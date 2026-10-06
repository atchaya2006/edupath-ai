export type SkillLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Unknown';

export interface PersonalInfo {
  name: string;
  email?: string;
  location?: string;
  currentRole: string;
  yearsExperience: string;
}

export interface EducationItem {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: string;
  evidence?: string;
}

export interface ExperienceItem {
  role: string;
  company: string;
  duration: string;
  description: string;
  skillsUsed?: string[];
  evidence?: string;
}

export interface SkillItem {
  id: string;
  name: string;
  level: SkillLevel;
  userConfirmedLevel?: SkillLevel;
  category: string;
  progress: number; // 0 to 100
  confidence?: number; // 0 to 100
  evidence?: string;
  targetLevel?: SkillLevel;
  status?: 'Acquired' | 'In Progress' | 'Skill Gap';
  isAiDetected?: boolean;
}

export interface CertificationItem {
  id: string;
  name: string;
  issuer: string;
  year?: string;
  date?: string;
  relevantSkills?: string[];
  evidence?: string;
  verified?: boolean;
}

export interface SkillGap {
  skill: string;
  current: SkillLevel;
  required: SkillLevel;
  gap: 'Ready' | 'Needs improvement' | 'Moderate';
  progress: number;
  priority: 'High' | 'Medium' | 'Low';
  reason?: string;
}

export interface ProjectItem {
  id: string;
  name?: string;
  title?: string;
  description: string;
  technologies?: string[];
  tech?: string[];
  skillsDemonstrated?: string[];
  role?: string;
  evidence?: string;
  url?: string;
  stars?: number;
}

export interface LearnerProfile {
  id: string;
  personalInfo?: PersonalInfo;
  name: string;
  currentRole: string;
  currentEducation: string;
  yearsExperience: string;
  targetRole: string;
  careerGoal: string;
  learningPreference: 'Hands-on Projects' | 'Video & Visuals' | 'Reading & Theory' | 'Balanced';
  weeklyHours: number;
  education?: EducationItem[];
  experience?: ExperienceItem[];
  technicalSkills: SkillItem[];
  softSkills: SkillItem[];
  certifications: CertificationItem[];
  projects: ProjectItem[];
  overallProgress: number;
  skillsAcquiredCount: number;
  skillsInProgressCount: number;
  remainingGapsCount: number;
  totalLearningHours: number;
  streakDays: number;
  skillGaps?: SkillGap[];
  resumeFileName?: string;
  resumeFileSize?: number;
  resumeFileMime?: string;
  resumeText?: string;
  isDemoProfile?: boolean;
}
