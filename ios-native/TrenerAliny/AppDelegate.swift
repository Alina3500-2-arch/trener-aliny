import UIKit
import UserNotifications

// Минимальная нативная обёртка: одно окно, один WebViewController.
// Никакого Storyboard и SceneDelegate — старый AppDelegate-only lifecycle,
// это проще и предсказуемее для CI unsigned-сборки.
@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Спросить разрешение на уведомления сразу при старте, чтобы системный
        // алерт появился при первом запуске, а не только на экране напоминаний.
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = WebViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
