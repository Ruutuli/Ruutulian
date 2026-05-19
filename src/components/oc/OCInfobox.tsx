import Link from 'next/link';
import type { OC } from '@/types/oc';
import { Infobox } from '@/components/wiki/Infobox';
import { InfoRow } from '@/components/wiki/InfoRow';
import { OCInfoboxPortrait } from '@/components/oc/OCInfoboxPortrait';
import { formatDateOfBirth } from '@/lib/utils/dateFormat';

interface OCInfoboxProps {
  oc: OC;
  profileImageNsfw?: boolean;
}

export async function OCInfobox({ oc, profileImageNsfw = false }: OCInfoboxProps) {
  return (
    <Infobox sticky={false} className="w-full lg:w-96">
      <OCInfoboxPortrait
        src={oc.image_url || ''}
        alt={oc.name}
        nsfw={profileImageNsfw || Boolean(oc.image_is_nsfw)}
      />
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
