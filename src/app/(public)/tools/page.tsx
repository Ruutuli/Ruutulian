import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';

interface ToolCardProps {
  href: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  bgGradient?: string;
}

function ToolCard({ href, title, description, icon, iconColor, bgGradient }: ToolCardProps) {
  const cardContent = (
    <div className={`wiki-card p-6 h-full flex flex-col transition-all duration-300 group relative overflow-hidden ${bgGradient || ''} hover:bg-gray-800/80 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 ${iconColor} rounded-xl group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
          <i className={`${icon} text-2xl`}></i>
        </div>
        <h3 className="text-xl font-bold text-gray-100 flex-1">
          {title}
        </h3>
      </div>
      <p className="text-gray-400 text-sm leading-relaxed flex-grow">
        {description}
      </p>
    </div>
  );

  return (
    <Link href={href} className="block h-full">
      {cardContent}
    </Link>
  );
}

export default function ToolsPage() {
  return (
    <div className="space-y-10 md:space-y-14">
      <div className="relative">
        <PageHeader title="Creative Tools" />
        <p className="text-gray-400 text-lg mt-4 max-w-2xl">
          Discover powerful tools to inspire your creativity, develop your characters, and bring your stories to life.
        </p>
      </div>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard
            href="/tools/generator"
            title="Character Generator"
            description="Generate random character concepts for inspiration and creative writing. Perfect for breaking through writer's block."
            icon="fas fa-dice"
            iconColor="bg-purple-500/20 text-purple-400"
          />
          <ToolCard
            href="/tools/prompts"
            title="Writing Prompts"
            description="Generate personalized writing prompts based on your characters and their stories. Spark new ideas for your narratives."
            icon="fas fa-pen-fancy"
            iconColor="bg-pink-500/20 text-pink-400"
          />
          <ToolCard
            href="/tools/brainstorm"
            title="OC Brainstorming Resources"
            description="Browse races, weapons, personality traits, tropes, and more. A searchable reference for character inspiration."
            icon="fas fa-book-open"
            iconColor="bg-cyan-500/20 text-cyan-400"
          />
        </div>
      </section>
    </div>
  );
}
