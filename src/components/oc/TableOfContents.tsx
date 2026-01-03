'use client';

import { useEffect, useState } from 'react';
import type { OC } from '@/types/oc';

interface TableOfContentsProps {
  oc: OC;
  storySnippets?: Array<{ id: string; title: string; snippet_text: string }>;
}

interface Section {
  id: string;
  title: string;
  icon: string;
  exists: boolean;
}

export function TableOfContents({ oc, storySnippets }: TableOfContentsProps) {
  const [activeSection, setActiveSection] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  // Determine which sections exist based on OC data
  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Overview',
      icon: 'fas fa-info-circle',
      exists: !!(oc.aliases || oc.affiliations || oc.romantic_orientation || oc.sexual_orientation || oc.story_alias || oc.species || oc.occupation || oc.development_status)
    },
    {
      id: 'identity-background',
      title: 'Identity Background',
      icon: 'fas fa-globe-americas',
      exists: !!(oc.ethnicity || oc.place_of_origin || oc.current_residence || (oc.languages && oc.languages.length > 0))
    },
    {
      id: 'biography',
      title: 'Biography',
      icon: 'fas fa-book',
      exists: !!oc.history_summary
    },
    {
      id: 'abilities',
      title: 'Abilities',
      icon: 'fas fa-magic',
      exists: !!(oc.abilities || oc.skills || oc.aptitudes || oc.strengths || oc.limits || oc.conditions)
    },
    {
      id: 'stats',
      title: 'Stats',
      icon: 'fas fa-dice-d20',
      exists: !!(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution || oc.stat_intelligence || oc.stat_wisdom || oc.stat_charisma || oc.stat_level || oc.stat_class || oc.stat_subclass || oc.stat_hit_points_current || oc.stat_hit_points_max || oc.stat_armor_class || oc.stat_speed || oc.stat_initiative || oc.stat_notes)
    },
    {
      id: 'appearance',
      title: 'Appearance',
      icon: 'fas fa-user',
      exists: !!(oc.standard_look || oc.alternate_looks || oc.accessories || oc.visual_motifs || oc.appearance_changes || oc.height || oc.weight || oc.build || oc.eye_color || oc.hair_color || oc.skin_tone || oc.features || oc.appearance_summary)
    },
    {
      id: 'personality-overview',
      title: 'Personality Overview',
      icon: 'fas fa-heart',
      exists: !!(oc.personality_summary || oc.alignment)
    },
    {
      id: 'personality-traits',
      title: 'Personality Traits',
      icon: 'fas fa-star',
      exists: !!(oc.positive_traits || oc.neutral_traits || oc.negative_traits)
    },
    {
      id: 'personality-metrics',
      title: 'Personality Metrics',
      icon: 'fas fa-chart-line',
      exists: !!(oc.sociability || oc.communication_style || oc.judgment || oc.emotional_resilience || oc.courage || oc.risk_behavior || oc.honesty || oc.discipline || oc.temperament || oc.humor)
    },
    {
      id: 'relationships',
      title: 'Relationships',
      icon: 'fas fa-users',
      exists: !!(oc.family || oc.friends_allies || oc.rivals_enemies || oc.romantic || oc.other_relationships)
    },
    {
      id: 'history',
      title: 'History',
      icon: 'fas fa-history',
      exists: !!(oc.origin || oc.formative_years || oc.major_life_events)
    },
    {
      id: 'story-snippets',
      title: 'Story Snippets',
      icon: 'fas fa-book-open',
      exists: !!(storySnippets && storySnippets.length > 0)
    },
    {
      id: 'preferences',
      title: 'Preferences & Habits',
      icon: 'fas fa-heart',
      exists: !!(oc.likes || oc.dislikes)
    },
    {
      id: 'gallery',
      title: 'Gallery',
      icon: 'fas fa-images',
      exists: !!(oc.gallery && oc.gallery.length > 0)
    },
    {
      id: 'media',
      title: 'Media & Additional Information',
      icon: 'fas fa-film',
      exists: !!(oc.seiyuu || oc.voice_actor || oc.theme_song || oc.pinterest_board || oc.inspirations || oc.design_notes || oc.name_meaning_etymology || oc.creator_notes)
    },
    {
      id: 'trivia',
      title: 'Trivia',
      icon: 'fas fa-star',
      exists: !!oc.trivia
    },
    {
      id: 'other-versions',
      title: 'Other Versions',
      icon: 'fas fa-globe',
      exists: !!(oc.identity && (oc.identity as any).versions && (oc.identity as any).versions.length > 1)
    }
  ];

  const visibleSections = sections.filter(section => section.exists);

  // Track active section on scroll
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100; // Offset for header

      for (let i = visibleSections.length - 1; i >= 0; i--) {
        const section = document.getElementById(visibleSections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(visibleSections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, [visibleSections]);

  // Smooth scroll to section
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // Offset for fixed headers
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="wiki-card p-4 md:p-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-200 flex items-center gap-2" suppressHydrationWarning>
          <i className="fas fa-list text-purple-400" suppressHydrationWarning></i>
          Table of Contents
        </h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-400 hover:text-gray-200 transition-colors p-1"
          aria-label={isCollapsed ? 'Expand table of contents' : 'Collapse table of contents'}
          aria-expanded={!isCollapsed}
          suppressHydrationWarning
        >
          <i 
            className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-sm transition-transform duration-200`}
            suppressHydrationWarning
          ></i>
        </button>
      </div>
      {!isCollapsed && (
        <div className="transition-all duration-300">
          {visibleSections.length > 0 ? (
            <nav>
              <ul className="space-y-2">
                {visibleSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(section.id);
                      }}
                      className={`
                        flex items-center gap-2 text-sm transition-colors
                        ${activeSection === section.id 
                          ? 'text-purple-400 font-semibold' 
                          : 'text-gray-400 hover:text-gray-200'
                        }
                      `}
                      suppressHydrationWarning
                    >
                      <i className={`${section.icon} text-xs w-4 flex-shrink-0 ${activeSection === section.id ? 'text-purple-400' : 'text-gray-500'}`} suppressHydrationWarning></i>
                      <span>{section.title}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <p className="text-sm text-gray-400">No sections available</p>
          )}
        </div>
      )}
    </div>
  );
}