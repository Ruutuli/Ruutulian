'use client';

import { useState } from 'react';
import type { OC } from '@/types/oc';
import { DnDRadarChart } from '@/components/visualizations/RadarChart';
import Image from 'next/image';
import Link from 'next/link';
import { convertGoogleDriveUrl } from '@/lib/utils/googleDriveImage';
import { GoogleDriveImage } from '@/components/oc/GoogleDriveImage';

interface CharacterComparisonProps {
  oc1: OC | null;
  oc2: OC | null;
  onSelectOC1?: (oc: OC | null) => void;
  onSelectOC2?: (oc: OC | null) => void;
  availableOCs?: OC[];
}

export function CharacterComparison({
  oc1,
  oc2,
  onSelectOC1,
  onSelectOC2,
  availableOCs = [],
}: CharacterComparisonProps) {
  const [showSelector1, setShowSelector1] = useState(false);
  const [showSelector2, setShowSelector2] = useState(false);

  const renderOCInfo = (oc: OC | null, side: 'left' | 'right') => {
    if (!oc) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
          <i className="fas fa-user-plus text-4xl mb-2"></i>
          <p>Select a character</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center">
          <Link href={`/ocs/${oc.slug}`} className="hover:text-purple-400 transition-colors">
            <h3 className="text-2xl font-bold text-gray-100 mb-2">{oc.name}</h3>
          </Link>
          {oc.world && (
            <p className="text-gray-400">{oc.world.name}</p>
          )}
        </div>

        {oc.image_url && (
          <div className="relative w-full aspect-square max-w-xs mx-auto rounded-lg overflow-hidden">
            {oc.image_url.includes('drive.google.com') ? (
              <GoogleDriveImage
                src={oc.image_url}
                alt={oc.name}
                className="object-cover w-full h-full"
                style={{ position: 'absolute', inset: 0 }}
              />
            ) : (
              <Image
                src={convertGoogleDriveUrl(oc.image_url)}
                alt={oc.name}
                fill
                sizes="(max-width: 768px) 100vw, 300px"
                className="object-cover"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {oc.age && (
            <div>
              <div className="text-gray-400">Age</div>
              <div className="text-gray-200 font-semibold">{oc.age}</div>
            </div>
          )}
          {oc.status && (
            <div>
              <div className="text-gray-400">Status</div>
              <div className="text-gray-200 font-semibold capitalize">{oc.status}</div>
            </div>
          )}
          {oc.species && (
            <div>
              <div className="text-gray-400">Species</div>
              <div className="text-gray-200 font-semibold">{oc.species}</div>
            </div>
          )}
          {oc.alignment && (
            <div>
              <div className="text-gray-400">Alignment</div>
              <div className="text-gray-200 font-semibold">{oc.alignment}</div>
            </div>
          )}
        </div>

        {/* D&D Stats Comparison */}
        {(oc.stat_strength || oc.stat_dexterity || oc.stat_constitution) && (
          <div>
            <DnDRadarChart
              stats={{
                strength: oc.stat_strength || undefined,
                dexterity: oc.stat_dexterity || undefined,
                constitution: oc.stat_constitution || undefined,
                intelligence: oc.stat_intelligence || undefined,
                wisdom: oc.stat_wisdom || undefined,
                charisma: oc.stat_charisma || undefined,
              }}
              title=""
              height={250}
              showModifiers={true}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Character Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <button
            onClick={() => setShowSelector1(!showSelector1)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg hover:border-purple-500 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-300">
                {oc1 ? oc1.name : 'Select Character 1'}
              </span>
              <i className="fas fa-chevron-down text-gray-400"></i>
            </div>
          </button>
          {showSelector1 && availableOCs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {availableOCs.map((oc) => (
                <button
                  key={oc.id}
                  onClick={() => {
                    onSelectOC1?.(oc);
                    setShowSelector1(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-gray-200"
                >
                  {oc.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowSelector2(!showSelector2)}
            className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg hover:border-purple-500 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-300">
                {oc2 ? oc2.name : 'Select Character 2'}
              </span>
              <i className="fas fa-chevron-down text-gray-400"></i>
            </div>
          </button>
          {showSelector2 && availableOCs.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {availableOCs.map((oc) => (
                <button
                  key={oc.id}
                  onClick={() => {
                    onSelectOC2?.(oc);
                    setShowSelector2(false);
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-gray-200"
                >
                  {oc.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison View */}
      {oc1 || oc2 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="wiki-card p-6">
            {renderOCInfo(oc1, 'left')}
          </div>
          <div className="wiki-card p-6">
            {renderOCInfo(oc2, 'right')}
          </div>
        </div>
      ) : (
        <div className="wiki-card p-12 text-center text-gray-400">
          <i className="fas fa-balance-scale text-6xl mb-4"></i>
          <p>Select two characters to compare</p>
        </div>
      )}

      {/* Side-by-side Stats Comparison */}
      {oc1 && oc2 && (
        <div className="wiki-card p-6">
          <h3 className="text-xl font-bold text-gray-100 mb-4">Stat Comparison</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-gray-300 mb-2">{oc1.name}</h4>
              <DnDRadarChart
                stats={{
                  strength: oc1.stat_strength || undefined,
                  dexterity: oc1.stat_dexterity || undefined,
                  constitution: oc1.stat_constitution || undefined,
                  intelligence: oc1.stat_intelligence || undefined,
                  wisdom: oc1.stat_wisdom || undefined,
                  charisma: oc1.stat_charisma || undefined,
                }}
                title=""
                height={250}
              />
            </div>
            <div>
              <h4 className="text-gray-300 mb-2">{oc2.name}</h4>
              <DnDRadarChart
                stats={{
                  strength: oc2.stat_strength || undefined,
                  dexterity: oc2.stat_dexterity || undefined,
                  constitution: oc2.stat_constitution || undefined,
                  intelligence: oc2.stat_intelligence || undefined,
                  wisdom: oc2.stat_wisdom || undefined,
                  charisma: oc2.stat_charisma || undefined,
                }}
                title=""
                height={250}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

