import UIKit
import UserNotifications
import WidgetKit
import AppIntents

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
        WebViewController.registerNotificationCategories()
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

        if let url = launchOptions?[.url] as? URL {
            webViewController.openTabFromWidget(Self.widgetTab(from: url), day: URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "day" })?.value)
        }
        return true
    }

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        guard url.scheme == "treneraliny" else { return false }
        (window?.rootViewController as? WebViewController)?.openTabFromWidget(Self.widgetTab(from: url), day: URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "day" })?.value)
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        WidgetCenter.shared.reloadAllTimelines()
    }

    private static func widgetTab(from url: URL) -> String {
        let tab = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?
            .first(where: { $0.name == "tab" })?
            .value
        return ["today", "workout", "routine", "tasks", "goals", "projects", "result", "progress", "settings"].contains(tab ?? "") ? tab! : "routine"
    }
}


// MARK: - Siri: «Добавь дело в Планировщик»
// Дело сразу попадает в виджет планировщика; в само приложение оно
// переносится при следующем открытии (см. WebViewController.updateTasks).

@available(iOS 17.0, *)
struct AddPlannerTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Добавить дело"
    static var description = IntentDescription("Записывает дело в планировщик: «завтра в 15:00 позвонить Саше».")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Дело", requestValueDialog: "Что нужно сделать?")
    var text: String

    func perform() async throws -> some IntentResult & ProvidesDialog {
        guard let parsed = PlannerTaskParser.parse(text, now: Date()) else {
            return .result(dialog: "Не расслышала дело, попробуй ещё раз.")
        }
        PlannerTaskStore.add(parsed)
        var answer = "Записала: \(parsed.title)"
        answer += parsed.dayOffsetLabel.isEmpty ? "" : ", \(parsed.dayOffsetLabel)"
        if let time = parsed.time { answer += " в \(time)" }
        return .result(dialog: IntentDialog(stringLiteral: answer))
    }
}

@available(iOS 17.0, *)
struct PlannerShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddPlannerTaskIntent(),
            phrases: [
                "Добавь дело в \(.applicationName)",
                "Запиши дело в \(.applicationName)",
                "Новое дело в \(.applicationName)",
                "\(.applicationName) новое дело"
            ],
            shortTitle: "Добавить дело",
            systemImageName: "checklist"
        )
    }
}

struct PlannerParsedTask {
    let title: String
    let date: Date
    let time: String?
    let dayOffsetLabel: String
}

// Разбирает фразу: «сегодня/завтра/послезавтра», дни недели и время «в 15», «в 15:30», «в 7 вечера».
enum PlannerTaskParser {
    static func parse(_ raw: String, now: Date) -> PlannerParsedTask? {
        let cal = Calendar.current
        var text = " " + raw.trimmingCharacters(in: .whitespacesAndNewlines) + " "
        let today = cal.startOfDay(for: now)
        var date = today
        var label = "на сегодня"

        func take(_ pattern: String) -> NSTextCheckingResult? {
            guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return nil }
            let range = NSRange(text.startIndex..., in: text)
            guard let match = re.firstMatch(in: text, range: range) else { return nil }
            return match
        }
        func cut(_ match: NSTextCheckingResult) {
            if let r = Range(match.range, in: text) { text.replaceSubrange(r, with: " ") }
        }
        func group(_ match: NSTextCheckingResult, _ i: Int) -> String? {
            guard match.range(at: i).location != NSNotFound, let r = Range(match.range(at: i), in: text) else { return nil }
            return String(text[r])
        }

        if let m = take("\\s(послезавтра)\\s") {
            date = cal.date(byAdding: .day, value: 2, to: today) ?? today; label = "на послезавтра"; cut(m)
        } else if let m = take("\\s(завтра)\\s") {
            date = cal.date(byAdding: .day, value: 1, to: today) ?? today; label = "на завтра"; cut(m)
        } else if let m = take("\\s(сегодня)\\s") {
            cut(m)
        } else {
            // Calendar weekday: 1 = Sunday … 7 = Saturday.
            let days: [(String, Int, String)] = [
                ("понедельник", 2, "на понедельник"), ("вторник", 3, "на вторник"), ("сред[уа]", 4, "на среду"),
                ("четверг", 5, "на четверг"), ("пятниц[уа]", 6, "на пятницу"), ("суббот[уа]", 7, "на субботу"),
                ("воскресень[еяю]", 1, "на воскресенье")
            ]
            for (word, weekday, dayLabel) in days {
                if let m = take("\\s(?:в|во|на)?\\s*\(word)\\s") {
                    let current = cal.component(.weekday, from: today)
                    let delta = (weekday - current + 7) % 7
                    date = cal.date(byAdding: .day, value: delta, to: today) ?? today
                    label = delta == 0 ? "на сегодня" : dayLabel
                    cut(m)
                    break
                }
            }
        }

        var time: String?
        if let m = take("\\s(?:в|к)\\s+(\\d{1,2})(?:[:.\\s](\\d{2}))?\\s*(?:час(?:а|ов)?)?\\s*(утра|дня|вечера|ночи)?(?=\\s)"),
           let h = Int(group(m, 1) ?? ""), h < 24 {
            var hour = h
            let minute = Int(group(m, 2) ?? "") ?? 0
            let part = group(m, 3)?.lowercased()
            if (part == "дня" || part == "вечера") && hour < 12 { hour += 12 }
            if minute < 60 {
                time = String(format: "%02d:%02d", hour, minute)
                cut(m)
            }
        }

        var title = text.components(separatedBy: .whitespaces).filter { !$0.isEmpty }.joined(separator: " ")
        title = title.trimmingCharacters(in: CharacterSet(charactersIn: " ,.-—"))
        guard !title.isEmpty else { return nil }
        title = title.prefix(1).uppercased() + title.dropFirst()
        return PlannerParsedTask(title: String(title.prefix(160)), date: date, time: time,
                                 dayOffsetLabel: label == "на сегодня" ? "" : label)
    }
}

enum PlannerTaskStore {
    static func key(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: date)
    }

    static func add(_ task: PlannerParsedTask) {
        guard let defaults = SharedStore.defaults else { return }
        let dateKey = key(task.date)
        let id = "siri-" + String(Int(Date().timeIntervalSince1970 * 1000))
        var item: [String: Any] = ["id": id, "title": task.title, "done": false, "date": dateKey]
        if let time = task.time { item["time"] = time }

        // 1) Show it on the widget right away.
        if let json = defaults.string(forKey: "dailyTasksWidgetPayload"),
           let data = json.data(using: .utf8),
           var payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
           var days = payload["days"] as? [[String: Any]],
           let index = days.firstIndex(where: { $0["date"] as? String == dateKey }) {
            var tasks = days[index]["tasks"] as? [[String: Any]] ?? []
            var widgetItem = item
            widgetItem.removeValue(forKey: "date")
            widgetItem["overdue"] = false
            tasks.append(widgetItem)
            tasks = tasks.enumerated().sorted { a, b in
                let ta = a.element["time"] as? String ?? "", tb = b.element["time"] as? String ?? ""
                if ta.isEmpty != tb.isEmpty { return !ta.isEmpty }
                if ta != tb { return ta < tb }
                return a.offset < b.offset
            }.map { $0.element }
            days[index]["tasks"] = tasks
            payload["days"] = days
            if let out = try? JSONSerialization.data(withJSONObject: payload),
               let string = String(data: out, encoding: .utf8) {
                defaults.set(string, forKey: "dailyTasksWidgetPayload")
            }
        }

        // 2) Queue it for the app's own storage.
        var pending = defaults.array(forKey: "tasksPendingAdds") as? [[String: Any]] ?? []
        pending.append(item)
        defaults.set(pending, forKey: "tasksPendingAdds")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyDailyTasksWidget")
    }
}
