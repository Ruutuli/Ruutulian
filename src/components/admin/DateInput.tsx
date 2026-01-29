'use client';

import { useState, useEffect } from 'react';
import type { EventDateData, ExactDate, ApproximateDate, DateRange, RelativeDate, UnknownDate } from '@/types/oc';

interface DateInputProps {
  value: EventDateData | null | undefined;
  onChange: (value: EventDateData | null) => void;
  availableEras?: string[]; // Available era options from timeline (e.g., ["BE", "SE"])
}

export function DateInput({ value, onChange, availableEras }: DateInputProps) {
  const [dateType, setDateType] = useState<'exact' | 'approximate' | 'range' | 'relative' | 'unknown'>(
    value?.type || 'exact'
  );

  useEffect(() => {
    if (value?.type) {
      setDateType(value.type);
    }
  }, [value]);

  const handleTypeChange = (newType: typeof dateType) => {
    setDateType(newType);
    // Reset to default for new type
    switch (newType) {
      case 'exact':
        onChange({ type: 'exact', era: null, year: new Date().getFullYear(), approximate: false });
        break;
      case 'approximate':
        onChange({ type: 'approximate', text: '' });
        break;
      case 'range':
        onChange({
          type: 'range',
          start: { era: null, year: new Date().getFullYear() },
          end: { era: null, year: new Date().getFullYear() },
        });
        break;
      case 'relative':
        onChange({ type: 'relative', text: '' });
        break;
      case 'unknown':
        onChange({ type: 'unknown', text: 'Date unknown' });
        break;
    }
  };

  const updateValue = (updates: Partial<EventDateData>) => {
    // If value exists and type matches, merge updates
    if (value && value.type === dateType) {
      onChange({ ...value, ...updates } as EventDateData);
    } else {
      // If value doesn't exist or type doesn't match, create new value based on current dateType
      // Preserve existing fields from current value if it exists and is compatible
      const baseValue: EventDateData = (() => {
        switch (dateType) {
          case 'exact': {
            const existing = value && value.type === 'exact' ? value : null;
            return {
              type: 'exact' as const,
              era: existing?.era ?? null,
              year: existing?.year ?? new Date().getFullYear(),
              month: existing?.month,
              day: existing?.day,
              approximate: existing?.approximate ?? false,
            };
          }
          case 'approximate': {
            const existing = value && value.type === 'approximate' ? value : null;
            return {
              type: 'approximate' as const,
              text: existing?.text ?? '',
              year: existing?.year,
              year_range: existing?.year_range,
            };
          }
          case 'range': {
            const existing = value && value.type === 'range' ? value : null;
            return {
              type: 'range' as const,
              start: existing?.start ?? { era: null, year: new Date().getFullYear() },
              end: existing?.end ?? { era: null, year: new Date().getFullYear() },
              text: existing?.text,
            };
          }
          case 'relative': {
            const existing = value && value.type === 'relative' ? value : null;
            return {
              type: 'relative' as const,
              text: existing?.text ?? '',
              reference_event_id: existing?.reference_event_id,
            };
          }
          case 'unknown': {
            const existing = value && value.type === 'unknown' ? value : null;
            return {
              type: 'unknown' as const,
              text: existing?.text ?? 'Date unknown',
            };
          }
        }
      })();
      onChange({ ...baseValue, ...updates } as EventDateData);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Date Type</label>
        <select
          value={dateType}
          onChange={(e) => handleTypeChange(e.target.value as typeof dateType)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
        >
          <option value="exact">Exact Date</option>
          <option value="approximate">Approximate Date</option>
          <option value="range">Date Range</option>
          <option value="relative">Relative Date</option>
          <option value="unknown">Unknown Date</option>
        </select>
      </div>

      {dateType === 'exact' && (
        <div className="space-y-2">
          {availableEras && availableEras.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Era (optional)</label>
              <select
                value={(value as ExactDate)?.era || ''}
                onChange={(e) => updateValue({ era: e.target.value || null })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              >
                <option value="">No Era</option>
                {availableEras.map((era) => (
                  <option key={era} value={era}>
                    {era}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Year *</label>
            <input
              type="number"
              value={(value as ExactDate)?.year ?? ''}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '') {
                  updateValue({ year: 0 });
                } else {
                  const numValue = Number(inputValue);
                  if (!isNaN(numValue)) {
                    updateValue({ year: numValue });
                  }
                }
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Month (optional)</label>
              <select
                value={(value as ExactDate)?.month ?? ''}
                onChange={(e) => {
                  const monthValue = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  updateValue({ month: monthValue });
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              >
                <option value="">Select month...</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Day (optional)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={(value as ExactDate)?.day ?? ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    updateValue({ day: undefined });
                  } else {
                    const numValue = Number(inputValue);
                    if (!isNaN(numValue)) {
                      updateValue({ day: numValue });
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={(value as ExactDate)?.approximate || false}
              onChange={(e) => updateValue({ approximate: e.target.checked })}
              className="w-4 h-4 text-purple-600 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
            />
            <label className="text-sm text-gray-300">
              Approximate date (shows ~)
            </label>
          </div>
        </div>
      )}

      {dateType === 'approximate' && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
            <input
              type="text"
              value={(value as ApproximateDate)?.text || ''}
              onChange={(e) => updateValue({ text: e.target.value })}
              placeholder="e.g., circa 500 BCE, early 3rd century"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Approximate Year (optional)</label>
              <input
                type="number"
                value={(value as ApproximateDate)?.year ?? ''}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    updateValue({ year: undefined });
                  } else {
                    const numValue = Number(inputValue);
                    if (!isNaN(numValue)) {
                      updateValue({ year: numValue });
                    }
                  }
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Year Range (optional)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={(value as ApproximateDate)?.year_range?.[0] ?? ''}
                  onChange={(e) => {
                    const range = (value as ApproximateDate)?.year_range || [0, 0];
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      updateValue({ year_range: [0, range[1]] });
                    } else {
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue)) {
                        updateValue({ year_range: [numValue, range[1]] });
                      }
                    }
                  }}
                  placeholder="Start"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
                <input
                  type="number"
                  value={(value as ApproximateDate)?.year_range?.[1] ?? ''}
                  onChange={(e) => {
                    const range = (value as ApproximateDate)?.year_range || [0, 0];
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      updateValue({ year_range: [range[0], 0] });
                    } else {
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue)) {
                        updateValue({ year_range: [range[0], numValue] });
                      }
                    }
                  }}
                  placeholder="End"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {dateType === 'range' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <div className="space-y-2">
              {availableEras && availableEras.length > 0 && (
                <select
                  value={(value as DateRange)?.start?.era || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      start: { ...range?.start, era: e.target.value || null },
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                >
                  <option value="">No Era</option>
                  {availableEras.map((era) => (
                    <option key={era} value={era}>
                      {era}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                value={(value as DateRange)?.start?.year ?? ''}
                onChange={(e) => {
                  const range = value as DateRange;
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    updateValue({
                      start: { ...range?.start, year: 0 },
                    });
                  } else {
                    const numValue = Number(inputValue);
                    if (!isNaN(numValue)) {
                      updateValue({
                        start: { ...range?.start, year: numValue },
                      });
                    }
                  }
                }}
                placeholder="Year"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={(value as DateRange)?.start?.month ?? ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    const monthValue = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    updateValue({
                      start: { ...range?.start, month: monthValue },
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                >
                  <option value="">Select month...</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={(value as DateRange)?.start?.day ?? ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      updateValue({
                        start: { ...range?.start, day: undefined },
                      });
                    } else {
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue)) {
                        updateValue({
                          start: { ...range?.start, day: numValue },
                        });
                      }
                    }
                  }}
                  placeholder="Day (optional)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <div className="space-y-2">
              {availableEras && availableEras.length > 0 && (
                <select
                  value={(value as DateRange)?.end?.era || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      end: { ...range?.end, era: e.target.value || null },
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                >
                  <option value="">No Era</option>
                  {availableEras.map((era) => (
                    <option key={era} value={era}>
                      {era}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="number"
                value={(value as DateRange)?.end?.year ?? ''}
                onChange={(e) => {
                  const range = value as DateRange;
                  const inputValue = e.target.value;
                  if (inputValue === '') {
                    updateValue({
                      end: { ...range?.end, year: 0 },
                    });
                  } else {
                    const numValue = Number(inputValue);
                    if (!isNaN(numValue)) {
                      updateValue({
                        end: { ...range?.end, year: numValue },
                      });
                    }
                  }
                }}
                placeholder="Year"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={(value as DateRange)?.end?.month ?? ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    const monthValue = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    updateValue({
                      end: { ...range?.end, month: monthValue },
                    });
                  }}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                >
                  <option value="">Select month...</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={(value as DateRange)?.end?.day ?? ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    const inputValue = e.target.value;
                    if (inputValue === '') {
                      updateValue({
                        end: { ...range?.end, day: undefined },
                      });
                    } else {
                      const numValue = Number(inputValue);
                      if (!isNaN(numValue)) {
                        updateValue({
                          end: { ...range?.end, day: numValue },
                        });
                      }
                    }
                  }}
                  placeholder="Day (optional)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Range Description (optional)</label>
            <input
              type="text"
              value={(value as DateRange)?.text || ''}
              onChange={(e) => updateValue({ text: e.target.value })}
              placeholder="e.g., Spring to Summer 500 BCE"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
            />
          </div>
        </div>
      )}

      {dateType === 'relative' && (
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Relative Description *</label>
            <input
              type="text"
              value={(value as RelativeDate)?.text || ''}
              onChange={(e) => updateValue({ text: e.target.value })}
              placeholder="e.g., Before the Great War, After Character X's birth"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Reference Event ID (optional)</label>
            <input
              type="text"
              value={(value as RelativeDate)?.reference_event_id || ''}
              onChange={(e) => updateValue({ reference_event_id: e.target.value })}
              placeholder="UUID of referenced event"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
            />
          </div>
        </div>
      )}

      {dateType === 'unknown' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description (optional)</label>
          <input
            type="text"
            value={(value as UnknownDate)?.text || ''}
            onChange={(e) => updateValue({ text: e.target.value })}
            placeholder="e.g., Date unknown, Time period unclear"
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
          />
        </div>
      )}
    </div>
  );
}

