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

        let webViewController = WebViewController()
        // Делегат нужен до того, как система может доставить тап по уведомлению
        // (в т.ч. при холодном старте приложения по нажатию на уведомление).
        UNUserNotificationCenter.current().delegate = webViewController

        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = webViewController
        window.makeKeyAndVisible()
        self.window = window

        if launchOptions?[.url] != nil {
            webViewController.openWorkoutFromWidget()
        }
        return true
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        guard url.scheme == "treneraliny" else { return false }
        (window?.rootViewController as? WebViewController)?.openWorkoutFromWidget()
        return true
    }
}
