import React, { useState, useEffect, useMemo } from 'react';
import {
  Play,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Filter,
  ShieldCheck,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  Inbox,
  Lightbulb,
} from 'lucide-react';
import {
  LearningResource,
  LearnerProfile,
  SkillGapAnalysis,
  LearningPath,
  ResourceFeedback,
} from '../types';
import { SAMPLE_RESOURCES } from '../data/demoData';
import { VERIFIED_CATALOG_RESOURCES } from '../data/verifiedResources';
import { ResourceService } from '../services/resourceService';
import { ResourceCard } from '../components/ResourceCard';
import { ResourceDetailModal } from '../components/ResourceDetailModal';
import { ResourceRecommendationHeader } from '../components/ResourceRecommendationHeader';

interface CoursesVideosViewProps {
  onNavigate: (view: string) => void;
  learnerProfile?: LearnerProfile;
  skillGapAnalysis?: SkillGapAnalysis | null;
  learningPath?: LearningPath | null;
  initialFocus?: {
    skill?: string;
    objective?: string;
    activityTitle?: string;
  } | null;
  onClearInitialFocus?: () => void;
}

export const CoursesVideosView: React.FC<CoursesVideosViewProps> = ({
  onNavigate,
  learnerProfile,
  skillGapAnalysis,
  learningPath,
  initialFocus,
  onClearInitialFocus,
}) => {
  // Initialize resources by combining verified catalog and sample resources
  const [resources, setResources] = useState<LearningResource[]>(() => {
    const combined = [...VERIFIED_CATALOG_RESOURCES];
    SAMPLE_RESOURCES.forEach((item) => {
      if (!combined.some((c) => c.title.toLowerCase() === item.title.toLowerCase())) {
        combined.push(item);
      }
    });
    return combined;
  });

  // State for user ratings and feedback
  const [feedbackHistory, setFeedbackHistory] = useState<ResourceFeedback[]>(() =>
    ResourceService.getFeedbackHistory()
  );

  // Filters and search
  const [selectedSkill, setSelectedSkill] = useState<string>(
    initialFocus?.skill || 'All'
  );
  const [selectedType, setSelectedType] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // AI Recommendation State
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Modal Details State
  const [activeModalResource, setActiveModalResource] = useState<LearningResource | null>(null);

  // Update selected skill if initialFocus changes
  useEffect(() => {
    if (initialFocus?.skill) {
      setSelectedSkill(initialFocus.skill);
      // Auto-trigger recommendation for focused activity
      triggerAiRecommendation(initialFocus.skill, initialFocus.objective);
    }
  }, [initialFocus]);

  // Extract available unique skills from resources and skill gap analysis
  const availableSkills = useMemo(() => {
    const set = new Set<string>();
    resources.forEach((r) => set.add(r.skill));
    skillGapAnalysis?.comparisons?.forEach((c) => set.add(c.skill));
    return Array.from(set).sort();
  }, [resources, skillGapAnalysis]);

  // Handle AI Recommendation Generation
  const triggerAiRecommendation = async (overrideSkill?: string, overrideObjective?: string) => {
    setIsLoadingAi(true);
    const targetSkill = overrideSkill || (selectedSkill !== 'All' ? selectedSkill : skillGapAnalysis?.topPriorities?.[0]?.skill || 'SQL');
    const targetObjective = overrideObjective || initialFocus?.objective;

    try {
      const response = await ResourceService.recommendLearningResources({
        learnerProfile,
        targetRole: learnerProfile?.targetRole || 'Data Analyst',
        skillGaps: skillGapAnalysis?.comparisons,
        skillPriorities: skillGapAnalysis?.topPriorities,
        currentWeek: learningPath?.currentWeek || 1,
        learningObjectives: targetObjective,
        specificSkill: targetSkill,
        specificObjective: targetObjective,
        resourceFeedbackHistory: feedbackHistory,
      });

      if (response.recommendations && response.recommendations.length > 0) {
        setResources((prev) => {
          const merged = [...response.recommendations];
          prev.forEach((existing) => {
            if (!merged.some((m) => m.title.toLowerCase() === existing.title.toLowerCase())) {
              merged.push(existing);
            }
          });
          return merged;
        });

        setAiSummary(response.currentFocusReason || `Recommended top targeted resources for ${targetSkill}.`);
        if (targetSkill && selectedSkill === 'All') {
          setSelectedSkill(targetSkill);
        }
      }
    } catch (err) {
      console.error('Failed to get AI recommendations:', err);
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Toggle Resource Completion Progress
  const handleToggleComplete = (resource: LearningResource) => {
    setResources((prev) =>
      prev.map((r) => {
        if (r.id !== resource.id) return r;
        const isCurrentlyCompleted = r.status === 'Completed' || (r.progress || 0) === 100;
        const newProgress = isCurrentlyCompleted ? 0 : 100;
        const newStatus = isCurrentlyCompleted ? 'Not Started' : 'Completed';
        return {
          ...r,
          progress: newProgress,
          status: newStatus,
        };
      })
    );

    if (activeModalResource && activeModalResource.id === resource.id) {
      const isCurrentlyCompleted =
        activeModalResource.status === 'Completed' || (activeModalResource.progress || 0) === 100;
      setActiveModalResource((prev) =>
        prev
          ? {
              ...prev,
              progress: isCurrentlyCompleted ? 0 : 100,
              status: isCurrentlyCompleted ? 'Not Started' : 'Completed',
            }
          : null
      );
    }
  };

  // Save Feedback for a Resource
  const handleSaveFeedback = (feedback: ResourceFeedback) => {
    const updated = ResourceService.recordResourceFeedback(feedback);
    setFeedbackHistory(updated);
  };

  // Filtered & Ranked Resources
  const filteredResources = useMemo(() => {
    let list = resources.filter((r) => {
      if (selectedType !== 'All' && r.type !== selectedType) return false;
      if (selectedSkill !== 'All' && r.skill.toLowerCase() !== selectedSkill.toLowerCase()) {
        return false;
      }
      if (selectedDifficulty !== 'All' && r.difficulty !== selectedDifficulty) return false;
      if (verifiedOnly && !r.verified) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const searchCorpus = `${r.title} ${r.description} ${r.provider} ${r.skill} ${r.learningObjective || ''} ${(r.searchKeywords || []).join(' ')}`.toLowerCase();
        return searchCorpus.includes(q);
      }

      return true;
    });

    // Rank resources using feedback and profile preferences
    return ResourceService.rankLearningResources(
      list,
      {
        targetSkill: selectedSkill !== 'All' ? selectedSkill : undefined,
        preferredType: selectedType !== 'All' ? selectedType : undefined,
      },
      feedbackHistory
    );
  }, [resources, selectedType, selectedSkill, selectedDifficulty, verifiedOnly, searchQuery, feedbackHistory]);

  // Completed Stats
  const completedCount = useMemo(
    () => resources.filter((r) => r.status === 'Completed' || (r.progress || 0) === 100).length,
    [resources]
  );

  return (
    <div className="space-y-6">
      {/* 1. Resource Recommendation Header and Controls */}
      <ResourceRecommendationHeader
        currentFocusSkill={selectedSkill}
        onSelectFocusSkill={(skill) => setSelectedSkill(skill)}
        availableSkills={availableSkills}
        selectedType={selectedType}
        onSelectType={(type) => setSelectedType(type)}
        selectedDifficulty={selectedDifficulty}
        onSelectDifficulty={(diff) => setSelectedDifficulty(diff)}
        verifiedOnly={verifiedOnly}
        onToggleVerifiedOnly={() => setVerifiedOnly((prev) => !prev)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onTriggerAiRecommendation={() => triggerAiRecommendation()}
        isLoadingAi={isLoadingAi}
        activeFocusContext={
          initialFocus
            ? {
                activityTitle: initialFocus.activityTitle,
                objective: initialFocus.objective,
              }
            : null
        }
        onClearFocusContext={() => {
          if (onClearInitialFocus) onClearInitialFocus();
          setSelectedSkill('All');
        }}
      />

      {/* 2. AI Recommendation Reason Banner (if triggered) */}
      {aiSummary && (
        <div className="p-4 bg-indigo-50/90 border border-indigo-200/90 rounded-2xl flex items-start justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-indigo-950 text-xs">
                AI Recommendation Agent Insight
              </h4>
              <p className="text-xs text-indigo-900 mt-0.5 leading-relaxed">
                {aiSummary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiSummary(null)}
            className="text-indigo-400 hover:text-indigo-700 text-xs font-semibold p-1 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Status and Quick Metrics Bar */}
      <div className="flex items-center justify-between gap-4 text-xs text-slate-500 px-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">
            Showing {filteredResources.length} resources
          </span>
          {verifiedOnly && (
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> (Verified links only)
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{completedCount} Completed</span>
          </span>

          <button
            type="button"
            onClick={() => onNavigate('practice')}
            className="hidden sm:flex items-center gap-1.5 font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
          >
            <span>Take Practice Quizzes</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 4. Resources Cards Grid */}
      {filteredResources.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <Inbox className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">No matching resources found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try resetting your search query or toggling off &ldquo;Verified Links Only&rdquo; to view AI-generated learning suggestions.
          </p>
          <div className="pt-2 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSkill('All');
                setSelectedType('All');
                setSelectedDifficulty('All');
                setVerifiedOnly(false);
                setSearchQuery('');
              }}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
            <button
              type="button"
              onClick={() => triggerAiRecommendation()}
              className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Ask AI to Generate
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredResources.map((res) => {
            const feedback = feedbackHistory.find((f) => f.resourceId === res.id);
            return (
              <ResourceCard
                key={res.id}
                resource={res}
                onOpenDetails={(r) => setActiveModalResource(r)}
                onToggleComplete={handleToggleComplete}
                onRate={(r) => setActiveModalResource(r)}
                userRating={feedback?.usefulnessScore}
              />
            );
          })}
        </div>
      )}

      {/* 5. Resource Detail & Q&A Modal */}
      {activeModalResource && (
        <ResourceDetailModal
          resource={activeModalResource}
          onClose={() => setActiveModalResource(null)}
          learnerProfile={learnerProfile}
          onToggleComplete={handleToggleComplete}
          onSaveFeedback={handleSaveFeedback}
          existingFeedback={feedbackHistory.find(
            (f) => f.resourceId === activeModalResource.id
          )}
        />
      )}
    </div>
  );
};
