-- Seed writing prompts with the existing templates
-- Two-character prompts
INSERT INTO writing_prompts (category, prompt_text, requires_two_characters, is_active) VALUES
-- First Meeting
('First Meeting', 'What happens when {character1} and {character2} meet for the first time?', true, true),
('First Meeting', 'Describe {character1}''s first impression of {character2}.', true, true),
('First Meeting', 'How does {character2} misjudge {character1} at first?', true, true),
('First Meeting', 'Write the moment {character1} realizes {character2} is not what they expected.', true, true),
('First Meeting', 'Create a scene where their first meeting goes completely wrong.', true, true),
('First Meeting', 'What unexpected connection forms when {character1} and {character2} meet?', true, true),
('First Meeting', 'Write a tense first encounter between {character1} and {character2}.', true, true),
('First Meeting', 'How do rumors about {character2} influence how {character1} approaches them?', true, true),
('First Meeting', 'What detail about {character2} immediately unsettles {character1}?', true, true),
('First Meeting', 'How does the setting affect their first interaction?', true, true),
('First Meeting', 'Write a meeting where neither character realizes its importance at first.', true, true),
('First Meeting', 'What assumption does {character1} make about {character2} that proves false?', true, true),
('First Meeting', 'How does {character2} deliberately control the first impression they give?', true, true),
('First Meeting', 'Write a brief but charged first interaction that lingers afterward.', true, true),
('First Meeting', 'What emotion dominates their first meeting, and why?', true, true),

-- Trust & Reliance
('Trust & Reliance', 'Write a scene where {character1} must ask {character2} for help.', true, true),
('Trust & Reliance', 'What makes {character1} finally trust {character2}?', true, true),
('Trust & Reliance', 'Create a moment where {character2} helps {character1} without being asked.', true, true),
('Trust & Reliance', 'Write about {character1} depending on {character2} for the first time.', true, true),
('Trust & Reliance', 'How does {character2} react when {character1} shows vulnerability?', true, true),
('Trust & Reliance', 'What happens when {character1} realizes they can''t succeed without {character2}?', true, true),
('Trust & Reliance', 'Write a quiet scene where trust is built without words.', true, true),
('Trust & Reliance', 'What small action from {character2} earns {character1}''s trust?', true, true),
('Trust & Reliance', 'When does {character1} trust {character2} before fully realizing it?', true, true),
('Trust & Reliance', 'What risk does {character2} take for {character1}?', true, true),
('Trust & Reliance', 'How does trust change their dynamic afterward?', true, true),
('Trust & Reliance', 'Write a scene where trust is tested but not broken.', true, true),
('Trust & Reliance', 'What unspoken agreement forms between them?', true, true),
('Trust & Reliance', 'How does reliance complicate their independence?', true, true),

-- Conflict & Betrayal
('Conflict & Betrayal', 'How would {character1} react if {character2} betrayed them?', true, true),
('Conflict & Betrayal', 'Write a confrontation where {character1} accuses {character2} of lying.', true, true),
('Conflict & Betrayal', 'What secret causes a rift between {character1} and {character2}?', true, true),
('Conflict & Betrayal', 'Create a scene where {character2} makes a choice that hurts {character1}.', true, true),
('Conflict & Betrayal', 'How does {character1} respond when {character2} refuses to explain themselves?', true, true),
('Conflict & Betrayal', 'Write the moment their alliance nearly falls apart.', true, true),
('Conflict & Betrayal', 'What line does {character2} cross that can''t be taken back?', true, true),
('Conflict & Betrayal', 'Describe a fight between them that is more emotional than physical.', true, true),
('Conflict & Betrayal', 'What misunderstanding escalates into open conflict?', true, true),
('Conflict & Betrayal', 'How does unresolved tension affect their decisions?', true, true),
('Conflict & Betrayal', 'What truth makes forgiveness difficult?', true, true),
('Conflict & Betrayal', 'Write a confrontation where neither character is entirely wrong.', true, true),
('Conflict & Betrayal', 'How does betrayal change how they see themselves?', true, true),

-- Forced Proximity
('Forced Proximity', 'Create a story where {character1} and {character2} are forced to work together.', true, true),
('Forced Proximity', 'Write about a day in the life of {character1} and {character2} as roommates.', true, true),
('Forced Proximity', 'What happens when {character1} and {character2} are stuck together overnight?', true, true),
('Forced Proximity', 'Put {character1} and {character2} on a mission where cooperation is mandatory.', true, true),
('Forced Proximity', 'How do they clash when given shared responsibility?', true, true),
('Forced Proximity', 'Write a scene where they must pretend to get along.', true, true),
('Forced Proximity', 'What small habits of {character2} slowly annoy {character1}?', true, true),
('Forced Proximity', 'How does proximity force honesty between them?', true, true),
('Forced Proximity', 'What boundary is crossed simply due to closeness?', true, true),
('Forced Proximity', 'How does being trapped together change their priorities?', true, true),
('Forced Proximity', 'Write a scene where silence becomes uncomfortable.', true, true),

-- Secrets & Revelations
('Secrets & Revelations', 'What if {character1} discovered a secret about {character2}?', true, true),
('Secrets & Revelations', 'Write the moment {character2} reveals something they''ve hidden.', true, true),
('Secrets & Revelations', 'How does {character1} react to learning the truth too late?', true, true),
('Secrets & Revelations', 'What secret does {character1} keep from {character2}, and why?', true, true),
('Secrets & Revelations', 'Create a scene where a secret is revealed by accident.', true, true),
('Secrets & Revelations', 'What changes when {character1} realizes they never really knew {character2}?', true, true),
('Secrets & Revelations', 'How does secrecy shape their relationship?', true, true),
('Secrets & Revelations', 'What truth is hardest to say aloud?', true, true),
('Secrets & Revelations', 'Write a revelation that shifts the power dynamic.', true, true),

-- Emotional Moments
('Emotional Moments', 'How would {character1} comfort {character2} after a loss?', true, true),
('Emotional Moments', 'Write a quiet scene where neither character says what they really mean.', true, true),
('Emotional Moments', 'Describe a moment of unexpected tenderness between {character1} and {character2}.', true, true),
('Emotional Moments', 'What does {character2} notice about {character1} when they think no one is watching?', true, true),
('Emotional Moments', 'Write a scene where emotional support matters more than action.', true, true),
('Emotional Moments', 'How does {character1} show care in a way that surprises {character2}?', true, true),
('Emotional Moments', 'What shared silence becomes meaningful?', true, true),
('Emotional Moments', 'Write a moment of emotional honesty that changes everything.', true, true),

-- Competition
('Competition', 'What happens when {character1} and {character2} compete in a challenge?', true, true),
('Competition', 'Write a rivalry that slowly turns into respect.', true, true),
('Competition', 'How does {character2} react to losing against {character1}?', true, true),
('Competition', 'Create a scene where competition reveals hidden feelings.', true, true),
('Competition', 'What happens when winning costs one of them something important?', true, true),
('Competition', 'Write about a challenge neither of them expected to win.', true, true),
('Competition', 'How does competition strain their relationship?', true, true),

-- Growth & Change
('Growth & Change', 'Create a scene where {character1} teaches {character2} something important.', true, true),
('Growth & Change', 'What lesson does {character2} unintentionally teach {character1}?', true, true),
('Growth & Change', 'Write about a mistake that leads to growth for both characters.', true, true),
('Growth & Change', 'How does {character1} change after knowing {character2}?', true, true),
('Growth & Change', 'Describe a moment where one character outgrows the other.', true, true),
('Growth & Change', 'What belief does {character2} force {character1} to question?', true, true),
('Growth & Change', 'How do they evolve together rather than apart?', true, true),

-- Identity & Role Reversal
('Identity & Role Reversal', 'What if {character1} and {character2} switched places for a day?', true, true),
('Identity & Role Reversal', 'Write a scene where {character1} must live with {character2}''s responsibilities.', true, true),
('Identity & Role Reversal', 'How does role reversal change how they see each other?', true, true),
('Identity & Role Reversal', 'What does {character2} struggle with most when taking on {character1}''s role?', true, true),
('Identity & Role Reversal', 'What empathy is gained through reversal?', true, true),

-- Choices & Endings
('Choices & Endings', 'Write a scene where {character1} must choose between {character2} and something else.', true, true),
('Choices & Endings', 'What happens when {character2} leaves without saying goodbye?', true, true),
('Choices & Endings', 'Describe their final conversation before everything changes.', true, true),
('Choices & Endings', 'Write an ending where {character1} and {character2} part ways.', true, true),
('Choices & Endings', 'What if they never met at all?', true, true),
('Choices & Endings', 'What ending neither of them wanted but accepted?', true, true);

-- Single-character prompts (Character Reflection category)
INSERT INTO writing_prompts (category, prompt_text, requires_two_characters, is_active) VALUES
('Character Reflection', 'What is {character1}''s greatest fear, and how do they cope with it?', false, true),
('Character Reflection', 'Describe a day in {character1}''s life when everything goes wrong.', false, true),
('Character Reflection', 'What secret does {character1} keep from the world, and why?', false, true),
('Character Reflection', 'How does {character1} react to unexpected good fortune?', false, true),
('Character Reflection', 'Write a scene where {character1} confronts their past self.', false, true),
('Character Reflection', 'What is {character1}''s most cherished possession, and why?', false, true),
('Character Reflection', 'How does {character1} spend their free time when no one is watching?', false, true),
('Character Reflection', 'What is a hidden talent or hobby {character1} possesses?', false, true),
('Character Reflection', 'Write about {character1} making a difficult moral choice.', false, true),
('Character Reflection', 'How does {character1} deal with loneliness or isolation?', false, true),
('Character Reflection', 'What is {character1}''s biggest regret, and how does it affect them?', false, true),
('Character Reflection', 'Describe {character1}''s ideal future, and what stands in their way.', false, true),
('Character Reflection', 'How does {character1} react to a sudden, drastic change in their environment?', false, true),
('Character Reflection', 'Write a scene where {character1} receives unexpected news.', false, true),
('Character Reflection', 'What is {character1}''s philosophy on life, and how did they develop it?', false, true);

