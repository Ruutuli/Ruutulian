import type { World } from '@/types/oc';
import { Markdown } from '@/lib/utils/markdown';
import Image from 'next/image';
import { convertGoogleDriveUrl, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';

interface WorldDetailsProps {
  world: World;
}

// Helper component to render section with optional image
function SectionWithImage({
  title,
  icon,
  iconColor,
  content,
  imageUrl,
  children,
}: {
  title: string;
  icon: string;
  iconColor: string;
  content?: string | null;
  imageUrl?: string | null;
  children?: React.ReactNode;
}) {
  if (!content && !children) return null;

  return (
    <div className="wiki-card p-6 md:p-8">
      <h2 className="wiki-section-header">
        <i className={`${icon} ${iconColor}`}></i>
        {title}
      </h2>
      <div className="relative">
        {imageUrl && (
          <div className="float-right ml-6 mb-4 w-full md:w-80 flex-shrink-0">
            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-gray-700/50">
              <Image
                src={convertGoogleDriveUrl(imageUrl) || 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png'}
                alt={title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 320px"
                unoptimized={imageUrl.includes('drive.google.com') || isGoogleSitesUrl(imageUrl)}
              />
            </div>
          </div>
        )}
        <div className="text-gray-300 prose max-w-none">
          {content && <Markdown content={content} />}
          {children}
        </div>
        <div className="clear-both"></div>
      </div>
    </div>
  );
}

export function WorldDetails({ world }: WorldDetailsProps) {
  return (
    <div className="space-y-6">
      {/* About Section */}
      {(world.description_markdown || world.summary) && (
        <div className="wiki-card p-6 md:p-8">
          <h2 className="wiki-section-header">
            <i className="fas fa-info-circle text-blue-400"></i>
            About
          </h2>
          {world.description_markdown ? (
            <Markdown content={world.description_markdown} />
          ) : (
            <div className="text-gray-300 prose max-w-none">
              <p>{world.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* Overview Section */}
      {(world.setting || world.lore || world.genre || world.timeline_era) && (
        <SectionWithImage
          title="Overview"
          icon="fas fa-globe"
          iconColor="text-blue-400"
          imageUrl={world.overview_image_url || null}
        >
          <div className="space-y-4 text-gray-300 prose max-w-none">
            {world.genre && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-tags text-sm"></i>
                  Genre
                </h3>
                <p>{world.genre}</p>
              </div>
            )}
            {world.timeline_era && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-clock text-sm"></i>
                  Timeline / Era
                </h3>
                <p>{world.timeline_era}</p>
              </div>
            )}
            {world.setting && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-map text-sm"></i>
                  Setting
                </h3>
                <Markdown content={world.setting} />
              </div>
            )}
            {world.lore && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-book-open text-sm"></i>
                  Lore
                </h3>
                <Markdown content={world.lore} />
              </div>
            )}
          </div>
        </SectionWithImage>
      )}

      {/* Society & Culture Section */}
      {(world.the_world_society || world.culture || world.politics || world.religion || world.government || world.technology || world.environment) && (
        <SectionWithImage
          title="Society & Culture"
          icon="fas fa-users"
          iconColor="text-green-400"
          imageUrl={world.society_culture_image_url || null}
        >
          <div className="space-y-4 text-gray-300 prose max-w-none">
            {world.the_world_society && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-sitemap text-sm"></i>
                  The World Society
                </h3>
                <Markdown content={world.the_world_society} />
              </div>
            )}
            {world.culture && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-monument text-sm"></i>
                  Culture
                </h3>
                <Markdown content={world.culture} />
              </div>
            )}
            {world.politics && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-balance-scale text-sm"></i>
                  Politics
                </h3>
                <Markdown content={world.politics} />
              </div>
            )}
            {world.religion && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-place-of-worship text-sm"></i>
                  Religion
                </h3>
                <Markdown content={world.religion} />
              </div>
            )}
            {world.government && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-landmark text-sm"></i>
                  Government
                </h3>
                <Markdown content={world.government} />
              </div>
            )}
            {world.technology && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-laptop-code text-sm"></i>
                  Technology
                </h3>
                <Markdown content={world.technology} />
              </div>
            )}
            {world.environment && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-mountain text-sm"></i>
                  Environment
                </h3>
                <Markdown content={world.environment} />
              </div>
            )}
          </div>
        </SectionWithImage>
      )}

      {/* World Building Section */}
      {(world.races_species || world.power_systems || world.power_source || world.important_factions || world.notable_figures || world.central_conflicts || world.world_rules_limitations || world.oc_integration_notes) && (
        <SectionWithImage
          title="World Building"
          icon="fas fa-cube"
          iconColor="text-purple-400"
          imageUrl={world.world_building_image_url || null}
        >
          <div className="space-y-4 text-gray-300 prose max-w-none">
            {world.races_species && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-users text-sm"></i>
                  Races & Species
                </h3>
                <Markdown content={world.races_species} />
              </div>
            )}
            {world.power_systems && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-magic text-sm"></i>
                  Power Systems
                </h3>
                <Markdown content={world.power_systems} />
              </div>
            )}
            {world.power_source && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-bolt text-sm"></i>
                  Power Source
                </h3>
                <p>{world.power_source}</p>
              </div>
            )}
            {world.important_factions && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-flag text-sm"></i>
                  Important Factions
                </h3>
                <Markdown content={world.important_factions} />
              </div>
            )}
            {world.notable_figures && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-star text-sm"></i>
                  Notable Figures
                </h3>
                <Markdown content={world.notable_figures} />
              </div>
            )}
            {world.central_conflicts && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-exclamation-triangle text-sm"></i>
                  Central Conflicts
                </h3>
                <Markdown content={world.central_conflicts} />
              </div>
            )}
            {world.world_rules_limitations && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-ban text-sm"></i>
                  World Rules & Limitations
                </h3>
                <Markdown content={world.world_rules_limitations} />
              </div>
            )}
            {world.oc_integration_notes && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-user-plus text-sm"></i>
                  OC Integration Notes
                </h3>
                <Markdown content={world.oc_integration_notes} />
              </div>
            )}
          </div>
        </SectionWithImage>
      )}

      {/* Economy & Systems Section */}
      {(world.languages || world.trade_economy || world.travel_transport) && (
        <SectionWithImage
          title="Economy & Systems"
          icon="fas fa-coins"
          iconColor="text-amber-400"
          imageUrl={world.economy_systems_image_url || null}
        >
          <div className="space-y-4 text-gray-300 prose max-w-none">
            {world.languages && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-language text-sm"></i>
                  Languages
                </h3>
                <p>{world.languages}</p>
              </div>
            )}
            {world.trade_economy && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-handshake text-sm"></i>
                  Trade & Economy
                </h3>
                <Markdown content={world.trade_economy} />
              </div>
            )}
            {world.travel_transport && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-ship text-sm"></i>
                  Travel & Transport
                </h3>
                <Markdown content={world.travel_transport} />
              </div>
            )}
          </div>
        </SectionWithImage>
      )}

      {/* History Section */}
      {world.history && (
        <SectionWithImage
          title="History"
          icon="fas fa-scroll"
          iconColor="text-red-400"
          imageUrl={world.history_image_url || null}
          content={world.history}
        />
      )}

      {/* Additional Information Section */}
      {(world.themes || world.inspirations || world.current_era_status || world.notes) && (
        <SectionWithImage
          title="Additional Information"
          icon="fas fa-info"
          iconColor="text-teal-400"
          imageUrl={world.additional_info_image_url || null}
        >
          <div className="space-y-4 text-gray-300 prose max-w-none">
            {world.themes && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-palette text-sm"></i>
                  Themes
                </h3>
                <Markdown content={world.themes} />
              </div>
            )}
            {world.inspirations && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-sm"></i>
                  Inspirations
                </h3>
                <Markdown content={world.inspirations} />
              </div>
            )}
            {world.current_era_status && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-hourglass-half text-sm"></i>
                  Current Era Status
                </h3>
                <Markdown content={world.current_era_status} />
              </div>
            )}
            {world.notes && (
              <div>
                <h3 className="text-lg font-bold text-gray-100 mb-2 flex items-center gap-2">
                  <i className="fas fa-sticky-note text-sm"></i>
                  Notes
                </h3>
                <Markdown content={world.notes} />
              </div>
            )}
          </div>
        </SectionWithImage>
      )}
    </div>
  );
}
