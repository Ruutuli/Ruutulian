'use client';

import { useState, useRef, useEffect } from 'react';
import type { TimelineEvent } from '@/types/oc';
import Link from 'next/link';
import { format } from 'date-fns';

interface InteractiveTimelineProps {
  events: TimelineEvent[];
  onEventClick?: (event: TimelineEvent) => void;
  className?: string;
}

export function InteractiveTimeline({ events, onEventClick, className = '' }: InteractiveTimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort events by year
  const sortedEvents = [...events].sort((a, b) => {
    const yearA = a.year || 0;
    const yearB = b.year || 0;
    return yearA - yearB;
  });

  // Calculate timeline range
  const minYear = sortedEvents.length > 0 ? Math.min(...sortedEvents.map(e => e.year || 0)) : 0;
  const maxYear = sortedEvents.length > 0 ? Math.max(...sortedEvents.map(e => e.year || 0)) : 0;
  const yearRange = maxYear - minYear || 1;

  // Handle mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * delta)));
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(3, prev * 1.2));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, prev * 0.8));
  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
  };

  // Calculate position for event
  const getEventPosition = (event: TimelineEvent): number => {
    const year = event.year || minYear;
    return ((year - minYear) / yearRange) * 100;
  };

  return (
    <div className={`wiki-card p-4 md:p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <i className="fas fa-timeline text-purple-400"></i>
          Interactive Timeline
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Zoom out"
          >
            <i className="fas fa-minus text-gray-300"></i>
          </button>
          <span className="text-gray-400 text-sm min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            title="Zoom in"
          >
            <i className="fas fa-plus text-gray-300"></i>
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors ml-2"
            title="Reset view"
          >
            <i className="fas fa-home text-gray-300"></i>
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative w-full h-96 bg-gray-900 rounded-lg overflow-hidden border border-gray-700"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        {/* Timeline line */}
        <div
          className="absolute top-1/2 left-0 right-0 h-1 bg-purple-500 transform -translate-y-1/2"
          style={{
            transform: `translateY(-50%) translateX(${panX}px) scaleX(${zoom})`,
            transformOrigin: 'left center',
          }}
        />

        {/* Year markers */}
        {Array.from({ length: Math.ceil(yearRange / 10) + 1 }, (_, i) => {
          const year = minYear + i * 10;
          const position = ((year - minYear) / yearRange) * 100;
          return (
            <div
              key={year}
              className="absolute top-1/2 transform -translate-y-1/2"
              style={{
                left: `${position}%`,
                transform: `translateY(-50%) translateX(${panX}px) scale(${zoom})`,
                transformOrigin: 'left center',
              }}
            >
              <div className="w-px h-4 bg-gray-500"></div>
              <div className="text-xs text-gray-400 mt-1 whitespace-nowrap" style={{ transform: 'translateX(-50%)' }}>
                {year}
              </div>
            </div>
          );
        })}

        {/* Events */}
        {sortedEvents.map((event) => {
          const position = getEventPosition(event);
          return (
            <div
              key={event.id}
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
              style={{
                left: `${position}%`,
                transform: `translateY(-50%) translateX(${panX}px) scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              onClick={() => {
                setSelectedEvent(event);
                onEventClick?.(event);
              }}
            >
              <div className="w-4 h-4 bg-purple-400 rounded-full border-2 border-gray-900 group-hover:bg-purple-300 transition-colors"></div>
              {selectedEvent?.id === event.id && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-64 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg z-10">
                  <h4 className="font-semibold text-gray-100 mb-1">{event.title}</h4>
                  {event.year && (
                    <p className="text-sm text-gray-400 mb-2">Year: {event.year}</p>
                  )}
                  {event.description && (
                    <p className="text-sm text-gray-300 line-clamp-2">{event.description}</p>
                  )}
                  <Link
                    href={`/timelines/${event.timeline_id || ''}`}
                    className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block"
                  >
                    View Details →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Event list */}
      <div className="mt-4 max-h-48 overflow-y-auto">
        <div className="space-y-2">
          {sortedEvents.map((event) => (
            <div
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              className={`p-2 rounded cursor-pointer transition-colors ${
                selectedEvent?.id === event.id
                  ? 'bg-purple-600/20 border border-purple-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-gray-100 font-semibold">{event.title}</h4>
                  {event.year && (
                    <p className="text-sm text-gray-400">Year: {event.year}</p>
                  )}
                </div>
                {event.year && (
                  <div className="text-purple-400 font-mono">{event.year}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

