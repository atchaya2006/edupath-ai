import { SkillLevel } from './learner';

export interface ProjectMilestone {
  id?: string;
  step?: number;
  title: string;
  objective?: string;
  tasks?: string[];
  skills?: string[];
  estimatedTime?: string;
  completed: boolean;
  status?: 'not_started' | 'in_progress' | 'completed';
  details?: string;
  hints?: string[];
  starterDeliverable?: string;
}

export interface ProjectSubmission {
  githubUrl?: string;
  demoUrl?: string;
  projectDescription?: string;
  screenshots?: string[];
  technologies?: string[];
  keyFeatures?: string[];
  challengesFaced?: string;
  learningOutcomes?: string[];
  submittedAt?: string;
}

export interface ProjectAIReview {
  reviewedAt: string;
  overallScore?: number;
  strengths: string[];
  areasForImprovement: string[];
  technicalSuggestions: string[];
  missingFeatures: string[];
  documentationSuggestions: string[];
  presentationSuggestions: string[];
  portfolioSuggestions: string[];
  interviewTalkingPoints: string[];
  overallSummary: string;
}

export interface AIProject {
  id: string;
  userId: string;
  title: string;
  problemStatement: string;
  objective: string;
  targetRole: string;
  skills: string[];
  technologies: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: string;
  prerequisites: string[];
  milestones: ProjectMilestone[];
  whyRecommended: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  portfolioValue?: string[];
  expectedOutcome?: string;
  functionalRequirements?: string[];
  technicalRequirements?: string[];
  expectedInputs?: string[];
  expectedOutputs?: string[];
  datasetRequirements?: string[];
  requirements?: {
    functional?: string[];
    technical?: string[];
    inputs?: string[];
    outputs?: string[];
    dataset?: string[];
  };
  portfolioSkillsDemonstrated?: string[];
  suggestedTools?: string[];
  submission?: ProjectSubmission;
  aiReview?: ProjectAIReview;
  skillsEvidence?: string[];
  currentMilestoneId?: string;
  isSaved?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMentorMessage {
  id: string;
  role: 'user' | 'mentor';
  content: string;
  hint?: string;
  example?: string;
  timestamp: string;
}
