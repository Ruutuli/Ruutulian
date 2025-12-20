'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { OCIdentity } from '@/types/oc';

interface OCVersionSwitcherProps {
  identity: OCIdentity;
  currentVersionId: string;
}

export function OCVersionSwitcher({ identity, currentVersionId }: OCVersionSwitcherProps) {
  const router = useRouter();

  if (!identity.versions || identity.versions.length <= 1) {
    return null; // Don't show switcher if only one version
  }

  const currentVersion = identity.versions.find(v => v.id === currentVersionId);
  const otherVersions = identity.versions.filter(v => v.id !== currentVersionId);

  return (
    <div className="mb-6 p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-blue-300 mb-1">
            Multi-Fandom Character
          </h3>
          <p className="text-xs text-gray-400">
            This character has {identity.versions.length} version{identity.versions.length !== 1 ? 's' : ''} across different fandoms
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm">
          <span className="text-gray-400">Current version: </span>
          <span className="font-medium text-gray-200">
            {currentVersion?.name} ({currentVersion?.world?.name || 'Unknown World'})
          </span>
        </div>

        {otherVersions.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-2">Other versions:</div>
            <div className="flex flex-wrap gap-2">
              {otherVersions.map((version) => (
                <Link
                  key={version.id}
                  href={`/admin/ocs/${version.id}`}
                  className="px-3 py-1.5 text-xs bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-md text-gray-300 hover:text-white transition-colors"
                >
                  {version.name} ({version.world?.name || 'Unknown'})
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-700/50">
          <Link
            href={`/admin/oc-identities/${identity.id}`}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Manage all versions →
          </Link>
        </div>
      </div>
    </div>
  );
}




















