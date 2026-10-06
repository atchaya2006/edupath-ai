import { SkillLevel } from './learner';

export interface ExtractedTechnicalSkill {
  skill: string;
  evidence: string;
  confidence: number; // 0 - 100
  estimatedLevel: SkillLevel;
  userConfirmedLevel?: SkillLevel;
}

export interface ExtractedSoftSkill {
  skill: string;
  evidence: string;
  confidence: number; // 0 - 100
}

export interface ExtractedEducation {
  institution: string;
  degree: string;
  field: string;
  graduationYear?: string;
  evidence?: string;
}

export interface ExtractedExperience {
  role: string;
  company: string;
  duration?: string;
  description: string;
  skillsUsed?: string[];
  evidence?: string;
}

export interface ExtractedCertification {
  name: string;
  issuer: string;
  date?: string;
  relevantSkills?: string[];
  evidence?: string;
}

export interface ExtractedProject {
  name: string;
  description: string;
  technologies: string[];
  skillsDemonstrated: string[];
  role?: string;
  evidence?: string;
}

export interface ProfileCompletenessBreakdown {
  education: boolean;
  skills: boolean;
  experience: boolean;
  projects: boolean;
  certifications: boolean;
  targetRole: boolean;
}

export interface CareerProfileAnalysisResult {
  candidateSummary: string;
  education: ExtractedEducation[];
  experience: ExtractedExperience[];
  technicalSkills: ExtractedTechnicalSkill[];
  softSkills: ExtractedSoftSkill[];
  certifications: ExtractedCertification[];
  projects: ExtractedProject[];
  careerInterests: string[];
  targetRole: string;
  strengths: string[];
  missingInformation: string[];
  evidenceReferences: string[];
  analyzedAt: string;
  sourceType: 'resume_and_profile' | 'profile_only' | 'demo';
  profileCompleteness: number; // 0 to 100
  completenessBreakdown: ProfileCompletenessBreakdown;
  completenessSuggestions: string[];
  isDemoAnalysis?: boolean;
}

export interface ProfileAnalysisPayload {
  learnerProfile: {
    name: string;
    currentEducation?: string;
    currentRole?: string;
    yearsExperience?: string;
    targetRole?: string;
    careerGoal?: string;
    learningPreference?: string;
    weeklyHours?: number;
    technicalSkills?: Array<{ name: string; level: string }>;
    softSkills?: Array<{ name: string; level: string }>;
    certifications?: Array<{ name: string; issuer: string }>;
    projects?: Array<{ name: string; description: string; tech?: string[] }>;
  };
  resumeText?: string;
  resumeFileName?: string;
  resumeFileBase64?: string;
  resumeFileMime?: string;
  targetRole?: string;
}

// ----------------------------------------------------
// Prompt 3: AI Skill Gap Analysis Agent Interfaces
// ----------------------------------------------------

export type SkillImportance = 'High' | 'Medium' | 'Low';
export type SkillComparisonStatus = 'Strong' | 'Developing' | 'Gap' | 'Unknown';
export type GapPriority = 'Critical' | 'High' | 'Medium' | 'Low';

export interface SkillRequirement {
  skill: string;
  importance: SkillImportance;
  reason: string;
  expectedLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  category?: string;
}

export interface TargetRoleProfile {
  targetRole: string;
  description?: string;
  technicalSkills: SkillRequirement[];
  softSkills: Array<{
    skill: string;
    importance: SkillImportance;
    reason: string;
  }>;
  tools: string[];
  domainKnowledge: string[];
  recommendedExperience: string[];
  generatedAt: string;
}

export interface SkillComparison {
  skill: string;
  currentLevel: string; // e.g. "Intermediate", "Beginner", "None / Unknown"
  requiredLevel: string; // e.g. "Advanced", "Intermediate"
  status: SkillComparisonStatus;
  priority: GapPriority;
  evidence: string[];
  explanation: string; // "Why is this a gap?"
  whatToLearn?: string[]; // "What should I learn?"
  category?: string;
  userOverride?: {
    isOverridden: boolean;
    userStatus?: SkillComparisonStatus;
    userConfirmedLevel?: string;
    notes?: string;
  };
}

export interface SkillDependency {
  prerequisite: string;
  target: string;
  reason: string;
  chain?: string[]; // e.g. ["Excel", "Data Cleaning", "Data Visualization", "Power BI"]
}

export interface SkillGapAnalysis {
  id: string;
  targetRole: string;
  roleRequirements: SkillRequirement[];
  comparisons: SkillComparison[];
  alignmentPercentage: number; // 0 - 100 (AI-estimated skill alignment)
  topPriorities: SkillComparison[];
  summary: string;
  dependencies: SkillDependency[];
  counts: {
    strong: number;
    developing: number;
    gap: number;
    unknown: number;
  };
  analyzedAt: string;
  isDemoAnalysis?: boolean;
  learnerProfileFingerprint?: string; // used to detect if profile changed since analysis
}

export interface SkillGapAnswerPayload {
  question: string;
  targetRole: string;
  analysisSummary: string;
  comparisons: SkillComparison[];
  learnerName: string;
}
