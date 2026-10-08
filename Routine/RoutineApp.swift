import UIKit
import WebKit
import UserNotifications

@main
final class RoutineApp: UIResponder, UIApplicationDelegate {
    var window: UIWindow?
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = RoutineViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

final class RoutineViewController: UIViewController, WKScriptMessageHandler, WKUIDelegate {
    private var webView: WKWebView!
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.984, green: 0.973, blue: 0.965, alpha: 1)
        let controller = WKUserContentController()
        controller.add(self, name: "reminders")
        controller.add(self, name: "backup")
        let config = WKWebViewConfiguration()
        config.userContentController = controller
        config.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        guard let url = Bundle.main.url(forResource: "index", withExtension: "html") else {
            showMessage("Ошибка", "Не найден встроенный интерфейс приложения.")
            return
        }
        webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "reminders" { enableReminders() }
        if message.name == "backup", let data = message.body as? String { shareBackup(data) }
    }
    private func shareBackup(_ json: String) {
        let file = FileManager.default.temporaryDirectory.appendingPathComponent("moy-rezhim-backup.json")
        do {
            try Data(json.utf8).write(to: file, options: .atomic)
            let activity = UIActivityViewController(activityItems: [file], applicationActivities: nil)
            if let popover = activity.popoverPresentationController {
                popover.sourceView = view
                popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            }
            present(activity, animated: true)
        } catch { showMessage("Ошибка", "Не удалось подготовить резервную копию.") }
    }
    private func enableReminders() {
        let center = UNUserNotificationCenter.current()
        center.requestAuthorization(options: [.alert, .badge, .sound]) { [weak self] granted, _ in
            guard granted else {
                DispatchQueue.main.async {
                    self?.showMessage("Уведомления выключены", "Разреши уведомления для «Мой режим» в настройках iPhone.")
                }
                return
            }
            let reminders: [(String, String, String, Int, Int, Int?)] = [
                ("goals", "Доброе утро 🌸", "Прочитай аффирмации и цели на сегодня.", 6, 55, nil),
                ("reading", "Время для себя 📖", "20 страниц книги — твой вечерний ритуал.", 20, 0, nil),
                ("food", "Последняя галочка дня ✨", "Проверь питание и отметь привычки.", 21, 15, nil),
                ("gym-mon", "Сегодня спортзал 💗", "Собирайся на тренировку к 08:00.", 7, 15, 2),
                ("gym-wed", "Сегодня спортзал 💗", "Собирайся на тренировку к 08:00.", 7, 15, 4),
                ("gym-sat", "Сегодня спортзал 💗", "Собирайся на тренировку к 08:00.", 7, 15, 7)
            ]
            for (id, title, body, hour, minute, weekday) in reminders {
                center.removePendingNotificationRequests(withIdentifiers: [id])
                let content = UNMutableNotificationContent()
                content.title = title
                content.body = body
                content.sound = .default
                var components = DateComponents()
                components.hour = hour
                components.minute = minute
                if let weekday = weekday { components.weekday = weekday }
                let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
                center.add(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            }
            DispatchQueue.main.async {
                self?.showMessage("Готово!", "Напоминания о целях, чтении, питании и спортзале включены.")
            }
        }
    }
    private func showMessage(_ title: String, _ body: String) {
        let alert = UIAlertController(title: title, message: body, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Хорошо", style: .default))
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "Мой режим", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Хорошо", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }
    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "Мой режим", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Отмена", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "Да", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }
}