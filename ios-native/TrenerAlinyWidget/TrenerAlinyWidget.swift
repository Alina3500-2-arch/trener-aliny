import SwiftUI
import WidgetKit
import AppIntents

private let widgetEndpoint = "https://trener-aliny-widget.alina-3500-2.workers.dev/widget/aline"

// Общее хранилище с приложением (App Group). SideStore переименовывает группу
// при установке (добавляет ID команды), поэтому берём реальное имя из профиля
// внутри расширения. Копия кода из WebViewController.swift — менять синхронно.
enum SharedStore {
    static let baseGroup = "group.com.aline456.treneraliny"
    static let groupID: String = resolveGroupID()
    static let defaults: UserDefaults? = UserDefaults(suiteName: groupID)

    private static func resolveGroupID() -> String {
        let candidates = (Bundle.main.object(forInfoDictionaryKey: "ALTAppGroups") as? [String] ?? [])
            + provisionedGroups()
        return candidates.first { $0 == baseGroup || $0.hasPrefix(baseGroup + ".") } ?? baseGroup
    }

    private static func provisionedGroups() -> [String] {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let start = data.range(of: Data("<?xml".utf8)),
              let end = data.range(of: Data("</plist>".utf8), in: start.lowerBound..<data.endIndex),
              let plist = try? PropertyListSerialization.propertyList(
                  from: data.subdata(in: start.lowerBound..<end.upperBound), format: nil) as? [String: Any],
              let entitlements = plist["Entitlements"] as? [String: Any] else { return [] }
        return entitlements["com.apple.security.application-groups"] as? [String] ?? []
    }
}

private struct CalorieDay: Codable, Identifiable {
    let date: String
    let label: String
    let kcal: Int
    let actualKcal: Int
    let complete: Bool
    var id: String { date }
}

private struct WidgetPayload: Codable {
    let nextDate: TimeInterval?
    let title: String?
    let durationMinutes: Int?
    let workoutDays: [Int]?
    let calorieTarget: Int?
    let todayKcal: Int?
    let calorieDays: [CalorieDay]?
}

private struct WorkoutEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

private struct WorkoutProvider: TimelineProvider {
    func placeholder(in context: Context) -> WorkoutEntry {
        WorkoutEntry(date: .now, payload: samplePayload)
    }

    func getSnapshot(in context: Context, completion: @escaping (WorkoutEntry) -> Void) {
        let payload = loadLocal() ?? loadFromCache()
        completion(WorkoutEntry(date: .now, payload: payload ?? (context.isPreview ? samplePayload : nil)))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkoutEntry>) -> Void) {
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? Date().addingTimeInterval(3600)
        // Главный источник — данные, которые приложение само положило в общее
        // хранилище (там есть и следующая тренировка, и калории).
        if let local = loadLocal() {
            completion(Timeline(entries: [WorkoutEntry(date: .now, payload: local)], policy: .after(nextUpdate)))
            return
        }
        // Запасной путь, если общее хранилище недоступно: копия на Worker'е.
        // Выдуманные цифры (samplePayload) на рабочем столе не показываем.
        fetchFromWorker { payload in
            if let payload = payload {
                cachePayload(payload)
            }
            let entry = WorkoutEntry(date: .now, payload: payload ?? loadFromCache())
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func loadLocal() -> WidgetPayload? {
        guard let raw = SharedStore.defaults?.string(forKey: "widgetPayload"),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetPayload.self, from: data)
    }

    private func fetchFromWorker(completion: @escaping (WidgetPayload?) -> Void) {
        var request = URLRequest(url: URL(string: widgetEndpoint)!)
        request.timeoutInterval = 10 // у виджета мало времени на обновление
        request.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: request) { data, response, _ in
            guard let data = data, (response as? HTTPURLResponse)?.statusCode == 200 else {
                completion(nil)
                return
            }
            let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data)
            completion(payload)
        }.resume()
    }

    private func loadFromCache() -> WidgetPayload? {
        guard let raw = SharedStore.defaults?.string(forKey: "widgetPayloadCache"),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetPayload.self, from: data)
    }

    private var samplePayload: WidgetPayload {
        WidgetPayload(
            nextDate: Calendar.current.date(byAdding: .day, value: 1, to: .now)!.timeIntervalSince1970,
            title: "ПРОГРАММА ТРЕНИРОВКИ",
            durationMinutes: 50,
            workoutDays: [1, 3, 5],
            calorieTarget: 1700,
            todayKcal: 1240,
            calorieDays: [
                CalorieDay(date: "1", label: "Пн", kcal: 1640, actualKcal: 1640, complete: true),
                CalorieDay(date: "2", label: "Вт", kcal: 1820, actualKcal: 1820, complete: true),
                CalorieDay(date: "3", label: "Ср", kcal: 2000, actualKcal: 820, complete: false),
                CalorieDay(date: "4", label: "Чт", kcal: 1550, actualKcal: 1550, complete: true),
                CalorieDay(date: "5", label: "Пт", kcal: 1710, actualKcal: 1710, complete: true),
                CalorieDay(date: "6", label: "Сб", kcal: 1460, actualKcal: 1460, complete: true),
                CalorieDay(date: "7", label: "Вс", kcal: 1240, actualKcal: 1240, complete: true)
            ]
        )
    }
}

private func cachePayload(_ payload: WidgetPayload) {
    guard let data = try? JSONEncoder().encode(payload),
          let json = String(data: data, encoding: .utf8) else { return }
    SharedStore.defaults?.set(json, forKey: "widgetPayloadCache")
}

private struct WeekDay: Identifiable {
    let date: Date
    let jsWeekday: Int
    let label: String
    var id: Date { date }
}

private struct TrenerWidgetView: View {
    let entry: WorkoutEntry

    private let violet = Color(red: 0.61, green: 0.28, blue: 1.0)
    private let muted = Color(red: 0.72, green: 0.68, blue: 0.82)

    private var payload: WidgetPayload? { entry.payload }
    private var nextDate: Date? { payload?.nextDate.map { Date(timeIntervalSince1970: $0) } }

    private var week: [WeekDay] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: entry.date)
        let weekday = cal.component(.weekday, from: today)
        let mondayOffset = (weekday + 5) % 7
        let monday = cal.date(byAdding: .day, value: -mondayOffset, to: today)!
        let labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        return (0..<7).map { offset in
            let date = cal.date(byAdding: .day, value: offset, to: monday)!
            return WeekDay(date: date, jsWeekday: (offset + 1) % 7, label: labels[offset])
        }
    }

    var body: some View {
        content
            .widgetURL(URL(string: "treneraliny://open?tab=workout"))
            .containerBackground(for: .widget) { widgetBackground }
    }

    private var content: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 7) {
                Image(systemName: "figure.strengthtraining.traditional")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(violet)
                Text("ТРЕНЕР АЛИНЫ")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(muted)
                Spacer()
            }

            if let payload, let nextDate {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Следующая тренировка")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(muted)
                        Text(nextDate.formatted(.dateTime.weekday(.wide).day()))
                            .font(.system(size: 20, weight: .heavy, design: .rounded))
                            .textCase(.uppercase)
                            .lineLimit(1)
                            .minimumScaleFactor(0.72)
                    }
                    Spacer(minLength: 4)
                    VStack(alignment: .trailing, spacing: 2) {
                        Text((payload.title ?? "ТРЕНИРОВКА").uppercased())
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .lineLimit(1)
                            .minimumScaleFactor(0.65)
                        Text("≈ \(payload.durationMinutes ?? 0) мин")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(violet)
                    }
                }
            } else {
                HStack(alignment: .top, spacing: 10) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Следующая тренировка")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(muted)
                        Text("—")
                            .font(.system(size: 20, weight: .heavy, design: .rounded))
                            .foregroundStyle(muted)
                    }
                    Spacer()
                }
            }

            HStack(spacing: 0) {
                ForEach(week) { day in
                    let isNext = nextDate.map { Calendar.current.isDate(day.date, inSameDayAs: $0) } ?? false
                    let hasWorkout = payload?.workoutDays?.contains(day.jsWeekday) ?? false
                    VStack(spacing: 3) {
                        Text(day.label)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(muted)
                        Text("\(Calendar.current.component(.day, from: day.date))")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .frame(width: 25, height: 25)
                            .background(isNext ? violet : Color.clear, in: Circle())
                        Image(systemName: "dumbbell.fill")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(violet)
                            .opacity(hasWorkout ? 1 : 0.2)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 15)
        .padding(.vertical, 12)
    }

    private var widgetBackground: some View {
        ZStack {
            Color(red: 0.035, green: 0.03, blue: 0.065)
            RadialGradient(
                colors: [violet.opacity(0.22), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 190
            )
        }
    }
}

struct TrenerAlinyWidget: Widget {
    let kind = "TrenerAlinyWorkoutWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutProvider()) { entry in
            TrenerWidgetView(entry: entry)
        }
        .configurationDisplayName("Следующая тренировка")
        .description("Показывает ближайшую тренировку и расписание недели.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

private struct CalorieWidgetView: View {
    let entry: WorkoutEntry

    private let violet = Color(red: 0.61, green: 0.28, blue: 1.0)
    private let muted = Color(red: 0.72, green: 0.68, blue: 0.82)
    private let danger = Color(red: 0.97, green: 0.38, blue: 0.43)
    private let incomplete = Color(red: 0.96, green: 0.65, blue: 0.28)

    private var target: Int { max(entry.payload?.calorieTarget ?? 1700, 1) }
    private var today: Int { max(entry.payload?.todayKcal ?? 0, 0) }
    private var days: [CalorieDay] { entry.payload?.calorieDays ?? [] }
    private var isOver: Bool { today > target }

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 7) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(violet)
                Text("КАЛОРИИ")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .tracking(1.2)
                    .foregroundStyle(muted)
                Spacer()
                Text("цель \(target)")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(muted)
            }

            HStack(alignment: .firstTextBaseline, spacing: 5) {
                Text("\(today)")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(isOver ? danger : .white)
                Text("ккал сегодня")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(muted)
                Spacer()
                Text(isOver ? "перебор \(today - target)" : "осталось \(target - today)")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(isOver ? danger : violet)
            }

            GeometryReader { geometry in
                let maximum = max(max(Double(target) * 1.22, Double(days.map(\.kcal).max() ?? target)), 1)
                let chartHeight = max(geometry.size.height - 16, 1)
                ZStack(alignment: .bottomLeading) {
                    Rectangle()
                        .fill(Color.green.opacity(0.75))
                        .frame(height: 1)
                        .offset(y: -chartHeight * CGFloat(Double(target) / maximum))

                    HStack(alignment: .bottom, spacing: 7) {
                        ForEach(days) { day in
                            VStack(spacing: 3) {
                                RoundedRectangle(cornerRadius: 3)
                                    .fill(barColor(day))
                                    .frame(height: max(4, chartHeight * CGFloat(Double(day.kcal) / maximum)))
                                Text(day.label)
                                    .font(.system(size: 9, weight: .bold, design: .rounded))
                                    .foregroundStyle(muted)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .frame(height: 60)

            HStack(spacing: 10) {
                legend(color: violet, text: "норма")
                legend(color: danger, text: "перебор")
                legend(color: incomplete, text: "неполный ≈2000")
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 15)
        .padding(.vertical, 11)
        .widgetURL(URL(string: "treneraliny://open?tab=today"))
        .containerBackground(for: .widget) { widgetBackground }
    }

    private func barColor(_ day: CalorieDay) -> Color {
        if !day.complete { return incomplete }
        return day.kcal > target ? danger : violet
    }

    private func legend(color: Color, text: String) -> some View {
        HStack(spacing: 3) {
            RoundedRectangle(cornerRadius: 2).fill(color).frame(width: 7, height: 7)
            Text(text).font(.system(size: 8, weight: .semibold)).foregroundStyle(muted)
        }
    }

    private var widgetBackground: some View {
        ZStack {
            Color(red: 0.035, green: 0.03, blue: 0.065)
            RadialGradient(
                colors: [violet.opacity(0.2), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 190
            )
        }
    }
}

struct TrenerAlinyCaloriesWidget: Widget {
    let kind = "TrenerAlinyCaloriesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutProvider()) { entry in
            CalorieWidgetView(entry: entry)
        }
        .configurationDisplayName("Калории за неделю")
        .description("Показывает калории за день, норму и перебор за неделю.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}


// iOS 17+ interactive widget action: toggles without launching the host app.
struct ToggleRoutineHabitIntent: AppIntent {
    static var title: LocalizedStringResource = "Отметить привычку"
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Привычка") var habitId: String
    @Parameter(title: "Дата") var dateKey: String

    init() {}
    init(habitId: String, dateKey: String) {
        self.habitId = habitId
        self.dateKey = dateKey
    }

    func perform() async throws -> some IntentResult {
        let valid = ["wake", "affirm", "read", "food", "gym", "motivation", "ai"]
        let today = RoutineWeek.key(Date())
        guard valid.contains(habitId), dateKey >= "2026-10-09",
              dateKey <= "2026-11-08", dateKey <= today,
              let defaults = SharedStore.defaults else { return .result() }

        var payload = defaults.string(forKey: "routineWidgetPayload")
            .flatMap { $0.data(using: .utf8) }
            .flatMap { try? JSONDecoder().decode(RoutinePayload.self, from: $0) }
            ?? RoutinePayload(date: today, active: true, habits: [], done: 0, total: 0,
                              percent: 0, weekPercent: 0, weekDone: 0, weekTotal: 0, weekDays: nil)

        var week = RoutineWeek.merged(payload, date: Date())
        let weekIndex = week.firstIndex(where: { $0.date == dateKey })
        guard let index = weekIndex,
              let habitIndex = week[index].habits.firstIndex(where: { $0.id == habitId }),
              week[index].habits[habitIndex].planned else { return .result() }

        let newValue = !week[index].habits[habitIndex].done
        week[index].habits[habitIndex].done = newValue
        payload.weekDays = week
        let weekHabits = week.flatMap { $0.habits }.filter { $0.planned }
        payload.weekTotal = weekHabits.count
        payload.weekDone = weekHabits.filter { $0.done }.count
        payload.weekPercent = payload.weekTotal > 0 ? Int((Double(payload.weekDone) * 100 / Double(payload.weekTotal)).rounded()) : 0

        if dateKey == today {
            payload.date = today
            payload.active = true
            let todayHabits = week[index].habits.filter { $0.planned }
            payload.total = todayHabits.count
            payload.done = todayHabits.filter { $0.done }.count
            payload.percent = payload.total > 0 ? Int((Double(payload.done) * 100 / Double(payload.total)).rounded()) : 0
            payload.habits = ["wake", "affirm", "read", "food"].map { id in
                RoutineHabit(id: id, done: week[index].habits.first(where: { $0.id == id })?.done ?? false)
            }
        }
        if let data = try? JSONEncoder().encode(payload),
           let json = String(data: data, encoding: .utf8) {
            defaults.set(json, forKey: "routineWidgetPayload")
        }
        var pending: [String: [String: Bool]] = [:]
        if let stored = defaults.data(forKey: "routinePendingWeekChecks"),
           let parsed = try? JSONDecoder().decode([String: [String: Bool]].self, from: stored) {
            pending = parsed
        }
        pending[dateKey, default: [:]][habitId] = newValue
        defaults.set(try? JSONEncoder().encode(pending), forKey: "routinePendingWeekChecks")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyRoutineWidget")
        return .result()
    }
}

private struct RoutineHabit: Codable {
    let id: String
    let done: Bool
}

private struct RoutinePayload: Codable {
    var date: String
    var active: Bool
    var habits: [RoutineHabit]
    var done: Int
    var total: Int
    var percent: Int
    var weekPercent: Int
    var weekDone: Int
    var weekTotal: Int
    var weekDays: [RoutineWeekDay]? = nil
}

private struct RoutineWeekHabit: Codable {
    let id: String
    let planned: Bool
    var done: Bool
}
private struct RoutineWeekDay: Codable {
    let date: String
    var habits: [RoutineWeekHabit]
}


// Shared schedule: renders checkboxes even before the web tracker has ever synced.
private enum RoutineWeek {
    static let ids = ["wake", "affirm", "read", "food", "gym", "motivation", "ai"]
    static func key(_ date: Date) -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.calendar = Calendar(identifier: .gregorian)
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
    static func days(around date: Date) -> [RoutineWeekDay] {
        let cal = Calendar.current
        let weekday = cal.component(.weekday, from: date)
        let monday = cal.startOfDay(for: cal.date(byAdding: .day, value: -((weekday + 5) % 7), to: date) ?? date)
        return (0..<7).map { offset in
            let day = cal.date(byAdding: .day, value: offset, to: monday) ?? monday
            let key = self.key(day)
            let dow = cal.component(.weekday, from: day)
            let active = key >= "2026-10-09" && key <= "2026-11-08" && dow != 1
            return RoutineWeekDay(date: key, habits: ids.map { id in
                let scheduled: Bool
                switch id {
                case "gym": scheduled = [2,4,7].contains(dow)
                case "motivation": scheduled = [2,4,6].contains(dow)
                case "ai": scheduled = [3,5,7].contains(dow)
                default: scheduled = true
                }
                return RoutineWeekHabit(id: id, planned: active && scheduled, done: false)
            })
        }
    }
    static func merged(_ payload: RoutinePayload?, date: Date) -> [RoutineWeekDay] {
        var base = days(around: date)
        let old = payload?.weekDays ?? []
        for index in base.indices {
            if let source = old.first(where: { $0.date == base[index].date }) {
                for j in base[index].habits.indices {
                    if let habit = source.habits.first(where: { $0.id == base[index].habits[j].id }) {
                        base[index].habits[j].done = habit.done
                    }
                }
            } else if base[index].date == payload?.date {
                for j in base[index].habits.indices {
                    if let habit = payload?.habits.first(where: { $0.id == base[index].habits[j].id }) {
                        base[index].habits[j].done = habit.done
                    }
                }
            }
        }
        return base
    }
}

private struct RoutineEntry: TimelineEntry {
    let date: Date
    let payload: RoutinePayload?
}

private struct RoutineProvider: TimelineProvider {
    func placeholder(in context: Context) -> RoutineEntry {
        RoutineEntry(date: .now, payload: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (RoutineEntry) -> Void) {
        completion(RoutineEntry(date: .now, payload: load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<RoutineEntry>) -> Void) {
        let now = Date()
        let next = Calendar.current.date(byAdding: .minute, value: 20, to: now) ?? now.addingTimeInterval(1200)
        completion(Timeline(entries: [RoutineEntry(date: now, payload: load())], policy: .after(next)))
    }

    private func load() -> RoutinePayload? {
        guard let json = SharedStore.defaults?
            .string(forKey: "routineWidgetPayload"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(RoutinePayload.self, from: data)
    }
}

private struct RoutineWidgetView: View {
    let entry: RoutineEntry
    @Environment(\.widgetFamily) private var family
    // Planwoo-style palette: white card, soft grey dots, rose accent.
    private let rose = Color(red: 0.94, green: 0.36, blue: 0.58)
    private let ink = Color(red: 0.11, green: 0.11, blue: 0.13)
    private let faded = Color(red: 0.60, green: 0.60, blue: 0.64)
    private let dot = Color(red: 0.93, green: 0.93, blue: 0.94)
    // Same order, times and icons as the tracker matrix in docs/routine.html.
    private let allRows: [(id: String, time: String, icon: String, title: String)] = [
        ("wake", "06:00", "🌅", "Подъём"),
        ("affirm", "06:10", "🌷", "Аффирмации"),
        ("gym", "08:00", "💪", "Спортзал"),
        ("ai", "17:00", "💻", "Обучение ИИ"),
        ("motivation", "18:00", "🎧", "Подкаст"),
        ("read", "20:00", "📖", "Книга 20 стр"),
        ("food", "21:00", "📝", "Питание")
    ]
    private let dailyIds = ["wake", "affirm", "read", "food"]
    private var labels: [(id: String, time: String, icon: String, title: String)] {
        isLarge ? allRows : allRows.filter { dailyIds.contains($0.id) }
    }
    private let days = ["п","в","с","ч","п","с","в"]

    private var today: String { RoutineWeek.key(entry.date) }
    private var week: [RoutineWeekDay] { RoutineWeek.merged(entry.payload, date: entry.date) }

    private var weekPlanned: [RoutineWeekHabit] { week.flatMap { $0.habits }.filter { $0.planned } }
    private var pct: Int {
        let total = weekPlanned.count
        return total == 0 ? 0 : Int((Double(weekPlanned.filter { $0.done }.count) * 100 / Double(total)).rounded())
    }

    private var isLarge: Bool { family == .systemLarge }
    private var rows: Int { labels.count }
    private var dotSize: CGFloat { isLarge ? 16 : 14 }
    private var colWidth: CGFloat { isLarge ? 19 : 18 }
    private var rowHeight: CGFloat { isLarge ? 37 : 24 }
    private var labelSize: CGFloat { isLarge ? 13 : 12 }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if family == .systemSmall {
                todayList
            } else {
                weekTable
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, isLarge ? 18 : 16)
        .padding(.top, isLarge ? 18 : 14)
        .padding(.bottom, 12)
        .containerBackground(for: .widget) { Color.white }
        .widgetURL(URL(string: "treneraliny://open?tab=routine"))
    }

    private var header: some View {
        HStack(spacing: 10) {
            Image(systemName: "arrow.counterclockwise.circle.fill")
                .font(.system(size: isLarge ? 21 : 18, weight: .semibold))
                .foregroundStyle(rose)
            Text("Моя неделя")
                .font(.system(size: isLarge ? 16 : 14, weight: .medium))
                .foregroundStyle(ink)
                .lineLimit(1)
            Spacer(minLength: 4)
            Text("\(pct)%")
                .font(.system(size: isLarge ? 15 : 13, weight: .medium))
                .foregroundStyle(rose)
        }
        .padding(.bottom, isLarge ? 12 : 5)
    }

    private var weekTable: some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Spacer(minLength: 0)
                ForEach(0..<7, id: \.self) { i in
                    let isToday = week[i].date == today
                    Text(days[i])
                        .font(.system(size: isLarge ? 11 : 9, weight: isToday ? .bold : .regular))
                        .foregroundStyle(isToday ? rose : faded)
                        .frame(width: colWidth)
                }
            }
            .padding(.bottom, isLarge ? 4 : 2)

            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: 0) {
                    rowLabel(labels[row], size: labelSize)
                    ForEach(0..<7, id: \.self) { col in
                        let day = week[col]
                        let habit = day.habits.first(where: { $0.id == labels[row].id })
                        cell(id: labels[row].id, date: day.date,
                             planned: habit?.planned ?? false,
                             done: habit?.done ?? false)
                            .frame(width: colWidth, height: rowHeight)
                    }
                }
                .frame(height: rowHeight)
            }
        }
    }

    private var todayList: some View {
        VStack(spacing: 0) {
            ForEach(0..<labels.count, id: \.self) { idx in
                let id = labels[idx].id
                let habit = week.first(where: { $0.date == today })?.habits.first(where: { $0.id == id })
                HStack(spacing: 6) {
                    rowLabel(labels[idx], size: 12)
                    cell(id: id, date: today, planned: habit?.planned ?? false, done: habit?.done ?? false)
                        .frame(width: 24, height: 26)
                }
                .frame(height: 26)
            }
        }
        .padding(.top, 4)
    }

    private func rowLabel(_ row: (id: String, time: String, icon: String, title: String), size: CGFloat) -> some View {
        HStack(spacing: 5) {
            Text(row.time)
                .font(.system(size: size - 3, weight: .regular).monospacedDigit())
                .foregroundStyle(faded)
                .frame(width: size * 2.4, alignment: .leading)
            Text(row.icon)
                .font(.system(size: size - 1))
            Text(row.title)
                .font(.system(size: size))
                .foregroundStyle(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Three looks: tappable = white ring, done = rose with check,
    // anything not actionable (future or not scheduled) = solid grey.
    private enum DotState { case tappable, done, future, off }

    private func dotView(_ state: DotState) -> some View {
        ZStack {
            switch state {
            case .done:
                Circle().fill(rose)
                Image(systemName: "checkmark")
                    .font(.system(size: dotSize * 0.5, weight: .bold))
                    .foregroundStyle(.white)
            case .tappable:
                Circle().fill(Color.white)
                Circle().strokeBorder(Color(red: 0.76, green: 0.76, blue: 0.80), lineWidth: 1.5)
            case .future:
                Circle().fill(dot)
            case .off:
                Circle().fill(dot.opacity(0.5))
            }
        }
        .frame(width: dotSize, height: dotSize)
    }

    @ViewBuilder
    private func cell(id: String, date: String, planned: Bool, done: Bool) -> some View {
        if planned && date <= today {
            Button(intent: ToggleRoutineHabitIntent(habitId: id, dateKey: date)) {
                dotView(done ? .done : .tappable)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        } else {
            dotView(planned ? (done ? .done : .future) : .off)
        }
    }
}

struct TrenerAlinyRoutineWidget: Widget {
    let kind = "TrenerAlinyRoutineWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: RoutineProvider()) { entry in
            RoutineWidgetView(entry: entry)
        }
        .configurationDisplayName("Мой режим")
        .description("Ежедневные привычки, галочки и прогресс за неделю.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}


private struct DailyTaskItem: Codable, Identifiable {
    let id: String
    let title: String
    var done: Bool
    let overdue: Bool?
}
private struct DailyTaskDay: Codable, Identifiable {
    let date: String
    let label: String
    var tasks: [DailyTaskItem]
    var id: String { date }
}
private struct DailyTaskPayload: Codable {
    var days: [DailyTaskDay]
}
private struct DailyTasksEntry: TimelineEntry {
    let date: Date
    let payload: DailyTaskPayload?
}
private struct DailyTasksProvider: TimelineProvider {
    private func load() -> DailyTaskPayload? {
        guard let json = SharedStore.defaults?.string(forKey: "dailyTasksWidgetPayload"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DailyTaskPayload.self, from: data)
    }
    func placeholder(in context: Context) -> DailyTasksEntry { DailyTasksEntry(date: .now, payload: nil) }
    func getSnapshot(in context: Context, completion: @escaping (DailyTasksEntry) -> Void) {
        completion(DailyTasksEntry(date: .now, payload: load()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyTasksEntry>) -> Void) {
        let now = Date()
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
        completion(Timeline(entries: [DailyTasksEntry(date: now, payload: load())], policy: .after(next)))
    }
}

// Ticks a planner task right on the widget; the app applies it to its own storage on next open.
struct ToggleDailyTaskIntent: AppIntent {
    static var title: LocalizedStringResource = "Отметить дело"
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Дело") var taskId: String
    @Parameter(title: "Дата") var dateKey: String

    init() {}
    init(taskId: String, dateKey: String) {
        self.taskId = taskId
        self.dateKey = dateKey
    }

    func perform() async throws -> some IntentResult {
        guard let defaults = SharedStore.defaults,
              let json = defaults.string(forKey: "dailyTasksWidgetPayload"),
              let data = json.data(using: .utf8),
              var payload = try? JSONDecoder().decode(DailyTaskPayload.self, from: data),
              let dayIndex = payload.days.firstIndex(where: { $0.date == dateKey }),
              let taskIndex = payload.days[dayIndex].tasks.firstIndex(where: { $0.id == taskId }) else { return .result() }

        let newValue = !payload.days[dayIndex].tasks[taskIndex].done
        payload.days[dayIndex].tasks[taskIndex].done = newValue
        if let encoded = try? JSONEncoder().encode(payload),
           let string = String(data: encoded, encoding: .utf8) {
            defaults.set(string, forKey: "dailyTasksWidgetPayload")
        }
        var pending: [String: [String: Bool]] = [:]
        if let stored = defaults.data(forKey: "tasksPendingToggles"),
           let parsed = try? JSONDecoder().decode([String: [String: Bool]].self, from: stored) {
            pending = parsed
        }
        pending[dateKey, default: [:]][taskId] = newValue
        defaults.set(try? JSONEncoder().encode(pending), forKey: "tasksPendingToggles")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyDailyTasksWidget")
        return .result()
    }
}

private struct DailyTasksWidgetView: View {
    let entry: DailyTasksEntry
    @Environment(\.widgetFamily) private var family
    // Same iPhone-style palette as "Моя неделя".
    private let rose = Color(red: 0.94, green: 0.36, blue: 0.58)
    private let ink = Color(red: 0.11, green: 0.11, blue: 0.13)
    private let faded = Color(red: 0.60, green: 0.60, blue: 0.64)
    private let ring = Color(red: 0.76, green: 0.76, blue: 0.80)
    private let tile = Color(red: 0.97, green: 0.965, blue: 0.972)
    private let names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    private var isLarge: Bool { family == .systemLarge }

    private static func key(_ date: Date) -> String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f.string(from: date)
    }
    private var todayKey: String { Self.key(entry.date) }
    private var isSunday: Bool { Calendar.current.component(.weekday, from: entry.date) == 1 }

    private var days: [DailyTaskDay] {
        let cal = Calendar.current
        let weekday = cal.component(.weekday, from: entry.date)
        let monday = cal.date(byAdding: .day, value: -((weekday + 5) % 7), to: cal.startOfDay(for: entry.date)) ?? entry.date
        return (0..<6).map { i in
            let date = cal.date(byAdding: .day, value: i, to: monday) ?? monday
            let key = Self.key(date)
            return entry.payload?.days.first(where: { $0.date == key })
                ?? DailyTaskDay(date: key, label: names[i], tasks: [])
        }
    }

    // Medium: today and tomorrow inside the current Mon–Sat week.
    private var nearDays: [(title: String, day: DailyTaskDay)] {
        let list = days
        guard let start = list.firstIndex(where: { $0.date == todayKey }) else {
            return list.prefix(2).map { (title: $0.label, day: $0) }
        }
        return list[start...].prefix(2).enumerated().map { offset, day in
            (title: offset == 0 ? "Сегодня" : "Завтра", day: day)
        }
    }

    private var all: [DailyTaskItem] { days.flatMap { $0.tasks } }
    private var doneCount: Int { all.filter { $0.done }.count }

    private func addURL(_ date: String?) -> URL {
        URL(string: date.map { "treneraliny://open?tab=tasks&day=\($0)" } ?? "treneraliny://open?tab=tasks")!
    }

    var body: some View {
        VStack(alignment: .leading, spacing: isLarge ? 10 : 8) {
            HStack(spacing: 8) {
                Image(systemName: "checklist")
                    .font(.system(size: isLarge ? 17 : 15, weight: .semibold))
                    .foregroundStyle(rose)
                Text("Планировщик")
                    .font(.system(size: isLarge ? 16 : 15, weight: .medium))
                    .foregroundStyle(ink)
                Spacer(minLength: 4)
                Text("\(doneCount)/\(all.count)")
                    .font(.system(size: 13).monospacedDigit())
                    .foregroundStyle(faded)
                Link(destination: addURL(isSunday ? nil : todayKey)) {
                    Image(systemName: "plus")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Circle().fill(rose))
                }
            }
            if isLarge {
                LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                    ForEach(days) { day in
                        dayTile(title: day.label, day: day, limit: 3, height: 94)
                    }
                }
            } else {
                HStack(spacing: 8) {
                    ForEach(nearDays, id: \.day.date) { item in
                        dayTile(title: item.title, day: item.day, limit: 3, height: 100)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 16)
        .padding(.top, isLarge ? 18 : 15)
        .padding(.bottom, 12)
        .widgetURL(addURL(nil))
        .containerBackground(for: .widget) {
            LinearGradient(colors: [.white, Color(red: 1.0, green: 0.968, blue: 0.98)], startPoint: .top, endPoint: .bottom)
        }
    }

    private func dayTile(title: String, day: DailyTaskDay, limit: Int, height: CGFloat) -> some View {
        let isToday = day.date == todayKey
        return VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(isToday ? rose : ink)
                Spacer()
                if !day.tasks.isEmpty {
                    Text("\(day.tasks.filter { $0.done }.count)/\(day.tasks.count)")
                        .font(.system(size: 11).monospacedDigit())
                        .foregroundStyle(faded)
                }
            }
            .padding(.bottom, 2)
            if day.tasks.isEmpty {
                Link(destination: addURL(day.date)) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus").font(.system(size: 11, weight: .semibold))
                        Text("Добавить").font(.system(size: 12.5))
                    }
                    .foregroundStyle(faded)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Color(red: 0.85, green: 0.85, blue: 0.88), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))
                    )
                }
            } else {
                ForEach(Array(day.tasks.prefix(limit))) { task in
                    Button(intent: ToggleDailyTaskIntent(taskId: task.id, dateKey: day.date)) {
                        HStack(spacing: 6) {
                            taskDot(task)
                            Text(task.title)
                                .font(.system(size: 12.5))
                                .foregroundStyle(task.done ? faded : ink)
                                .strikethrough(task.done, color: faded)
                                .lineLimit(1)
                            Spacer(minLength: 0)
                        }
                        .frame(height: 20)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                Spacer(minLength: 0)
                Link(destination: addURL(day.date)) {
                    HStack(spacing: 4) {
                        if day.tasks.count > limit {
                            Text("ещё \(day.tasks.count - limit)")
                                .font(.system(size: 10.5))
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "plus").font(.system(size: 11, weight: .semibold))
                    }
                    .foregroundStyle(faded)
                    .frame(height: 14)
                    .contentShape(Rectangle())
                }
            }
        }
        .padding(9)
        .frame(maxWidth: .infinity, minHeight: height, maxHeight: height, alignment: .topLeading)
        .background(tile)
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .strokeBorder(isToday ? rose.opacity(0.55) : Color.clear, lineWidth: 1.2)
        )
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private func taskDot(_ task: DailyTaskItem) -> some View {
        ZStack {
            if task.done {
                Circle().fill(rose)
                Image(systemName: "checkmark").font(.system(size: 7, weight: .bold)).foregroundStyle(.white)
            } else {
                Circle().fill(Color.white)
                Circle().strokeBorder(task.overdue == true ? rose : ring, lineWidth: 1.4)
            }
        }
        .frame(width: 15, height: 15)
    }
}
struct TrenerAlinyDailyTasksWidget: Widget {
    let kind = "TrenerAlinyDailyTasksWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DailyTasksProvider()) { entry in
            DailyTasksWidgetView(entry: entry)
        }
        .configurationDisplayName("Мои дела на 6 дней")
        .description("Задачи с понедельника по субботу, отметки и переход прямо к делам.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}


// Список аффирмаций и выбранная сейчас — одна логика и для виджета, и для стрелок.
private enum AffirmationStore {
    // Same defaults as docs/routine.html, so the widget is never stuck on one line.
    static let fallback = [
        "Я очень красивая, ценю свою особенную красоту, люблю и поддерживаю себя в любом ракурсе и любой ситуации!",
        "Я с лёгкостью зарабатываю миллионы рублей.",
        "Я смелая и уверенная, всегда добиваюсь своих целей.",
        "Я всегда управляю своими эмоциями, я осознанна в любой ситуации.",
        "Я открыта ко всему новому, активная и позитивная, легко меняюсь, вижу только лучшее в себе и в других.",
        "У меня красивый коммерческий вокал и крутые треки, которые занимают первые места в чарте ВК.",
        "Я легко нахожу способы заработка, деньги сами идут ко мне.",
        "Я всегда притягиваю всё прекрасное, мне всегда везёт.",
        "Я благодарна за то, что деньги приходят ко мне из множества источников в больших количествах и на постоянной основе.",
        "В этом году я покупаю себе Mercedes CLA."
    ]

    static func read() -> [String] {
        let defaults = SharedStore.defaults
        // The app stores the list on its own key first, so it survives skipped routine syncs.
        var arr = defaults?.stringArray(forKey: "affirmationsList")
        if arr == nil,
           let raw = defaults?.string(forKey: "routineWidgetPayload"),
           let data = raw.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            arr = json["affirmations"] as? [String]
        }
        let list = (arr ?? []).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        return list.isEmpty ? fallback : list
    }

    // Пока стрелки не трогали — аффирмация дня; после — та, что выбрана.
    static func index(count: Int, date: Date) -> Int {
        guard count > 0 else { return 0 }
        let saved = SharedStore.defaults?.object(forKey: "affirmationSelectedIndex") as? Int
            ?? (Calendar.current.ordinality(of: .day, in: .era, for: date) ?? 0)
        return ((saved % count) + count) % count
    }
}

private struct AffirmationEntry: TimelineEntry {
    let date: Date
    let affirmations: [String]
    let index: Int
}
private struct AffirmationProvider: TimelineProvider {
    private func entry(_ date: Date) -> AffirmationEntry {
        let list = AffirmationStore.read()
        return AffirmationEntry(date: date, affirmations: list, index: AffirmationStore.index(count: list.count, date: date))
    }
    func placeholder(in context: Context) -> AffirmationEntry {
        AffirmationEntry(date: .now, affirmations: AffirmationStore.fallback, index: 0)
    }
    func getSnapshot(in context: Context, completion: @escaping (AffirmationEntry) -> Void) {
        completion(entry(.now))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<AffirmationEntry>) -> Void) {
        let now = Date()
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: now) ?? now.addingTimeInterval(21600)
        completion(Timeline(entries: [entry(now)], policy: .after(next)))
    }
}
struct ChangeAffirmationIntent: AppIntent {
    static var title: LocalizedStringResource = "Листать аффирмации"
    static var openAppWhenRun: Bool = false
    @Parameter(title: "Направление") var direction: Int
    init() {}
    init(direction: Int) { self.direction = direction }
    func perform() async throws -> some IntentResult {
        guard let defaults = SharedStore.defaults else { return .result() }
        let count = AffirmationStore.read().count
        let current = AffirmationStore.index(count: count, date: Date())
        defaults.set((current + direction + count) % count, forKey: "affirmationSelectedIndex")
        WidgetCenter.shared.reloadTimelines(ofKind: "TrenerAlinyAffirmationWidget")
        return .result()
    }
}
private struct AffirmationWidgetView: View {
    let entry: AffirmationEntry
    @Environment(\.widgetFamily) private var family
    private let rose = Color(red: 0.94, green: 0.36, blue: 0.58)
    private let ink = Color(red: 0.13, green: 0.11, blue: 0.14)
    private let faded = Color(red: 0.60, green: 0.58, blue: 0.63)
    private var isLarge: Bool { family == .systemLarge }
    private var count: Int { max(1, entry.affirmations.count) }
    private var quote: String { entry.affirmations.indices.contains(entry.index) ? entry.affirmations[entry.index] : "Сегодня я выбираю действовать." }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Image(systemName: "sparkle")
                    .font(.system(size: 10, weight: .bold))
                Text("АФФИРМАЦИЯ ДНЯ")
                    .font(.system(size: 10.5, weight: .semibold))
                    .tracking(1.2)
                Spacer(minLength: 4)
                arrow("chevron.left", direction: -1)
                arrow("chevron.right", direction: 1)
            }
            .foregroundStyle(rose)

            Spacer(minLength: 6)
            ZStack(alignment: .topLeading) {
                Text("“")
                    .font(.system(size: isLarge ? 74 : 54, weight: .bold, design: .serif))
                    .foregroundStyle(rose.opacity(0.18))
                    .offset(x: -4, y: isLarge ? -26 : -20)
                Text(quote)
                    .font(.system(size: isLarge ? 24 : 18, weight: .regular, design: .serif))
                    .foregroundStyle(ink)
                    .lineSpacing(2)
                    .lineLimit(isLarge ? 9 : 4)
                    .minimumScaleFactor(0.62)
                    .padding(.leading, isLarge ? 16 : 12)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            Spacer(minLength: 6)

            HStack(spacing: 4) {
                ForEach(0..<min(count, 12), id: \.self) { i in
                    Capsule()
                        .fill(i == entry.index % 12 ? rose : Color(red: 0.88, green: 0.86, blue: 0.89))
                        .frame(width: i == entry.index % 12 ? 14 : 5, height: 5)
                }
                Spacer(minLength: 4)
                Text("\(entry.index + 1) из \(count)")
                    .font(.system(size: 11).monospacedDigit())
                    .foregroundStyle(faded)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetURL(URL(string: "treneraliny://open?tab=routine"))
        .containerBackground(for: .widget) {
            ZStack {
                Color.white
                RadialGradient(colors: [Color(red: 1.0, green: 0.86, blue: 0.91).opacity(0.75), .clear],
                               center: .bottomTrailing, startRadius: 0, endRadius: 230)
                RadialGradient(colors: [Color(red: 0.93, green: 0.90, blue: 1.0).opacity(0.7), .clear],
                               center: .topLeading, startRadius: 0, endRadius: 190)
            }
        }
    }

    private func arrow(_ symbol: String, direction: Int) -> some View {
        Button(intent: ChangeAffirmationIntent(direction: direction)) {
            Image(systemName: symbol)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(ink.opacity(0.65))
                .frame(width: 24, height: 24)
                .background(Circle().fill(Color.white.opacity(0.85)))
                .overlay(Circle().strokeBorder(Color(red: 0.90, green: 0.88, blue: 0.91), lineWidth: 0.8))
        }
        .buttonStyle(.plain)
    }
}

struct TrenerAlinyAffirmationWidget: Widget {
    let kind = "TrenerAlinyAffirmationWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: AffirmationProvider()) { entry in
            AffirmationWidgetView(entry: entry)
        }
        .configurationDisplayName("Мои аффирмации ✿")
        .description("Твои собственные аффирмации, новая каждый день.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

private struct ProjectRow: Decodable, Identifiable {
    let id: String
    let name: String
    let icon: String
    let total: Int
    let done: Int
    let top: [String]
}
private struct ProjectPayload: Decodable { let projects: [ProjectRow] }
private struct ProjectsEntry: TimelineEntry {
    let date: Date
    let projects: [ProjectRow]
}
private struct ProjectsProvider: TimelineProvider {
    func read() -> [ProjectRow] {
        guard let json = SharedStore.defaults?.string(forKey: "projectsWidgetPayload"),
              let data = json.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(ProjectPayload.self, from: data) else { return [] }
        return parsed.projects
    }
    func placeholder(in context: Context) -> ProjectsEntry { ProjectsEntry(date: .now, projects: []) }
    func getSnapshot(in context: Context, completion: @escaping (ProjectsEntry) -> Void) {
        completion(ProjectsEntry(date: .now, projects: read()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ProjectsEntry>) -> Void) {
        completion(Timeline(entries: [ProjectsEntry(date: .now, projects: read())], policy: .after(Date().addingTimeInterval(1800))))
    }
}
private struct ProjectsWidgetView: View {
    let entry: ProjectsEntry
    @Environment(\.widgetFamily) private var family
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("📁 МОИ ПРОЕКТЫ").font(.system(size: 13, weight: .bold))
                Spacer()
                Text("20/80").font(.system(size: 12, weight: .bold)).foregroundStyle(.pink)
            }
            ForEach(Array(entry.projects.prefix(family == .systemLarge ? 4 : 3))) { p in
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 5) {
                        Text(p.icon)
                        Text(p.name).lineLimit(1)
                        Spacer(minLength: 2)
                        Text(String(p.done) + "/" + String(p.total)).foregroundStyle(.pink)
                    }.font(.system(size: 11, weight: .semibold))
                    ProgressView(value: Double(p.done), total: Double(max(1,p.total))).tint(.pink)
                    if family == .systemLarge, let task = p.top.first {
                        Text("→ " + task).font(.system(size: 10)).lineLimit(1).foregroundStyle(.secondary)
                    }
                }
            }
            if entry.projects.isEmpty {
                Text("Открой раздел «Проекты»").font(.system(size: 12)).foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
            Text("Результат важнее идеала").font(.system(size: 10)).foregroundStyle(.pink)
        }
        .padding(13)
        .widgetURL(URL(string: "treneraliny://open?tab=projects"))
        .containerBackground(for: .widget) { Color(red: 0.99, green: 0.96, blue: 0.97) }
    }
}
struct TrenerAlinyProjectsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TrenerAlinyProjectsWidget", provider: ProjectsProvider()) { entry in
            ProjectsWidgetView(entry: entry)
        }
        .configurationDisplayName("Мои проекты · 20/80")
        .description("Проекты, задачи и прогресс")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

private struct GoalRow: Decodable, Identifiable {
    let id: String
    let name: String
    let period: String
    let done: Int
    let total: Int
}
private struct GoalsPayload: Decodable { let goals: [GoalRow] }
private struct GoalsEntry: TimelineEntry {
    let date: Date
    let goals: [GoalRow]
}
private struct GoalsProvider: TimelineProvider {
    func read() -> [GoalRow] {
        guard let json = SharedStore.defaults?.string(forKey: "projectsWidgetPayload"),
              let data = json.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(GoalsPayload.self, from: data) else { return [] }
        return parsed.goals
    }
    func placeholder(in context: Context) -> GoalsEntry { GoalsEntry(date: .now, goals: []) }
    func getSnapshot(in context: Context, completion: @escaping (GoalsEntry) -> Void) {
        completion(GoalsEntry(date: .now, goals: read()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<GoalsEntry>) -> Void) {
        completion(Timeline(entries: [GoalsEntry(date: .now, goals: read())], policy: .after(Date().addingTimeInterval(1800))))
    }
}
private struct GoalsWidgetView: View {
    let entry: GoalsEntry
    @Environment(\.widgetFamily) private var family
    private let ink = Color(red: 0.11, green: 0.11, blue: 0.13)
    private let faded = Color(red: 0.60, green: 0.60, blue: 0.64)
    private let track = Color(red: 0.94, green: 0.93, blue: 0.95)
    private let palette = [
        Color(red: 0.94, green: 0.36, blue: 0.58),
        Color(red: 1.0, green: 0.62, blue: 0.48),
        Color(red: 0.66, green: 0.55, blue: 1.0),
        Color(red: 0.36, green: 0.74, blue: 0.67),
        Color(red: 0.98, green: 0.76, blue: 0.30),
        Color(red: 0.45, green: 0.62, blue: 0.95)
    ]
    private var isLarge: Bool { family == .systemLarge }
    private var shown: [GoalRow] { Array(entry.goals.prefix(isLarge ? 6 : 3)) }

    var body: some View {
        VStack(alignment: .leading, spacing: isLarge ? 16 : 10) {
            HStack(spacing: 8) {
                Image(systemName: "target")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(palette[0])
                Text("Мои цели")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(ink)
                Spacer()
                if let period = entry.goals.first?.period {
                    Text(period)
                        .font(.system(size: 12))
                        .foregroundStyle(faded)
                }
            }
            if entry.goals.isEmpty {
                Spacer(minLength: 0)
                Text("Добавь первую цель в Планировщике")
                    .font(.system(size: 13))
                    .foregroundStyle(faded)
                    .frame(maxWidth: .infinity)
                Spacer(minLength: 0)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3),
                          alignment: .center, spacing: isLarge ? 18 : 0) {
                    ForEach(Array(shown.enumerated()), id: \.element.id) { index, goal in
                        goalCell(goal, color: palette[index % palette.count])
                    }
                }
                Spacer(minLength: 0)
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 16)
        .padding(.bottom, 12)
        .widgetURL(URL(string: "treneraliny://open?tab=goals"))
        .containerBackground(for: .widget) {
            LinearGradient(colors: [.white, Color(red: 1.0, green: 0.968, blue: 0.98)], startPoint: .top, endPoint: .bottom)
        }
    }

    private func goalCell(_ goal: GoalRow, color: Color) -> some View {
        let progress = goal.total > 0 ? Double(goal.done) / Double(goal.total) : 0
        return VStack(spacing: 6) {
            ZStack {
                Circle().stroke(track, lineWidth: 6)
                Circle()
                    .trim(from: 0, to: max(0.001, progress))
                    .stroke(color, style: StrokeStyle(lineWidth: 6, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .opacity(goal.total > 0 ? 1 : 0)
                Text(goal.total > 0 ? "\(goal.done)/\(goal.total)" : "0%")
                    .font(.system(size: 13, weight: .semibold).monospacedDigit())
                    .foregroundStyle(ink)
                    .minimumScaleFactor(0.7)
                    .padding(6)
            }
            .frame(width: 50, height: 50)
            Text(goal.name)
                .font(.system(size: 11))
                .foregroundStyle(ink)
                .multilineTextAlignment(.center)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .frame(maxWidth: .infinity)
        }
    }
}
struct TrenerAlinyGoalsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TrenerAlinyGoalsWidget", provider: GoalsProvider()) { entry in
            GoalsWidgetView(entry: entry)
        }
        .configurationDisplayName("Мои цели 🎯")
        .description("Цели на месяц, квартал и год")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

@main
struct TrenerAlinyWidgetBundle: WidgetBundle {
    var body: some Widget {
        TrenerAlinyWidget()
        TrenerAlinyCaloriesWidget()
        TrenerAlinyRoutineWidget()
        TrenerAlinyDailyTasksWidget()
        TrenerAlinyAffirmationWidget()
        TrenerAlinyProjectsWidget()
        TrenerAlinyGoalsWidget()
    }
}
