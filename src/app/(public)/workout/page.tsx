import { WorkoutDashboard } from '@/components/workout/WorkoutDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { generatePageMetadata } from '@/lib/seo/page-metadata';

export async function generateMetadata() {
  return generatePageMetadata({
    title: 'Workout Tracker',
    description: 'Personal fitness journal and progress tracker.',
    path: '/workout',
    noIndex: true,
  });
}

export default function WorkoutPage() {
  return (
    <div className="space-y-6 sm:space-y-8 pb-8">
      <PageHeader
        title="Workout Tracker"
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Workout' }]}
      />
      <WorkoutDashboard />
    </div>
  );
}
