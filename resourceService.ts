import {
  LearnerProfile,
  LearningResource,
  ResourceFeedback,
  ResourceRecommendationResponse,
  SkillGapAnalysis,
  LearningPath,
} from '../types';
import { VERIFIED_CATALOG_RESOURCES } from '../data/verifiedResources';

export interface RecommendResourcesOptions {
  learnerProfile?: LearnerProfile;
  targetRole?: string;
  skillGaps?: any[];
  skillPriorities?: any[];
  currentLearningPhase?: any;
  currentWeek?: number;
  learningObjectives?: string;
  currentSkillLevel?: string;
  learningPreferences?: any;
  weeklyAvailableHours?: number;
  previouslyCompletedResources?: LearningResource[];
  specificSkill?: string;
  specificObjective?: string;
  resourceFeedbackHistory?: ResourceFeedback[];
}

export class ResourceService {
  private static FEEDBACK_STORAGE_KEY = 'edupath_resource_feedback';
  private static SAVED_STORAGE_KEY = 'edupath_saved_resources';
  private static PROGRESS_STORAGE_KEY = 'edupath_resources_progress';

  /**
   * 1. recommendLearningResources
   * Dynamically calls the backend Gemini Agent or returns prioritized verified catalog resources
   */
  static async recommendLearningResources(
    options: RecommendResourcesOptions
  ): Promise<ResourceRecommendationResponse> {
    try {
      const res = await fetch('/api/agent/recommend-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      if (!res.ok) {
        throw new Error(`Resource recommendation API failed with HTTP ${res.status}`);
      }

      const data = await res.json();
      return data;
    } catch (err) {
      console.warn('Falling back to local verified catalog recommendation:', err);

      const focusSkill =
        options.specificSkill ||
        options.skillPriorities?.[0]?.skill ||
        options.skillGaps?.[0]?.skill ||
        'SQL';

      const focusObjective =
        options.specificObjective ||
        options.learningObjectives ||
        `Master essential ${focusSkill} skills for ${options.targetRole || 'Data Analyst'}`;

      const matches = VERIFIED_CATALOG_RESOURCES.filter(
        (r) => r.skill.toLowerCase() === focusSkill.toLowerCase()
      );

      const recs = matches.length > 0
        ? matches.map((r, idx) => ({
            ...r,
            relevanceScore: Math.max(85, 96 - idx * 3),
            reason: r.reason || `Directly targets your ${focusSkill} gap for ${options.targetRole || 'Data Analyst'}.`,
          }))
        : VERIFIED_CATALOG_RESOURCES.slice(0, 4);

      return {
        skill: focusSkill,
        learningObjective: focusObjective,
        currentFocusReason: `These resources were selected because ${focusSkill} is currently one of your highest-priority skill gaps.`,
        recommendations: recs,
        isAiGenerated: false,
      };
    }
  }

  /**
   * 2. searchLearningResources
   * Interprets natural language queries (e.g. "Find a beginner SQL JOIN tutorial", "Give me a short Power BI video", "I have only 20 minutes")
   */
  static async searchLearningResources(
    query: string,
    context?: {
      learnerProfile?: LearnerProfile;
      learningPath?: LearningPath | null;
      skillGapAnalysis?: SkillGapAnalysis | null;
    }
  ): Promise<{
    query: string;
    searchSummary?: string;
    results: LearningResource[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/search-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          learnerProfile: context?.learnerProfile,
          learningPath: context?.learningPath,
          skillGapAnalysis: context?.skillGapAnalysis,
        }),
      });

      if (!res.ok) {
        throw new Error(`Search API failed with HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      console.warn('Falling back to local search matching:', err);
      const q = (query || '').toLowerCase().trim();
      const results = VERIFIED_CATALOG_RESOURCES.filter((r) => {
        const text = `${r.title} ${r.skill} ${r.type} ${r.description} ${r.difficulty} ${(r.searchKeywords || []).join(' ')}`.toLowerCase();
        return text.includes(q) || q.split(' ').some((w) => w.length > 2 && text.includes(w));
      });

      return {
        query,
        searchSummary: `Found ${results.length} resources in catalog matching "${query}"`,
        results: results.length > 0 ? results : VERIFIED_CATALOG_RESOURCES.slice(0, 3),
        isFallback: true,
      };
    }
  }

  /**
   * 3. rankLearningResources
   * Ranks resources based on learner's current level, target gaps, duration constraint, and past ratings
   */
  static rankLearningResources(
    resources: LearningResource[],
    preferences?: {
      preferredType?: string;
      maxDurationMinutes?: number;
      targetSkill?: string;
    },
    feedbackHistory: ResourceFeedback[] = []
  ): LearningResource[] {
    // Calculate category affinity from feedback
    const positiveTypes = new Set<string>();
    feedbackHistory.forEach((f) => {
      if (f.usefulnessScore >= 4) {
        const matched = resources.find((r) => r.id === f.resourceId);
        if (matched) positiveTypes.add(matched.type);
      }
    });

    return [...resources].sort((a, b) => {
      let scoreA = a.relevanceScore || 85;
      let scoreB = b.relevanceScore || 85;

      // Boost matching preferred skill
      if (preferences?.targetSkill) {
        if (a.skill.toLowerCase() === preferences.targetSkill.toLowerCase()) scoreA += 10;
        if (b.skill.toLowerCase() === preferences.targetSkill.toLowerCase()) scoreB += 10;
      }

      // Boost matching preferred type
      if (preferences?.preferredType && preferences.preferredType !== 'All') {
        if (a.type.toLowerCase() === preferences.preferredType.toLowerCase()) scoreA += 8;
        if (b.type.toLowerCase() === preferences.preferredType.toLowerCase()) scoreB += 8;
      }

      // Boost types that learner rated favorably in the past
      if (positiveTypes.has(a.type)) scoreA += 5;
      if (positiveTypes.has(b.type)) scoreB += 5;

      // Penalize if exceeds max duration
      if (preferences?.maxDurationMinutes) {
        if ((a.durationMinutes || 30) > preferences.maxDurationMinutes) scoreA -= 15;
        if ((b.durationMinutes || 30) > preferences.maxDurationMinutes) scoreB -= 15;
      }

      return scoreB - scoreA;
    });
  }

  /**
   * 4. answerResourceQuestion
   * Answers contextual questions regarding a resource ("Is this right for me?", "Prerequisites?")
   */
  static async answerResourceQuestion(
    question: string,
    resource: LearningResource,
    learnerProfile?: LearnerProfile
  ): Promise<string> {
    try {
      const res = await fetch('/api/agent/ask-resource', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, resource, learnerProfile }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.answer;
    } catch (err) {
      console.warn('Fallback resource answer:', err);
      return `**${resource.title}** is an **${resource.difficulty}** level **${resource.type}** provided by **${resource.provider}**. It specifically trains **${resource.learningObjective}** to help bridge your **${resource.skill}** development area toward your career as a ${learnerProfile?.targetRole || 'Data Analyst'}.`;
    }
  }

  /**
   * 5. recordResourceFeedback
   * Records user rating and difficulty feedback to adapt future recommendations
   */
  static recordResourceFeedback(feedback: ResourceFeedback): ResourceFeedback[] {
    try {
      const existing = this.getFeedbackHistory();
      const updated = [
        ...existing.filter((f) => f.resourceId !== feedback.resourceId),
        { ...feedback, submittedAt: new Date().toISOString() },
      ];
      localStorage.setItem(this.FEEDBACK_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Failed to save feedback to localStorage:', e);
      return [feedback];
    }
  }

  /**
   * Get feedback history
   */
  static getFeedbackHistory(): ResourceFeedback[] {
    try {
      const saved = localStorage.getItem(this.FEEDBACK_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  }

  /**
   * Get all verified catalog resources
   */
  static getVerifiedCatalog(): LearningResource[] {
    return VERIFIED_CATALOG_RESOURCES;
  }
}
