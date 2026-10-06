export type CommunicationPracticeMode =
  | 'grammar'
  | 'vocabulary'
  | 'intro'
  | 'project_explanation'
  | 'interview'
  | 'technical_explanation'
  | 'presentation'
  | 'general_writing';

export interface CommunicationEvaluation {
  clarity: number; // 0-100
  grammar: number; // 0-100
  structure: number; // 0-100
  vocabulary: number; // 0-100
  professionalism: number; // 0-100
  technicalAccuracy?: number; // 0-100
  overallScore?: number; // 0-100
  strengths: string[];
  improvements: string[];
  correctedVersion?: string;
  practiceRecommendation: string;
}

export interface CommunicationAttempt {
  id: string;
  userId: string;
  type: CommunicationPracticeMode | string;
  prompt: string;
  response: string;
  evaluation?: CommunicationEvaluation;
  createdAt: string;
  targetRole?: string;
  context?: string;
}

export interface GrammarPracticeExercise {
  id: string;
  type: 'fill_blank' | 'sentence_correction' | 'tenses' | 'articles' | 'prepositions' | 'subject_verb';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  commonMistake: string;
  improvedSentence: string;
  targetSkill?: string;
}

export interface VocabularyWord {
  id: string;
  word: string;
  meaning: string;
  example: string;
  careerContext: string;
  practiceQuestion: string;
  targetRole: string;
  synonyms?: string[];
  options?: string[];
}

export interface ProfessionalIntroDraft {
  introduction: string;
  bulletSummary: string[];
  tips: string[];
  elevatorPitch30s?: string;
  fullBio?: string;
  variants?: {
    improved?: string;
    concise?: string;
    executive?: string;
  };
  strengths?: string[];
}

export interface PresentationStructure {
  topic: string;
  audience: string;
  duration: string;
  purpose: string;
  structure: {
    opening: string;
    mainPoints: string[];
    example: string;
    closing: string;
    possibleQuestions: string[];
  };
  speakerNotes?: string[];
}

export interface TechnicalExplanationScenario {
  topic: string;
  targetAudience: string;
  prompt: string;
  context: string;
  keyTechnicalConcepts: string[];
  suggestedAnalogy: string;
  recommendedStructure: string[];
}

export interface ImprovedCommunicationResult {
  original: string;
  correctedVersion: string;
  whyChanged: string;
  moreProfessionalVersion: string;
  simplerVersion: string;
  executiveBulletSummary?: string[];
}
