'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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

// Generate a seed based on the current date in EST (same seed for the same day)
function getDaySeed(): number {
  const today = new Date();
  // Get date components in EST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', // EST/EDT
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(today);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  const dateString = `${year}-${month}-${day}`;
  
  // Better hash function to convert date string to number
  let hash = 0;
  for (let i = 0; i < dateString.length; i++) {
    const char = dateString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Get a unique day identifier for comparison in EST
function getDayIdentifier(): string {
  const today = new Date();
  // Get date components in EST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', // EST/EDT
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(today);
  const year = parts.find(p => p.type === 'year')?.value || '';
  const month = parts.find(p => p.type === 'month')?.value || '';
  const day = parts.find(p => p.type === 'day')?.value || '';
  return `${year}-${month}-${day}`;
}

// Improved seeded random number generator (Linear Congruential Generator)
function seededRandom(seed: number): () => number {
  let value = seed;
  return function() {
    // LCG parameters (from Numerical Recipes)
    value = (value * 1664525 + 1013904223) % Math.pow(2, 32);
    return value / Math.pow(2, 32);
  };
}

// Fisher-Yates shuffle with seeded random
function seededShuffle<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

interface RandomOCOfTheDayProps {
  ocs: OC[];
}

// Function to select a random OC from the pool
function selectRandomOC(progressItems: OCProgressItem[], useDateSeed: boolean = false, additionalSeed: number = 0): OCProgressItem | null {
  // Safety check: if no items, return null
  if (!progressItems || progressItems.length === 0) {
    return null;
  }
  
  // Prefer OCs with lower completion (prioritize ones that need work)
  // But still allow some randomness
  const sortedByProgress = [...progressItems].sort((a, b) => a.percentage - b.percentage);
  
  // Get OCs that are below 80% completion (ones that need work)
  const needsWork = sortedByProgress.filter(item => item.percentage < 80);
  const pool = needsWork.length > 0 ? needsWork : sortedByProgress;
  
  // Safety check: ensure pool is not empty
  if (pool.length === 0) {
    return sortedByProgress[0] || null;
  }
  
  // Use date-based seed for initial selection, or better random for reshuffle
  let seed: number;
  if (useDateSeed) {
    seed = getDaySeed();
  } else {
    // For reshuffle, use a combination of timestamp, random, and additional seed
    // This ensures better distribution
    seed = Date.now() + Math.random() * 1000000 + additionalSeed;
  }
  
  // Shuffle the pool using seeded shuffle for better distribution
  const shuffledPool = seededShuffle(pool, seed);
  
  // Pick a random OC from the shuffled pool (weighted towards lower completion)
  // Use first 30% of the pool (lowest completion) with higher probability
  const random = seededRandom(seed);
  const lowCompletionPool = shuffledPool.slice(0, Math.max(1, Math.floor(shuffledPool.length * 0.3)));
  const useLowPool = random() < 0.7;
  const targetPool = useLowPool ? lowCompletionPool : shuffledPool;
  const randomIndex = Math.floor(random() * targetPool.length);
  
  // Safety check: ensure index is valid
  if (randomIndex >= 0 && randomIndex < targetPool.length) {
    return targetPool[randomIndex];
  }
  
  // Fallback to first item if something goes wrong
  return targetPool[0] || shuffledPool[0] || sortedByProgress[0] || null;
}

export function RandomOCOfTheDay({ ocs }: RandomOCOfTheDayProps) {
  if (!ocs || ocs.length === 0) {
    return null;
  }

  // Calculate progress for all OCs (memoized to avoid recalculating)
  const progressItems = useMemo(() => ocs.map(calculateOCProgress), [ocs]);
  
  // Track the current day to detect day changes
  const [currentDay, setCurrentDay] = useState<string>(() => getDayIdentifier());
  const [reshuffleCounter, setReshuffleCounter] = useState<number>(0);
  
  // Initialize with date-based seed, then allow reshuffling
  const [selectedItem, setSelectedItem] = useState<OCProgressItem | null>(() => {
    const item = selectRandomOC(progressItems, true);
    return item;
  });
  
  // Check if day has changed and reset if needed
  useEffect(() => {
    const checkDayChange = () => {
      const today = getDayIdentifier();
      if (today !== currentDay) {
        setCurrentDay(today);
        setReshuffleCounter(0); // Reset counter on new day
        const newItem = selectRandomOC(progressItems, true);
        if (newItem) {
          setSelectedItem(newItem);
        }
      }
    };
    
    // Check immediately
    checkDayChange();
    
    // Set up interval to check every minute (in case page is open across midnight)
    const interval = setInterval(checkDayChange, 60000);
    
    return () => clearInterval(interval);
  }, [currentDay, progressItems]);
  
  // Ensure we have a selected item (fallback if initialization failed)
  useEffect(() => {
    if (!selectedItem && progressItems.length > 0) {
      const fallbackItem = selectRandomOC(progressItems, true);
      if (fallbackItem) {
        setSelectedItem(fallbackItem);
      }
    }
  }, [selectedItem, progressItems]);
  
  // Reshuffle function with improved randomization
  const handleReshuffle = useCallback(() => {
    // Increment counter to ensure different results each time
    setReshuffleCounter(prev => {
      const newCounter = prev + 1;
      // Use the new counter value for selection
      const newItem = selectRandomOC(progressItems, false, newCounter);
      if (newItem) {
        setSelectedItem(newItem);
      }
      return newCounter;
    });
  }, [progressItems]);
  
  // If no item is selected, don't render
  if (!selectedItem) {
    return null;
  }

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
          <button
            onClick={handleReshuffle}
            className="ml-auto px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-md flex items-center gap-2 touch-manipulation"
            title="Reshuffle to get a different random OC"
          >
            <i className="fas fa-redo"></i>
            <span className="hidden sm:inline">Reshuffle</span>
          </button>
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



















