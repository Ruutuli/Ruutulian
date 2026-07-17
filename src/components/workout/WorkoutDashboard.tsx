'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart } from '@/components/stats/LineChart';
import { BarChart } from '@/components/stats/BarChart';
import { StatCard } from '@/components/stats/StatCard';
import { StatsSection } from '@/components/stats/StatsSection';
import {
  ROUTINE,
  WORKOUT_GOALS,
  HOME_AB_CIRCUIT,
  WEEKLY_SPLIT,
  GYM_CARDIO,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  LOCAL_STORAGE_KEY,
  BODY_GOALS,
  BODY_STATS_STORAGE_KEY,
  type WorkoutCategory,
  type WorkoutLogEntry,
  type BodyStatsEntry,
} from '@/lib/workout/data';
import {
  mergeLogs,
  getLatestLogs,
  getGrowthData,
  getProgressChartData,
  getExercisesWithProgress,
  formatWeight,
  formatExercisePrescription,
  formatLogSummary,
  isWeightedExercise,
  getRoutineByCategory,
  getExercisesForTrainingDay,
  formatLongDate,
  formatSettings,
  groupCompleteLogsByDate,
  isInferredLog,
  getWorkoutDays,
  getDefaultRepsValue,
  getTodayLocalDate,
  sanitizeWorkoutLogs,
  mergeBodyStats,
  getLatestBodyStats,
  getBodyGoalProgress,
  sanitizeBodyStats,
} from '@/lib/workout/utils';

const ROUTINE_CATEGORIES: WorkoutCategory[] = ['legs', 'push', 'pull', 'glutes', 'core'];

type Tab = 'overview' | 'routine' | 'weights' | 'log' | 'charts';

const TABS: { id: Tab; label: string; shortLabel: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview', icon: 'fas fa-home' },
  { id: 'routine', label: 'Routine', shortLabel: 'Routine', icon: 'fas fa-list' },
  { id: 'weights', label: 'Current Weights', shortLabel: 'Weights', icon: 'fas fa-dumbbell' },
  { id: 'log', label: 'Progress Log', shortLabel: 'Log', icon: 'fas fa-clipboard-list' },
  { id: 'charts', label: 'Charts', shortLabel: 'Charts', icon: 'fas fa-chart-line' },
];

const INPUT_CLASS =
  'w-full bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-3 sm:py-2 text-base sm:text-sm min-h-[44px] sm:min-h-0';
const BTN_PRIMARY =
  'inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto';
const BTN_SECONDARY =
  'inline-flex items-center justify-center min-h-[44px] px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto';

const CHART_COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#14b8a6'];

export function WorkoutDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [extraLogs, setExtraLogs] = useState<WorkoutLogEntry[]>([]);
  const [extraBodyStats, setExtraBodyStats] = useState<BodyStatsEntry[]>([]);
  const [selectedChartExercise, setSelectedChartExercise] = useState<string>('all');
  const [showLogForm, setShowLogForm] = useState(false);
  const [showBodyForm, setShowBodyForm] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        setExtraLogs(sanitizeWorkoutLogs(JSON.parse(stored)));
      }
      const storedBody = localStorage.getItem(BODY_STATS_STORAGE_KEY);
      if (storedBody) {
        setExtraBodyStats(sanitizeBodyStats(JSON.parse(storedBody)));
      }
    } catch {
      // ignore corrupt local storage
    }
  }, []);

  const allLogs = useMemo(() => mergeLogs(extraLogs), [extraLogs]);
  const allBodyStats = useMemo(() => mergeBodyStats(extraBodyStats), [extraBodyStats]);
  const latestBody = useMemo(() => getLatestBodyStats(allBodyStats), [allBodyStats]);
  const baselineBody = allBodyStats[0];
  const weightProgress = useMemo(
    () => getBodyGoalProgress(latestBody.weightLb, BODY_GOALS.weightLb, baselineBody.weightLb),
    [latestBody.weightLb, baselineBody.weightLb]
  );
  const waistProgress = useMemo(
    () => getBodyGoalProgress(latestBody.waistIn, BODY_GOALS.waistIn, baselineBody.waistIn),
    [latestBody.waistIn, baselineBody.waistIn]
  );
  const currentWeights = useMemo(() => getLatestLogs(allLogs), [allLogs]);
  const growthData = useMemo(() => getGrowthData(currentWeights), [currentWeights]);
  const exercisesWithProgress = useMemo(() => getExercisesWithProgress(allLogs), [allLogs]);
  const logsByDate = useMemo(() => groupCompleteLogsByDate(allLogs), [allLogs]);
  const trackedExerciseCount = useMemo(() => {
    const validIds = new Set(ROUTINE.map((exercise) => exercise.id));
    return new Set(allLogs.filter((log) => validIds.has(log.exerciseId)).map((log) => log.exerciseId)).size;
  }, [allLogs]);

  const chartData = useMemo(() => {
    if (selectedChartExercise === 'all') {
      const topExercises = exercisesWithProgress.slice(0, 4).map((exercise) => exercise.id);
      return getProgressChartData(allLogs, topExercises);
    }
    return getProgressChartData(allLogs, [selectedChartExercise]);
  }, [allLogs, selectedChartExercise, exercisesWithProgress]);

  const chartKeys = useMemo(() => {
    if (selectedChartExercise === 'all') {
      return exercisesWithProgress.slice(0, 4).map((exercise, index) => ({
        key: exercise.name,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
    }
    const exercise = ROUTINE.find((item) => item.id === selectedChartExercise);
    return exercise
      ? [{ key: exercise.name, color: CATEGORY_COLORS[exercise.category] }]
      : [];
  }, [selectedChartExercise, exercisesWithProgress]);

  useEffect(() => {
    if (selectedChartExercise === 'all') return;
    const stillExists = exercisesWithProgress.some((exercise) => exercise.id === selectedChartExercise);
    if (!stillExists) {
      setSelectedChartExercise('all');
    }
  }, [selectedChartExercise, exercisesWithProgress]);

  const gainPercentData = useMemo(
    () =>
      growthData.slice(0, 10).map((entry) => ({
        name: entry.name,
        value: entry.gainPercent,
      })),
    [growthData]
  );

  const biggestGain = growthData[0];
  const totalSessions = getWorkoutDays(allLogs);

  function saveExtraLogs(logs: WorkoutLogEntry[]) {
    const sanitizedLogs = sanitizeWorkoutLogs(logs);
    setExtraLogs(sanitizedLogs);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sanitizedLogs));
    } catch {
      // ignore storage write failures
    }
  }

  function saveExtraBodyStats(entries: BodyStatsEntry[]) {
    const sanitized = sanitizeBodyStats(entries);
    setExtraBodyStats(sanitized);
    try {
      localStorage.setItem(BODY_STATS_STORAGE_KEY, JSON.stringify(sanitized));
    } catch {
      // ignore storage write failures
    }
  }

  function handleAddBodyStats(entry: Omit<BodyStatsEntry, 'id'>) {
    const newEntry: BodyStatsEntry = {
      ...entry,
      id: `body-${Date.now()}`,
    };
    saveExtraBodyStats([...extraBodyStats, newEntry]);
    setShowBodyForm(false);
  }

  function handleAddLog(entry: Omit<WorkoutLogEntry, 'id'>) {
    const newEntry: WorkoutLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${entry.exerciseId}`,
    };
    saveExtraLogs([...extraLogs, newEntry]);
    setShowLogForm(false);
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 sm:static sm:mx-0 sm:px-0 sm:py-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex shrink-0 items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              }`}
            >
              <i className={tab.icon} />
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Gym Split"
              value={`${WORKOUT_GOALS.gymDaysPerWeek}x/week`}
              subtitle={WORKOUT_GOALS.split}
              color="#8b5cf6"
              icon="fas fa-calendar-week"
            />
            <StatCard
              title="Workout Days"
              value={totalSessions}
              subtitle="Logged sessions"
              color="#3b82f6"
              icon="fas fa-fire"
            />
            <StatCard
              title="Exercises Tracked"
              value={trackedExerciseCount}
              subtitle={`of ${ROUTINE.length} in routine`}
              color="#10b981"
              icon="fas fa-dumbbell"
            />
            <StatCard
              title="Biggest Gain"
              value={biggestGain ? `+${biggestGain.gainPercent}%` : '—'}
              subtitle={biggestGain?.name ?? 'Log more to see growth'}
              color="#ec4899"
              icon="fas fa-arrow-trend-up"
            />
          </div>

          <StatsSection title="Body Goals" icon="fas fa-bullseye" iconColor="text-pink-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <BodyGoalCard
                label="Weight"
                current={latestBody.weightLb}
                goal={BODY_GOALS.weightLb}
                unit="lb"
                remaining={weightProgress.remaining}
                percent={weightProgress.percent}
                color="#ec4899"
                asOf={latestBody.date}
              />
              <BodyGoalCard
                label="Waist"
                current={latestBody.waistIn}
                goal={BODY_GOALS.waistIn}
                unit="in"
                remaining={waistProgress.remaining}
                percent={waistProgress.percent}
                color="#f472b6"
                asOf={latestBody.date}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
              <p className="text-sm text-gray-500">
                Baseline {baselineBody.weightLb} lb · {baselineBody.waistIn} in waist (
                {formatLongDate(baselineBody.date)})
              </p>
              <button
                type="button"
                onClick={() => setShowBodyForm((value) => !value)}
                className={`${BTN_PRIMARY} bg-pink-600 hover:bg-pink-500 text-white shrink-0`}
              >
                <i className="fas fa-pen mr-2" />
                Update Measurements
              </button>
            </div>
            {showBodyForm && (
              <BodyStatsForm
                defaults={latestBody}
                onSubmit={handleAddBodyStats}
                onCancel={() => setShowBodyForm(false)}
              />
            )}
          </StatsSection>

          <StatsSection title="Weekly Split" icon="fas fa-calendar-week" iconColor="text-purple-400">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WEEKLY_SPLIT.map((day) => (
                <div key={day.key} className="wiki-card p-5 border-l-4" style={{ borderLeftColor: day.color }}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <i className={`${day.icon} text-sm`} style={{ color: day.color }} />
                        <h4 className="text-gray-200 font-semibold">{day.title}</h4>
                        {day.status && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                            {day.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{day.subtitle}</p>
                      <p className="text-xs text-gray-500 mt-2 capitalize">{day.location}</p>
                    </div>
                    <span className="text-2xl font-bold" style={{ color: day.color }}>
                      {getExercisesForTrainingDay(day.key).length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {WORKOUT_GOALS.gymDaysPerWeek} gym days per week — {GYM_CARDIO.machine}{' '}
              {GYM_CARDIO.minutes} min before & after at level {GYM_CARDIO.level}. Home abs are separate.
              Exercises not logged on a day are shown at the same weight as your previous session.
            </p>
          </StatsSection>

          <div className="wiki-card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Training Goals</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Schedule</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.gymDaysPerWeek} days/week</p>
              </div>
              <div>
                <span className="text-gray-500">Split</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.split}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <span className="text-gray-500">Cardio</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.cardio}</p>
              </div>
              <div>
                <span className="text-gray-500">Sets</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.sets}</p>
              </div>
              <div>
                <span className="text-gray-500">Rep Range</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.repRange}</p>
              </div>
              <div>
                <span className="text-gray-500">Rest</span>
                <p className="text-gray-200 font-medium">{WORKOUT_GOALS.restSeconds} sec</p>
              </div>
            </div>
          </div>

          {growthData.length > 0 && (
            <StatsSection title="Recent Progress" icon="fas fa-chart-line" iconColor="text-green-400">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {growthData.slice(0, 6).map((entry) => (
                  <div key={entry.exerciseId} className="wiki-card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-200 font-medium">{entry.name}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${entry.color}22`, color: entry.color }}
                      >
                        {CATEGORY_LABELS[entry.category]}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                      <span className="text-2xl font-bold" style={{ color: entry.color }}>
                        {entry.current} lb
                      </span>
                      <span className="text-sm text-green-400">+{entry.gain} lb ({entry.gainPercent}%)</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Started at {entry.starting} lb</p>
                  </div>
                ))}
              </div>
            </StatsSection>
          )}

          <StatsSection title="Latest Session" icon="fas fa-clock" iconColor="text-blue-400">
            {logsByDate.size > 0 ? (
              <LatestSession logs={[...logsByDate.values()][0]} date={[...logsByDate.keys()][0]} />
            ) : (
              <p className="text-gray-500">No sessions logged yet.</p>
            )}
          </StatsSection>
        </div>
      )}

      {activeTab === 'routine' && (
        <div className="space-y-8">
          {WEEKLY_SPLIT.filter((day) => day.key !== 'home').map((day) => (
            <TrainingDaySection
              key={day.key}
              day={day}
              currentWeights={currentWeights}
            />
          ))}

          {WEEKLY_SPLIT.filter((day) => day.key === 'home').map((day) => (
            <StatsSection
              key={day.key}
              title={day.title}
              icon={day.icon}
              iconColor="text-amber-400"
            >
              <p className="text-sm text-gray-400 -mt-4 mb-4">{day.subtitle}</p>
              {day.status && (
                <p className="text-sm text-amber-400/90 mb-4">{day.status}</p>
              )}

              <div className="wiki-card p-5 mb-4 border border-amber-500/20">
                <h4 className="text-gray-200 font-semibold mb-2">Ab Circuit — {HOME_AB_CIRCUIT.rounds} rounds</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-400">
                  <p>
                    <span className="text-gray-500">Between moves:</span> {HOME_AB_CIRCUIT.restBetweenMoves}
                  </p>
                  <p>
                    <span className="text-gray-500">Between rounds:</span> {HOME_AB_CIRCUIT.restBetweenRounds}
                  </p>
                  <p>
                    <span className="text-gray-500">Where:</span> Home
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">{HOME_AB_CIRCUIT.notes}</p>
              </div>

              <div className="space-y-3 mb-4">
                {getRoutineByCategory('core')
                  .filter((exercise) => exercise.circuitOrder)
                  .map((exercise) => (
                    <div key={exercise.id} className="wiki-card p-4 flex gap-4">
                      <div
                        className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: `${CATEGORY_COLORS.core}33`, color: CATEGORY_COLORS.core }}
                      >
                        {exercise.circuitOrder}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-gray-200 font-semibold">{exercise.name}</h4>
                          {exercise.isFinisher && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              Finisher
                            </span>
                          )}
                          <span className="text-sm text-amber-400/90">{formatExercisePrescription(exercise)}</span>
                        </div>
                        {exercise.cue && <p className="text-sm text-gray-500 mt-1">{exercise.cue}</p>}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getExercisesForTrainingDay('home')
                  .filter((exercise) => !exercise.circuitOrder)
                  .map((exercise) => (
                    <RoutineCard
                      key={exercise.id}
                      exercise={exercise}
                      current={currentWeights.find((entry) => entry.exerciseId === exercise.id)}
                    />
                  ))}
              </div>
            </StatsSection>
          ))}
        </div>
      )}

      {activeTab === 'weights' && (
        <div className="space-y-8">
          {ROUTINE_CATEGORIES.map((category) => {
            const weights = currentWeights.filter((entry) => {
              const routine = ROUTINE.find((exercise) => exercise.id === entry.exerciseId);
              return entry.category === category && routine && isWeightedExercise(routine);
            });
            if (weights.length === 0) return null;

            return (
              <StatsSection
                key={category}
                title={CATEGORY_LABELS[category]}
                icon="fas fa-weight-hanging"
                iconColor="text-purple-400"
              >
                <div className="md:hidden space-y-3">
                  {weights.map((entry) => (
                    <WeightMobileCard key={entry.exerciseId} entry={entry} />
                  ))}
                </div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm min-w-[640px]">
                    <thead>
                      <tr className="border-b border-gray-700 text-gray-400 text-left">
                        <th className="pb-3 pr-4 font-medium">Exercise</th>
                        <th className="pb-3 pr-4 font-medium">Weight</th>
                        <th className="pb-3 pr-4 font-medium">Sets × Reps</th>
                        <th className="pb-3 font-medium">Last Updated</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weights.map((entry) => {
                        const routine = ROUTINE.find((exercise) => exercise.id === entry.exerciseId);
                        const starting = routine?.startingWeight;
                        const gained =
                          starting !== null &&
                          starting !== undefined &&
                          entry.weight !== null &&
                          entry.weight > starting;

                        return (
                          <tr key={entry.exerciseId} className="border-b border-gray-800">
                            <td className="py-3 pr-4 text-gray-200">
                              {entry.exerciseName}
                              {routine?.location === 'home' && (
                                <span className="ml-2 text-xs text-gray-500">(home)</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-gray-100 font-medium">
                                {formatWeight(entry.weight, entry.weightUnit)}
                              </span>
                              {gained && (
                                <span className="ml-2 text-xs text-green-400">
                                  +{entry.weight! - starting!} lb
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4 text-gray-400">
                              {entry.sets} × {entry.reps}
                            </td>
                            <td className="py-3 text-gray-500">{formatLongDate(entry.lastDate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </StatsSection>
            );
          })}

          <StatsSection title="Home Abs" icon="fas fa-house" iconColor="text-amber-400">
            <div className="wiki-card p-5 text-sm text-gray-400">
              <p className="text-gray-300 mb-2">Bodyweight circuit — track by feel, not weight.</p>
              <p>
                {HOME_AB_CIRCUIT.rounds} rounds · {HOME_AB_CIRCUIT.restBetweenMoves} between moves ·{' '}
                {HOME_AB_CIRCUIT.restBetweenRounds} between rounds
              </p>
              <p className="mt-2 text-gray-500">
                Log hold times or reps in the Progress Log when you want to track improvements (plank duration,
                dragon flag attempts, etc.).
              </p>
            </div>
          </StatsSection>
        </div>
      )}

      {activeTab === 'log' && (
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-gray-400 text-sm">
              {allLogs.length} entries · {extraLogs.length} saved locally
            </p>
            <button
              type="button"
              onClick={() => setShowLogForm((value) => !value)}
              className={`${BTN_PRIMARY} bg-purple-600 hover:bg-purple-500 text-white shrink-0`}
            >
              <i className="fas fa-plus mr-2" />
              Log Workout
            </button>
          </div>

          {showLogForm && <LogForm onSubmit={handleAddLog} onCancel={() => setShowLogForm(false)} />}

          <div className="space-y-6">
            {[...logsByDate.entries()].map(([date, logs]) => (
              <div key={date} className="wiki-card p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-4">{formatLongDate(date)}</h3>
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between py-3 border-b border-gray-800 last:border-0"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-gray-200 font-medium break-words">{log.exerciseName}</span>
                          {isInferredLog(log) && (
                            <span className="text-xs text-gray-500">(carried over)</span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[log.category]}22`,
                              color: CATEGORY_COLORS[log.category],
                            }}
                          >
                            {CATEGORY_LABELS[log.category]}
                          </span>
                        </div>
                        {log.notes && <p className="text-xs text-gray-500 mt-1 break-words">{log.notes}</p>}
                      </div>
                      <div className="text-sm text-gray-200 font-medium sm:text-right shrink-0">
                        {formatLogSummary(log)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-8">
          <div className="wiki-card p-4">
            <label htmlFor="chart-exercise" className="text-sm text-gray-400 block mb-2">
              Exercise filter
            </label>
            <select
              id="chart-exercise"
              value={selectedChartExercise}
              onChange={(event) => setSelectedChartExercise(event.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-200 rounded-lg px-3 py-2 text-sm w-full md:w-auto"
            >
              <option value="all">Top exercises (combined)</option>
              {exercisesWithProgress.map((exercise) => (
                <option key={exercise.id} value={exercise.id}>
                  {exercise.name}
                </option>
              ))}
            </select>
          </div>

          {chartData.length > 0 && chartKeys.length > 0 ? (
            <LineChart
              data={chartData}
              dataKeys={chartKeys}
              title="Weight Progress Over Time"
              height={280}
            />
          ) : (
            <div className="wiki-card p-8 text-center text-gray-500">
              Log at least 2 sessions per exercise to see progress charts.
            </div>
          )}

          {growthData.length > 0 && (
            <StatsSection title="Starting vs Current" icon="fas fa-chart-bar" iconColor="text-purple-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {growthData.map((entry) => (
                  <div key={entry.exerciseId} className="wiki-card p-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-gray-200 font-medium">{entry.name}</span>
                      <span className="text-sm text-green-400">+{entry.gainPercent}%</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Starting</span>
                          <span>{entry.starting} lb</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gray-600"
                            style={{ width: `${Math.min(100, (entry.starting / entry.current) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Current</span>
                          <span>{entry.current} lb</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: '100%',
                              backgroundColor: entry.color,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </StatsSection>
          )}

          {gainPercentData.length > 0 && (
            <BarChart
              data={gainPercentData}
              title="Growth % by Exercise"
              color="#10b981"
              height={Math.max(280, gainPercentData.length * 44)}
              horizontal
            />
          )}
        </div>
      )}
    </div>
  );
}

function WeightMobileCard({ entry }: { entry: ReturnType<typeof getLatestLogs>[number] }) {
  const routine = ROUTINE.find((exercise) => exercise.id === entry.exerciseId);
  const starting = routine?.startingWeight;
  const gained =
    starting !== null &&
    starting !== undefined &&
    entry.weight !== null &&
    entry.weight > starting;

  return (
    <div className="wiki-card p-4 space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-gray-200 font-medium break-words">{entry.exerciseName}</h4>
          {routine?.location === 'home' && <span className="text-xs text-gray-500">Home</span>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-gray-100 font-semibold">{formatWeight(entry.weight, entry.weightUnit)}</p>
          {gained && <p className="text-xs text-green-400">+{entry.weight! - starting!} lb</p>}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>{entry.sets} × {entry.reps}</span>
        <span>{formatLongDate(entry.lastDate)}</span>
      </div>
    </div>
  );
}

function BodyGoalCard({
  label,
  current,
  goal,
  unit,
  remaining,
  percent,
  color,
  asOf,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
  remaining: number;
  percent: number;
  color: string;
  asOf: string;
}) {
  return (
    <div className="wiki-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h4 className="text-gray-400 text-sm uppercase tracking-wide">{label}</h4>
          <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color }}>
            {current} {unit}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Goal {goal} {unit} · {remaining} {unit} to go
          </p>
        </div>
        <span className="text-sm font-medium shrink-0" style={{ color }}>
          {percent}%
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${percent}%`, backgroundColor: color }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">Last updated {formatLongDate(asOf)}</p>
    </div>
  );
}

function BodyStatsForm({
  defaults,
  onSubmit,
  onCancel,
}: {
  defaults: BodyStatsEntry;
  onSubmit: (entry: Omit<BodyStatsEntry, 'id'>) => void;
  onCancel: () => void;
}) {
  const [date, setDate] = useState(getTodayLocalDate());
  const [weightLb, setWeightLb] = useState(String(defaults.weightLb));
  const [waistIn, setWaistIn] = useState(String(defaults.waistIn));
  const [notes, setNotes] = useState('');

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const weight = parseFloat(weightLb);
    const waist = parseFloat(waistIn);
    if (!Number.isFinite(weight) || weight <= 0) return;
    if (!Number.isFinite(waist) || waist <= 0) return;

    onSubmit({
      date,
      weightLb: weight,
      waistIn: waist,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="wiki-card p-4 sm:p-5 mt-4 space-y-4">
      <h4 className="text-gray-200 font-semibold">Log Measurements</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Weight (lb)</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={weightLb}
            onChange={(event) => setWeightLb(event.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Waist (in)</label>
          <input
            type="number"
            step="0.1"
            inputMode="decimal"
            value={waistIn}
            onChange={(event) => setWaistIn(event.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <button type="submit" className={`${BTN_PRIMARY} bg-pink-600 hover:bg-pink-500 text-white`}>
          Save
        </button>
        <button type="button" onClick={onCancel} className={`${BTN_SECONDARY} bg-gray-700 hover:bg-gray-600 text-gray-300`}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function TrainingDaySection({
  day,
  currentWeights,
}: {
  day: (typeof WEEKLY_SPLIT)[number];
  currentWeights: ReturnType<typeof getLatestLogs>;
}) {
  const exercises = getExercisesForTrainingDay(day.key);

  return (
    <StatsSection title={day.title} icon={day.icon} iconColor="text-purple-400">
      <p className="text-sm text-gray-400 -mt-4 mb-2">{day.subtitle}</p>
      <p className="text-xs text-gray-500 mb-4 capitalize">Gym · {exercises.length} exercises</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exercises.map((exercise) => (
          <RoutineCard
            key={exercise.id}
            exercise={exercise}
            current={currentWeights.find((entry) => entry.exerciseId === exercise.id)}
          />
        ))}
      </div>
    </StatsSection>
  );
}

function RoutineCard({
  exercise,
  current,
}: {
  exercise: (typeof ROUTINE)[number];
  current?: ReturnType<typeof getLatestLogs>[number];
}) {
  const settings = formatSettings(exercise);
  const color = CATEGORY_COLORS[exercise.category];

  return (
    <div className={`wiki-card p-4 ${exercise.category === 'cardio' ? 'border border-red-500/20' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="text-gray-200 font-semibold break-words">{exercise.name}</h4>
          {exercise.location === 'home' && (
            <span className="text-xs text-gray-500">Home</span>
          )}
          {exercise.location === 'gym' && exercise.category === 'glutes' && (
            <span className="text-xs text-gray-500">Gym</span>
          )}
        </div>
        <span className="text-sm font-medium shrink-0 text-right" style={{ color }}>
          {formatWeight(current?.weight ?? exercise.startingWeight, exercise.weightUnit)}
        </span>
      </div>
      <p className="text-sm text-gray-400 mt-1">{formatExercisePrescription(exercise)}</p>
      {exercise.notes && <p className="text-xs text-gray-500 mt-1">{exercise.notes}</p>}
      {exercise.cue && <p className="text-xs text-gray-500 mt-1 italic">{exercise.cue}</p>}
      {settings.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {settings.map((setting) => (
            <li key={setting} className="text-xs text-gray-500">
              • {setting}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LatestSession({ logs, date }: { logs: WorkoutLogEntry[]; date: string }) {
  const categories = [...new Set(logs.map((log) => log.category))];

  return (
    <div className="wiki-card p-4 sm:p-5">
      <h3 className="text-base sm:text-lg font-semibold text-gray-200 mb-1">{formatLongDate(date)}</h3>
      <p className="text-sm text-gray-500 mb-4 break-words">
        {logs.length} exercises · {categories.map((category) => CATEGORY_LABELS[category]).join(', ')}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {logs.map((log) => (
          <div key={log.id} className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center py-2 px-3 bg-gray-800/50 rounded-lg">
            <span className="text-gray-300 text-sm break-words min-w-0">
              {log.exerciseName}
              {isInferredLog(log) && <span className="text-gray-500 text-xs ml-1">(carried)</span>}
            </span>
            <span className="text-gray-200 text-sm font-medium sm:text-right shrink-0">{formatLogSummary(log)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface LogFormProps {
  onSubmit: (entry: Omit<WorkoutLogEntry, 'id'>) => void;
  onCancel: () => void;
}

function LogForm({ onSubmit, onCancel }: LogFormProps) {
  const [exerciseId, setExerciseId] = useState(ROUTINE[0].id);
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [notes, setNotes] = useState('');
  const [date, setDate] = useState(getTodayLocalDate());

  const selectedExercise = ROUTINE.find((exercise) => exercise.id === exerciseId) ?? ROUTINE[0];
  const showWeight = selectedExercise.weightUnit === 'lb' || selectedExercise.weightUnit === 'dumbbells';
  const repsLabel =
    selectedExercise.repType === 'minutes'
      ? 'Minutes'
      : selectedExercise.repType === 'seconds'
        ? 'Seconds'
        : selectedExercise.repType === 'per_side'
          ? 'Reps (per side)'
          : 'Reps';

  useEffect(() => {
    setSets(String(selectedExercise.sets));
    setReps(String(getDefaultRepsValue(selectedExercise)));
    setWeight(selectedExercise.startingWeight !== null ? String(selectedExercise.startingWeight) : '');
  }, [selectedExercise]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const parsedWeight = showWeight && weight.trim() !== '' ? parseFloat(weight) : null;
    const parsedSets = parseInt(sets, 10);
    const parsedReps = parseInt(reps, 10);

    if (!date) return;
    if (!Number.isFinite(parsedSets) || parsedSets < 1) return;
    if (!Number.isFinite(parsedReps) || parsedReps < 1) return;
    if (showWeight && weight.trim() !== '' && (!Number.isFinite(parsedWeight) || parsedWeight! < 0)) return;

    onSubmit({
      date,
      exerciseId,
      exerciseName: selectedExercise.name,
      category: selectedExercise.category,
      weight: parsedWeight,
      weightUnit: selectedExercise.weightUnit,
      sets: parsedSets,
      reps: parsedReps,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="wiki-card p-4 sm:p-5 space-y-4">
      <h3 className="text-lg font-semibold text-gray-200">Log a Workout</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 block mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={INPUT_CLASS}
            required
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 block mb-1">Exercise</label>
          <select
            value={exerciseId}
            onChange={(event) => setExerciseId(event.target.value)}
            className={INPUT_CLASS}
          >
            {WEEKLY_SPLIT.map((day) => (
              <optgroup key={day.key} label={day.title}>
                {getExercisesForTrainingDay(day.key).map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {showWeight && (
          <div>
            <label className="text-sm text-gray-400 block mb-1">
              Weight (lb){selectedExercise.weightUnit === 'dumbbells' ? ' — dumbbell' : ''}
            </label>
            <input
              type="number"
              step="2.5"
              inputMode="decimal"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              className={INPUT_CLASS}
              required={selectedExercise.weightUnit === 'lb'}
            />
          </div>
        )}
        {selectedExercise.weightUnit === 'time' && selectedExercise.repType === 'minutes' ? (
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-400">
              Level {selectedExercise.settings?.level ?? '5'} · {selectedExercise.reps} minutes
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                {selectedExercise.category === 'core' && selectedExercise.circuitOrder ? 'Rounds completed' : 'Sets'}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={sets}
                onChange={(event) => setSets(event.target.value)}
                className={INPUT_CLASS}
                min={1}
                required
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">{repsLabel}</label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                className={INPUT_CLASS}
                min={1}
                required
              />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <label className="text-sm text-gray-400 block mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="e.g. felt easy, go up next week"
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="submit" className={`${BTN_PRIMARY} bg-purple-600 hover:bg-purple-500 text-white`}>
          Save Entry
        </button>
        <button type="button" onClick={onCancel} className={`${BTN_SECONDARY} bg-gray-700 hover:bg-gray-600 text-gray-300`}>
          Cancel
        </button>
      </div>
    </form>
  );
}
