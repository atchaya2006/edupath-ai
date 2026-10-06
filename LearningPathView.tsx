import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Sliders,
  Milestone,
  RotateCw,
  Flame,
  ArrowRight,
  HelpCircle,
  Brain,
  AlertTriangle,
  Compass,
  Calendar,
  Layers,
  ChevronRight,
} from 'lucide-react';
import {
  LearnerProfile,
  SkillGapAnalysis,
  LearningPath,
  LearningPreferences,
  LearningActivity,
  WeeklyCheckIn,
  WeeklySummary,
  AdaptationChange,
} from '../types';
import { LearningPathService } from '../services/learningPathService';
import { RoadmapPhasesCard } from '../components/RoadmapPhasesCard';
import { WeeklyPlanCard } from '../components/WeeklyPlanCard';
import { AIReasoningCard } from '../components/AIReasoningCard';
import { WeeklyCheckInCard } from '../components/WeeklyCheckInCard';
import { WeeklySummaryCard } from '../components/WeeklySummaryCard';
import { AdaptationDiffModal } from '../components/AdaptationDiffModal';
import { LearningPreferencesModal } from '../components/LearningPreferencesModal';
import { LearningPathQACard } from '../components/LearningPathQACard';

interface LearningPathViewProps {
  learnerProfile: LearnerProfile;
  skillGapAnalysis?: SkillGapAnalysis | null;
  learningPath: LearningPath | null;
  onUpdateLearningPath: (path: LearningPath) => void;
  completedActivityIds: string[];
  onToggleActivity: (activity: LearningActivity) => void;
  onNavigate: (view: string) => void;
  learningStreak?: number;
  onFindResourcesForActivity?: (activity: LearningActivity) => void;
}

export const LearningPathView: React.FC<LearningPathViewProps> = ({
  learnerProfile,
  skillGapAnalysis,
  learningPath,
  onUpdateLearningPath,
  completedActivityIds,
  onToggleActivity,
  onNavigate,
  learningStreak = 5,
  onFindResourcesForActivity,
}) => {
  // Selected week for detailed viewing
  const [activeWeekNumber, setActiveWeekNumber] = useState<number>(() => {
    if (learningPath) {
      const current = learningPath.weeks.find((w) => w.isCurrent);
      return current ? current.weekNumber : learningPath.weeks[0]?.weekNumber || 1;
    }
    return 3; // Week 3 default for Alex
  });

  // Modals & UI States
  const [showPreferencesModal, setShowPreferencesModal] = useState<boolean>(false);
  const [showAdaptationModal, setShowAdaptationModal] = useState<boolean>(false);
  const [latestAdaptation, setLatestAdaptation] = useState<AdaptationChange | null>(null);
  const [isAdapting, setIsAdapting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSubmittingCheckIn, setIsSubmittingCheckIn] = useState<boolean>(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Sync active week if learningPath changes
  useEffect(() => {
    if (learningPath && !learningPath.weeks.some((w) => w.weekNumber === activeWeekNumber)) {
      const curr = learningPath.weeks.find((w) => w.isCurrent) || learningPath.weeks[0];
      if (curr) setActiveWeekNumber(curr.weekNumber);
    }
  }, [learningPath, activeWeekNumber]);

  // Compute live progress
  const progress = learningPath
    ? LearningPathService.calculateLearningProgress(
        learningPath,
        completedActivityIds,
        learningStreak
      )
    : null;

  // 1. Adapt My Learning Path Handler
  const handleAdaptLearningPath = async () => {
    if (!learningPath) return;
    setIsAdapting(true);
    setErrorNotice(null);

    try {
      const currentWeekCheckIn = learningPath.weeklyCheckIns?.[activeWeekNumber];
      const result = await LearningPathService.adaptLearningPath(
        learningPath,
        completedActivityIds,
        undefined,
        currentWeekCheckIn?.difficultyFeedback,
        currentWeekCheckIn,
        learningPath.weeklyHours,
        learnerProfile
      );

      onUpdateLearningPath(result.updatedLearningPath);
      setLatestAdaptation(result.adaptationChange);
      setShowAdaptationModal(true);
    } catch (err: any) {
      console.error('Adaptation failed:', err);
      setErrorNotice('Could not reach AI replanner. Rebalanced with grounded local scheduling rules.');
    } finally {
      setIsAdapting(false);
    }
  };

  // 2. Build or Re-generate Learning Path with Gemini
  const handleGenerateLearningPath = async (
    customHours?: number,
    customPreferences?: LearningPreferences
  ) => {
    setIsGenerating(true);
    setErrorNotice(null);

    try {
      const hours = customHours || learningPath?.weeklyHours || 7;
      const prefs = customPreferences || learningPath?.learningPreferences;

      const newPath = await LearningPathService.generateLearningPath(
        learnerProfile,
        skillGapAnalysis,
        hours,
        prefs
      );

      onUpdateLearningPath(newPath);
      setActiveWeekNumber(newPath.weeks.find((w) => w.isCurrent)?.weekNumber || 1);
    } catch (err: any) {
      console.error('Generate roadmap error:', err);
      setErrorNotice('Failed to generate full learning path. Retained current personalized roadmap.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 3. Save Preferences & Re-Pace
  const handleSavePreferences = async (hours: number, preferences: LearningPreferences) => {
    if (!learningPath) return;
    setIsAdapting(true);
    try {
      const result = await LearningPathService.adaptLearningPath(
        { ...learningPath, learningPreferences: preferences },
        completedActivityIds,
        undefined,
        `Adjusted weekly schedule to ${hours} hours/week. Format: ${preferences.learningFormat}.`,
        undefined,
        hours,
        learnerProfile
      );
      onUpdateLearningPath(result.updatedLearningPath);
      setLatestAdaptation(result.adaptationChange);
      setShowAdaptationModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdapting(false);
    }
  };

  // 4. Submit Weekly Check-In & Trigger Summary
  const handleSubmitCheckIn = async (checkIn: WeeklyCheckIn) => {
    if (!learningPath) return;
    setIsSubmittingCheckIn(true);

    try {
      // Find completed activities for this week
      const currentWeek = learningPath.weeks.find((w) => w.weekNumber === checkIn.weekNumber);
      const doneActs = (currentWeek?.activities || []).filter(
        (a) => completedActivityIds.includes(a.id) || a.completed
      );

      // Generate AI Weekly Summary
      const summary = await LearningPathService.generateWeeklySummary(
        checkIn.weekNumber,
        learningPath,
        doneActs,
        checkIn,
        learnerProfile
      );

      // Adapt upcoming week plan
      const adaptResult = await LearningPathService.adaptLearningPath(
        learningPath,
        completedActivityIds,
        checkIn.confidenceScore <= 2 ? 65 : checkIn.confidenceScore >= 4 ? 92 : 80,
        checkIn.difficultyFeedback,
        checkIn,
        learningPath.weeklyHours,
        learnerProfile
      );

      const updatedPath: LearningPath = {
        ...adaptResult.updatedLearningPath,
        weeklyCheckIns: {
          ...(learningPath.weeklyCheckIns || {}),
          [checkIn.weekNumber]: checkIn,
        },
        weeklySummaries: {
          ...(learningPath.weeklySummaries || {}),
          [checkIn.weekNumber]: summary,
        },
      };

      onUpdateLearningPath(updatedPath);
      setLatestAdaptation(adaptResult.adaptationChange);
      setShowAdaptationModal(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingCheckIn(false);
    }
  };

  // EMPTY STATE: If no skill gap analysis exists
  if (!skillGapAnalysis && !learningPath) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center max-w-2xl mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
          <Compass className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Your personalized learning path starts with a skill-gap analysis
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            EduPath AI compares your verified profile against market benchmarks for{' '}
            <strong>{learnerProfile.targetRole}</strong> to architect a week-by-week personalized journey.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onNavigate('skill_gap')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <span>Analyze My Skills</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // EMPTY STATE 2: If skill gap exists but path not generated yet
  if (!learningPath) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs text-center max-w-2xl mx-auto space-y-4 my-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
          <Sparkles className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Ready to Build Your AI Learning Path
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            Your skill gap analysis for <strong>{learnerProfile.targetRole}</strong> is ready. Generate a tailored week-by-week curriculum based on your availability and goals.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => handleGenerateLearningPath()}
            disabled={isGenerating}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 mx-auto cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isGenerating ? 'Generating with Gemini...' : 'Build My AI Learning Path'}</span>
          </button>
        </div>
      </div>
    );
  }

  const activeWeeklyPlan =
    learningPath.weeks.find((w) => w.weekNumber === activeWeekNumber) ||
    learningPath.weeks[0];

  const currentSummary = learningPath.weeklySummaries?.[activeWeekNumber];
  const currentCheckIn = learningPath.weeklyCheckIns?.[activeWeekNumber];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Main Title */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Personalized Adaptive Agent
            </span>
            <span className="text-xs text-slate-500">• {learningPath.targetRole} Path</span>
          </div>

          <h1 className="text-xl font-bold text-slate-900 mt-1">
            Your AI Learning Path
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
            A personalized roadmap built around your career goal, current skills, and learning progress.
          </p>
        </div>

        {/* Primary Agent Controls: "Adapt My Learning Path" & "Constraints" */}
        <div className="flex flex-wrap items-center gap-2.5 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => setShowPreferencesModal(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Constraints ({learningPath.weeklyHours}h/wk)</span>
          </button>

          <button
            id="adapt-learning-path-btn"
            type="button"
            onClick={handleAdaptLearningPath}
            disabled={isAdapting}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>{isAdapting ? 'Recalculating Path...' : 'Adapt My Learning Path'}</span>
          </button>
        </div>
      </div>

      {/* Error notice if fallback occurred */}
      {errorNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* 2. Key Metrics Bar (Directly from learner data & learning path) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Target Role */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Target Role
          </span>
          <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
            {learningPath.targetRole}
          </span>
        </div>

        {/* Estimated Journey */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Estimated Journey
          </span>
          <span className="text-xs font-bold text-slate-900 mt-1 block">
            {learningPath.durationWeeks} Weeks Total
          </span>
        </div>

        {/* Weekly Commitment */}
        <div
          onClick={() => setShowPreferencesModal(true)}
          className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
            <span>Commitment</span>
            <Sliders className="w-2.5 h-2.5 text-indigo-500" />
          </span>
          <span className="text-xs font-bold text-indigo-600 mt-1 block">
            {learningPath.weeklyHours} Hours / Week
          </span>
        </div>

        {/* Current Phase */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Current Phase
          </span>
          <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
            {progress?.currentPhaseTitle.split('—')[0] || 'Phase 2'}
          </span>
        </div>

        {/* Overall Progress */}
        <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
            <span>Overall Progress</span>
            <span className="text-slate-700">{progress?.overallProgressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progress?.overallProgressPercent || 0}%` }}
            />
          </div>
        </div>

        {/* Learning Streak */}
        <div className="p-3.5 bg-white rounded-xl border border-amber-200 shadow-2xs flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-700 block">
              Streak
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              🔥 {learningStreak} Days
            </span>
          </div>
        </div>
      </div>

      {/* 3. AI Reasoning Panel ("Why was this plan created?") */}
      <AIReasoningCard learningPath={learningPath} />

      {/* 4. Phase-Based Career Roadmap */}
      <RoadmapPhasesCard
        phases={learningPath.phases}
        weeks={learningPath.weeks}
        activeWeekNumber={activeWeekNumber}
        onSelectWeek={(wNum) => setActiveWeekNumber(wNum)}
        completedActivityIds={completedActivityIds}
      />

      {/* 5. Detailed Weekly Learning Plan with Day-by-day Activities */}
      {activeWeeklyPlan && (
        <WeeklyPlanCard
          weeklyPlan={activeWeeklyPlan}
          weeks={learningPath.weeks}
          activeWeekNumber={activeWeekNumber}
          onSelectWeek={(wNum) => setActiveWeekNumber(wNum)}
          completedActivityIds={completedActivityIds}
          onToggleActivityComplete={onToggleActivity}
          onSkipActivity={(act) => {
            // Skips activity cleanly
            onToggleActivity({ ...act, skipped: true });
          }}
          onFindResourcesForActivity={onFindResourcesForActivity}
        />
      )}

      {/* 6. End-of-Week Features: Weekly Check-in & Weekly AI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly AI Check-in */}
        <WeeklyCheckInCard
          weekNumber={activeWeekNumber}
          existingCheckIn={currentCheckIn}
          onSubmitCheckIn={handleSubmitCheckIn}
          isSubmitting={isSubmittingCheckIn}
        />

        {/* Your Week in Review (AI Summary) */}
        {currentSummary ? (
          <WeeklySummaryCard
            summary={currentSummary}
            onContinueNextWeek={() => {
              if (activeWeekNumber < learningPath.durationWeeks) {
                setActiveWeekNumber(activeWeekNumber + 1);
              }
            }}
          />
        ) : (
          <div className="bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 p-6 flex flex-col items-center justify-center text-center space-y-2">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              Week {activeWeekNumber} Summary Pending
            </h4>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Complete your scheduled tasks and submit your Weekly Check-in to generate your AI "Week in Review" analysis.
            </p>
          </div>
        )}
      </div>

      {/* 7. Natural Language Assistant: "Ask About My Learning Path" */}
      <LearningPathQACard
        learningPath={learningPath}
        learnerProfile={learnerProfile}
      />

      {/* 8. Modals */}
      {showPreferencesModal && (
        <LearningPreferencesModal
          isOpen={showPreferencesModal}
          onClose={() => setShowPreferencesModal(false)}
          weeklyHours={learningPath.weeklyHours}
          preferences={learningPath.learningPreferences}
          onSave={handleSavePreferences}
        />
      )}

      {showAdaptationModal && latestAdaptation && (
        <AdaptationDiffModal
          isOpen={showAdaptationModal}
          onClose={() => setShowAdaptationModal(false)}
          adaptationChange={latestAdaptation}
          targetRole={learningPath.targetRole}
        />
      )}
    </div>
  );
};
