import { SkillLevel } from './learner';

export type ResourceType =
  | 'Course'
  | 'Video'
  | 'Article'
  | 'Documentation'
  | 'Practice'
  | 'Project';

export interface ResourceFeedback {
  id?: string;
  resourceId: string;
  usefulnessScore: number; // 1 to 5
  difficultyAppropriateness?: 'Too easy' | 'Appropriate' | 'Too difficult';
  difficultyRating?: 'too-easy' | 'just-right' | 'too-hard';
  confidenceIncrease?: 'Yes' | 'Somewhat' | 'Not yet';
  submittedAt: string;
  notes?: string;
}

export interface LearningResource {
  id: string;
  title: string;
  type: ResourceType;
  provider: string;
  url?: string;
  skill: string;
  difficulty: SkillLevel;
  duration: string; // e.g. "30 min", "1h 15m"
  durationMinutes?: number;
  description: string;
  learningObjective: string;
  verified: boolean;
  relevanceScore: number; // 0 to 100
  reason?: string;
  searchKeywords?: string[];
  prerequisites?: string[];
  expectedOutcome?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Saved';
  saved?: boolean;
  savedAt?: string;
  completedAt?: string;
  progress?: number; // 0 to 100
  feedback?: ResourceFeedback;
  linkedActivityId?: string;
  category?: 'Courses' | 'Videos' | 'Articles' | 'Documentation' | 'Practice'; // Legacy compatibility
  rating?: number; // Legacy compatibility
  thumbnailUrl?: string;
  objective?: string; // Legacy alias
}

export interface ResourceRecommendationResponse {
  skill: string;
  learningObjective: string;
  currentFocusReason?: string;
  recommendations: LearningResource[];
  isAiGenerated?: boolean;
}

export interface ResourceSearchQuery {
  query: string;
  skill?: string;
  type?: string;
  difficulty?: string;
  maxMinutes?: number;
}
