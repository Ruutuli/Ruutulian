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
    if (value && value.type === dateType) {
      onChange({ ...value, ...updates } as EventDateData);
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
              value={(value as ExactDate)?.year || ''}
              onChange={(e) => updateValue({ year: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Month (optional)</label>
              <input
                type="number"
                min="1"
                max="12"
                value={(value as ExactDate)?.month || ''}
                onChange={(e) => updateValue({ month: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Day (optional)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={(value as ExactDate)?.day || ''}
                onChange={(e) => updateValue({ day: e.target.value ? parseInt(e.target.value) : undefined })}
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
                value={(value as ApproximateDate)?.year || ''}
                onChange={(e) => updateValue({ year: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Year Range (optional)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={(value as ApproximateDate)?.year_range?.[0] || ''}
                  onChange={(e) => {
                    const range = (value as ApproximateDate)?.year_range || [0, 0];
                    updateValue({ year_range: [parseInt(e.target.value) || 0, range[1]] });
                  }}
                  placeholder="Start"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
                <input
                  type="number"
                  value={(value as ApproximateDate)?.year_range?.[1] || ''}
                  onChange={(e) => {
                    const range = (value as ApproximateDate)?.year_range || [0, 0];
                    updateValue({ year_range: [range[0], parseInt(e.target.value) || 0] });
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
                value={(value as DateRange)?.start?.year || ''}
                onChange={(e) => {
                  const range = value as DateRange;
                  updateValue({
                    start: { ...range?.start, year: parseInt(e.target.value) || 0 },
                  });
                }}
                placeholder="Year"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={(value as DateRange)?.start?.month || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      start: { ...range?.start, month: e.target.value ? parseInt(e.target.value) : undefined },
                    });
                  }}
                  placeholder="Month (optional)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={(value as DateRange)?.start?.day || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      start: { ...range?.start, day: e.target.value ? parseInt(e.target.value) : undefined },
                    });
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
                value={(value as DateRange)?.end?.year || ''}
                onChange={(e) => {
                  const range = value as DateRange;
                  updateValue({
                    end: { ...range?.end, year: parseInt(e.target.value) || 0 },
                  });
                }}
                placeholder="Year"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                required
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={(value as DateRange)?.end?.month || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      end: { ...range?.end, month: e.target.value ? parseInt(e.target.value) : undefined },
                    });
                  }}
                  placeholder="Month (optional)"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-gray-100"
                />
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={(value as DateRange)?.end?.day || ''}
                  onChange={(e) => {
                    const range = value as DateRange;
                    updateValue({
                      end: { ...range?.end, day: e.target.value ? parseInt(e.target.value) : undefined },
                    });
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

