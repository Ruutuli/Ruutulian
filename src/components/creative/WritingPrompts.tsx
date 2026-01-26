'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

// Minimal type for writing prompts - only requires the fields we actually use
interface PromptOC {
  id: string;
  name: string;
  slug: string;
  world_id: string;
  world?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface WritingPromptsProps {
  ocs: PromptOC[];
  prompts?: Array<{
    id: string;
    category: string;
    prompt_text: string;
    requires_two_characters: boolean;
  }>;
  className?: string;
  isAdmin?: boolean;
}

interface PromptTemplate {
  category: string;
  prompt: string;
  requiresTwoCharacters?: boolean;
}

const twoCharacterPromptTemplates: PromptTemplate[] = [
    // ============================
    // First Meetings & Impressions
    // ============================
    { category: 'First Meeting', prompt: 'What happens when {character1} and {character2} meet for the first time?', requiresTwoCharacters: true },
    { category: 'First Meeting', prompt: 'Describe {character1}\'s first impression of {character2}.' },
    { category: 'First Meeting', prompt: 'How does {character2} misjudge {character1} at first?' },
    { category: 'First Meeting', prompt: 'Write the moment {character1} realizes {character2} is not what they expected.' },
    { category: 'First Meeting', prompt: 'Create a scene where their first meeting goes completely wrong.' },
    { category: 'First Meeting', prompt: 'What unexpected connection forms when {character1} and {character2} meet?' },
    { category: 'First Meeting', prompt: 'Write a tense first encounter between {character1} and {character2}.' },
    { category: 'First Meeting', prompt: 'How do rumors about {character2} influence how {character1} approaches them?' },
    { category: 'First Meeting', prompt: 'What detail about {character2} immediately unsettles {character1}?' },
    { category: 'First Meeting', prompt: 'How does the setting affect their first interaction?' },
    { category: 'First Meeting', prompt: 'Write a meeting where neither character realizes its importance at first.' },
    { category: 'First Meeting', prompt: 'What assumption does {character1} make about {character2} that proves false?' },
    { category: 'First Meeting', prompt: 'How does {character2} deliberately control the first impression they give?' },
    { category: 'First Meeting', prompt: 'Write a brief but charged first interaction that lingers afterward.' },
    { category: 'First Meeting', prompt: 'What emotion dominates their first meeting, and why?' },
  
    // ============================
    // Trust, Help & Reliance
    // ============================
    { category: 'Trust & Reliance', prompt: 'Write a scene where {character1} must ask {character2} for help.' },
    { category: 'Trust & Reliance', prompt: 'What makes {character1} finally trust {character2}?' },
    { category: 'Trust & Reliance', prompt: 'Create a moment where {character2} helps {character1} without being asked.' },
    { category: 'Trust & Reliance', prompt: 'Write about {character1} depending on {character2} for the first time.' },
    { category: 'Trust & Reliance', prompt: 'How does {character2} react when {character1} shows vulnerability?' },
    { category: 'Trust & Reliance', prompt: 'What happens when {character1} realizes they can\'t succeed without {character2}?' },
    { category: 'Trust & Reliance', prompt: 'Write a quiet scene where trust is built without words.' },
    { category: 'Trust & Reliance', prompt: 'What small action from {character2} earns {character1}\'s trust?' },
    { category: 'Trust & Reliance', prompt: 'When does {character1} trust {character2} before fully realizing it?' },
    { category: 'Trust & Reliance', prompt: 'What risk does {character2} take for {character1}?' },
    { category: 'Trust & Reliance', prompt: 'How does trust change their dynamic afterward?' },
    { category: 'Trust & Reliance', prompt: 'Write a scene where trust is tested but not broken.' },
    { category: 'Trust & Reliance', prompt: 'What unspoken agreement forms between them?' },
    { category: 'Trust & Reliance', prompt: 'How does reliance complicate their independence?' },
  
    // ============================
    // Conflict, Betrayal & Tension
    // ============================
    { category: 'Conflict & Betrayal', prompt: 'How would {character1} react if {character2} betrayed them?' },
    { category: 'Conflict & Betrayal', prompt: 'Write a confrontation where {character1} accuses {character2} of lying.' },
    { category: 'Conflict & Betrayal', prompt: 'What secret causes a rift between {character1} and {character2}?' },
    { category: 'Conflict & Betrayal', prompt: 'Create a scene where {character2} makes a choice that hurts {character1}.' },
    { category: 'Conflict & Betrayal', prompt: 'How does {character1} respond when {character2} refuses to explain themselves?' },
    { category: 'Conflict & Betrayal', prompt: 'Write the moment their alliance nearly falls apart.' },
    { category: 'Conflict & Betrayal', prompt: 'What line does {character2} cross that can\'t be taken back?' },
    { category: 'Conflict & Betrayal', prompt: 'Describe a fight between them that is more emotional than physical.' },
    { category: 'Conflict & Betrayal', prompt: 'What misunderstanding escalates into open conflict?' },
    { category: 'Conflict & Betrayal', prompt: 'How does unresolved tension affect their decisions?' },
    { category: 'Conflict & Betrayal', prompt: 'What truth makes forgiveness difficult?' },
    { category: 'Conflict & Betrayal', prompt: 'Write a confrontation where neither character is entirely wrong.' },
    { category: 'Conflict & Betrayal', prompt: 'How does betrayal change how they see themselves?' },
  
    // ============================
    // Forced Proximity & Dynamics
    // ============================
    { category: 'Forced Proximity', prompt: 'Create a story where {character1} and {character2} are forced to work together.' },
    { category: 'Forced Proximity', prompt: 'Write about a day in the life of {character1} and {character2} as roommates.' },
    { category: 'Forced Proximity', prompt: 'What happens when {character1} and {character2} are stuck together overnight?' },
    { category: 'Forced Proximity', prompt: 'Put {character1} and {character2} on a mission where cooperation is mandatory.' },
    { category: 'Forced Proximity', prompt: 'How do they clash when given shared responsibility?' },
    { category: 'Forced Proximity', prompt: 'Write a scene where they must pretend to get along.' },
    { category: 'Forced Proximity', prompt: 'What small habits of {character2} slowly annoy {character1}?' },
    { category: 'Forced Proximity', prompt: 'How does proximity force honesty between them?' },
    { category: 'Forced Proximity', prompt: 'What boundary is crossed simply due to closeness?' },
    { category: 'Forced Proximity', prompt: 'How does being trapped together change their priorities?' },
    { category: 'Forced Proximity', prompt: 'Write a scene where silence becomes uncomfortable.' },
  
    // ============================
    // Secrets & Revelations
    // ============================
    { category: 'Secrets & Revelations', prompt: 'What if {character1} discovered a secret about {character2}?' },
    { category: 'Secrets & Revelations', prompt: 'Write the moment {character2} reveals something they\'ve hidden.' },
    { category: 'Secrets & Revelations', prompt: 'How does {character1} react to learning the truth too late?' },
    { category: 'Secrets & Revelations', prompt: 'What secret does {character1} keep from {character2}, and why?' },
    { category: 'Secrets & Revelations', prompt: 'Create a scene where a secret is revealed by accident.' },
    { category: 'Secrets & Revelations', prompt: 'What changes when {character1} realizes they never really knew {character2}?' },
    { category: 'Secrets & Revelations', prompt: 'How does secrecy shape their relationship?' },
    { category: 'Secrets & Revelations', prompt: 'What truth is hardest to say aloud?' },
    { category: 'Secrets & Revelations', prompt: 'Write a revelation that shifts the power dynamic.' },
  
    // ============================
    // Emotional Moments
    // ============================
    { category: 'Emotional Moments', prompt: 'How would {character1} comfort {character2} after a loss?' },
    { category: 'Emotional Moments', prompt: 'Write a quiet scene where neither character says what they really mean.' },
    { category: 'Emotional Moments', prompt: 'Describe a moment of unexpected tenderness between {character1} and {character2}.' },
    { category: 'Emotional Moments', prompt: 'What does {character2} notice about {character1} when they think no one is watching?' },
    { category: 'Emotional Moments', prompt: 'Write a scene where emotional support matters more than action.' },
    { category: 'Emotional Moments', prompt: 'How does {character1} show care in a way that surprises {character2}?' },
    { category: 'Emotional Moments', prompt: 'What shared silence becomes meaningful?' },
    { category: 'Emotional Moments', prompt: 'Write a moment of emotional honesty that changes everything.' },
  
    // ============================
    // Competition & Challenge
    // ============================
    { category: 'Competition', prompt: 'What happens when {character1} and {character2} compete in a challenge?' },
    { category: 'Competition', prompt: 'Write a rivalry that slowly turns into respect.' },
    { category: 'Competition', prompt: 'How does {character2} react to losing against {character1}?' },
    { category: 'Competition', prompt: 'Create a scene where competition reveals hidden feelings.' },
    { category: 'Competition', prompt: 'What happens when winning costs one of them something important?' },
    { category: 'Competition', prompt: 'Write about a challenge neither of them expected to win.' },
    { category: 'Competition', prompt: 'How does competition strain their relationship?' },
  
    // ============================
    // Growth & Change
    // ============================
    { category: 'Growth & Change', prompt: 'Create a scene where {character1} teaches {character2} something important.' },
    { category: 'Growth & Change', prompt: 'What lesson does {character2} unintentionally teach {character1}?' },
    { category: 'Growth & Change', prompt: 'Write about a mistake that leads to growth for both characters.' },
    { category: 'Growth & Change', prompt: 'How does {character1} change after knowing {character2}?' },
    { category: 'Growth & Change', prompt: 'Describe a moment where one character outgrows the other.' },
    { category: 'Growth & Change', prompt: 'What belief does {character2} force {character1} to question?' },
    { category: 'Growth & Change', prompt: 'How do they evolve together rather than apart?' },
  
    // ============================
    // Identity & Role Reversal
    // ============================
    { category: 'Identity & Role Reversal', prompt: 'What if {character1} and {character2} switched places for a day?' },
    { category: 'Identity & Role Reversal', prompt: 'Write a scene where {character1} must live with {character2}\'s responsibilities.' },
    { category: 'Identity & Role Reversal', prompt: 'How does role reversal change how they see each other?' },
    { category: 'Identity & Role Reversal', prompt: 'What does {character2} struggle with most when taking on {character1}\'s role?' },
    { category: 'Identity & Role Reversal', prompt: 'What empathy is gained through reversal?' },
  
    // ============================
    // Choices & Endings
    // ============================
    { category: 'Choices & Endings', prompt: 'Write a scene where {character1} must choose between {character2} and something else.' },
    { category: 'Choices & Endings', prompt: 'What happens when {character2} leaves without saying goodbye?' },
    { category: 'Choices & Endings', prompt: 'Describe their final conversation before everything changes.' },
    { category: 'Choices & Endings', prompt: 'Write an ending where {character1} and {character2} part ways.' },
    { category: 'Choices & Endings', prompt: 'What if they never met at all?', requiresTwoCharacters: true },
    { category: 'Choices & Endings', prompt: 'What ending neither of them wanted but accepted?', requiresTwoCharacters: true },
  ];

const singleCharacterPromptTemplates: PromptTemplate[] = [
    // ============================
    // Character Development & Growth
    // ============================
    { category: 'Character Development', prompt: 'Write about a day in {character1}\'s life that changes everything.', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'Describe a moment when {character1} questions their core beliefs.', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'What is {character1}\'s biggest fear, and how do they confront it?', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'Write a scene where {character1} must make a difficult moral choice.', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'How does {character1} handle failure or disappointment?', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'Describe {character1}\'s most defining moment.', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'What does {character1} learn about themselves in solitude?', requiresTwoCharacters: false },
    { category: 'Character Development', prompt: 'Write about {character1}\'s journey toward self-acceptance.', requiresTwoCharacters: false },

    // ============================
    // Internal Struggles & Emotions
    // ============================
    { category: 'Internal Struggles', prompt: 'What inner conflict torments {character1}?', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'Describe {character1}\'s relationship with their past.', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'What secret burden does {character1} carry?', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'How does {character1} cope with loneliness?', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'Write about {character1}\'s darkest hour.', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'What memory haunts {character1}?', requiresTwoCharacters: false },
    { category: 'Internal Struggles', prompt: 'Describe a moment when {character1} feels truly lost.', requiresTwoCharacters: false },

    // ============================
    // Skills, Abilities & Talents
    // ============================
    { category: 'Abilities & Skills', prompt: 'How did {character1} discover their greatest talent?', requiresTwoCharacters: false },
    { category: 'Abilities & Skills', prompt: 'Write about {character1} mastering a new skill.', requiresTwoCharacters: false },
    { category: 'Abilities & Skills', prompt: 'What ability does {character1} struggle to control?', requiresTwoCharacters: false },
    { category: 'Abilities & Skills', prompt: 'Describe {character1}\'s training or practice routine.', requiresTwoCharacters: false },
    { category: 'Abilities & Skills', prompt: 'How does {character1} feel about their own power?', requiresTwoCharacters: false },
    { category: 'Abilities & Skills', prompt: 'Write about a time {character1} pushed their limits.', requiresTwoCharacters: false },

    // ============================
    // Relationships & Connections
    // ============================
    { category: 'Relationships', prompt: 'Who does {character1} miss most?', requiresTwoCharacters: false },
    { category: 'Relationships', prompt: 'Describe {character1}\'s relationship with their family.', requiresTwoCharacters: false },
    { category: 'Relationships', prompt: 'What friendship means the most to {character1}?', requiresTwoCharacters: false },
    { category: 'Relationships', prompt: 'How does {character1} express love or care?', requiresTwoCharacters: false },
    { category: 'Relationships', prompt: 'Write about {character1}\'s first love or crush.', requiresTwoCharacters: false },
    { category: 'Relationships', prompt: 'What person changed {character1}\'s life forever?', requiresTwoCharacters: false },

    // ============================
    // Goals, Dreams & Aspirations
    // ============================
    { category: 'Goals & Dreams', prompt: 'What is {character1}\'s ultimate goal or dream?', requiresTwoCharacters: false },
    { category: 'Goals & Dreams', prompt: 'What would {character1} sacrifice everything for?', requiresTwoCharacters: false },
    { category: 'Goals & Dreams', prompt: 'Write about {character1}\'s childhood dream.', requiresTwoCharacters: false },
    { category: 'Goals & Dreams', prompt: 'How does {character1} define success?', requiresTwoCharacters: false },
    { category: 'Goals & Dreams', prompt: 'What ambition drives {character1} forward?', requiresTwoCharacters: false },

    // ============================
    // Daily Life & Routine
    // ============================
    { category: 'Daily Life', prompt: 'Describe {character1}\'s morning routine.', requiresTwoCharacters: false },
    { category: 'Daily Life', prompt: 'What does {character1} do to relax or unwind?', requiresTwoCharacters: false },
    { category: 'Daily Life', prompt: 'Write about {character1}\'s favorite place.', requiresTwoCharacters: false },
    { category: 'Daily Life', prompt: 'What hobby or pastime does {character1} enjoy?', requiresTwoCharacters: false },
    { category: 'Daily Life', prompt: 'Describe {character1}\'s perfect day.', requiresTwoCharacters: false },
    { category: 'Daily Life', prompt: 'How does {character1} spend their free time?', requiresTwoCharacters: false },

    // ============================
    // Personality & Traits
    // ============================
    { category: 'Personality', prompt: 'What makes {character1} laugh?', requiresTwoCharacters: false },
    { category: 'Personality', prompt: 'Describe {character1}\'s sense of humor.', requiresTwoCharacters: false },
    { category: 'Personality', prompt: 'What is {character1}\'s worst personality trait?', requiresTwoCharacters: false },
    { category: 'Personality', prompt: 'What is {character1}\'s best quality?', requiresTwoCharacters: false },
    { category: 'Personality', prompt: 'How does {character1} handle stress?', requiresTwoCharacters: false },
    { category: 'Personality', prompt: 'Write about a time {character1} surprised themselves.', requiresTwoCharacters: false },

    // ============================
    // Backstory & Origin
    // ============================
    { category: 'Backstory', prompt: 'What childhood event shaped {character1}?', requiresTwoCharacters: false },
    { category: 'Backstory', prompt: 'Describe {character1}\'s origin story.', requiresTwoCharacters: false },
    { category: 'Backstory', prompt: 'Where did {character1} grow up, and how did it affect them?', requiresTwoCharacters: false },
    { category: 'Backstory', prompt: 'What tragedy defines {character1}\'s past?', requiresTwoCharacters: false },
    { category: 'Backstory', prompt: 'Write about {character1}\'s earliest memory.', requiresTwoCharacters: false },
  ];

// Ensure all two-character templates have the flag
const twoCharacterTemplates = twoCharacterPromptTemplates.map(t => ({ 
  ...t, 
  requiresTwoCharacters: true 
}));

// Default templates (fallback if database is empty)
const defaultPromptTemplates = [...twoCharacterTemplates, ...singleCharacterPromptTemplates];
  
  

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

export function WritingPrompts({ ocs, prompts = [], className = '', isAdmin = false }: WritingPromptsProps) {
  const [promptType, setPromptType] = useState<'single' | 'two'>('two');
  const [prompt, setPrompt] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [character1, setCharacter1] = useState<PromptOC | null>(null);
  const [character2, setCharacter2] = useState<PromptOC | null>(null);
  const [responseText, setResponseText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-clear success message, with cleanup to avoid unmount leaks
  useEffect(() => {
    if (!saveMessage || saveMessage.type !== 'success') return;
    const timer = window.setTimeout(() => setSaveMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  // Group OCs by world_id
  const ocsByWorld = ocs.reduce((acc, oc) => {
    const worldId = oc.world_id || 'no-world';
    if (!acc[worldId]) {
      acc[worldId] = [];
    }
    acc[worldId].push(oc);
    return acc;
  }, {} as Record<string, PromptOC[]>);

  // Convert database prompts to template format, or use defaults
  const dbPromptTemplates: PromptTemplate[] = prompts.length > 0
    ? prompts.map(p => ({
        category: p.category,
        prompt: p.prompt_text,
        requiresTwoCharacters: p.requires_two_characters,
      }))
    : defaultPromptTemplates;

  // Find worlds with at least the required number of characters
  const validWorldsForTwo = Object.entries(ocsByWorld).filter(([_, chars]) => chars.length >= 2);
  const validWorldsForSingle = Object.entries(ocsByWorld).filter(([_, chars]) => chars.length >= 1);
  
  const canGenerateTwo = promptType === 'two' && validWorldsForTwo.length > 0;
  const canGenerateSingle = promptType === 'single' && validWorldsForSingle.length > 0;
  const canGenerate = promptType === 'two' ? canGenerateTwo : canGenerateSingle;

  const generatePrompt = () => {
    if (promptType === 'two') {
      if (!canGenerateTwo) {
        alert('Need at least 2 characters from the same world to generate two-character prompts');
        return;
      }

      // Pick a random world that has at least 2 characters
      const [worldId, worldOCs] = randomElement(validWorldsForTwo);
      const char1 = randomElement(worldOCs);
      let char2 = randomElement(worldOCs);
      // Make sure they're different
      while (char2.id === char1.id && worldOCs.length > 1) {
        char2 = randomElement(worldOCs);
      }

      const templates = dbPromptTemplates.filter((t: PromptTemplate) => t.requiresTwoCharacters === true);
      if (templates.length === 0) {
        alert('No two-character prompts available');
        return;
      }
      const template = randomElement(templates);
      const generatedPrompt = template.prompt
        .replace('{character1}', char1.name)
        .replace('{character2}', char2.name);

      setCharacter1(char1);
      setCharacter2(char2);
      setCategory(template.category);
      setPrompt(generatedPrompt);
    } else {
      if (!canGenerateSingle) {
        alert('Need at least 1 character to generate single-character prompts');
        return;
      }

      // Pick a random world and character
      const [worldId, worldOCs] = randomElement(validWorldsForSingle);
      const char1 = randomElement(worldOCs);

      const templates = dbPromptTemplates.filter((t: PromptTemplate) => !t.requiresTwoCharacters);
      if (templates.length === 0) {
        alert('No single-character prompts available');
        return;
      }
      const template = randomElement(templates);
      const generatedPrompt = template.prompt
        .replace('{character1}', char1.name);

      setCharacter1(char1);
      setCharacter2(null);
      setCategory(template.category);
      setPrompt(generatedPrompt);
    }

    setResponseText('');
    setSaveMessage(null);
  };

  const handleSaveResponse = async () => {
    // Check if admin is logged in
    if (!isAdmin) {
      setSaveMessage({ type: 'error', text: 'You must be logged in as admin to save responses.' });
      return;
    }

    if (!prompt || !category || !character1 || !responseText.trim()) {
      setSaveMessage({ type: 'error', text: 'Please enter a response before saving.' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('writing_prompt_responses')
        .insert({
          oc_id: character1.id,
          other_oc_id: character2?.id || null,
          category: category,
          prompt_text: prompt,
          response_text: responseText.trim(),
        });

      if (error) {
        logger.error('Component', 'WritingPrompts: Error saving response', error);
        setSaveMessage({ type: 'error', text: 'Failed to save response. Please try again.' });
      } else {
        setSaveMessage({ type: 'success', text: 'Response saved! View it on the character\'s page.' });
        setResponseText('');
      }
    } catch (error) {
      logger.error('Component', 'WritingPrompts: Error saving response', error);
      setSaveMessage({ type: 'error', text: 'An unexpected error occurred. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="wiki-card p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg border border-purple-500/30">
            <i className="fas fa-pen-fancy text-purple-400 text-xl"></i>
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-100">
              Writing Prompt Generator
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Generate prompts from characters in the same world
            </p>
          </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-900/30 rounded-xl border border-gray-700/50 mb-4">
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Generate creative writing prompts based on your characters and their relationships. 
            Choose between single-character prompts or prompts that compare two characters from the same world.
          </p>

          <div className="mb-3">
            <label className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2">
              Prompt Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setPromptType('single')}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  promptType === 'single'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700/70 hover:text-gray-300'
                }`}
              >
                <i className="fas fa-user mr-2"></i>
                Single Character
              </button>
              <button
                onClick={() => setPromptType('two')}
                className={`flex-1 px-3 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                  promptType === 'two'
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700/70 hover:text-gray-300'
                }`}
              >
                <i className="fas fa-users mr-2"></i>
                Two Characters
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 text-xs text-gray-400">
            <i className="fas fa-info-circle text-purple-400 mt-0.5"></i>
            <p>
              {promptType === 'two' 
                ? `You need at least 2 characters from the same world. Currently, ${validWorldsForTwo.length} ${validWorldsForTwo.length === 1 ? 'world has' : 'worlds have'} enough characters.`
                : `You need at least 1 character. Currently, ${validWorldsForSingle.length} ${validWorldsForSingle.length === 1 ? 'world has' : 'worlds have'} characters.`
              }
            </p>
          </div>
        </div>

        <button
          onClick={generatePrompt}
          disabled={!canGenerate}
          className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2"
        >
          <i className="fas fa-magic"></i>
          <span>Generate Prompt</span>
        </button>
      </div>

      {prompt && category && character1 && (
        <div className="wiki-card p-4 md:p-6 border-l-4 border-purple-400 bg-gradient-to-br from-gray-800/60 to-gray-900/40 shadow-xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-lg border border-purple-500/40 shadow-lg shadow-purple-500/20">
              <i className="fas fa-star text-purple-300 text-lg"></i>
            </div>
            <div>
              <h3 className="text-xl md:text-2xl font-bold text-gray-100">
                Your Writing Prompt
              </h3>
              <p className="text-gray-400 text-xs mt-0.5">Ready to inspire your next story</p>
            </div>
          </div>
          
          {character1.world && (
            <div className="mb-4">
              <a
                href={`/worlds/${character1.world.slug}`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/40 hover:border-purple-400/60 rounded-lg text-purple-300 hover:text-purple-200 transition-all duration-200 group shadow-md text-sm"
              >
                <i className="fas fa-globe text-purple-400"></i>
                <span className="font-medium">World: {character1.world.name}</span>
                <i className="fas fa-arrow-right text-xs group-hover:translate-x-1 transition-transform"></i>
              </a>
            </div>
          )}
          
          <div className="p-4 bg-gradient-to-br from-gray-900/70 to-gray-800/50 rounded-xl border border-gray-700/60 mb-4 shadow-inner">
            <div className="mb-3 pb-3 border-b border-gray-700/60">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 rounded-lg">
                <i className="fas fa-tag text-purple-400 text-xs"></i>
                <span className="text-purple-300 font-semibold text-xs uppercase tracking-wider">
                  {category}
                </span>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="text-gray-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                <i className="fas fa-pen-nib text-purple-400"></i>
                Prompt
              </div>
              <p className="text-lg md:text-xl lg:text-2xl text-gray-100 leading-relaxed font-medium">
                {prompt}
              </p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-gray-900/70 to-gray-800/50 rounded-xl border border-gray-700/60 mb-4">
            {!isAdmin && (
              <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-300 text-sm">
                  <i className="fas fa-lock"></i>
                  <span className="font-medium">Admin login required to save responses</span>
                </div>
              </div>
            )}
            
            <div className="mb-3">
              <label htmlFor="response-text" className="block text-gray-300 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2">
                <i className="fas fa-pen text-purple-400"></i>
                Your Response
              </label>
              <textarea
                id="response-text"
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder={isAdmin ? "Write your response to this prompt here..." : "Admin login required to save responses..."}
                className="w-full h-40 px-3 py-2 bg-gray-900/60 border border-gray-700/60 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all resize-y text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving || !isAdmin}
              />
            </div>

            {saveMessage && (
              <div className={`mb-3 p-3 rounded-lg border text-sm ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/20 border-green-500/40 text-green-300'
                  : 'bg-red-500/20 border-red-500/40 text-red-300'
              }`}>
                <div className="flex items-center gap-2">
                  <i className={`fas ${saveMessage.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                  <span className="font-medium">{saveMessage.text}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleSaveResponse}
              disabled={isSaving || !responseText.trim() || !isAdmin}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-95 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/40 disabled:hover:scale-100 disabled:shadow-none flex items-center justify-center gap-2 text-sm"
            >
              {isSaving ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-save"></i>
                  <span>Save Response</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a
              href={`/ocs/${character1.slug}`}
              className="group p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/60 rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02]"
            >
              <div className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-2">
                <i className="fas fa-user text-purple-400"></i>
                Character 1
              </div>
              <div className="text-purple-400 hover:text-purple-300 font-bold group-hover:text-purple-300 transition-colors">
                {character1.name}
              </div>
              <div className="mt-1.5 flex items-center gap-1 text-gray-500 text-xs">
                <i className="fas fa-arrow-right text-xs"></i>
                <span>View character</span>
              </div>
            </a>
            {character2 ? (
              <a
                href={`/ocs/${character2.slug}`}
                className="group p-4 bg-gradient-to-br from-gray-800/80 to-gray-900/60 rounded-xl border border-gray-700/50 hover:border-purple-500/50 transition-all duration-200 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-[1.02]"
              >
                <div className="text-gray-400 text-xs uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-2">
                  <i className="fas fa-user text-purple-400"></i>
                  Character 2
                </div>
                <div className="text-purple-400 hover:text-purple-300 font-bold group-hover:text-purple-300 transition-colors">
                  {character2.name}
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-gray-500 text-xs">
                  <i className="fas fa-arrow-right text-xs"></i>
                  <span>View character</span>
                </div>
              </a>
            ) : (
              <div className="p-4 bg-gradient-to-br from-gray-800/40 to-gray-900/30 rounded-xl border border-gray-700/30 opacity-60">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-2">
                  <i className="fas fa-info-circle"></i>
                  Single Character Prompt
                </div>
                <div className="text-gray-600 text-xs">
                  This prompt focuses on {character1?.name} alone.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

