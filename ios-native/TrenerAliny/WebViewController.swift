import UIKit
import WebKit
import UserNotifications
import WidgetKit

// WKWebView на весь экран, грузит веб-приложение с GitHub Pages.
// Единственный настоящий нативный мост — планирование локальных уведомлений
// через window.webkit.messageHandlers.notify.postMessage(...).
final class WebViewController: UIViewController {

    // URL веб-приложения (GitHub Pages). Правки UI/логики происходят в docs/index.html
    // и публикуются мгновенно через Pages — пересборка .ipa для этого не нужна.
    private let appURL = URL(string: "https://alina3500-2-arch.github.io/trener-aliny/")!

    private var webView: WKWebView!

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

        // Запросить разрешение (если ещё не дано) и перепланировать всё.
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return } // тихо ничего не планируем, если запрещено
            self.scheduleNotifications(reminders: reminders, workout: workout)
        }
    }

    private func updateWidget(_ payload: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(payload),
              let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8),
              let defaults = UserDefaults(suiteName: "group.com.aline456.treneraliny") else { return }

        defaults.set(json, forKey: "widgetPayload")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyWorkoutWidget")
    }

    private func scheduleNotifications(reminders: [[String: Any]], workout: [String: Any]?) {
        let center = UNUserNotificationCenter.current()
        center.removeAllPendingNotificationRequests()

        // Ежедневные напоминания.
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
    }

    private static func parseTime(_ s: String) -> (Int, Int)? {
        let parts = s.split(separator: ":")
        guard parts.count == 2,
              let h = Int(parts[0]), let m = Int(parts[1]),
              (0...23).contains(h), (0...59).contains(m) else { return nil }
        return (h, m)
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
        if let target = Self.deepLinkTarget(for: response.notification.request.identifier) {
            openDeepLink(target)
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
            // Умные напоминания о еде: "reminder-sm-<mealKey>-<hour>" → открыть лист приёма пищи.
            if identifier.hasPrefix("reminder-sm-") {
                let rest = identifier.dropFirst("reminder-sm-".count) // напр. "breakfast-7"
                if let lastDash = rest.range(of: "-", options: .backwards) {
                    let mealKey = rest[rest.startIndex..<lastDash.lowerBound]
                    return "meal:\(mealKey)"
                }
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
        webView.load(URLRequest(url: url))
    }
}
