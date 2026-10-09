import SwiftUI
import WidgetKit

private let widgetEndpoint = "https://trener-aliny-widget.alina-3500-2.workers.dev/widget/aline"

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
        completion(WorkoutEntry(date: .now, payload: loadFromCache() ?? samplePayload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkoutEntry>) -> Void) {
        // Сначала пытаемся получить свежие данные с Worker'а
        fetchFromWorker { payload in
            // Если получили, сохраняем в кэш
            if let payload = payload {
                cachePayload(payload)
            }

            // Показываем полученные данные или кэш
            let entry = WorkoutEntry(date: .now, payload: payload ?? loadFromCache() ?? samplePayload)

            // Обновляем каждый час
            let nextUpdate = Calendar.current.date(byAdding: .hour, value: 1, to: .now) ?? Date().addingTimeInterval(3600)
            completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
        }
    }

    private func fetchFromWorker(completion: @escaping (WidgetPayload?) -> Void) {
        URLSession.shared.dataTask(with: URL(string: widgetEndpoint)!) { data, _, _ in
            guard let data = data else {
                completion(nil)
                return
            }
            let payload = try? JSONDecoder().decode(WidgetPayload.self, from: data)
            completion(payload)
        }.resume()
    }

    private func loadFromCache() -> WidgetPayload? {
        guard let raw = UserDefaults(suiteName: "group.com.aline456.treneraliny")?.string(forKey: "widgetPayloadCache"),
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
    UserDefaults(suiteName: "group.com.aline456.treneraliny")?.set(json, forKey: "widgetPayloadCache")
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


private struct RoutineHabit: Codable {
    let id: String
    let done: Bool
}

private struct RoutinePayload: Codable {
    let date: String
    let active: Bool
    let habits: [RoutineHabit]
    let done: Int
    let total: Int
    let percent: Int
    let weekPercent: Int
    let weekDone: Int
    let weekTotal: Int
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
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: now) ?? now.addingTimeInterval(3600)
        completion(Timeline(entries: [RoutineEntry(date: now, payload: load())], policy: .after(next)))
    }

    private func load() -> RoutinePayload? {
        guard let json = UserDefaults(suiteName: "group.com.aline456.treneraliny")?
            .string(forKey: "routineWidgetPayload"),
              let data = json.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(RoutinePayload.self, from: data)
    }
}

private struct RoutineWidgetView: View {
    let entry: RoutineEntry
    @Environment(\.widgetFamily) private var family

    private let rose = Color(red: 0.72, green: 0.45, blue: 0.57)
    private let ink = Color(red: 0.23, green: 0.17, blue: 0.22)
    private let faded = Color(red: 0.57, green: 0.49, blue: 0.54)

    private var todayKey: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: entry.date)
    }
    private var fresh: Bool { entry.payload?.date == todayKey }
    private var done: Int { fresh ? (entry.payload?.done ?? 0) : 0 }
    private var total: Int { fresh ? (entry.payload?.total ?? 0) : 0 }
    private var percentage: Int { fresh ? (entry.payload?.percent ?? 0) : 0 }

    private let labels: [(String, String)] = [
        ("wake", "Подъём 06:30"),
        ("affirm", "Цели"),
        ("read", "20 страниц"),
        ("food", "Питание")
    ]

    private func isDone(_ id: String) -> Bool {
        fresh && (entry.payload?.habits.first(where: { $0.id == id })?.done ?? false)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: family == .systemSmall ? 8 : 11) {
            HStack(spacing: 5) {
                Image(systemName: "sparkle")
                    .foregroundStyle(rose)
                Text("МОЙ РЕЖИМ")
                    .tracking(0.9)
                    .foregroundStyle(rose)
                Spacer(minLength: 2)
                Text("\(percentage)%")
                    .foregroundStyle(ink)
            }
            .font(.system(size: 11, weight: .bold, design: .rounded))

            GeometryReader { g in
                Capsule().fill(rose.opacity(0.13))
                    .overlay(alignment: .leading) {
                        Capsule().fill(rose).frame(width: g.size.width * CGFloat(percentage) / 100)
                    }
            }
            .frame(height: 6)

            if family == .systemSmall {
                VStack(alignment: .leading, spacing: 7) {
                    ForEach(labels, id: \.0) { id, title in
                        habitRow(id, title)
                    }
                }
            } else {
                LazyVGrid(columns: [GridItem(.flexible(), alignment: .leading),
                                    GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: 12) {
                    ForEach(labels, id: \.0) { id, title in
                        habitRow(id, title)
                    }
                }
                Spacer(minLength: 0)
                HStack {
                    Text("Сегодня: \(done) из \(total)")
                    Spacer()
                    Text("Неделя: \(fresh ? (entry.payload?.weekPercent ?? 0) : 0)%")
                }
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(faded)
            }
        }
        .padding(family == .systemSmall ? 12 : 17)
        .widgetURL(URL(string: "treneraliny://open?tab=routine"))
        .containerBackground(for: .widget) {
            Color(red: 1.0, green: 0.974, blue: 0.981)
        }
    }

    private func habitRow(_ id: String, _ title: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: isDone(id) ? "checkmark.square.fill" : "square")
                .foregroundStyle(isDone(id) ? rose : faded.opacity(0.65))
                .font(.system(size: 16))
            Text(title)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundStyle(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.75)
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
        .supportedFamilies([.systemSmall, .systemMedium])
        .contentMarginsDisabled()
    }
}

@main
struct TrenerAlinyWidgetBundle: WidgetBundle {
    var body: some Widget {
        TrenerAlinyWidget()
        TrenerAlinyCaloriesWidget()
        TrenerAlinyRoutineWidget()
    }
}
