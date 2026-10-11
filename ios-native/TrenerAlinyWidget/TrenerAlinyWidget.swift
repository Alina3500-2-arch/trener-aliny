import SwiftUI
import WidgetKit
import AppIntents

let widgetEndpoint = "https://trener-aliny-widget.alina-3500-2.workers.dev/widget/aline"

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

// MARK: - Дизайн: шрифт SF (системный, как у виджетов Apple), цифры — SF Rounded,
// одна розовая палитра со светлой и тёмной темой.

struct Palette {
    let dark: Bool
    init(_ scheme: ColorScheme) { dark = scheme == .dark }

    var accent: Color { dark ? Color(red: 1.0, green: 0.42, blue: 0.62) : Color(red: 0.92, green: 0.22, blue: 0.47) }
    var accentSoft: Color { accent.opacity(dark ? 0.22 : 0.12) }
    var background: Color { dark ? Color(red: 0.11, green: 0.11, blue: 0.12) : .white }
    var card: Color { dark ? Color(white: 1, opacity: 0.07) : Color(red: 0.97, green: 0.955, blue: 0.965) }
    var ink: Color { dark ? .white : Color(red: 0.10, green: 0.10, blue: 0.11) }
    var secondary: Color { dark ? Color(white: 0.92, opacity: 0.62) : Color(red: 0.24, green: 0.24, blue: 0.27, opacity: 0.62) }
    var tertiary: Color { dark ? Color(white: 0.92, opacity: 0.30) : Color(red: 0.24, green: 0.24, blue: 0.27, opacity: 0.28) }
    var track: Color { dark ? Color(white: 1, opacity: 0.12) : Color(white: 0, opacity: 0.07) }
    var danger: Color { dark ? Color(red: 1.0, green: 0.43, blue: 0.40) : Color(red: 0.90, green: 0.24, blue: 0.22) }
    var success: Color { dark ? Color(red: 0.25, green: 0.84, blue: 0.42) : Color(red: 0.16, green: 0.70, blue: 0.33) }
}

enum Typo {
    static let header = Font.system(size: 13, weight: .semibold)
    static let caption = Font.system(size: 11, weight: .medium)
    static let micro = Font.system(size: 10, weight: .semibold)
    static func body(_ size: CGFloat = 13) -> Font { .system(size: size, weight: .medium) }
    static func strong(_ size: CGFloat = 13) -> Font { .system(size: size, weight: .semibold) }
    static func number(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font { .system(size: size, weight: weight, design: .rounded) }
}

enum TextFormat {
    static func sentence(_ s: String) -> String {
        let lower = s.lowercased()
        return lower.prefix(1).uppercased() + lower.dropFirst()
    }

    static func relativeDay(_ date: Date, now: Date) -> String {
        let cal = Calendar.current
        if cal.isDate(date, inSameDayAs: now) { return "Сегодня" }
        if let tomorrow = cal.date(byAdding: .day, value: 1, to: now), cal.isDate(date, inSameDayAs: tomorrow) { return "Завтра" }
        let f = DateFormatter()
        f.locale = Locale(identifier: "ru_RU")
        f.dateFormat = "EEEE, d"
        return sentence(f.string(from: date))
    }

    static func dayNumber(_ key: String) -> String {
        String(Int(key.suffix(2)) ?? 0)
    }
}

// Заголовок виджета в стиле Apple: значок и название цветом акцента.
struct WidgetHeader: View {
    let icon: String
    let title: String
    var trailing: String? = nil
    let palette: Palette

    var body: some View {
        HStack(spacing: 5) {
            Image(systemName: icon)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(palette.accent)
            Text(title)
                .font(Typo.header)
                .foregroundStyle(palette.accent)
            Spacer(minLength: 4)
            if let trailing {
                Text(trailing)
                    .font(Typo.number(13, .semibold))
                    .monospacedDigit()
                    .foregroundStyle(palette.secondary)
            }
        }
        .lineLimit(1)
        .widgetAccentable()
    }
}

struct ProgressBar: View {
    let value: Double
    let palette: Palette
    var height: CGFloat = 5

    var body: some View {
        GeometryReader { g in
            Capsule().fill(palette.track)
                .overlay(alignment: .leading) {
                    Capsule().fill(palette.accent)
                        .frame(width: max(value > 0 ? height : 0, g.size.width * CGFloat(min(max(value, 0), 1))))
                }
        }
        .frame(height: height)
    }
}

extension View {
    // В снимках для проверки дизайна containerBackground не рисуется — подменяем фоном.
    func widgetBackground<B: View>(@ViewBuilder _ background: () -> B) -> some View {
        #if SNAPSHOT
        self.background(background())
        #else
        self.containerBackground(for: .widget, content: background)
        #endif
    }
}

#if SNAPSHOT
struct SnapshotFamilyKey: EnvironmentKey { static let defaultValue: WidgetFamily = .systemMedium }
extension EnvironmentValues {
    var snapshotFamily: WidgetFamily {
        get { self[SnapshotFamilyKey.self] }
        set { self[SnapshotFamilyKey.self] = newValue }
    }
}
#endif

// MARK: - Тренировка и калории

struct CalorieDay: Codable, Identifiable {
    let date: String
    let label: String
    let kcal: Int
    let actualKcal: Int
    let complete: Bool
    var id: String { date }
}

struct WidgetPayload: Codable {
    let nextDate: TimeInterval?
    let title: String?
    let durationMinutes: Int?
    let workoutDays: [Int]?
    let calorieTarget: Int?
    let todayKcal: Int?
    let calorieDays: [CalorieDay]?
}

struct WorkoutEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct WorkoutProvider: TimelineProvider {
    func placeholder(in context: Context) -> WorkoutEntry {
        WorkoutEntry(date: .now, payload: Self.samplePayload)
    }

    func getSnapshot(in context: Context, completion: @escaping (WorkoutEntry) -> Void) {
        let payload = loadLocal() ?? loadFromCache()
        completion(WorkoutEntry(date: .now, payload: payload ?? (context.isPreview ? Self.samplePayload : nil)))
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

    // Пример для галереи виджетов (и снимков дизайна): текущая неделя.
    static var samplePayload: WidgetPayload {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        let monday = cal.date(byAdding: .day, value: -((cal.component(.weekday, from: today) + 5) % 7), to: today)!
        let labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"]
        let kcal = [1640, 1820, 1380, 1550, 1710, 1460, 1240]
        let todayIndex = (cal.component(.weekday, from: today) + 5) % 7
        let days = (0..<7).map { i -> CalorieDay in
            let date = cal.date(byAdding: .day, value: i, to: monday)!
            let value = i < todayIndex ? kcal[i] : (i == todayIndex ? 1240 : 0)
            return CalorieDay(date: RoutineWeek.key(date), label: labels[i], kcal: value, actualKcal: value, complete: i != 2)
        }
        return WidgetPayload(
            nextDate: cal.date(byAdding: .day, value: 1, to: .now)!.timeIntervalSince1970,
            title: "ЯГОДИЦЫ И НОГИ",
            durationMinutes: 50,
            workoutDays: [1, 3, 6],
            calorieTarget: 1700,
            todayKcal: 1240,
            calorieDays: days
        )
    }
}

func cachePayload(_ payload: WidgetPayload) {
    guard let data = try? JSONEncoder().encode(payload),
          let json = String(data: data, encoding: .utf8) else { return }
    SharedStore.defaults?.set(json, forKey: "widgetPayloadCache")
}

struct WeekDay: Identifiable {
    let date: Date
    let jsWeekday: Int
    let letter: String
    var id: Date { date }
}

struct TrenerWidgetView: View {
    let entry: WorkoutEntry
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }

    private var payload: WidgetPayload? { entry.payload }
    // Устаревшая дата (тренировка уже прошла, а приложение не открывали) — не показываем.
    private var nextDate: Date? {
        guard let ts = payload?.nextDate else { return nil }
        let date = Date(timeIntervalSince1970: ts)
        return date >= Calendar.current.startOfDay(for: entry.date) ? date : nil
    }

    private var week: [WeekDay] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: entry.date)
        let monday = cal.date(byAdding: .day, value: -((cal.component(.weekday, from: today) + 5) % 7), to: today)!
        let letters = ["П", "В", "С", "Ч", "П", "С", "В"]
        return (0..<7).map { offset in
            WeekDay(date: cal.date(byAdding: .day, value: offset, to: monday)!, jsWeekday: (offset + 1) % 7, letter: letters[offset])
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeader(icon: "figure.strengthtraining.traditional", title: "Тренировка",
                         trailing: nextDate != nil ? payload?.durationMinutes.map { "≈ \($0) мин" } : nil, palette: p)
            Spacer(minLength: 4)
            if let nextDate {
                Text(TextFormat.relativeDay(nextDate, now: entry.date))
                    .font(Typo.number(24))
                    .foregroundStyle(p.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text(TextFormat.sentence(payload?.title ?? "Тренировка"))
                    .font(Typo.body(13))
                    .foregroundStyle(p.secondary)
                    .lineLimit(1)
            } else {
                Text("Нет плана")
                    .font(Typo.number(22))
                    .foregroundStyle(p.ink)
                Text("Выбери дни тренировок в приложении")
                    .font(Typo.body(12))
                    .foregroundStyle(p.secondary)
                    .lineLimit(1)
            }
            Spacer(minLength: 6)
            HStack(spacing: 0) {
                ForEach(week) { day in
                    let cal = Calendar.current
                    let isNext = nextDate.map { cal.isDate(day.date, inSameDayAs: $0) } ?? false
                    let isToday = cal.isDate(day.date, inSameDayAs: entry.date)
                    let hasWorkout = payload?.workoutDays?.contains(day.jsWeekday) ?? false
                    VStack(spacing: 3) {
                        Text(day.letter)
                            .font(Typo.micro)
                            .foregroundStyle(isToday ? p.accent : p.tertiary)
                        Text("\(cal.component(.day, from: day.date))")
                            .font(Typo.number(13, .semibold))
                            .monospacedDigit()
                            .foregroundStyle(isNext ? .white : (isToday ? p.accent : p.ink))
                            .frame(width: 26, height: 26)
                            .background {
                                Circle().fill(isNext ? p.accent : (isToday ? p.accentSoft : .clear))
                            }
                        Circle()
                            .fill(hasWorkout ? p.accent : .clear)
                            .frame(width: 4, height: 4)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=workout"))
        .widgetBackground { p.background }
    }
}

struct TrenerAlinyWidget: Widget {
    let kind = "TrenerAlinyWorkoutWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutProvider()) { entry in
            TrenerWidgetView(entry: entry)
        }
        .configurationDisplayName("Следующая тренировка")
        .description("Ближайшая тренировка и расписание недели.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

struct CalorieWidgetView: View {
    let entry: WorkoutEntry
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }

    private var target: Int { max(entry.payload?.calorieTarget ?? 1700, 1) }
    private var today: Int { max(entry.payload?.todayKcal ?? 0, 0) }
    private var days: [CalorieDay] { entry.payload?.calorieDays ?? [] }
    private var isOver: Bool { today > target }
    private var todayKey: String { RoutineWeek.key(entry.date) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(icon: "flame.fill", title: "Калории", trailing: "цель \(target)", palette: p)
            HStack(alignment: .center, spacing: 16) {
                ring
                VStack(alignment: .leading, spacing: 6) {
                    Text(isOver ? "Перебор \(today - target)" : "Осталось \(target - today)")
                        .font(Typo.strong(13))
                        .foregroundStyle(isOver ? p.danger : p.ink)
                        .lineLimit(1)
                    chart
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=today"))
        .widgetBackground { p.background }
    }

    private var ring: some View {
        ZStack {
            Circle().stroke(p.track, lineWidth: 9)
            Circle()
                .trim(from: 0, to: CGFloat(min(Double(today) / Double(target), 1)))
                .stroke(isOver ? p.danger : p.accent, style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))
            VStack(spacing: -1) {
                Text("\(today)")
                    .font(Typo.number(20))
                    .monospacedDigit()
                    .foregroundStyle(isOver ? p.danger : p.ink)
                    .minimumScaleFactor(0.6)
                Text("ккал")
                    .font(Typo.micro)
                    .foregroundStyle(p.secondary)
            }
            .padding(.horizontal, 10)
        }
        .frame(width: 84, height: 84)
    }

    private var chart: some View {
        GeometryReader { g in
            let labelHeight: CGFloat = 14
            let chartHeight = max(g.size.height - labelHeight, 1)
            let maximum = max(Double(target) * 1.25, Double(days.map(\.kcal).max() ?? target), 1)
            ZStack(alignment: .topLeading) {
                // Линия нормы
                Path { path in
                    let y = chartHeight * (1 - CGFloat(Double(target) / maximum))
                    path.move(to: CGPoint(x: 0, y: y))
                    path.addLine(to: CGPoint(x: g.size.width, y: y))
                }
                .stroke(p.secondary.opacity(0.5), style: StrokeStyle(lineWidth: 1, dash: [3, 3]))

                HStack(alignment: .bottom, spacing: 6) {
                    ForEach(days) { day in
                        VStack(spacing: 3) {
                            Spacer(minLength: 0)
                            RoundedRectangle(cornerRadius: 3, style: .continuous)
                                .fill(barColor(day))
                                .frame(height: day.kcal > 0 ? max(4, chartHeight * CGFloat(Double(day.kcal) / maximum)) : 3)
                            Text(day.label)
                                .font(.system(size: 9, weight: day.date == todayKey ? .bold : .medium))
                                .foregroundStyle(day.date == todayKey ? p.accent : p.tertiary)
                                .frame(height: labelHeight - 3)
                        }
                        .frame(maxWidth: .infinity)
                    }
                }
            }
        }
    }

    private func barColor(_ day: CalorieDay) -> Color {
        if day.kcal == 0 { return p.track }
        if day.kcal > target { return p.danger }
        return day.complete ? p.accent : p.accent.opacity(0.35)
    }
}

struct TrenerAlinyCaloriesWidget: Widget {
    let kind = "TrenerAlinyCaloriesWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WorkoutProvider()) { entry in
            CalorieWidgetView(entry: entry)
        }
        .configurationDisplayName("Калории за неделю")
        .description("Калории за день, норма и перебор за неделю.")
        .supportedFamilies([.systemMedium])
        .contentMarginsDisabled()
    }
}

// MARK: - Мой режим

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

struct RoutineHabit: Codable {
    let id: String
    let done: Bool
}

struct RoutinePayload: Codable {
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

struct RoutineWeekHabit: Codable {
    let id: String
    let planned: Bool
    var done: Bool
}
struct RoutineWeekDay: Codable {
    let date: String
    var habits: [RoutineWeekHabit]
}

// Shared schedule: renders checkboxes even before the web tracker has ever synced.
enum RoutineWeek {
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

struct RoutineEntry: TimelineEntry {
    let date: Date
    let payload: RoutinePayload?
}

struct RoutineProvider: TimelineProvider {
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

struct RoutineWidgetView: View {
    let entry: RoutineEntry
    #if SNAPSHOT
    @Environment(\.snapshotFamily) private var family
    #else
    @Environment(\.widgetFamily) private var family
    #endif
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }

    private let labels: [(String, String)] = [
        ("wake", "Подъём 06:30"), ("affirm", "Аффирмации"),
        ("read", "20 страниц"), ("food", "Учёт питания"),
        ("gym", "Спортзал"), ("motivation", "Мотивация"), ("ai", "Обучение ИИ")
    ]
    private let letters = ["П", "В", "С", "Ч", "П", "С", "♡"]

    private var today: String { RoutineWeek.key(entry.date) }
    private var week: [RoutineWeekDay] { RoutineWeek.merged(entry.payload, date: entry.date) }
    private var weekPlanned: [RoutineWeekHabit] { week.flatMap { $0.habits }.filter { $0.planned } }
    private var weekDone: Int { weekPlanned.filter { $0.done }.count }
    private var weekPct: Int { weekPlanned.isEmpty ? 0 : Int((Double(weekDone) * 100 / Double(weekPlanned.count)).rounded()) }
    private var todayHabits: [RoutineWeekHabit] { week.first(where: { $0.date == today })?.habits.filter { $0.planned } ?? [] }
    private var todayPct: Int { todayHabits.isEmpty ? 0 : Int((Double(todayHabits.filter { $0.done }.count) * 100 / Double(todayHabits.count)).rounded()) }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            switch family {
            case .systemSmall: small
            case .systemLarge: large
            default: medium
            }
        }
        .padding(family == .systemLarge ? 16 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=routine"))
        .widgetBackground { p.background }
    }

    private var small: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeader(icon: "sparkles", title: "Режим", trailing: "\(todayPct)%", palette: p)
            Spacer(minLength: 6)
            VStack(alignment: .leading, spacing: 7) {
                ForEach(0..<4, id: \.self) { idx in
                    let id = labels[idx].0
                    let habit = week.first(where: { $0.date == today })?.habits.first(where: { $0.id == id })
                    HStack(spacing: 8) {
                        cell(id: id, date: today, planned: habit?.planned ?? false, done: habit?.done ?? false, size: 18, box: 20)
                        Text(labels[idx].1)
                            .font(Typo.body(12))
                            .foregroundStyle(habit?.done == true ? p.secondary : p.ink)
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                }
            }
        }
    }

    private var medium: some View {
        VStack(alignment: .leading, spacing: 6) {
            WidgetHeader(icon: "sparkles", title: "Моя неделя", trailing: "\(weekPct)%", palette: p)
            grid(rows: 4, cellSize: 18, rowHeight: 22, labelFont: Typo.body(12))
        }
    }

    private var large: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(icon: "sparkles", title: "Моя неделя", trailing: "\(weekPct)%", palette: p)
            ProgressBar(value: Double(weekPct) / 100, palette: p, height: 4)
            grid(rows: 7, cellSize: 22, rowHeight: 34, labelFont: Typo.body(13))
            Spacer(minLength: 0)
            HStack {
                Text("\(weekDone) из \(weekPlanned.count) отметок")
                Spacer()
                Text("♡ воскресенье — для себя")
            }
            .font(Typo.caption)
            .foregroundStyle(p.secondary)
        }
    }

    private func grid(rows: Int, cellSize: CGFloat, rowHeight: CGFloat, labelFont: Font) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: 0) {
                Spacer(minLength: 0)
                ForEach(0..<7, id: \.self) { i in
                    Text(letters[i])
                        .font(Typo.micro)
                        .foregroundStyle(week[i].date == today ? p.accent : p.tertiary)
                        .frame(width: 27)
                }
            }
            .padding(.bottom, 2)
            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: 0) {
                    Text(labels[row].1)
                        .font(labelFont)
                        .foregroundStyle(p.ink)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ForEach(0..<7, id: \.self) { col in
                        let day = week[col]
                        let habit = day.habits.first(where: { $0.id == labels[row].0 })
                        cell(id: labels[row].0, date: day.date,
                             planned: habit?.planned ?? false,
                             done: habit?.done ?? false, size: cellSize, box: 27)
                    }
                }
                .frame(height: rowHeight)
            }
        }
    }

    @ViewBuilder
    private func cell(id: String, date: String, planned: Bool, done: Bool, size: CGFloat, box: CGFloat) -> some View {
        let mark = ZStack {
            if !planned {
                Circle().fill(p.track).frame(width: 4, height: 4)
            } else if done {
                Circle().fill(p.accent)
                Image(systemName: "checkmark")
                    .font(.system(size: size * 0.5, weight: .bold))
                    .foregroundStyle(.white)
            } else if date < today {
                Circle().strokeBorder(p.danger.opacity(0.45), lineWidth: 1.5)
                Image(systemName: "xmark")
                    .font(.system(size: size * 0.38, weight: .bold))
                    .foregroundStyle(p.danger.opacity(0.7))
            } else {
                Circle().strokeBorder(date == today ? p.accent.opacity(0.55) : p.tertiary, lineWidth: 1.5)
            }
        }
        .frame(width: size, height: size)

        if planned && date <= today {
            Button(intent: ToggleRoutineHabitIntent(habitId: id, dateKey: date)) {
                mark.frame(width: box, height: max(box, size + 6)).contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        } else {
            mark.frame(width: box, height: max(box, size + 6))
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

// MARK: - Планировщик

struct DailyTaskItem: Codable, Identifiable {
    let id: String
    let title: String
    let done: Bool
    let overdue: Bool?
}
struct DailyTaskDay: Codable, Identifiable {
    let date: String
    let label: String
    let tasks: [DailyTaskItem]
    var id: String { date }
}
struct DailyTaskPayload: Codable {
    let days: [DailyTaskDay]
}
struct DailyTasksEntry: TimelineEntry {
    let date: Date
    let payload: DailyTaskPayload?
}
struct DailyTasksProvider: TimelineProvider {
    private func load() -> DailyTaskPayload? {
        guard let json = SharedStore.defaults?.string(forKey: "dailyTasksWidgetPayload"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(DailyTaskPayload.self, from: data)
    }
    func placeholder(in context: Context) -> DailyTasksEntry { DailyTasksEntry(date: .now, payload: Self.sample) }
    func getSnapshot(in context: Context, completion: @escaping (DailyTasksEntry) -> Void) {
        completion(DailyTasksEntry(date: .now, payload: load() ?? (context.isPreview ? Self.sample : nil)))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DailyTasksEntry>) -> Void) {
        let now = Date()
        let next = Calendar.current.date(byAdding: .minute, value: 30, to: now) ?? now.addingTimeInterval(1800)
        completion(Timeline(entries: [DailyTasksEntry(date: now, payload: load())], policy: .after(next)))
    }

    static var sample: DailyTaskPayload {
        let cal = Calendar.current
        let today = cal.startOfDay(for: .now)
        let monday = cal.date(byAdding: .day, value: -((cal.component(.weekday, from: today) + 5) % 7), to: today)!
        let names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
        let tasks: [[(String, Bool, Bool)]] = [
            [("Сторис про запуск", true, false), ("Созвон с Ильёй", true, false)],
            [("Отчёт по рекламе", false, true), ("Спортзал", true, false), ("Письмо клиенту", false, false)],
            [("Контент-план", false, false)],
            [],
            [("Записаться к врачу", false, false), ("Прочитать главу", false, false)],
            [("Уборка", false, false)]
        ]
        return DailyTaskPayload(days: (0..<6).map { i in
            let date = cal.date(byAdding: .day, value: i, to: monday)!
            return DailyTaskDay(date: RoutineWeek.key(date), label: names[i], tasks: tasks[i].enumerated().map {
                DailyTaskItem(id: "\(i)-\($0.offset)", title: $0.element.0, done: $0.element.1, overdue: $0.element.2)
            })
        })
    }
}

struct DailyTasksWidgetView: View {
    let entry: DailyTasksEntry
    #if SNAPSHOT
    @Environment(\.snapshotFamily) private var family
    #else
    @Environment(\.widgetFamily) private var family
    #endif
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }
    private let names = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]

    private var todayKey: String { RoutineWeek.key(entry.date) }
    private var days: [DailyTaskDay] {
        let cal = Calendar.current
        let monday = cal.date(byAdding: .day, value: -((cal.component(.weekday, from: entry.date) + 5) % 7), to: cal.startOfDay(for: entry.date)) ?? entry.date
        return (0..<6).map { i in
            let key = RoutineWeek.key(cal.date(byAdding: .day, value: i, to: monday) ?? monday)
            return entry.payload?.days.first(where: { $0.date == key })
                ?? DailyTaskDay(date: key, label: names[i], tasks: [])
        }
    }
    private var all: [DailyTaskItem] { days.flatMap { $0.tasks } }
    private var isLarge: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            WidgetHeader(icon: "checklist", title: "Планировщик",
                         trailing: "\(all.filter { $0.done }.count) из \(all.count)", palette: p)
            let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: isLarge ? 2 : 3)
            LazyVGrid(columns: columns, spacing: 6) {
                ForEach(days) { day in
                    Link(destination: URL(string: "treneraliny://open?tab=tasks&day=\(day.date)")!) {
                        dayCard(day)
                    }
                }
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=tasks"))
        .widgetBackground { p.background }
    }

    private func dayCard(_ day: DailyTaskDay) -> some View {
        let isToday = day.date == todayKey
        let shown = Array(day.tasks.sorted { !$0.done && $1.done }.prefix(isLarge ? 3 : 1))
        return VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Text(day.label)
                    .font(Typo.strong(12))
                Text(TextFormat.dayNumber(day.date))
                    .font(Typo.number(12, .semibold))
                Spacer(minLength: 2)
                if !day.tasks.isEmpty {
                    Text("\(day.tasks.filter { $0.done }.count)/\(day.tasks.count)")
                        .font(Typo.number(10, .semibold))
                        .monospacedDigit()
                        .foregroundStyle(isToday ? Color.white.opacity(0.85) : p.secondary)
                }
            }
            .foregroundStyle(isToday ? .white : p.ink)
            ForEach(shown) { task in
                HStack(spacing: 4) {
                    Image(systemName: task.done ? "checkmark.circle.fill" : (task.overdue == true ? "exclamationmark.circle.fill" : "circle"))
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(taskColor(task, onAccent: isToday))
                    Text(task.title)
                        .font(Typo.body(11))
                        .strikethrough(task.done, color: isToday ? .white.opacity(0.6) : p.tertiary)
                        .foregroundStyle(isToday ? .white.opacity(task.done ? 0.7 : 1) : (task.done ? p.secondary : p.ink))
                        .lineLimit(1)
                }
            }
            if day.tasks.isEmpty {
                Text("Свободно")
                    .font(Typo.body(11))
                    .foregroundStyle(isToday ? .white.opacity(0.8) : p.tertiary)
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 7)
        .frame(maxWidth: .infinity, minHeight: isLarge ? 88 : 44, alignment: .topLeading)
        .background(isToday ? p.accent : p.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private func taskColor(_ task: DailyTaskItem, onAccent: Bool) -> Color {
        if onAccent { return .white.opacity(task.done ? 0.7 : 1) }
        if task.done { return p.accent }
        return task.overdue == true ? p.danger : p.tertiary
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

// MARK: - Аффирмации

// Список аффирмаций и выбранная сейчас — одна логика и для виджета, и для стрелок.
enum AffirmationStore {
    static let fallback = ["Я смелая и уверенная, всегда добиваюсь своих целей."]

    static func read() -> [String] {
        guard let raw = SharedStore.defaults?.string(forKey: "routineWidgetPayload"),
              let data = raw.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let arr = json["affirmations"] as? [String] else { return fallback }
        let list = arr.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
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

struct AffirmationEntry: TimelineEntry {
    let date: Date
    let affirmations: [String]
    let index: Int
}
struct AffirmationProvider: TimelineProvider {
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

struct AffirmationWidgetView: View {
    let entry: AffirmationEntry
    #if SNAPSHOT
    @Environment(\.snapshotFamily) private var family
    #else
    @Environment(\.widgetFamily) private var family
    #endif
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }

    private var quote: String { entry.affirmations.indices.contains(entry.index) ? entry.affirmations[entry.index] : "Сегодня я выбираю действовать." }
    private var isLarge: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeader(icon: "heart.fill", title: "Аффирмация",
                         trailing: "\(entry.index + 1) из \(max(1, entry.affirmations.count))", palette: p)
            Spacer(minLength: 8)
            Text(quote)
                .font(.system(size: isLarge ? 26 : 18, weight: .semibold))
                .foregroundStyle(p.ink)
                .lineSpacing(isLarge ? 3 : 1)
                .lineLimit(isLarge ? 8 : 3)
                .minimumScaleFactor(0.7)
                .frame(maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 8)
            HStack(spacing: 10) {
                Text("Мой режим · каждый день")
                    .font(Typo.caption)
                    .foregroundStyle(p.secondary)
                Spacer()
                arrow("chevron.left", direction: -1)
                arrow("chevron.right", direction: 1)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=routine"))
        .widgetBackground {
            ZStack {
                p.background
                LinearGradient(colors: [p.accent.opacity(p.dark ? 0.30 : 0.16), p.accent.opacity(0.02)],
                               startPoint: .topLeading, endPoint: .bottomTrailing)
            }
        }
    }

    private func arrow(_ icon: String, direction: Int) -> some View {
        Button(intent: ChangeAffirmationIntent(direction: direction)) {
            Image(systemName: icon)
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(p.accent)
                .frame(width: 32, height: 32)
                .background(p.accentSoft, in: Circle())
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
        .configurationDisplayName("Мои аффирмации")
        .description("Твои собственные аффирмации, новая каждый день.")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

// MARK: - Проекты и цели

struct ProjectRow: Decodable, Identifiable {
    let id: String
    let name: String
    let icon: String
    let total: Int
    let done: Int
    let top: [String]
}
struct ProjectPayload: Decodable { let projects: [ProjectRow] }
struct ProjectsEntry: TimelineEntry {
    let date: Date
    let projects: [ProjectRow]
}
struct ProjectsProvider: TimelineProvider {
    func read() -> [ProjectRow] {
        guard let json = SharedStore.defaults?.string(forKey: "projectsWidgetPayload"),
              let data = json.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(ProjectPayload.self, from: data) else { return [] }
        return parsed.projects
    }
    func placeholder(in context: Context) -> ProjectsEntry { ProjectsEntry(date: .now, projects: Self.sample) }
    func getSnapshot(in context: Context, completion: @escaping (ProjectsEntry) -> Void) {
        let rows = read()
        completion(ProjectsEntry(date: .now, projects: rows.isEmpty && context.isPreview ? Self.sample : rows))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ProjectsEntry>) -> Void) {
        completion(Timeline(entries: [ProjectsEntry(date: .now, projects: read())], policy: .after(Date().addingTimeInterval(1800))))
    }

    static let sample = [
        ProjectRow(id: "1", name: "Запуск курса", icon: "🚀", total: 12, done: 7, top: ["Записать урок 3"]),
        ProjectRow(id: "2", name: "Блог", icon: "✍️", total: 8, done: 3, top: ["Пост про режим"]),
        ProjectRow(id: "3", name: "Сайт", icon: "🌸", total: 6, done: 5, top: ["Отзывы"]),
        ProjectRow(id: "4", name: "Здоровье", icon: "💪", total: 10, done: 4, top: ["Анализы"])
    ]
}

struct ProjectsWidgetView: View {
    let entry: ProjectsEntry
    #if SNAPSHOT
    @Environment(\.snapshotFamily) private var family
    #else
    @Environment(\.widgetFamily) private var family
    #endif
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }
    private var isLarge: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: isLarge ? 14 : 9) {
            WidgetHeader(icon: "folder.fill", title: "Проекты", trailing: "20/80", palette: p)
            ForEach(Array(entry.projects.prefix(isLarge ? 5 : 3))) { project in
                HStack(spacing: 10) {
                    Text(project.icon)
                        .font(.system(size: isLarge ? 18 : 15))
                        .frame(width: isLarge ? 34 : 26, height: isLarge ? 34 : 26)
                        .background(p.card, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(project.name)
                                .font(Typo.strong(13))
                                .foregroundStyle(p.ink)
                                .lineLimit(1)
                            Spacer(minLength: 4)
                            Text("\(project.done)/\(project.total)")
                                .font(Typo.number(12, .semibold))
                                .monospacedDigit()
                                .foregroundStyle(p.secondary)
                        }
                        ProgressBar(value: Double(project.done) / Double(max(1, project.total)), palette: p, height: 4)
                        if isLarge, let task = project.top.first {
                            Text(task)
                                .font(Typo.caption)
                                .foregroundStyle(p.secondary)
                                .lineLimit(1)
                        }
                    }
                }
            }
            if entry.projects.isEmpty {
                Spacer(minLength: 0)
                Text("Добавь первый проект в приложении")
                    .font(Typo.body(13))
                    .foregroundStyle(p.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=projects"))
        .widgetBackground { p.background }
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

struct GoalRow: Decodable, Identifiable {
    let id: String
    let name: String
    let period: String
    let done: Int
    let total: Int
}
struct GoalsPayload: Decodable { let goals: [GoalRow] }
struct GoalsEntry: TimelineEntry {
    let date: Date
    let goals: [GoalRow]
}
struct GoalsProvider: TimelineProvider {
    func read() -> [GoalRow] {
        guard let json = SharedStore.defaults?.string(forKey: "projectsWidgetPayload"),
              let data = json.data(using: .utf8),
              let parsed = try? JSONDecoder().decode(GoalsPayload.self, from: data) else { return [] }
        return parsed.goals
    }
    func placeholder(in context: Context) -> GoalsEntry { GoalsEntry(date: .now, goals: Self.sample) }
    func getSnapshot(in context: Context, completion: @escaping (GoalsEntry) -> Void) {
        let rows = read()
        completion(GoalsEntry(date: .now, goals: rows.isEmpty && context.isPreview ? Self.sample : rows))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<GoalsEntry>) -> Void) {
        completion(Timeline(entries: [GoalsEntry(date: .now, goals: read())], policy: .after(Date().addingTimeInterval(1800))))
    }

    static let sample = [
        GoalRow(id: "1", name: "Доход 200 тысяч", period: "Октябрь", done: 3, total: 5),
        GoalRow(id: "2", name: "Спортзал 12 раз", period: "Октябрь", done: 4, total: 12),
        GoalRow(id: "3", name: "Освоить ИИ", period: "Квартал", done: 2, total: 6),
        GoalRow(id: "4", name: "Минус 4 кг", period: "Без срока", done: 1, total: 4)
    ]
}

struct GoalsWidgetView: View {
    let entry: GoalsEntry
    #if SNAPSHOT
    @Environment(\.snapshotFamily) private var family
    #else
    @Environment(\.widgetFamily) private var family
    #endif
    @Environment(\.colorScheme) private var scheme
    private var p: Palette { Palette(scheme) }
    private var isLarge: Bool { family == .systemLarge }

    var body: some View {
        VStack(alignment: .leading, spacing: isLarge ? 14 : 9) {
            WidgetHeader(icon: "target", title: "Цели", palette: p)
            ForEach(Array(entry.goals.prefix(isLarge ? 6 : 3))) { goal in
                let value = Double(goal.done) / Double(max(goal.total, 1))
                HStack(spacing: 10) {
                    ZStack {
                        Circle().stroke(p.track, lineWidth: 3.5)
                        Circle()
                            .trim(from: 0, to: CGFloat(min(value, 1)))
                            .stroke(p.accent, style: StrokeStyle(lineWidth: 3.5, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    .frame(width: 22, height: 22)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(goal.name)
                            .font(Typo.strong(13))
                            .foregroundStyle(p.ink)
                            .lineLimit(1)
                        Text(goal.period)
                            .font(Typo.caption)
                            .foregroundStyle(p.secondary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: 4)
                    Text("\(goal.done)/\(goal.total)")
                        .font(Typo.number(13, .semibold))
                        .monospacedDigit()
                        .foregroundStyle(p.secondary)
                }
            }
            if entry.goals.isEmpty {
                Spacer(minLength: 0)
                Text("Добавь первую цель в приложении")
                    .font(Typo.body(13))
                    .foregroundStyle(p.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(16)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .widgetURL(URL(string: "treneraliny://open?tab=goals"))
        .widgetBackground { p.background }
    }
}

struct TrenerAlinyGoalsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "TrenerAlinyGoalsWidget", provider: GoalsProvider()) { entry in
            GoalsWidgetView(entry: entry)
        }
        .configurationDisplayName("Мои цели")
        .description("Цели на месяц, квартал и год")
        .supportedFamilies([.systemMedium, .systemLarge])
        .contentMarginsDisabled()
    }
}

#if !SNAPSHOT
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
#endif
