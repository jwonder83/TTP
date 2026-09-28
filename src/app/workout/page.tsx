import { Suspense } from "react";
import { WorkoutScreen } from "@/components/workout/WorkoutScreen";

export default function WorkoutPage() {
  return (
    <Suspense fallback={null}>
      <WorkoutScreen />
    </Suspense>
  );
}
