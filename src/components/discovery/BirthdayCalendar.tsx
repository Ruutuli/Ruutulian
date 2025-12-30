'use client';

import { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format, isSameDay } from 'date-fns';
import type { OC } from '@/types/oc';
import Link from 'next/link';

interface BirthdayCalendarProps {
  ocs: OC[];
  className?: string;
}

interface BirthdayEvent {
  date: Date;
  characters: OC[];
}

export function BirthdayCalendar({ ocs, className = '' }: BirthdayCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Parse birthdays and group by date
  const birthdayEvents: BirthdayEvent[] = [];
  const birthdayMap = new Map<string, OC[]>();

  ocs.forEach((oc) => {
    if (oc.date_of_birth) {
      try {
        const date = new Date(oc.date_of_birth);
        if (!isNaN(date.getTime())) {
          // Use month-day as key (ignore year for display)
          const key = `${date.getMonth()}-${date.getDate()}`;
          if (!birthdayMap.has(key)) {
            birthdayMap.set(key, []);
          }
          birthdayMap.get(key)!.push(oc);
        }
      } catch (e) {
        // Invalid date, skip
      }
    }
  });

  // Convert map to array
  birthdayMap.forEach((characters, key) => {
    const [month, day] = key.split('-').map(Number);
    const date = new Date(2024, month, day); // Use current year for display
    birthdayEvents.push({ date, characters });
  });

  // Get characters for a specific date
  const getCharactersForDate = (date: Date): OC[] => {
    const month = date.getMonth();
    const day = date.getDate();
    const key = `${month}-${day}`;
    return birthdayMap.get(key) || [];
  };

  // Custom tile content
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const characters = getCharactersForDate(date);
      if (characters.length > 0) {
        return (
          <div className="flex flex-wrap gap-0.5 justify-center mt-1">
            {characters.slice(0, 3).map((oc) => (
              <div
                key={oc.id}
                className="w-1.5 h-1.5 rounded-full bg-purple-400"
                title={oc.name}
              />
            ))}
            {characters.length > 3 && (
              <div className="text-[8px] text-purple-400">+{characters.length - 3}</div>
            )}
          </div>
        );
      }
    }
    return null;
  };

  // Custom tile className
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const characters = getCharactersForDate(date);
      if (characters.length > 0) {
        return 'has-birthday';
      }
    }
    return null;
  };

  const selectedCharacters = selectedDate ? getCharactersForDate(selectedDate) : [];

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="wiki-card p-4 md:p-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-alt text-purple-400"></i>
          Character Birthdays
        </h2>
        
        <div className="bg-gray-900 rounded-lg p-4">
          <Calendar
            onChange={(value) => setSelectedDate(value as Date)}
            value={selectedDate}
            tileContent={tileContent}
            tileClassName={tileClassName}
            className="bg-transparent text-gray-200 border-none"
          />
        </div>

        <style jsx global>{`
          .react-calendar {
            background: transparent;
            border: none;
            font-family: inherit;
          }
          .react-calendar__navigation {
            display: flex;
            margin-bottom: 1em;
          }
          .react-calendar__navigation button {
            color: #e5e7eb;
            min-width: 44px;
            background: none;
            font-size: 16px;
            margin-top: 8px;
          }
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: #374151;
          }
          .react-calendar__month-view__weekdays {
            text-align: center;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.75em;
            color: #9ca3af;
          }
          .react-calendar__month-view__days {
            display: grid !important;
            grid-template-columns: 14.2% 14.2% 14.2% 14.2% 14.2% 14.2% 14.2%;
          }
          .react-calendar__tile {
            max-width: 100%;
            text-align: center;
            padding: 0.75em 0.5em;
            background: none;
            color: #e5e7eb;
            border-radius: 4px;
            min-height: 60px;
          }
          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
            background-color: #374151;
          }
          .react-calendar__tile--now {
            background: #8b5cf6;
            color: white;
          }
          .react-calendar__tile--active {
            background: #7c3aed;
            color: white;
          }
          .react-calendar__tile.has-birthday {
            background: rgba(139, 92, 246, 0.2);
          }
          .react-calendar__tile.has-birthday:enabled:hover {
            background: rgba(139, 92, 246, 0.3);
          }
        `}</style>
      </div>

      {selectedDate && selectedCharacters.length > 0 && (
        <div className="wiki-card p-4 md:p-6">
          <h3 className="text-xl font-bold text-gray-100 mb-4">
            Birthdays on {format(selectedDate, 'MMMM d')}
          </h3>
          <div className="space-y-3">
            {selectedCharacters.map((oc) => (
              <Link
                key={oc.id}
                href={`/ocs/${oc.slug}`}
                className="block p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {oc.image_url && (
                    <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                      {oc.image_url.includes('drive.google.com') ? (
                        <img
                          src={oc.image_url}
                          alt={oc.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img
                          src={convertGoogleDriveUrl(oc.image_url)}
                          alt={oc.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-gray-100 font-semibold truncate">{oc.name}</h4>
                    {oc.date_of_birth && (
                      <p className="text-gray-400 text-sm">
                        {format(new Date(oc.date_of_birth), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                  <i className="fas fa-chevron-right text-gray-400"></i>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {selectedDate && selectedCharacters.length === 0 && (
        <div className="wiki-card p-4 md:p-6 text-center text-gray-400">
          <p>No birthdays on {format(selectedDate, 'MMMM d')}</p>
        </div>
      )}
    </div>
  );
}

