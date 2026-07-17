import {
  ROUTINE,
  PROGRESS_LOG,
  WEEKLY_SPLIT,
  BODY_STATS_BASELINE,
  type WorkoutLogEntry,
  type BodyStatsEntry,
  type WorkoutCategory,
  type RoutineExercise,
  type WeightUnit,
  type TrainingDayKey,
  CATEGORY_COLORS,
} from './data';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VALID_CATEGORIES = new Set<WorkoutCategory>(['legs', 'push', 'pull', 'glutes', 'core', 'cardio']);
const VALID_WEIGHT_UNITS = new Set<WeightUnit>(['lb', 'dumbbells', 'bodyweight', 'time', 'tbd']);

export interface CurrentWeight {
  exerciseId: string;
  exerciseName: string;
  category: WorkoutCategory;
  weight: number | null;
  weightUnit: WeightUnit;
  sets: number;
  reps: number;
  lastDate: string;
  notes?: string;
}

export interface GrowthEntry {
  exerciseId: string;
  name: string;
  category: WorkoutCategory;
  starting: number;
  current: number;
  gain: number;
  gainPercent: number;
  color: string;
}

export function mergeLogs(extraLogs: WorkoutLogEntry[]): WorkoutLogEntry[] {
  const byId = new Map<string, WorkoutLogEntry>();
  for (const entry of [...PROGRESS_LOG, ...sanitizeWorkoutLogs(extraLogs)]) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values()).sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.exerciseName.localeCompare(b.exerciseName);
  });
}

export function getLatestLogs(logs: WorkoutLogEntry[]): CurrentWeight[] {
  const latestByExercise = new Map<string, WorkoutLogEntry>();

  for (const log of logs) {
    const routineMatch = ROUTINE.find((exercise) => exercise.id === log.exerciseId);
    if (!routineMatch) continue;
    if (log.exerciseName !== routineMatch.name) continue;

    const existing = latestByExercise.get(log.exerciseId);
    if (!existing || log.date >= existing.date) {
      latestByExercise.set(log.exerciseId, log);
    }
  }

  return ROUTINE.map((exercise) => {
    const latest = latestByExercise.get(exercise.id);
    if (latest) {
      return {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        category: exercise.category,
        weight: latest.weight,
        weightUnit: latest.weightUnit,
        sets: latest.sets,
        reps: latest.reps,
        lastDate: latest.date,
        notes: latest.notes,
      };
    }

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      weight: exercise.startingWeight,
      weightUnit: exercise.weightUnit,
      sets: exercise.sets,
      reps: getDefaultRepsValue(exercise),
      lastDate: '2026-06-15',
    };
  });
}

export function getGrowthData(currentWeights: CurrentWeight[]): GrowthEntry[] {
  return ROUTINE.filter((exercise) => exercise.startingWeight !== null)
    .map((exercise) => {
      const current = currentWeights.find((entry) => entry.exerciseId === exercise.id);
      const currentWeight = current?.weight ?? exercise.startingWeight ?? 0;
      const starting = exercise.startingWeight ?? 0;
      const gain = currentWeight - starting;
      const gainPercent = starting > 0 ? Math.round((gain / starting) * 100) : 0;

      return {
        exerciseId: exercise.id,
        name: exercise.name,
        category: exercise.category,
        starting,
        current: currentWeight,
        gain,
        gainPercent,
        color: CATEGORY_COLORS[exercise.category],
      };
    })
    .filter((entry) => entry.gain !== 0)
    .sort((a, b) => b.gainPercent - a.gainPercent);
}

export function getProgressChartData(
  logs: WorkoutLogEntry[],
  exerciseIds?: string[]
): Array<{ name: string; [key: string]: string | number }> {
  const filtered = logs.filter(
    (log) =>
      log.weight !== null &&
      log.weightUnit === 'lb' &&
      (!exerciseIds || exerciseIds.includes(log.exerciseId)) &&
      ROUTINE.some((exercise) => exercise.id === log.exerciseId && exercise.name === log.exerciseName)
  );

  const dates = [...new Set(filtered.map((log) => log.date))].sort();
  const exercises = [...new Set(filtered.map((log) => log.exerciseId))];

  return dates.map((date) => {
    const point: { name: string; [key: string]: string | number } = {
      name: formatShortDate(date),
    };

    for (const exerciseId of exercises) {
      const dayLogs = filtered.filter((log) => log.date === date && log.exerciseId === exerciseId);
      if (dayLogs.length > 0) {
        const routine = ROUTINE.find((exercise) => exercise.id === exerciseId);
        const key = routine?.name ?? exerciseId;
        point[key] = dayLogs[dayLogs.length - 1].weight as number;
      }
    }

    return point;
  });
}

export function getExercisesWithProgress(logs: WorkoutLogEntry[]): RoutineExercise[] {
  const counts = new Map<string, number>();
  for (const log of logs) {
    if (log.weight === null || log.weightUnit !== 'lb') continue;
    if (!ROUTINE.some((exercise) => exercise.id === log.exerciseId && exercise.name === log.exerciseName)) {
      continue;
    }
    counts.set(log.exerciseId, (counts.get(log.exerciseId) ?? 0) + 1);
  }
  return ROUTINE.filter((exercise) => (counts.get(exercise.id) ?? 0) >= 2);
}

export function formatWeight(weight: number | null, unit: WeightUnit): string {
  if (unit === 'dumbbells') return weight !== null ? `${weight} lb DB` : 'DB + hip pad';
  if (unit === 'bodyweight') return 'Bodyweight';
  if (unit === 'time') return 'Timed hold';
  if (unit === 'tbd' || weight === null) return 'TBD';
  return `${weight} lb`;
}

export function formatExercisePrescription(exercise: RoutineExercise): string {
  if (exercise.reps === 'attempt') return 'Form practice';

  if (exercise.category === 'core' && exercise.circuitOrder) {
    return formatCoreCircuitPrescription(exercise);
  }

  if (exercise.repType === 'per_side') {
    return `${exercise.sets}×${exercise.reps}/side`;
  }
  if (exercise.repType === 'seconds') {
    return `${exercise.sets}×${exercise.reps} sec`;
  }
  if (exercise.repType === 'minutes') {
    return `${exercise.reps} min`;
  }
  if (exercise.repType === 'total') {
    return `${exercise.sets}×${exercise.reps} total`;
  }
  return `${exercise.sets}×${exercise.reps}`;
}

function formatCoreCircuitPrescription(exercise: RoutineExercise): string {
  if (exercise.repType === 'per_side') return `${exercise.reps} reps/side`;
  if (exercise.repType === 'seconds') return `${exercise.reps} sec`;
  if (exercise.repType === 'minutes') return `${exercise.reps} min`;
  if (exercise.repType === 'total') return `${exercise.reps} total twists`;
  return `${exercise.reps} reps`;
}

export function formatLogSummary(log: WorkoutLogEntry): string {
  const routine = ROUTINE.find((exercise) => exercise.id === log.exerciseId);
  const parts: string[] = [];

  if (log.weightUnit === 'lb' || (log.weightUnit === 'dumbbells' && log.weight !== null)) {
    parts.push(formatWeight(log.weight, log.weightUnit));
  } else if (log.weightUnit === 'time') {
    if (routine?.repType === 'minutes') {
      parts.push(`Level ${routine.settings?.level ?? '5'} · ${log.reps} min`);
    } else {
      parts.push(`${log.reps} sec hold`);
      parts.push(`${log.sets} rounds`);
      return parts.join(' · ');
    }
  }

  if (log.weightUnit !== 'time') {
    const routine = ROUTINE.find((exercise) => exercise.id === log.exerciseId);
    const suffix = routine?.repType === 'per_side' ? '/leg' : '';
    parts.push(`${log.sets}×${log.reps}${suffix}`);
  }

  return parts.join(' · ');
}

export function isWeightedExercise(exercise: RoutineExercise): boolean {
  return exercise.weightUnit === 'lb' || exercise.weightUnit === 'dumbbells';
}

export function getRoutineByCategory(category: WorkoutCategory): RoutineExercise[] {
  const exercises = ROUTINE.filter((exercise) => exercise.category === category);
  if (category === 'core') {
    return exercises.sort((a, b) => (a.circuitOrder ?? 99) - (b.circuitOrder ?? 99));
  }
  return exercises;
}

export function getExercisesForTrainingDay(dayKey: TrainingDayKey): RoutineExercise[] {
  const day = WEEKLY_SPLIT.find((entry) => entry.key === dayKey);
  if (!day) return [];

  const byCategory = ROUTINE.filter((exercise) => day.categories.includes(exercise.category));
  const extraIds = day.exerciseIds ?? [];
  const extras = ROUTINE.filter(
    (exercise) => extraIds.includes(exercise.id) && !day.categories.includes(exercise.category)
  );

  if (dayKey === 'home') {
    return [
      ...byCategory.filter((exercise) => exercise.circuitOrder),
      ...extras,
      ...byCategory.filter((exercise) => !exercise.circuitOrder),
    ];
  }

  const warmup = extras.filter((exercise) => exercise.id === 'stairmaster-warmup');
  const cooldown = extras.filter((exercise) => exercise.id === 'stairmaster-cooldown');
  const otherExtras = extras.filter(
    (exercise) => exercise.id !== 'stairmaster-warmup' && exercise.id !== 'stairmaster-cooldown'
  );

  return [...warmup, ...byCategory, ...otherExtras, ...cooldown];
}

export function getDefaultRepsValue(exercise: RoutineExercise): number {
  const match = exercise.reps.match(/\d+/);
  return match ? parseInt(match[0], 10) : 10;
}

export function getTodayLocalDate(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
}

export function sanitizeWorkoutLogs(value: unknown): WorkoutLogEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is WorkoutLogEntry => {
    if (!item || typeof item !== 'object') return false;

    const candidate = item as Partial<WorkoutLogEntry>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.date === 'string' &&
      ISO_DATE_PATTERN.test(candidate.date) &&
      typeof candidate.exerciseId === 'string' &&
      typeof candidate.exerciseName === 'string' &&
      typeof candidate.category === 'string' &&
      VALID_CATEGORIES.has(candidate.category as WorkoutCategory) &&
      typeof candidate.weightUnit === 'string' &&
      VALID_WEIGHT_UNITS.has(candidate.weightUnit as WeightUnit) &&
      typeof candidate.sets === 'number' &&
      Number.isFinite(candidate.sets) &&
      candidate.sets > 0 &&
      typeof candidate.reps === 'number' &&
      Number.isFinite(candidate.reps) &&
      candidate.reps > 0 &&
      (candidate.weight === null || (typeof candidate.weight === 'number' && Number.isFinite(candidate.weight)))
    );
  });
}

export function formatShortDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatLongDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatSettings(exercise: RoutineExercise): string[] {
  if (!exercise.settings) return [];
  const parts: string[] = [];
  if (exercise.settings.seat) parts.push(`Seat ${exercise.settings.seat}`);
  if (exercise.settings.platform) parts.push(`Platform ${exercise.settings.platform}`);
  if (exercise.settings.pad) parts.push(`Pad ${exercise.settings.pad}`);
  if (exercise.settings.arm) parts.push(`Arm ${exercise.settings.arm}`);
  if (exercise.settings.position) parts.push(`Position ${exercise.settings.position}`);
  if (exercise.settings.level) parts.push(`Level ${exercise.settings.level}`);
  return parts;
}

export function groupLogsByDate(logs: WorkoutLogEntry[]): Map<string, WorkoutLogEntry[]> {
  const grouped = new Map<string, WorkoutLogEntry[]>();
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));

  for (const log of sorted) {
    const existing = grouped.get(log.date) ?? [];
    existing.push(log);
    grouped.set(log.date, existing);
  }

  return grouped;
}

export function inferTrainingDayForDate(dayLogs: WorkoutLogEntry[]): TrainingDayKey | null {
  if (dayLogs.length === 0) return null;

  const scores = { push: 0, pull: 0, legs: 0, home: 0 };
  for (const log of dayLogs) {
    if (log.category === 'push') scores.push += 2;
    if (log.category === 'pull') scores.pull += 2;
    if (log.category === 'legs') scores.legs += 2;
    if (log.category === 'glutes') scores.legs += 2;
    if (log.category === 'core') scores.home += 2;
  }

  const gymMax = Math.max(scores.push, scores.pull, scores.legs);
  if (gymMax === 0) {
    return scores.home > 0 ? 'home' : null;
  }
  if (scores.push === gymMax) return 'push';
  if (scores.pull === gymMax) return 'pull';
  return 'legs';
}

function getCarriedLogEntry(
  exercise: RoutineExercise,
  date: string,
  allLogs: WorkoutLogEntry[]
): WorkoutLogEntry | null {
  const prior = allLogs
    .filter(
      (log) =>
        log.exerciseId === exercise.id &&
        log.exerciseName === exercise.name &&
        log.date < date &&
        !log.id.startsWith('carried-')
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];

  const sets = prior?.sets ?? exercise.sets;
  const reps = prior?.reps ?? getDefaultRepsValue(exercise);
  const weightUnit = prior?.weightUnit ?? exercise.weightUnit;

  if (weightUnit === 'lb') {
    const weight = prior?.weight ?? exercise.startingWeight;
    if (weight === null) return null;
    return {
      id: `carried-${date}-${exercise.id}`,
      date,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      weight,
      weightUnit,
      sets,
      reps,
      notes: 'Same weight as previous session',
    };
  }

  if (weightUnit === 'time' && exercise.repType === 'minutes') {
    return {
      id: `carried-${date}-${exercise.id}`,
      date,
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      category: exercise.category,
      weight: null,
      weightUnit,
      sets,
      reps,
      notes: 'Same as previous session',
    };
  }

  return null;
}

export function getCompleteLogsForDate(date: string, allLogs: WorkoutLogEntry[]): WorkoutLogEntry[] {
  const explicit = allLogs.filter((log) => log.date === date && !log.id.startsWith('carried-'));
  const trainingDay = inferTrainingDayForDate(explicit);
  if (!trainingDay || trainingDay === 'home') {
    return [...explicit].sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
  }

  const order = getExercisesForTrainingDay(trainingDay);
  const complete: WorkoutLogEntry[] = [];

  for (const exercise of order) {
    const logged = explicit.find(
      (log) => log.exerciseId === exercise.id && log.exerciseName === exercise.name
    );
    if (logged) {
      complete.push(logged);
      continue;
    }

    const carried = getCarriedLogEntry(exercise, date, allLogs);
    if (carried) complete.push(carried);
  }

  for (const log of explicit) {
    if (!complete.some((entry) => entry.id === log.id)) {
      complete.push(log);
    }
  }

  return complete;
}

export function groupCompleteLogsByDate(logs: WorkoutLogEntry[]): Map<string, WorkoutLogEntry[]> {
  const dates = [...new Set(logs.filter((log) => !log.id.startsWith('carried-')).map((log) => log.date))].sort(
    (a, b) => b.localeCompare(a)
  );
  const grouped = new Map<string, WorkoutLogEntry[]>();
  for (const date of dates) {
    grouped.set(date, getCompleteLogsForDate(date, logs));
  }
  return grouped;
}

export function isInferredLog(log: WorkoutLogEntry): boolean {
  return log.id.startsWith('carried-') || log.notes === 'Same weight as previous session';
}

export function getDaysSinceStart(): number {
  const start = new Date('2026-06-15');
  const today = new Date();
  const diff = today.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function getWorkoutDays(logs: WorkoutLogEntry[]): number {
  return new Set(logs.map((log) => log.date)).size;
}

export function sanitizeBodyStats(value: unknown): BodyStatsEntry[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is BodyStatsEntry => {
    if (!item || typeof item !== 'object') return false;
    const candidate = item as Partial<BodyStatsEntry>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.date === 'string' &&
      ISO_DATE_PATTERN.test(candidate.date) &&
      typeof candidate.weightLb === 'number' &&
      Number.isFinite(candidate.weightLb) &&
      candidate.weightLb > 0 &&
      typeof candidate.waistIn === 'number' &&
      Number.isFinite(candidate.waistIn) &&
      candidate.waistIn > 0
    );
  });
}

export function mergeBodyStats(extraEntries: BodyStatsEntry[]): BodyStatsEntry[] {
  const byId = new Map<string, BodyStatsEntry>();
  for (const entry of [BODY_STATS_BASELINE, ...sanitizeBodyStats(extraEntries)]) {
    byId.set(entry.id, entry);
  }
  return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function getLatestBodyStats(entries: BodyStatsEntry[]): BodyStatsEntry {
  return entries[entries.length - 1];
}

export function getBodyGoalProgress(
  current: number,
  goal: number,
  baseline: number
): { remaining: number; percent: number; unit: string } {
  const totalChange = baseline - goal;
  const completed = baseline - current;
  const remaining = Math.abs(current - goal);
  const percent =
    totalChange === 0 ? 100 : Math.max(0, Math.min(100, Math.round((completed / totalChange) * 100)));

  return { remaining, percent, unit: '' };
}
