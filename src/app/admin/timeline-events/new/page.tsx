import { TimelineEventForm } from '@/components/admin/TimelineEventForm';

export default function NewTimelineEventPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-100 mb-8">Create Timeline Event</h1>
      <div className="bg-gray-700/90 rounded-lg shadow-lg p-6 border border-gray-600/70">
        <TimelineEventForm />
      </div>
    </div>
  );
}
