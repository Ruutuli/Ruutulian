import { PageHeader } from '@/components/layout/PageHeader';
import Link from 'next/link';

interface ToolCardProps {
  href?: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  bgGradient?: string;
  comingSoon?: boolean;
}

function ToolCard({ href, title, description, icon, iconColor, bgGradient, comingSoon }: ToolCardProps) {
  const cardContent = (
    <div className={`wiki-card p-6 h-full flex flex-col transition-all duration-300 group relative overflow-hidden ${bgGradient || ''} ${comingSoon ? 'opacity-75 cursor-not-allowed' : 'hover:bg-gray-800/80 hover:scale-[1.02] hover:shadow-xl hover:-translate-y-1'}`}>
      {comingSoon && (
        <div className="absolute top-4 right-4 z-10">
          <span className="px-3 py-1 bg-gradient-to-r from-purple-500/90 to-pink-500/90 text-white text-xs font-bold rounded-full shadow-lg backdrop-blur-sm border border-white/20">
            Coming Soon
          </span>
        </div>
      )}
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
      {comingSoon && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <i className="fas fa-clock"></i>
            <span>In development</span>
          </div>
        </div>
      )}
    </div>
  );

  if (comingSoon || !href) {
    return <div className="block">{cardContent}</div>;
  }

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
      
      {/* Available Tools */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center gap-3 whitespace-nowrap">
            <i className="fas fa-check-circle text-green-400"></i>
            Available Now
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"></div>
        </div>
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
        </div>
      </section>

      {/* Coming Soon Tools */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-500/50 to-transparent"></div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-100 flex items-center gap-3 whitespace-nowrap">
            <i className="fas fa-rocket text-blue-400"></i>
            Coming Soon
          </h2>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-500/50 to-transparent"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ToolCard
            title="OC Quiz"
            description="Test your knowledge about your characters with fun and challenging quizzes. See how well you know your OCs!"
            icon="fas fa-question-circle"
            iconColor="bg-blue-500/20 text-blue-400"
            comingSoon={true}
          />
          <ToolCard
            title="Name Generator"
            description="Generate unique names for characters, places, and items. Filter by origin, meaning, and style to find the perfect name."
            icon="fas fa-signature"
            iconColor="bg-cyan-500/20 text-cyan-400"
            comingSoon={true}
          />
          <ToolCard
            title="Color Palette Generator"
            description="Create cohesive color palettes for your characters and worlds. Extract colors from images or generate harmonious schemes."
            icon="fas fa-palette"
            iconColor="bg-indigo-500/20 text-indigo-400"
            comingSoon={true}
          />
          <ToolCard
            title="Story Plot Generator"
            description="Generate plot ideas, story structures, and narrative arcs. Get inspiration for your next big story or adventure."
            icon="fas fa-book-open"
            iconColor="bg-yellow-500/20 text-yellow-400"
            comingSoon={true}
          />
          <ToolCard
            title="Character Conflict Generator"
            description="Generate conflicts and challenges for your characters. Create tension, drama, and compelling narrative obstacles."
            icon="fas fa-fire"
            iconColor="bg-orange-500/20 text-orange-400"
            comingSoon={true}
          />
          <ToolCard
            title="World Building Assistant"
            description="Get prompts and ideas for building rich, detailed worlds. Create cultures, histories, and environments for your stories."
            icon="fas fa-globe"
            iconColor="bg-emerald-500/20 text-emerald-400"
            comingSoon={true}
          />
          <ToolCard
            title="Dialogue Generator"
            description="Generate realistic dialogue between characters. Practice conversations and develop authentic character voices."
            icon="fas fa-comments"
            iconColor="bg-teal-500/20 text-teal-400"
            comingSoon={true}
          />
          <ToolCard
            title="Timeline Builder"
            description="Visualize and organize your story timeline. Track events, relationships, and character development over time."
            icon="fas fa-timeline"
            iconColor="bg-violet-500/20 text-violet-400"
            comingSoon={true}
          />
          <ToolCard
            title="Mood Board Creator"
            description="Create visual mood boards for your characters and stories. Collect inspiration and visualize your creative vision."
            icon="fas fa-images"
            iconColor="bg-rose-500/20 text-rose-400"
            comingSoon={true}
          />
          <ToolCard
            title="OC Card Game"
            description="Play a strategic card game inspired by Queen's Blood using your OCs! Build decks, battle opponents, and master tactical gameplay with your characters."
            icon="fas fa-crown"
            iconColor="bg-amber-500/20 text-amber-400"
            comingSoon={true}
          />
        </div>
      </section>
    </div>
  );
}

