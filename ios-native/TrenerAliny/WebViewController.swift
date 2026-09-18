import UIKit
import WebKit
import UserNotifications
import WidgetKit

// WKWebView на весь экран, грузит веб-приложение с GitHub Pages.
// Единственный настоящий нативный мост — планирование локальных уведомлений
// через window.webkit.messageHandlers.notify.postMessage(...).
final class WebViewController: UIViewController {

    private static let mealCategory = "MEAL_DECISION"
    private static let mealRecordAction = "MEAL_RECORD"
    private static let mealSnoozeAction = "MEAL_SNOOZE"
    private static let mealSkipDayAction = "MEAL_SKIP_DAY"

    // URL веб-приложения (GitHub Pages). Правки UI/логики происходят в docs/index.html
    // и публикуются мгновенно через Pages — пересборка .ipa для этого не нужна.
    private let appURL = URL(string: "https://alina3500-2-arch.github.io/trener-aliny/")!

    private var webView: WKWebView!
    private var skipNextActiveReload = false

    static func registerNotificationCategories() {
        let record = UNNotificationAction(
            identifier: mealRecordAction,
            title: "Записать",
            options: [.foreground]
        )
        let snooze = UNNotificationAction(
            identifier: mealSnoozeAction,
            title: "Ещё не ела",
            options: [.foreground]
        )
        let skip = UNNotificationAction(
            identifier: mealSkipDayAction,
            title: "Сегодня без контроля",
            options: [.foreground]
        )
        let category = UNNotificationCategory(
            identifier: mealCategory,
            actions: [record, snooze, skip],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    override func loadView() {
        let config = WKWebViewConfiguration()

        // Мост уведомлений: window.webkit.messageHandlers.notify.postMessage(payload)
        let controller = WKUserContentController()
        controller.add(self, name: "notify")
        controller.add(self, name: "widget")
        config.userContentController = controller

        // Разрешить inline-воспроизведение и не требовать жеста пользователя для
        // старта медиа (для getUserMedia/MediaRecorder не обязательно, но не мешает).
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        self.webView = webView
        self.view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView.load(URLRequest(url: appURL))

        // При возврате из фона перезагружаем страницу, чтобы подхватить свежую
        // версию HTML, опубликованную через GitHub Pages.
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(reloadIfNeeded),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc private func reloadIfNeeded() {
        if skipNextActiveReload {
            skipNextActiveReload = false
            return
        }
        // Если по какой-то причине страница не загружена — грузим заново,
        // иначе просто reload для получения последней версии.
        if webView.url == nil {
            webView.load(URLRequest(url: appURL))
        } else {
            webView.reload()
        }
    }

    func openWorkoutFromWidget() {
        openDeepLink("tab:workout")
    }

    func openTabFromWidget(_ tab: String) {
        openDeepLink("tab:\(tab == "today" ? "today" : "workout")")
    }
}

// MARK: - Разрешения на камеру/микрофон внутри WKWebView (iOS 15+)
extension WebViewController: WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        requestMediaCapturePermissionFor origin: WKSecurityOrigin,
        initiatedByFrame frame: WKFrameInfo,
        type: WKMediaCaptureType,
        decisionHandler: @escaping (WKPermissionDecision) -> Void
    ) {
        // Контент наш собственный (GitHub Pages) — всегда разрешаем.
        decisionHandler(.grant)
    }
}

// MARK: - Мост уведомлений
extension WebViewController: WKScriptMessageHandler {
    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let payload = message.body as? [String: Any] else { return }

        if message.name == "widget" {
            updateWidget(payload)
            return
        }

        guard message.name == "notify" else { return }

        let reminders = payload["reminders"] as? [[String: Any]] ?? []
        let workout = payload["workout"] as? [String: Any]
        let snooze = payload["snooze"] as? [String: Any]

        // Запросить разрешение (если ещё не дано) и перепланировать всё.
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return } // тихо ничего не планируем, если запрещено
            self.scheduleNotifications(reminders: reminders, workout: workout, snooze: snooze)
        }
    }

    private func updateWidget(_ payload: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8),
              let defaults = UserDefaults(suiteName: "group.com.aline456.treneraliny") else { return }

        defaults.set(json, forKey: "widgetPayload")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyWorkoutWidget")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyCaloriesWidget")
    }

    private func scheduleNotifications(reminders: [[String: Any]], workout: [String: Any]?, snooze: [String: Any]?) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        // Обычные напоминания повторяются ежедневно. Напоминания о еде
        // планируем отдельными датами на неделю: так «Сегодня без контроля»
        // отключает только текущий день, а не все будущие.
        for r in reminders {
            let enabled = (r["enabled"] as? Bool) ?? false
            guard enabled else { continue }
            guard let time = r["time"] as? String,
                  let (h, m) = Self.parseTime(time) else { continue }

            let body = (r["body"] as? String) ?? ""
            let content = UNMutableNotificationContent()
            content.title = "Тренер Алины"
            content.body = body
            content.sound = .default

            let isMeal = (r["actions"] as? Bool) == true
            if isMeal, let mealKey = r["mealKey"] as? String {
                content.categoryIdentifier = Self.mealCategory
                content.userInfo = ["mealKey": mealKey]
                let skipToday = (r["skipToday"] as? Bool) ?? false
                let calendar = Calendar.current
                let now = Date()

                for dayOffset in 0..<8 {
                    guard let day = calendar.date(byAdding: .day, value: dayOffset, to: now) else { continue }
                    var comps = calendar.dateComponents([.year, .month, .day], from: day)
                    comps.hour = h
                    comps.minute = m
                    guard let fireDate = calendar.date(from: comps), fireDate > now else { continue }
                    if dayOffset == 0 && skipToday { continue }

                    let dateKey = Self.dateKey(day)
                    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
                    let id = "reminder-sm-\(mealKey)-\(dateKey)"
                    center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
                }
                continue
            }

            var comps = DateComponents()
            comps.hour = h
            comps.minute = m
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)

            let id = (r["id"].map { "\($0)" }) ?? UUID().uuidString
            center.add(UNNotificationRequest(identifier: "reminder-\(id)", content: content, trigger: trigger))
        }

        // Еженедельное напоминание за час до тренировки в выбранные дни.
        if let workout = workout,
           let days = workout["days"] as? [Int], !days.isEmpty {
            let timeStr = (workout["time"] as? String) ?? "18:00"
            if let (th, tm) = Self.parseTime(timeStr) {
                let rh = (th - 1 + 24) % 24 // за час до тренировки
                for gd in days {
                    let content = UNMutableNotificationContent()
                    content.title = "💪 Скоро тренировка"
                    content.body = "Через час тренировка! Собирайся: вода, полотенце, форма и протеин 💜"
                    content.sound = .default

                    var comps = DateComponents()
                    // JS getDay: 0=Вс..6=Сб; Apple weekday: 1=Вс..7=Сб → gd+1
                    comps.weekday = (gd % 7) + 1
                    comps.hour = rh
                    comps.minute = tm
                    let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: true)
                    center.add(UNNotificationRequest(identifier: "workout-\(gd)", content: content, trigger: trigger))
                }
            }
        }

        if let snooze,
           let mealKey = snooze["mealKey"] as? String {
            let body = (snooze["body"] as? String) ?? "Пора записать приём пищи"
            scheduleMealSnooze(mealKey: mealKey, body: body)
        }
    }

    private static func parseTime(_ s: String) -> (Int, Int)? {
        let parts = s.split(separator: ":")
        guard parts.count == 2,
              let h = Int(parts[0]), let m = Int(parts[1]),
              (0...23).contains(h), (0...59).contains(m) else { return nil }
        return (h, m)
    }

    private static func dateKey(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar.current
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private func scheduleMealSnooze(mealKey: String, body: String) {
        let content = UNMutableNotificationContent()
        content.title = "Тренер Алины"
        content.body = body
        content.sound = .default
        content.categoryIdentifier = Self.mealCategory
        content.userInfo = ["mealKey": mealKey]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60 * 60, repeats: false)
        let id = "reminder-sm-\(mealKey)-snooze-\(Int(Date().timeIntervalSince1970))"
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
    }

    private func removeTodayMealNotifications() {
        let today = Self.dateKey(Date())
        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { requests in
            let ids = requests.map(\.identifier).filter {
                $0.hasPrefix("reminder-sm-") && ($0.hasSuffix("-\(today)") || $0.contains("-snooze-"))
            }
            center.removePendingNotificationRequests(withIdentifiers: ids)
        }
    }
}

// MARK: - Тап по уведомлению открывает конкретный экран приложения
// Грузим appURL с #open=meal:<type> или #open=tab:<name> — веб-часть
// (docs/index.html, функция applyDeepLink) сама переключает вкладку/окно при загрузке.
extension WebViewController: UNUserNotificationCenterDelegate {
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Показывать уведомление баннером, даже если приложение открыто на экране.
        completionHandler([.banner, .sound, .list])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let request = response.notification.request
        let mealKey = request.content.userInfo["mealKey"] as? String

        switch response.actionIdentifier {
        case Self.mealRecordAction:
            if let mealKey { openDeepLink("meal:\(mealKey)") }
        case Self.mealSnoozeAction:
            if let mealKey {
                scheduleMealSnooze(mealKey: mealKey, body: request.content.body)
                openDeepLink("meal-snooze:\(mealKey)")
            }
        case Self.mealSkipDayAction:
            removeTodayMealNotifications()
            openDeepLink("meal-skip:today")
        default:
            if let mealKey {
                openDeepLink("meal:\(mealKey)")
            } else if let target = Self.deepLinkTarget(for: request.identifier) {
                openDeepLink(target)
            }
        }
        completionHandler()
    }

    private static func deepLinkTarget(for identifier: String) -> String? {
        switch identifier {
        case "reminder-weigh": return "tab:weight"
        case "reminder-workout": return "tab:workout"
        case "reminder-sm-summary": return "tab:today"
        default:
            if identifier.hasPrefix("workout-") { return "tab:workout" }
            // Запасной разбор старых идентификаторов напоминаний о еде.
            if identifier.hasPrefix("reminder-sm-") {
                let rest = identifier.dropFirst("reminder-sm-".count)
                if let firstDash = rest.firstIndex(of: "-") { return "meal:\(rest[..<firstDash])" }
            }
            return nil
        }
    }

    private func openDeepLink(_ target: String) {
        // query-параметр, не #fragment: переход, отличающийся только якорем,
        // WKWebView (как и большинство браузеров) может посчитать навигацией
        // внутри документа и не перезагрузить страницу — тогда JS отработавший
        // на предыдущей загрузке deep-link просто не увидит новое значение.
        guard var comps = URLComponents(url: appURL, resolvingAgainstBaseURL: false) else { return }
        comps.queryItems = [URLQueryItem(name: "open", value: target)]
        guard let url = comps.url else { return }
        skipNextActiveReload = true
        webView.load(URLRequest(url: url))
    }
}
