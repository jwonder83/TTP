import { detectPlateau, sessionE1rm } from "@/lib/training/plateauDetector";
import { strengthTrend } from "@/lib/training/strengthTrend";
import type { LoggedSession, TrainingInsight } from "@/lib/training/types";

export interface InsightInput {
  exerciseId: string;
  exerciseName: string;
  sessionsNewestFirst: LoggedSession[];
  workingSetsThisWeek: number;
  workingSetsLastWeek: number;
  prThisWeek: boolean;
  locale: "ko" | "en";
  now?: string;
}

function text(locale: "ko" | "en", en: string, ko: string) {
  return locale === "ko" ? ko : en;
}

export function buildExerciseInsights(input: InsightInput): TrainingInsight[] {
  const now = input.now ?? new Date().toISOString();
  const insights: TrainingInsight[] = [];
  const trend = strengthTrend(input.sessionsNewestFirst);
  if (trend?.direction === "TRENDING_UP") {
    insights.push({
      type: "PROGRESS",
      priority: 2,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "Strength is climbing", "근력이 올라가는 중"),
      description: text(
        input.locale,
        `${input.exerciseName} estimated 1RM is up ${trend.changePercent.toFixed(1)}% across recent sessions.`,
        `${input.exerciseName} 추정 1RM이 최근 기록에서 ${trend.changePercent.toFixed(1)}% 상승했습니다.`,
      ),
    });
  }
  if (trend?.direction === "TRENDING_DOWN") {
    insights.push({
      type: "WARNING",
      priority: 1,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "Strength is easing", "근력이 내려가는 중"),
      description: text(
        input.locale,
        `${input.exerciseName} estimated 1RM is down ${Math.abs(trend.changePercent).toFixed(1)}% across recent sessions.`,
        `${input.exerciseName} 추정 1RM이 최근 기록에서 ${Math.abs(trend.changePercent).toFixed(1)}% 하락했습니다.`,
      ),
    });
  }
  const plateau = detectPlateau(input.sessionsNewestFirst);
  if (plateau.detected) {
    insights.push({
      type: "PLATEAU",
      priority: 1,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "Plateau detected", "정체 감지"),
      description: text(
        input.locale,
        `${input.exerciseName} estimated 1RM has barely moved over the last ${input.sessionsNewestFirst.length} sessions.`,
        `${input.exerciseName} 추정 1RM이 최근 ${Math.min(5, input.sessionsNewestFirst.length)}회 동안 거의 변하지 않았습니다.`,
      ),
    });
  }
  const hits = input.sessionsNewestFirst.slice(0, 3).filter((session) => {
    const working = session.sets.filter((set) => set.completed && set.setType !== "warmup" && set.setType !== "backoff");
    return working.length > 0 && working.every((set) => set.reps >= 5);
  });
  if (hits.length >= 3 && sessionE1rm(input.sessionsNewestFirst[0]) > 0) {
    insights.push({
      type: "CONSISTENCY",
      priority: 3,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "Targets are sticking", "목표 반복이 이어짐"),
      description: text(
        input.locale,
        `${input.exerciseName} reached its working reps for 3 sessions in a row.`,
        `${input.exerciseName} 목표 반복을 3회 연속 달성했습니다.`,
      ),
    });
  }
  if (input.workingSetsThisWeek > input.workingSetsLastWeek && input.workingSetsThisWeek > 0) {
    insights.push({
      type: "VOLUME",
      priority: 4,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "More working sets", "워킹 세트 증가"),
      description: text(
        input.locale,
        `${input.exerciseName} working sets are higher than last week.`,
        `${input.exerciseName} 워킹 세트가 지난주보다 늘었습니다.`,
      ),
    });
  }
  if (input.prThisWeek) {
    insights.push({
      type: "PR",
      priority: 2,
      exerciseId: input.exerciseId,
      createdAt: now,
      title: text(input.locale, "New record this week", "이번 주 기록"),
      description: text(input.locale, `${input.exerciseName} set a record this week.`, `${input.exerciseName} 이번 주 기록을 세웠습니다.`),
    });
  }
  return insights;
}
