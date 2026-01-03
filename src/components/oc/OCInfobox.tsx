import Image from 'next/image';
import Link from 'next/link';
import type { OC } from '@/types/oc';
import { Infobox } from '@/components/wiki/Infobox';
import { InfoRow } from '@/components/wiki/InfoRow';
import { convertGoogleDriveUrl, isGoogleSitesUrl } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';
import { formatDateOfBirth } from '@/lib/utils/dateFormat';

interface OCInfoboxProps {
  oc: OC;
}

export async function OCInfobox({ oc }: OCInfoboxProps) {
  return (
    <Infobox sticky={false} className="w-full lg:w-96">
      <div className="relative w-full aspect-[4/5] mb-4 rounded-lg overflow-hidden" suppressHydrationWarning>
        {oc.image_url?.includes('drive.google.com') ? (
          <GoogleDriveImage
            src={oc.image_url}
            alt={oc.name}
            className="wiki-image w-full h-full object-contain"
            style={{ position: 'absolute', inset: 0, objectPosition: 'center 10%' }}
          />
        ) : (
          <Image
            src={convertGoogleDriveUrl(oc.image_url) || 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/960px-Placeholder_view_vector.svg.png'}
            alt={oc.name}
            fill
            sizes="(max-width: 768px) 100vw, 384px"
            priority
            className="wiki-image"
            style={{ objectPosition: 'center 10%' }}
            unoptimized={isGoogleSitesUrl(oc.image_url)}
          />
        )}
      </div>
      <dl className="space-y-0" suppressHydrationWarning>
        {/* Basic Information Section */}
        <InfoRow label="Name" value={oc.name} icon="fas fa-user" />
        <InfoRow 
          label="Status"
          value={oc.status}
          icon={
            oc.status === 'alive' 
              ? 'fas fa-heart text-green-400' 
              : oc.status === 'deceased' 
              ? 'fas fa-skull text-red-400' 
              : 'fas fa-question-circle text-yellow-400'
          }
        >
          <span className="capitalize font-medium">{oc.status}</span>
        </InfoRow>
        {oc.age && <InfoRow label="Age" value={oc.age} icon="fas fa-birthday-cake" />}
        {oc.date_of_birth && <InfoRow label="Date of Birth" value={formatDateOfBirth(oc.date_of_birth)} icon="fas fa-calendar" />}
        {oc.pronouns && <InfoRow label="Pronouns" value={oc.pronouns} icon="fas fa-user-friends" />}
        {oc.gender && (
          <InfoRow label="Gender" value={oc.gender} icon="fas fa-venus-mars" />
        )}
        {oc.sex && <InfoRow label="Sex" value={oc.sex} icon="fas fa-venus-mars" />}
        {oc.star_sign && <InfoRow label="Star Sign" value={oc.star_sign} icon="fas fa-star" />}
      </dl>
    </Infobox>
  );
}
