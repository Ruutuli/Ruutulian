import Image from 'next/image';
import type { World } from '@/types/oc';
import { applyWorldThemeStyles } from '@/lib/theme/worldTheme';
import { convertGoogleDriveUrl, isGoogleSitesUrl, getProxyUrl, isAnimatedImage } from '@/lib/utils/googleDriveImage';
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
        <Image
          src={world.header_image_url?.includes('drive.google.com')
            ? getProxyUrl(world.header_image_url)
            : (convertGoogleDriveUrl(world.header_image_url) || 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png')}
          alt={world.name}
          fill
          sizes="100vw"
          className="object-cover"
          unoptimized={world.header_image_url?.includes('drive.google.com') || isGoogleSitesUrl(world.header_image_url) || isAnimatedImage(world.header_image_url)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 md:w-20 md:h-20 flex-shrink-0">
            <Image
              src={world.icon_url?.includes('drive.google.com')
                ? getProxyUrl(world.icon_url)
                : (convertGoogleDriveUrl(world.icon_url) || 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png')}
              alt={world.name}
              fill
              sizes="(max-width: 768px) 64px, 80px"
              className="object-contain rounded-lg bg-white/20 backdrop-blur-sm p-1"
              unoptimized={world.icon_url?.includes('drive.google.com') || isGoogleSitesUrl(world.icon_url) || isAnimatedImage(world.icon_url)}
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
