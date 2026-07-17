export type WorkoutCategory = 'legs' | 'push' | 'pull' | 'glutes' | 'core' | 'cardio';
export type WeightUnit = 'lb' | 'dumbbells' | 'bodyweight' | 'time' | 'tbd';
export type RepType = 'reps' | 'seconds' | 'minutes' | 'per_side' | 'total';
export type WorkoutLocation = 'gym' | 'home';

export interface ExerciseSettings {
  seat?: string;
  platform?: string;
  pad?: string;
  arm?: string;
  position?: string;
  level?: string;
}

export interface RoutineExercise {
  id: string;
  name: string;
  category: WorkoutCategory;
  location: WorkoutLocation;
  startingWeight: number | null;
  weightUnit: WeightUnit;
  sets: number;
  reps: string;
  repType?: RepType;
  settings?: ExerciseSettings;
  notes?: string;
  cue?: string;
  isFinisher?: boolean;
  circuitOrder?: number;
}

export interface WorkoutLogEntry {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  category: WorkoutCategory;
  weight: number | null;
  weightUnit: WeightUnit;
  sets: number;
  reps: number;
  notes?: string;
}

export type TrainingDayKey = 'push' | 'pull' | 'legs' | 'home';

export const WORKOUT_GOALS = {
  sets: 3,
  repRange: '10–12',
  restSeconds: '30–60',
  startedOn: '2026-06-15',
  gymDaysPerWeek: 3,
  split: 'Push · Pull · Legs',
  cardio: 'StairMaster 10 min before & after · Level 5',
} as const;

export const GYM_CARDIO = {
  machine: 'StairMaster',
  minutes: 10,
  level: 5,
  timing: 'Before and after every gym session',
  frequency: '3x/week',
} as const;

const GYM_CARDIO_IDS = ['stairmaster-warmup', 'stairmaster-cooldown'] as const;

export const WEEKLY_SPLIT: Array<{
  key: TrainingDayKey;
  title: string;
  subtitle: string;
  location: WorkoutLocation;
  icon: string;
  color: string;
  categories: WorkoutCategory[];
  exerciseIds?: string[];
  status?: string;
}> = [
  {
    key: 'push',
    title: 'Push Day',
    subtitle: 'Chest, shoulders, triceps',
    location: 'gym',
    icon: 'fas fa-arrow-up',
    color: '#ec4899',
    categories: ['push'],
    exerciseIds: [...GYM_CARDIO_IDS],
  },
  {
    key: 'pull',
    title: 'Pull Day',
    subtitle: 'Back, biceps, rear delts',
    location: 'gym',
    icon: 'fas fa-arrow-down',
    color: '#3b82f6',
    categories: ['pull'],
    exerciseIds: [...GYM_CARDIO_IDS],
  },
  {
    key: 'legs',
    title: 'Leg Day',
    subtitle: 'Quads, hamstrings, hips + glute kickback',
    location: 'gym',
    icon: 'fas fa-person-walking',
    color: '#10b981',
    categories: ['legs'],
    exerciseIds: [...GYM_CARDIO_IDS, 'glute-kickback'],
  },
  {
    key: 'home',
    title: 'Home',
    subtitle: 'Ab circuit + hip thrusts',
    location: 'home',
    icon: 'fas fa-house',
    color: '#f59e0b',
    categories: ['core'],
    exerciseIds: ['hip-thrust'],
    status: 'Building the habit',
  },
];

export const CATEGORY_LABELS: Record<WorkoutCategory, string> = {
  legs: 'Legs',
  push: 'Push',
  pull: 'Pull',
  glutes: 'Glutes',
  core: 'Home Abs',
  cardio: 'Cardio',
};

export const CATEGORY_COLORS: Record<WorkoutCategory, string> = {
  legs: '#10b981',
  push: '#ec4899',
  pull: '#3b82f6',
  glutes: '#a855f7',
  core: '#f59e0b',
  cardio: '#ef4444',
};

export const HOME_AB_CIRCUIT = {
  rounds: 3,
  restBetweenMoves: '30–45 sec',
  restBetweenRounds: '1–2 min',
  location: 'home' as const,
  notes:
    'Separate from gym days — do at home when you can. 6 moves in order, then repeat for 3 rounds.',
};

export const ROUTINE: RoutineExercise[] = [
  {
    id: 'stairmaster-warmup',
    name: 'StairMaster (Warm-up)',
    category: 'cardio',
    location: 'gym',
    startingWeight: null,
    weightUnit: 'time',
    sets: 1,
    reps: '10',
    repType: 'minutes',
    settings: { level: '5' },
    notes: 'Before lifting — 10 min at level 5',
  },
  {
    id: 'stairmaster-cooldown',
    name: 'StairMaster (Cool-down)',
    category: 'cardio',
    location: 'gym',
    startingWeight: null,
    weightUnit: 'time',
    sets: 1,
    reps: '10',
    repType: 'minutes',
    settings: { level: '5' },
    notes: 'After lifting — 10 min at level 5',
  },
  {
    id: 'leg-press',
    name: 'Leg Press',
    category: 'legs',
    location: 'gym',
    startingWeight: 60,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '5', platform: '5' },
  },
  {
    id: 'leg-press-single',
    name: 'Leg Press (Single Leg)',
    category: 'legs',
    location: 'gym',
    startingWeight: 30,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    repType: 'per_side',
    settings: { seat: '5', platform: '5' },
    notes: 'Each leg',
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    category: 'legs',
    location: 'gym',
    startingWeight: 30,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '5', platform: '2' },
  },
  {
    id: 'leg-curl',
    name: 'Leg Curl',
    category: 'legs',
    location: 'gym',
    startingWeight: 25,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '4–5', platform: '1' },
  },
  {
    id: 'adductor',
    name: 'Adductor',
    category: 'legs',
    location: 'gym',
    startingWeight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
  },
  {
    id: 'abductor',
    name: 'Abductor',
    category: 'legs',
    location: 'gym',
    startingWeight: 60,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
  },
  {
    id: 'chest-press',
    name: 'Chest Press',
    category: 'push',
    location: 'gym',
    startingWeight: 30,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '4' },
  },
  {
    id: 'pec-deck',
    name: 'Pec Deck',
    category: 'push',
    location: 'gym',
    startingWeight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '7', position: '3' },
  },
  {
    id: 'shoulder-press',
    name: 'Shoulder Press',
    category: 'push',
    location: 'gym',
    startingWeight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '4' },
  },
  {
    id: 'triceps-extension',
    name: 'Triceps Extension',
    category: 'push',
    location: 'gym',
    startingWeight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '4' },
  },
  {
    id: 'triceps-press',
    name: 'Triceps Press',
    category: 'push',
    location: 'gym',
    startingWeight: 50,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '1' },
  },
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    category: 'pull',
    location: 'gym',
    startingWeight: 50,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '4', pad: '2' },
  },
  {
    id: 'seated-row',
    name: 'Seated Row',
    category: 'pull',
    location: 'gym',
    startingWeight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '3', pad: '7' },
  },
  {
    id: 'biceps-curl',
    name: 'Biceps Curl',
    category: 'pull',
    location: 'gym',
    startingWeight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '6', arm: '4' },
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear Delt Fly',
    category: 'pull',
    location: 'gym',
    startingWeight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    settings: { seat: '7', position: '3' },
  },
  {
    id: 'back-extension',
    name: 'Back Extension',
    category: 'pull',
    location: 'gym',
    startingWeight: 50,
    weightUnit: 'lb',
    sets: 3,
    reps: '12',
  },
  {
    id: 'glute-kickback',
    name: 'Glute Kickback',
    category: 'glutes',
    location: 'gym',
    startingWeight: 35,
    weightUnit: 'lb',
    sets: 3,
    reps: '10',
    notes: 'Only core/glute machine still in rotation',
  },
  {
    id: 'hip-thrust',
    name: 'Hip Thrust',
    category: 'glutes',
    location: 'home',
    startingWeight: null,
    weightUnit: 'dumbbells',
    sets: 3,
    reps: '10–12',
    notes: 'Dumbbell + hip pad/wrap',
  },
  {
    id: 'dead-bugs',
    name: 'Dead Bugs',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'bodyweight',
    sets: 3,
    reps: '12',
    repType: 'per_side',
    circuitOrder: 1,
    cue: 'Keep your lower back pressed into the floor.',
  },
  {
    id: 'reverse-crunches',
    name: 'Reverse Crunches',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'bodyweight',
    sets: 3,
    reps: '15',
    repType: 'reps',
    circuitOrder: 2,
    cue: 'Curl your hips up — don’t swing your legs.',
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'time',
    sets: 3,
    reps: '30–45',
    repType: 'seconds',
    circuitOrder: 3,
    cue: 'Squeeze your core and glutes. Don’t let your hips sag.',
  },
  {
    id: 'leg-raises',
    name: 'Leg Raises',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'bodyweight',
    sets: 3,
    reps: '10–12',
    repType: 'reps',
    circuitOrder: 4,
    cue: 'If your back arches, bend your knees slightly.',
  },
  {
    id: 'hollow-hold',
    name: 'Hollow Hold',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'time',
    sets: 3,
    reps: '20–30',
    repType: 'seconds',
    circuitOrder: 5,
    cue: 'Hold tight. It sucks a little.',
  },
  {
    id: 'dragon-flags',
    name: 'Dragon Flags',
    category: 'core',
    location: 'home',
    startingWeight: null,
    weightUnit: 'bodyweight',
    sets: 1,
    reps: 'attempt',
    repType: 'reps',
    circuitOrder: 6,
    notes: 'Focus on form, not reps',
    cue: 'Controlled negatives when you can get them.',
  },
];

export const PROGRESS_LOG: WorkoutLogEntry[] = [
  {
    id: 'log-2026-07-09-chest-press',
    date: '2026-07-09',
    exerciseId: 'chest-press',
    exerciseName: 'Chest Press',
    category: 'push',
    weight: 37.5,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-09-pec-deck',
    date: '2026-07-09',
    exerciseId: 'pec-deck',
    exerciseName: 'Pec Deck',
    category: 'push',
    weight: 45,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-09-triceps-press',
    date: '2026-07-09',
    exerciseId: 'triceps-press',
    exerciseName: 'Triceps Press',
    category: 'push',
    weight: 80,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-09-shoulder-press',
    date: '2026-07-09',
    exerciseId: 'shoulder-press',
    exerciseName: 'Shoulder Press',
    category: 'push',
    weight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Same weight as previous session',
  },
  {
    id: 'log-2026-07-09-triceps-extension',
    date: '2026-07-09',
    exerciseId: 'triceps-extension',
    exerciseName: 'Triceps Extension',
    category: 'push',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Same weight as previous session',
  },
  {
    id: 'log-2026-07-09-back-extension',
    date: '2026-07-09',
    exerciseId: 'back-extension',
    exerciseName: 'Back Extension',
    category: 'pull',
    weight: 90,
    weightUnit: 'lb',
    sets: 3,
    reps: 12,
  },
  {
    id: 'log-2026-07-14-biceps-curl',
    date: '2026-07-14',
    exerciseId: 'biceps-curl',
    exerciseName: 'Biceps Curl',
    category: 'pull',
    weight: 20,
    weightUnit: 'lb',
    sets: 3,
    reps: 12,
  },
  {
    id: 'log-2026-07-14-lat-pulldown',
    date: '2026-07-14',
    exerciseId: 'lat-pulldown',
    exerciseName: 'Lat Pulldown',
    category: 'pull',
    weight: 65,
    weightUnit: 'lb',
    sets: 2,
    reps: 12,
  },
  {
    id: 'log-2026-07-14-rear-delt-fly',
    date: '2026-07-14',
    exerciseId: 'rear-delt-fly',
    exerciseName: 'Rear Delt Fly',
    category: 'pull',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-14-seated-row',
    date: '2026-07-14',
    exerciseId: 'seated-row',
    exerciseName: 'Seated Row',
    category: 'pull',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Same weight as previous session',
  },
  {
    id: 'log-2026-07-14-back-extension',
    date: '2026-07-14',
    exerciseId: 'back-extension',
    exerciseName: 'Back Extension',
    category: 'pull',
    weight: 90,
    weightUnit: 'lb',
    sets: 3,
    reps: 12,
    notes: 'Same weight as previous session',
  },
  {
    id: 'log-2026-07-15-leg-press',
    date: '2026-07-15',
    exerciseId: 'leg-press',
    exerciseName: 'Leg Press',
    category: 'legs',
    weight: 90,
    weightUnit: 'lb',
    sets: 3,
    reps: 12,
  },
  {
    id: 'log-2026-07-15-leg-press-single',
    date: '2026-07-15',
    exerciseId: 'leg-press-single',
    exerciseName: 'Leg Press (Single Leg)',
    category: 'legs',
    weight: 30,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Each leg',
  },
  {
    id: 'log-2026-07-15-leg-press-calf',
    date: '2026-07-15',
    exerciseId: 'leg-press',
    exerciseName: 'Leg Press Calf Raises',
    category: 'legs',
    weight: 60,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-15-leg-extension',
    date: '2026-07-15',
    exerciseId: 'leg-extension',
    exerciseName: 'Leg Extension',
    category: 'legs',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-15-leg-curl',
    date: '2026-07-15',
    exerciseId: 'leg-curl',
    exerciseName: 'Leg Curl',
    category: 'legs',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 12,
    notes: 'Seated variation',
  },
  {
    id: 'log-2026-07-15-adductor',
    date: '2026-07-15',
    exerciseId: 'adductor',
    exerciseName: 'Hip Adductor',
    category: 'legs',
    weight: 60,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-15-abductor',
    date: '2026-07-15',
    exerciseId: 'abductor',
    exerciseName: 'Hip Abductor',
    category: 'legs',
    weight: 70,
    weightUnit: 'lb',
    sets: 2,
    reps: 10,
  },
  {
    id: 'log-2026-07-15-glute-kickback',
    date: '2026-07-15',
    exerciseId: 'glute-kickback',
    exerciseName: 'Glute Kickback',
    category: 'glutes',
    weight: 35,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-16-shoulder-press',
    date: '2026-07-16',
    exerciseId: 'shoulder-press',
    exerciseName: 'Shoulder Press',
    category: 'push',
    weight: 30,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-16-pec-deck',
    date: '2026-07-16',
    exerciseId: 'pec-deck',
    exerciseName: 'Pec Deck',
    category: 'push',
    weight: 40,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Felt easy — consider increasing next week',
  },
  {
    id: 'log-2026-07-16-chest-press',
    date: '2026-07-16',
    exerciseId: 'chest-press',
    exerciseName: 'Chest Press',
    category: 'push',
    weight: 47.5,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
  },
  {
    id: 'log-2026-07-16-triceps-extension',
    date: '2026-07-16',
    exerciseId: 'triceps-extension',
    exerciseName: 'Triceps Extension',
    category: 'push',
    weight: 50,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Felt easy — consider increasing next week',
  },
  {
    id: 'log-2026-07-16-triceps-press',
    date: '2026-07-16',
    exerciseId: 'triceps-press',
    exerciseName: 'Triceps Press',
    category: 'push',
    weight: 80,
    weightUnit: 'lb',
    sets: 3,
    reps: 10,
    notes: 'Same weight as previous session',
  },
];

export const LOCAL_STORAGE_KEY = 'ruutulian-workout-logs';

export interface BodyStatsEntry {
  id: string;
  date: string;
  weightLb: number;
  waistIn: number;
  notes?: string;
}

export const BODY_GOALS = {
  weightLb: 120,
  waistIn: 27,
} as const;

export const BODY_STATS_BASELINE: BodyStatsEntry = {
  id: 'body-baseline-2026-07-17',
  date: '2026-07-17',
  weightLb: 137,
  waistIn: 30,
};

export const BODY_STATS_STORAGE_KEY = 'ruutulian-body-stats';
