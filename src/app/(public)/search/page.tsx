'use client';

import { useState, useEffect } from 'react';
import { AdvancedSearch, type SearchFilters } from '@/components/discovery/AdvancedSearch';
import { OCCard } from '@/components/oc/OCCard';
import { PageHeader } from '@/components/layout/PageHeader';
import type { OC } from '@/types/oc';

export default function SearchPage() {
  const [allOCs, setAllOCs] = useState<OC[]>([]);
  const [filteredOCs, setFilteredOCs] = useState<OC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOCs() {
      try {
        const response = await fetch('/api/ocs?public=true');
        if (response.ok) {
          const data = await response.json();
          setAllOCs(data.ocs || []);
          setFilteredOCs(data.ocs || []);
        }
      } catch (error) {
        console.error('Error fetching OCs:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOCs();
  }, []);

  const handleSearch = (filters: SearchFilters) => {
    let filtered = [...allOCs];

    // Name filter
    if (filters.name) {
      const nameLower = filters.name.toLowerCase();
      filtered = filtered.filter(oc => oc.name.toLowerCase().includes(nameLower));
    }

    // Age filter
    if (filters.ageMin !== undefined) {
      filtered = filtered.filter(oc => oc.age !== null && oc.age !== undefined && oc.age >= filters.ageMin!);
    }
    if (filters.ageMax !== undefined) {
      filtered = filtered.filter(oc => oc.age !== null && oc.age !== undefined && oc.age <= filters.ageMax!);
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(oc => oc.status === filters.status);
    }

    // Species filter
    if (filters.species) {
      const speciesLower = filters.species.toLowerCase();
      filtered = filtered.filter(oc => 
        oc.species?.toLowerCase().includes(speciesLower) ||
        (oc.modular_fields as any)?.species?.toLowerCase().includes(speciesLower)
      );
    }

    // D&D Stats filter
    if (filters.statMin) {
      Object.entries(filters.statMin).forEach(([stat, minValue]) => {
        if (minValue !== undefined) {
          const statKey = `stat_${stat}` as keyof OC;
          filtered = filtered.filter(oc => {
            const value = oc[statKey] as number | null | undefined;
            return value !== null && value !== undefined && value >= minValue;
          });
        }
      });
    }

    // Personality filter
    if (filters.personalityMin) {
      Object.entries(filters.personalityMin).forEach(([trait, minValue]) => {
        if (minValue !== undefined) {
          const traitKey = trait as keyof OC;
          filtered = filtered.filter(oc => {
            const value = oc[traitKey] as number | null | undefined;
            return value !== null && value !== undefined && value >= minValue;
          });
        }
      });
    }

    setFilteredOCs(filtered);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Advanced Search" />
        <div className="wiki-card p-6 text-center text-gray-400">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Advanced Search" />
      <AdvancedSearch onSearch={handleSearch} />
      <div className="wiki-card p-4 md:p-6">
        <p className="text-gray-400 mb-4">
          Found {filteredOCs.length} character{filteredOCs.length !== 1 ? 's' : ''}
        </p>
        {filteredOCs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredOCs.map((oc) => (
              <OCCard key={oc.id} oc={oc} />
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12">
            <p>No characters match your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

