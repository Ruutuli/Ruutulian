'use client';

import Link from 'next/link';
import type { OC } from '@/types/oc';

interface OCProgressItem {
  oc: OC;
  percentage: number;
  filledFields: number;
  totalFields: number;
}

function calculateOCProgress(oc: OC): OCProgressItem {
  // List of all fields to check (excluding system fields like id, created_at, updated_at)
  const fieldsToCheck: (keyof OC)[] = [
    // Overview
    'first_name',
    'last_name',
    'aliases',
    'species',
    'sex',
    'gender',
    'pronouns',
    'age',
    'date_of_birth',
    'occupation',
    'affiliations',
    'romantic_orientation',
    'sexual_orientation',
    'star_sign',
    
    // Identity Background
    'ethnicity',
    'place_of_origin',
    'current_residence',
    'languages',
    
    // Personality Overview
    'personality_summary',
    'alignment',
    
    // Personality Metrics
    'sociability',
    'communication_style',
    'judgment',
    'emotional_resilience',
    'courage',
    'risk_behavior',
    'honesty',
    'discipline',
    'temperament',
    'humor',
    
    // Personality Traits
    'positive_traits',
    'neutral_traits',
    'negative_traits',
    
    // Abilities
    'abilities',
    'skills',
    'aptitudes',
    'strengths',
    'limits',
    'conditions',
    
    // Appearance
    'standard_look',
    'alternate_looks',
    'accessories',
    'visual_motifs',
    'appearance_changes',
    'height',
    'weight',
    'build',
    'eye_color',
    'hair_color',
    'skin_tone',
    'features',
    'appearance_summary',
    
    // Relationships
    'family',
    'friends_allies',
    'rivals_enemies',
    'romantic',
    'other_relationships',
    
    // History
    'origin',
    'formative_years',
    'major_life_events',
    'history_summary',
    
    // Preferences & Habits
    'likes',
    'dislikes',
    
    // Media
    'gallery',
    'image_url',
    'icon_url',
    'seiyuu',
    'voice_actor',
    'theme_song',
    'inspirations',
    'design_notes',
    'name_meaning_etymology',
    'creator_notes',
    
    // Trivia
    'trivia',
    
    // Development
    'development_status',
  ];

  let filledCount = 0;
  const totalFields = fieldsToCheck.length;

  // Count standard fields
  for (const field of fieldsToCheck) {
    const value = oc[field];
    
    // Check if field is filled
    if (value !== null && value !== undefined && value !== '') {
      // For arrays, check if they have at least one item
      if (Array.isArray(value)) {
        if (value.length > 0) {
          filledCount++;
        }
      } else {
        filledCount++;
      }
    }
  }

  const percentage = totalFields > 0 ? Math.round((filledCount / totalFields) * 100) : 0;

  return {
    oc,
    percentage: Math.min(percentage, 100), // Cap at 100%
    filledFields: filledCount,
    totalFields: totalFields,
  };
}

// Generate a seed based on the current date (same seed for the same day)
function getDaySeed(): number {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  // Simple hash function to convert date string to number
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Simple seeded random number generator
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

interface RandomOCOfTheDayProps {
  ocs: OC[];
}

export function RandomOCOfTheDay({ ocs }: RandomOCOfTheDayProps) {
  if (!ocs || ocs.length === 0) {
    return null;
  }

  // Calculate progress for all OCs
  const progressItems = ocs.map(calculateOCProgress);
  
  // Prefer OCs with lower completion (prioritize ones that need work)
  // But still allow some randomness
  const sortedByProgress = [...progressItems].sort((a, b) => a.percentage - b.percentage);
  
  // Get OCs that are below 80% completion (ones that need work)
  const needsWork = sortedByProgress.filter(item => item.percentage < 80);
  const pool = needsWork.length > 0 ? needsWork : sortedByProgress;
  
  // Use date-based seed for consistent selection per day
  const seed = getDaySeed();
  const random = seededRandom(seed);
  
  // Pick a random OC from the pool (weighted towards lower completion)
  // Use first 30% of the pool (lowest completion) with higher probability
  const lowCompletionPool = pool.slice(0, Math.max(1, Math.floor(pool.length * 0.3)));
  const randomIndex = Math.floor(random() * (random() < 0.7 ? lowCompletionPool.length : pool.length));
  const selectedItem = random() < 0.7 ? lowCompletionPool[randomIndex] : pool[randomIndex];

  const getProgressColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-400';
    if (percentage >= 60) return 'text-yellow-400';
    if (percentage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const worldName = selectedItem.oc.world?.name || selectedItem.oc.world_name || 'Unknown';

  return (
    <div className="bg-gradient-to-br from-pink-900/30 via-purple-900/30 to-blue-900/30 rounded-lg shadow-lg p-4 sm:p-6 border-2 border-pink-500/50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
      
      <div className="relative z-10">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
          <i className="fas fa-star text-lg sm:text-xl text-yellow-400 animate-pulse"></i>
          <h2 className="text-lg sm:text-xl font-bold text-gray-100">Random OC of the Day</h2>
          <span className="text-xs sm:text-sm text-pink-300 font-semibold">✨ You should work on this OC!</span>
        </div>
        
        <Link
          href={`/admin/ocs/${selectedItem.oc.slug}`}
          className="block p-4 sm:p-5 bg-gray-800/80 backdrop-blur-sm rounded-lg hover:bg-gray-800 transition-all hover:scale-[1.02] border border-gray-700/50 hover:border-pink-500/50 touch-manipulation"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* OC Info */}
            <div className="flex-1">
              <div className="mb-3">
                <h3 className="text-lg sm:text-xl font-bold text-gray-100 mb-1" title={selectedItem.oc.name}>
                  {selectedItem.oc.name}
                </h3>
                <p className="text-sm text-gray-400" title={worldName}>
                  <i className="fas fa-globe text-xs mr-1"></i>
                  {worldName}
                </p>
              </div>
              
              {/* Progress Info */}
              <div className="flex items-center gap-4 mb-3">
                <div className={`text-2xl sm:text-3xl font-bold ${getProgressTextColor(selectedItem.percentage)}`}>
                  {selectedItem.percentage}%
                </div>
                <div className="text-sm text-gray-400">
                  {selectedItem.filledFields} / {selectedItem.totalFields} fields completed
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2">
                <div
                  className={`h-2.5 rounded-full transition-all ${getProgressColor(selectedItem.percentage)}`}
                  style={{ width: `${selectedItem.percentage}%` }}
                ></div>
              </div>
            </div>
            
            {/* CTA Button */}
            <div className="flex-shrink-0">
              <div className="px-4 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-semibold text-center transition-colors shadow-lg">
                <i className="fas fa-edit mr-2"></i>
                Edit OC
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
















