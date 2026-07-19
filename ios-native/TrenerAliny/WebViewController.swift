import UIKit
import WebKit
import UserNotifications

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
        guard message.name == "notify",
              let payload = message.body as? [String: Any] else { return }

        let reminders = payload["reminders"] as? [[String: Any]] ?? []
        let workout = payload["workout"] as? [String: Any]

        // Запросить разрешение (если ещё не дано) и перепланировать всё.
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { granted, _ in
            guard granted else { return } // тихо ничего не планируем, если запрещено
            self.scheduleNotifications(reminders: reminders, workout: workout)
        }
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
