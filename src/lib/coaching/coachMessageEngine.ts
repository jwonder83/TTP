export type CoachMessageType = "PROGRESSION" | "PR" | "PLATEAU" | "RECOVERY" | "CONSISTENCY" | "PROGRAM" | "GOAL" | "VOLUME";

export interface CoachMessage {
  type: CoachMessageType;
  text: string;
}

export function coachMessages(input: {
  exerciseName?: string;
  hitStreak?: number;
  increment?: number;
  kept?: boolean;
  weekDone?: number;
  weekTotal?: number;
  recovery?: string;
}) {
  const messages: CoachMessage[] = [];
  if ((input.hitStreak ?? 0) >= 3 && input.exerciseName) {
    messages.push({ type: "PROGRESSION", text: `${input.exerciseName} met the target range for 3 sessions.` });
  }
  if ((input.increment ?? 0) > 0 && input.exerciseName) {
    messages.push({ type: "PROGRESSION", text: `Suggested next load for ${input.exerciseName}: +${input.increment} kg.` });
  }
  if (input.kept && input.exerciseName) {
    messages.push({ type: "PLATEAU", text: `${input.exerciseName} stays at the same load as the last session.` });
  }
  if (input.weekDone != null && input.weekTotal != null) {
    messages.push({ type: "CONSISTENCY", text: `This week: ${input.weekDone} / ${input.weekTotal} workouts.` });
  }
  if (input.recovery) messages.push({ type: "RECOVERY", text: `Recovery: ${input.recovery}.` });
  return messages;
}

const events: Array<{ name: string; at: string }> = [];

export function trackTrainingEvent(name: string) {
  events.push({ name, at: new Date().toISOString() });
}

export function trainingEvents() {
  return events.slice();
}
