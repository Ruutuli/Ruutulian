import type { World } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { ProxiedNextImage } from '@/components/oc/GoogleDriveImage';
import { formatLastUpdated } from '@/lib/utils/dateFormat';

interface WorldHeaderProps {
  world: World;
}

export function WorldHeader({ world }: WorldHeaderProps) {
  const themeStyles = applyWorldThemeStyles(world);

  return (
    <div
      className="relative rounded-xl overflow-hidden mb-8 shadow-lg"
      style={themeStyles}
    >
      <div className="relative h-64 md:h-96 w-full">
        <ProxiedNextImage
          src={world.header_image_url}
          alt={world.name}
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
            <ProxiedNextImage
              src={world.icon_url}
              alt={world.name}
              fill
              sizes="(max-width: 768px) 64px, 80px"
              className="object-contain rounded-lg bg-white/20 backdrop-blur-sm p-1"
            />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              {world.name}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="inline-block px-4 py-1 rounded-full text-sm font-medium text-white"
                style={{ backgroundColor: world.primary_color }}
              >
                {world.series_type}
              </span>
              {world.updated_at && (
                <span className="text-sm text-white/80">
                  <i className="fas fa-clock mr-1.5" aria-hidden="true"></i>
                  Last updated: {formatLastUpdated(world.updated_at)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
