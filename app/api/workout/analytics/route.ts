import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Fetch last 90 days of logs with exercises and sets
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

    const { data: logs, error } = await supabase
      .from("workout_logs")
      .select(`
        id, date, duration_minutes, name,
        workout_log_exercises (
          exercise_name,
          workout_log_sets (weight, reps, completed)
        )
      `)
      .eq("user_id", user.id)
      .gte("date", fromDate)
      .order("date", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Compute weekly frequency (last 12 weeks)
    const weeklyMap: Record<string, { workouts: number; volume: number; duration: number }> = {};
    const muscleMap: Record<string, number> = {};
    const exerciseFreq: Record<string, number> = {};

    for (const log of (logs ?? [])) {
      // Weekly key: Monday of that week
      const d = new Date(log.date + "T00:00:00");
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      const wk = monday.toISOString().split("T")[0];

      if (!weeklyMap[wk]) weeklyMap[wk] = { workouts: 0, volume: 0, duration: 0 };
      weeklyMap[wk].workouts += 1;
      weeklyMap[wk].duration += log.duration_minutes ?? 0;

      for (const ex of (log.workout_log_exercises ?? [])) {
        exerciseFreq[ex.exercise_name] = (exerciseFreq[ex.exercise_name] ?? 0) + 1;
        for (const s of (ex.workout_log_sets ?? [])) {
          if (s.completed && s.weight && s.reps) {
            weeklyMap[wk].volume += s.weight * s.reps;
          }
        }
      }
    }

    // Fetch muscle group data from all-time logs grouped by exercise
    const { data: muscleData } = await supabase
      .from("workout_log_exercises")
      .select(`
        exercise_id,
        workout_exercises!inner(muscle_group),
        workout_log_id,
        workout_logs!inner(user_id)
      `)
      .eq("workout_logs.user_id", user.id);

    for (const row of (muscleData ?? [])) {
      const mg = (row.workout_exercises as unknown as { muscle_group: string })?.muscle_group ?? "Other";
      muscleMap[mg] = (muscleMap[mg] ?? 0) + 1;
    }

    // Daily log streak
    const allLogs = await supabase
      .from("workout_logs")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    const dates = [...new Set((allLogs.data ?? []).map((l: { date: string }) => l.date))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    let check = today;
    for (const d of dates) {
      if (d === check) {
        streak++;
        const dt = new Date(check + "T00:00:00");
        dt.setDate(dt.getDate() - 1);
        check = dt.toISOString().split("T")[0];
      } else break;
    }

    // Top 5 exercises by frequency
    const topExercises = Object.entries(exerciseFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Weekly data sorted
    const weeklyData = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, data]) => ({
        week,
        label: new Date(week + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        ...data,
        volume: Math.round(data.volume),
      }));

    const muscleDistribution = Object.entries(muscleMap)
      .sort(([, a], [, b]) => b - a)
      .map(([muscle_group, count]) => ({ muscle_group, count }));

    return NextResponse.json({
      weeklyData,
      muscleDistribution,
      topExercises,
      streak,
      totalWorkouts: (allLogs.data ?? []).length,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
