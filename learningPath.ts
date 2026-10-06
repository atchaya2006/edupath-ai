import { SkillLevel } from './learner';

export type ActivityType =
  | 'lesson'
  | 'video'
  | 'reading'
  | 'practice'
  | 'quiz'
  | 'project'
  | 'communication';

export type ActivityPriority = 'High' | 'Medium' | 'Low';

export type DayOfWeek =
  | 'Monday'
  | 'Tuesday'
  | 'Wednesday'
  | 'Thursday'
  | 'Friday'
  | 'Saturday'
  | 'Sunday';

export interface ResourceSlot {
  resourceId?: string;
  resourceType?: 'Course' | 'Video' | 'Article' | 'Interactive Practice' | 'Project Brief';
  resourceTitle?: string;
  resourceUrl?: string;
  provider?: string;
  note?: string;
}

export interface LearningActivity {
  id: string;
  title: string;
  description: string;
  skill: string;
  type: ActivityType;
  difficulty: SkillLevel;
  estimatedMinutes: number;
  priority: ActivityPriority;
  dayOfWeek?: DayOfWeek;
  completed: boolean;
  skipped?: boolean;
  whyThisTask?: string;
  learningObjective?: string;
  resourceSlot?: ResourceSlot;
  projectMilestones?: string[];
  communicationTopic?: string;
  completedAt?: string;
}

export interface WeeklyPlan {
  weekNumber: number;
  title: string;
  objective: string;
  detailedObjectives?: string[];
  skills: string[];
  estimatedHours: number;
  activities: LearningActivity[];
  assessment: string;
  expectedOutcome: string;
  isCurrent?: boolean;
  isCompleted?: boolean;
}

export interface RoadmapPhase {
  phaseId: string;
  title: string;
  description: string;
  weeks: number[]; // e.g. [1, 2]
  skills: string[];
  status: 'Not Started' | 'In Progress' | 'Completed';
  estimatedHours?: number;
  current?: boolean;
}

export type LearningFormat =
  | 'Videos'
  | 'Reading'
  | 'Hands-on practice'
  | 'Projects'
  | 'Quizzes'
  | 'Mixed';

export type CurriculumDifficulty = 'Beginner-friendly' | 'Balanced' | 'Challenging';

export type SessionStyle = 'Short sessions' | 'Deep-focus sessions' | 'Flexible schedule';

export interface LearningPreferences {
  learningFormat: LearningFormat;
  difficulty: CurriculumDifficulty;
  sessionStyle: SessionStyle;
  customNotes?: string;
}

export interface WeeklyCheckIn {
  weekNumber: number;
  confidenceScore: number; // 1 to 5
  difficultyFeedback: string;
  completedStatus: 'Yes' | 'Partially' | 'No';
  helpNeeded: string;
  submittedAt: string;
}

export interface WeeklySummary {
  weekNumber: number;
  summaryText: string;
  skillsPracticed: string[];
  activitiesCompleted: number;
  totalActivities: number;
  timeSpentMinutes: number;
  quizPerformance: string;
  difficultAreas: string[];
  improvements: string[];
  recommendedNextSteps: string[];
  generatedAt: string;
}

export interface AdaptationChange {
  timestamp: string;
  summary: string;
  reasons: string[];
  adjustments: string[];
  trigger: 'user_request' | 'struggle' | 'excelled' | 'check_in' | 'hours_change';
}

export interface LearningPath {
  id: string;
  targetRole: string;
  durationWeeks: number;
  weeklyHours: number;
  overallObjective: string;
  learningPreferences: LearningPreferences;
  phases: RoadmapPhase[];
  weeks: WeeklyPlan[];
  aiReasoning: string;
  generatedAt: string;
  currentWeek?: number;
  lastAdaptedAt?: string;
  isDemoPath?: boolean;
  adaptationHistory?: AdaptationChange[];
  weeklyCheckIns?: Record<number, WeeklyCheckIn>;
  weeklySummaries?: Record<number, WeeklySummary>;
}

export interface LearningProgress {
  activitiesCompleted: number;
  activitiesTotal: number;
  activitiesRemaining: number;
  weeklyCompletionPercent: number;
  phaseCompletionPercent: number;
  overallProgressPercent: number;
  currentStreakDays: number;
  currentWeekNumber: number;
  currentPhaseTitle: string;
}
