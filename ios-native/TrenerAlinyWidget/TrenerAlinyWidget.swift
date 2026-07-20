import SwiftUI
import WidgetKit

private let appGroup = "group.com.aline456.treneraliny"
private let payloadKey = "widgetPayload"

private struct WidgetPayload: Codable {
    let nextDate: TimeInterval
    let title: String
    let durationMinutes: Int
    let workoutDays: [Int]
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
        completion(WorkoutEntry(date: .now, payload: loadPayload() ?? samplePayload))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WorkoutEntry>) -> Void) {
        let entry = WorkoutEntry(date: .now, payload: loadPayload())
        let nextMidnight = Calendar.current.nextDate(
            after: .now,
            matching: DateComponents(hour: 0, minute: 1),
            matchingPolicy: .nextTime
        ) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }

    private func loadPayload() -> WidgetPayload? {
        guard let raw = UserDefaults(suiteName: appGroup)?.string(forKey: payloadKey),
              let data = raw.data(using: .utf8) else { return nil }
        return try? JSONDecoder().decode(WidgetPayload.self, from: data)
    }

    private var samplePayload: WidgetPayload {
        WidgetPayload(
            nextDate: Calendar.current.date(byAdding: .day, value: 1, to: .now)!.timeIntervalSince1970,
            title: "ЯГОДИЦЫ • БАЗА",
            durationMinutes: 54,
            workoutDays: [1, 5]
        )
    }
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
    private var nextDate: Date? { payload.map { Date(timeIntervalSince1970: $0.nextDate) } }

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
        Group {
            if let payload, let nextDate {
                content(payload: payload, nextDate: nextDate)
            } else {
                emptyContent
            }
        }
        .containerBackground(for: .widget) { widgetBackground }
    }

    private func content(payload: WidgetPayload, nextDate: Date) -> some View {
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
                    Text(payload.title.uppercased())
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .lineLimit(1)
                        .minimumScaleFactor(0.65)
                    Text("≈ \(payload.durationMinutes) мин")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(violet)
                }
            }

            HStack(spacing: 0) {
                ForEach(week) { day in
                    let isNext = Calendar.current.isDate(day.date, inSameDayAs: nextDate)
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
                            .opacity(payload.workoutDays.contains(day.jsWeekday) ? 1 : 0)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 15)
        .padding(.vertical, 12)
    }

    private var emptyContent: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("ТРЕНЕР АЛИНЫ", systemImage: "figure.strengthtraining.traditional")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundStyle(muted)
            Spacer()
            Text("Открой приложение")
                .font(.system(size: 20, weight: .heavy, design: .rounded))
            Text("Я покажу здесь следующую тренировку 💜")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(muted)
            Spacer()
        }
        .foregroundStyle(.white)
        .padding(16)
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

@main
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
