import { SkillLevel } from './learner';

export type TrendStatus =
  | 'IMPROVING'
  | 'STABLE'
  | 'DEVELOPING'
  | 'DECLINING'
  | 'INSUFFICIENT_DATA';

export type LearningLoadType = 'Light' | 'Balanced' | 'Heavy' | 'Overloaded';

export type NextBestActionType =
  | 'LEARN'
  | 'PRACTICE'
  | 'REVIEW'
  | 'BUILD'
  | 'COMMUNICATE'
  | 'INTERVIEW'
  | 'COMPLETE_ACTIVITY'
  | 'REST / RESCHEDULE';

export type AdaptiveDecisionType =
  | 'CONTINUE'
  | 'INCREASE_DIFFICULTY'
  | 'DECREASE_DIFFICULTY'
  | 'ADD_PRACTICE'
  | 'ADD_REVIEW'
  | 'ADD_PREREQUISITE'
  | 'RECOMMEND_RESOURCE'
  | 'REORDER_ACTIVITIES'
  | 'EXTEND_TIMELINE'
  | 'ACCELERATE_PATH'
  | 'REBALANCE_WEEK';

export interface SkillTrend {
  skillName: string;
  category?: string;
  currentEstimatedLevel: SkillLevel | string;
  requiredLevel: SkillLevel | string;
  userConfirmedLevel?: SkillLevel | string;
  learningProgress: number; // 0-100
  trend: TrendStatus;
  evidence: string[];
  lastActivityDate?: string;
  recommendedNextAction: string;
}

export interface ProgressStrength {
  id: string;
  skill: string;
  evidence: string;
  whyItMatters: string;
  howToUseNext: string;
}

export interface ProgressWeakness {
  id: string;
  skill: string;
  evidence: string;
  severity: 'Low' | 'Medium' | 'High';
  whyItMatters: string;
  recommendedAction: string;
}

export interface LearningInsight {
  id: string;
  category: 'strength' | 'weakness' | 'workload' | 'momentum' | 'general';
  text: string;
  evidence: string;
  recommendation?: string;
}

export interface LearningLoadDetail {
  load: LearningLoadType;
  weeklyAvailableHours: number;
  plannedHours: number;
  completedHours: number;
  explanation: string;
  recommendation?: string;
}

export interface NextBestAction {
  id: string;
  actionType: NextBestActionType;
  title: string;
  skill: string;
  reason: string;
  evidence: string[];
  estimatedMinutes: number;
  targetView: string;
  actionData?: any;
}

export interface DailyPlanTask {
  id: string;
  title: string;
  skill: string;
  estimatedMinutes: number;
  priority: 'High' | 'Medium' | 'Low';
  completed: boolean;
  skipped?: boolean;
  reason: string;
  targetView: string;
}

export interface WeeklyLearningReport {
  id: string;
  weekStartDate: string;
  weekEndDate: string;
  activitiesCompleted: number;
  skillsPracticed: string[];
  resourcesCompleted: number;
  practicePerformance: {
    questionsAnswered: number;
    accuracy: number;
    topSkill: string;
  };
  projectProgress: {
    projectsWorkedOn: number;
    milestonesCompleted: number;
  };
  communicationProgress: {
    attemptsCount: number;
    averageScore: number;
  };
  interviewProgress: {
    interviewsConducted: number;
    latestScore: number;
  };
  whatImproved: string[];
  whatNeedsAttention: string[];
  learningLoad: LearningLoadType;
  nextWeekRecommendations: string[];
  generatedAt: string;
}

export interface AdaptiveLearningChange {
  id: string;
  decision: AdaptiveDecisionType;
  title: string;
  whatChanged: string;
  why: string;
  expectedBenefit: string;
  evidenceUsed: string[];
  isMajor: boolean;
  status: 'proposed' | 'accepted' | 'declined' | 'applied';
  timestamp: string;
  targetSkill?: string;
  targetPhaseId?: number;
}

export interface LearningPathVersion {
  version: number;
  label: string;
  createdAt: string;
  whatChanged: string;
  why: string;
  evidenceUsed: string[];
  pathSnapshot?: any;
}

export interface LearnerLearningState {
  userId: string;
  targetRole: string;
  skills: any[];
  skillGaps: any[];
  learningPath?: any;
  resources: any[];
  practicePerformance: any;
  projects: any[];
  communicationProgress: any;
  interviewProgress: any;
  overallProgress: number;
  strengths: ProgressStrength[];
  weaknesses: ProgressWeakness[];
  trends: SkillTrend[];
  insights?: LearningInsight[];
  learningLoad: LearningLoadDetail;
  nextBestAction: NextBestAction;
  dailyPlan: DailyPlanTask[];
  learningStreak: number;
  weeklyReport?: WeeklyLearningReport;
  pathVersions: LearningPathVersion[];
  pendingChange?: AdaptiveLearningChange;
  appliedChanges: AdaptiveLearningChange[];
  lastUpdated: string;
}
