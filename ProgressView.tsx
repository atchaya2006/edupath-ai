import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderGit2,
  MessageSquareText,
  Bot,
  Zap,
  RotateCw,
  ArrowRight,
  Shield,
  HelpCircle,
  History,
  Calendar,
  Layers,
  BarChart2,
  BrainCircuit,
  Sliders,
  Check,
  X,
  Target,
  FileCheck,
} from 'lucide-react';
import {
  LearnerProfile,
  LearningPath,
  SkillGapAnalysis,
  SkillTrend,
  ProgressStrength,
  ProgressWeakness,
  LearningInsight,
  WeeklyLearningReport,
  AdaptiveLearningChange,
  LearningPathVersion,
  NextBestAction,
  DailyPlanTask,
  LearningLoadDetail,
  LearnerLearningState,
} from '../types';
import { ProgressService } from '../services/progressService';
import { AgentService } from '../services/agentService';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface ProgressViewProps {
  learnerProfile: LearnerProfile;
  onNavigate: (view: string) => void;
  learningPath?: LearningPath | null;
  skillGapAnalysis?: SkillGapAnalysis | null;
  onUpdateLearningPath?: (path: LearningPath) => void;
  onUpdateSkillGapAnalysis?: (analysis: SkillGapAnalysis) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  learnerProfile,
  onNavigate,
  learningPath,
  skillGapAnalysis,
  onUpdateLearningPath,
  onUpdateSkillGapAnalysis,
}) => {
  const { userId } = useAuth();
  const effectiveUserId = userId || 'user_demo';

  // Central State
  const [learningState, setLearningState] = useState<LearnerLearningState>(() =>
    ProgressService.getCentralLearningState(
      effectiveUserId,
      learnerProfile,
      learningPath,
      skillGapAnalysis
    )
  );

  // Async states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdapting, setIsAdapting] = useState(false);
  const [isGeneratingWeeklyReport, setIsGeneratingWeeklyReport] = useState(false);
  const [isReassessingGaps, setIsReassessingGaps] = useState(false);

  // Active view tab in progress
  const [activeTab, setActiveTab] = useState<
    'overview' | 'trends' | 'adaptive' | 'weekly_report' | 'versions'
  >('overview');

  // Modals & detail popovers
  const [explainingAction, setExplainingAction] = useState<NextBestAction | DailyPlanTask | null>(null);
  const [explainingChange, setExplainingChange] = useState<AdaptiveLearningChange | null>(null);
  const [showRebalanceSuccess, setShowRebalanceSuccess] = useState(false);
  const [reassessResult, setReassessResult] = useState<{
    reassessedGaps: any[];
    overallReadinessChange: number;
    narrative: string;
  } | null>(null);

  // Weekly report state
  const [weeklyReport, setWeeklyReport] = useState<WeeklyLearningReport | null>(() => {
    return AuthService.getUserData<WeeklyLearningReport | null>(
      effectiveUserId,
      'weekly_learning_report',
      null
    );
  });

  // Sync state on user or profile change
  useEffect(() => {
    const fresh = ProgressService.getCentralLearningState(
      effectiveUserId,
      learnerProfile,
      learningPath,
      skillGapAnalysis
    );
    setLearningState(fresh);
  }, [effectiveUserId, learnerProfile, learningPath, skillGapAnalysis]);

  // Handle Run AI Progress Analysis
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const updates = await ProgressService.analyzeSkillTrends(
        effectiveUserId,
        learnerProfile,
        learningPath,
        skillGapAnalysis
      );

      const newState: LearnerLearningState = {
        ...learningState,
        ...updates,
        trends: updates.trends || learningState.trends,
        strengths: updates.strengths || learningState.strengths,
        weaknesses: updates.weaknesses || learningState.weaknesses,
        insights: updates.insights || learningState.insights,
        learningLoad: updates.learningLoad || learningState.learningLoad,
        nextBestAction: updates.nextBestAction || learningState.nextBestAction,
        dailyPlan: updates.dailyPlan || learningState.dailyPlan,
        overallProgress: updates.overallProgress || learningState.overallProgress,
        lastUpdated: new Date().toISOString(),
      };

      setLearningState(newState);
      AuthService.setUserData(effectiveUserId, 'progress_learning_state', newState);

      // Check if adaptation is warranted
      if (newState.weaknesses && newState.weaknesses.length > 0) {
        const adaptRes = await ProgressService.adaptLearningExperience(
          effectiveUserId,
          learnerProfile,
          learningPath,
          newState.weaknesses,
          'Post-analysis automatic check'
        );
        if (adaptRes.change && adaptRes.change.isMajor) {
          AuthService.setUserData(effectiveUserId, 'pending_adaptive_change', adaptRes.change);
          setLearningState((prev) => ({ ...prev, pendingChange: adaptRes.change }));
        }
      }
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle Trigger Deep Adaptive Evaluation
  const handleTriggerAdaptation = async () => {
    setIsAdapting(true);
    try {
      const res = await ProgressService.adaptLearningExperience(
        effectiveUserId,
        learnerProfile,
        learningPath,
        learningState.weaknesses,
        'Manual learner request'
      );
      if (res.change) {
        if (res.change.isMajor) {
          AuthService.setUserData(effectiveUserId, 'pending_adaptive_change', res.change);
          setLearningState((prev) => ({ ...prev, pendingChange: res.change }));
        } else {
          // Minor change auto-applied
          const updatedApplied = [
            { ...res.change, status: 'applied' as const },
            ...(learningState.appliedChanges || []),
          ];
          AuthService.setUserData(effectiveUserId, 'applied_adaptive_changes', updatedApplied);
          setLearningState((prev) => ({
            ...prev,
            appliedChanges: updatedApplied,
          }));
        }
      }
    } catch (err) {
      console.error('Adaptation error:', err);
    } finally {
      setIsAdapting(false);
    }
  };

  // Handle Accept Proposed Change
  const handleAcceptChange = (change: AdaptiveLearningChange) => {
    if (!learningPath) return;
    const { updatedPath, newVersion } = ProgressService.acceptAdaptiveChange(
      effectiveUserId,
      change,
      learningPath
    );
    if (onUpdateLearningPath) {
      onUpdateLearningPath(updatedPath);
    }
    setLearningState((prev) => ({
      ...prev,
      pendingChange: undefined,
      appliedChanges: [{ ...change, status: 'applied' }, ...(prev.appliedChanges || [])],
      pathVersions: [newVersion, ...(prev.pathVersions || [])],
    }));
  };

  // Handle Decline Proposed Change
  const handleDeclineChange = () => {
    AuthService.removeUserData(effectiveUserId, 'pending_adaptive_change');
    setLearningState((prev) => ({ ...prev, pendingChange: undefined }));
  };

  // Handle Task Completion in Daily Plan
  const handleToggleTask = (taskId: string) => {
    const updated = (learningState.dailyPlan || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const newState = { ...learningState, dailyPlan: updated };
    setLearningState(newState);
    AuthService.setUserData(effectiveUserId, 'progress_learning_state', newState);
  };

  // Handle Skip Task
  const handleSkipTask = (taskId: string) => {
    const updated = (learningState.dailyPlan || []).filter((t) => t.id !== taskId);
    const newState = { ...learningState, dailyPlan: updated };
    setLearningState(newState);
    AuthService.setUserData(effectiveUserId, 'progress_learning_state', newState);
  };

  // Handle Rebalance Week
  const handleRebalance = () => {
    if (!learningState.dailyPlan) return;
    const rebalanced = ProgressService.rebalanceWeeklyPlan(
      effectiveUserId,
      learnerProfile.weeklyHours || 8,
      learningState.dailyPlan
    );
    const updatedLoad: LearningLoadDetail = {
      ...learningState.learningLoad,
      load: 'Balanced',
      explanation: `Rebalanced sequence prioritizes High impact interview requirements within your ${learnerProfile.weeklyHours || 8}h weekly goal.`,
    };
    const newState = { ...learningState, dailyPlan: rebalanced, learningLoad: updatedLoad };
    setLearningState(newState);
    AuthService.setUserData(effectiveUserId, 'progress_learning_state', newState);
    setShowRebalanceSuccess(true);
    setTimeout(() => setShowRebalanceSuccess(false), 3500);
  };

  // Handle Generate Weekly Report
  const handleGenerateWeeklyReport = async () => {
    setIsGeneratingWeeklyReport(true);
    try {
      const report = await ProgressService.generateWeeklyLearningReport(
        effectiveUserId,
        learnerProfile
      );
      setWeeklyReport(report);
      AuthService.setUserData(effectiveUserId, 'weekly_learning_report', report);
      setActiveTab('weekly_report');
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingWeeklyReport(false);
    }
  };

  // Handle Reassess Skill Gaps
  const handleReassessSkillGaps = async () => {
    setIsReassessingGaps(true);
    try {
      const res = await ProgressService.reassessSkillGap(
        effectiveUserId,
        learnerProfile,
        skillGapAnalysis?.topPriorities || []
      );
      setReassessResult(res);
      if (skillGapAnalysis && onUpdateSkillGapAnalysis) {
        onUpdateSkillGapAnalysis({
          ...skillGapAnalysis,
          alignmentPercentage: Math.min(95, skillGapAnalysis.alignmentPercentage + res.overallReadinessChange),
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsReassessingGaps(false);
    }
  };

  // Navigation router for Next Best Action
  const handleLaunchNextAction = (targetView?: string) => {
    if (!targetView) {
      onNavigate('practice');
      return;
    }
    const viewMap: Record<string, string> = {
      practice: 'practice',
      projects: 'projects',
      communication: 'communication',
      mock_interview: 'mock_interview',
      learning_path: 'learning_path',
      courses: 'courses',
    };
    onNavigate(viewMap[targetView] || 'practice');
  };

  // Helper for trend badges
  const renderTrendBadge = (trend: SkillTrend['trend']) => {
    switch (trend) {
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <TrendingUp className="w-3.5 h-3.5" /> Improving
          </span>
        );
      case 'DEVELOPING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            <BarChart2 className="w-3.5 h-3.5" /> Developing
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <Minus className="w-3.5 h-3.5" /> Stable
          </span>
        );
      case 'DECLINING':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
            <TrendingDown className="w-3.5 h-3.5" /> Declining
          </span>
        );
      case 'INSUFFICIENT_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5" /> Insufficient Data
          </span>
        );
    }
  };

  // Helper for workload badges
  const renderLoadBadge = (load: LearningLoadDetail['load']) => {
    switch (load) {
      case 'Overloaded':
        return (
          <span className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
            Overloaded
          </span>
        );
      case 'Heavy':
        return (
          <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
            Heavy Workload
          </span>
        );
      case 'Light':
        return (
          <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full">
            Light Pace
          </span>
        );
      case 'Balanced':
      default:
        return (
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            Balanced
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5" /> AI Progress & Adaptive Agent
            </span>
            <span className="text-xs font-semibold text-slate-600">
              • Target: <strong className="text-slate-900">{learnerProfile.targetRole || 'Data Analyst'}</strong>
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              🔥 {learningState.learningStreak || 5}-Day Active Streak
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Continuous Progress Analysis & Deep Adaptive Learning
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Continuously analyzing real practice accuracy, project milestones, communication scores, and interview performance to dynamically tune your personal curriculum.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="run-ai-progress-analysis-btn"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing Real Telemetry...' : 'Refresh AI Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
        <Shield className="w-4 h-4 text-indigo-600 shrink-0" />
        <span>
          <strong>User Data Isolation:</strong> Progress metrics and adaptive suggestions are calculated exclusively from your authenticated account activity (completed quizzes, project builds, and mock interviews).
        </span>
      </div>

      {/* 2. Proposed Adaptation Alert (If AI proposes a major adjustment) */}
      {learningState.pendingChange && (
        <div className="bg-gradient-to-r from-amber-50 to-indigo-50 border-2 border-amber-300 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Adaptive Agent Proposal ({learningState.pendingChange.decision})
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {learningState.pendingChange.title}
                </h3>
              </div>
            </div>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-amber-100 text-amber-800 border border-amber-300">
              User Approval Required
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/80 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">What Changes:</span>
              <p className="text-slate-600">{learningState.pendingChange.whatChanged}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Why (Pedagogical Reason):</span>
              <p className="text-slate-600">{learningState.pendingChange.why}</p>
            </div>
            <div className="bg-white/80 p-3 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700 block mb-1">Expected Benefit:</span>
              <p className="text-slate-600">{learningState.pendingChange.expectedBenefit}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-slate-500">
              <strong>Evidence:</strong> {learningState.pendingChange.evidenceUsed?.join('; ')}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={declineChange => handleDeclineChange()}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
              >
                Keep Current Plan
              </button>
              <button
                onClick={() => handleAcceptChange(learningState.pendingChange!)}
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Accept & Update Roadmap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. AI Adaptive Recommendation Card (Top Priority Next Move) */}
      {learningState.nextBestAction && (
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl text-white p-6 shadow-md border border-indigo-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                AI Adaptive Recommendation
              </span>
              <span className="text-xs text-indigo-200 font-medium">
                • Next Best Move for Today
              </span>
              <span className="text-xs bg-indigo-800 text-indigo-100 px-2 py-0.5 rounded">
                ~{learningState.nextBestAction.estimatedMinutes} mins
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-white">
              {learningState.nextBestAction.title}
            </h2>
            <p className="text-xs text-indigo-100/90 leading-relaxed">
              <strong>Why:</strong> {learningState.nextBestAction.reason}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-indigo-200">
              <span className="font-semibold text-white">Evidence:</span>
              {learningState.nextBestAction.evidence?.map((ev, i) => (
                <span key={i} className="bg-indigo-950/70 border border-indigo-700/60 px-2 py-0.5 rounded text-[11px]">
                  ✓ {ev}
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setExplainingAction(learningState.nextBestAction!)}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs border border-white/20 transition flex items-center justify-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-300" />
              <span>Why This Move?</span>
            </button>
            <button
              onClick={() => handleLaunchNextAction(learningState.nextBestAction?.targetView)}
              className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
            >
              <span>Start Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. High-Level Telemetry Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Career Readiness</div>
          <div className="text-2xl font-black text-indigo-600">
            {learningState.overallProgress}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all"
              style={{ width: `${learningState.overallProgress}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Active Streak</div>
          <div className="text-2xl font-black text-emerald-600">
            {learningState.learningStreak} days
          </div>
          <span className="text-[11px] text-slate-400">Verified activity</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Current Workload</div>
          <div className="mt-1">{renderLoadBadge(learningState.learningLoad?.load || 'Balanced')}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {learningState.learningLoad?.plannedHours || 6.5}h planned / {learnerProfile.weeklyHours || 8}h goal
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Strengths Detected</div>
          <div className="text-2xl font-black text-slate-900">
            {learningState.strengths?.length || 2}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Evidence validated</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Needs Attention</div>
          <div className="text-2xl font-black text-rose-600">
            {learningState.weaknesses?.length || 2}
          </div>
          <span className="text-[11px] text-slate-400">Target role gaps</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 mb-1">Adaptive Versions</div>
          <div className="text-2xl font-black text-indigo-700">
            v{learningState.pathVersions?.length || 1}
          </div>
          <span className="text-[11px] text-slate-400">Curriculum iterations</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" /> Overview & Today's Plan
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'trends'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Skill Trends & Evidence
        </button>
        <button
          onClick={() => setActiveTab('adaptive')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'adaptive'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> Workload & Rebalancing
        </button>
        <button
          onClick={() => setActiveTab('weekly_report')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'weekly_report'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Weekly AI Report
        </button>
        <button
          onClick={() => setActiveTab('versions')}
          className={`pb-2.5 px-3.5 text-xs font-bold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'versions'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Path Version History ({learningState.pathVersions?.length || 1})
        </button>
      </div>

      {/* TAB 1: OVERVIEW & TODAY'S LEARNING PLAN */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today's Adaptive Plan */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Today's AI Learning Sequence
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ordered by priority and prerequisite dependency to maximize interview and job readiness.
                </p>
              </div>

              <button
                onClick={handleRebalance}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition flex items-center gap-1 self-start sm:self-auto"
              >
                <Sliders className="w-3 h-3" /> Rebalance Sequence
              </button>
            </div>

            {showRebalanceSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium animate-in fade-in">
                ✓ Plan rebalanced! High-priority skills and pending gaps moved to the front.
              </div>
            )}

            <div className="space-y-2.5">
              {(learningState.dailyPlan || []).map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.completed
                      ? 'bg-slate-50/80 border-slate-200 text-slate-400'
                      : 'bg-white border-slate-200/90 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleTask(task.id)}
                      className={`w-5 h-5 rounded-md border mt-0.5 flex items-center justify-center transition shrink-0 ${
                        task.completed
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 hover:border-indigo-500'
                      }`}
                    >
                      {task.completed && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-bold ${
                            task.completed ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {task.skill}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            task.priority === 'High'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : task.priority === 'Medium'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.priority} Priority
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{task.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <span className="text-[11px] text-slate-400 font-medium">
                      ~{task.estimatedMinutes} mins
                    </span>
                    <button
                      onClick={() => setExplainingAction(task)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                      title="Why this task?"
                    >
                      <HelpCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSkipTask(task.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded hover:bg-slate-100"
                    >
                      Skip
                    </button>
                    <button
                      onClick={() => handleLaunchNextAction(task.targetView)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
                    >
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weak Areas Split View */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Strengths */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Confirmed Strengths (Evidence Supported)
                </h3>
              </div>
              <div className="space-y-3">
                {(learningState.strengths || []).map((str) => (
                  <div key={str.id} className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-emerald-950">
                      <span>{str.skill}</span>
                      <span className="text-[10px] bg-emerald-200/60 text-emerald-900 px-2 py-0.5 rounded">
                        High Confidence
                      </span>
                    </div>
                    <p className="text-emerald-900/90 text-[11px]">
                      <strong>Evidence:</strong> {str.evidence}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Why It Matters:</strong> {str.whyItMatters}
                    </p>
                    <div className="pt-1 text-[11px] text-indigo-700 font-semibold">
                      💡 How to leverage next: {str.howToUseNext}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Areas Needing Attention */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Needs Attention (Focus Gaps)
                </h3>
              </div>
              <div className="space-y-3">
                {(learningState.weaknesses || []).map((weak) => (
                  <div key={weak.id} className="p-3 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between font-bold text-rose-950">
                      <span>{weak.skill}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          weak.severity === 'High'
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-amber-200 text-amber-900'
                        }`}
                      >
                        {weak.severity} Severity
                      </span>
                    </div>
                    <p className="text-rose-900/90 text-[11px]">
                      <strong>Evidence:</strong> {weak.evidence}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      <strong>Impact on Role:</strong> {weak.whyItMatters}
                    </p>
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-700">
                        <strong>Action:</strong> {weak.recommendedAction}
                      </span>
                      <button
                        onClick={() => onNavigate('practice')}
                        className="text-[11px] font-bold text-rose-700 hover:text-rose-800 underline shrink-0"
                      >
                        Practice Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Learning Insights Grid */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Continuous AI Learning Insights
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Updated from latest activity telemetry
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {(learningState.insights || []).map((ins: LearningInsight) => (
                <div key={ins.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-block ${
                      ins.category === 'strength'
                        ? 'bg-emerald-100 text-emerald-800'
                        : ins.category === 'weakness'
                        ? 'bg-rose-100 text-rose-800'
                        : ins.category === 'workload'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {ins.category}
                  </span>
                  <p className="font-semibold text-slate-900">{ins.text}</p>
                  <p className="text-[11px] text-slate-500">
                    <strong>Evidence:</strong> {ins.evidence}
                  </p>
                  <div className="pt-1 text-[11px] text-indigo-600 font-medium">
                    → {ins.recommendation}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SKILL TRENDS & EVIDENCE TABLE */}
      {activeTab === 'trends' && (
        <div className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Skill Trend Analysis & Evidence Matrix
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Clearly distinguishes between AI-estimated levels, confirmed skills, and empirical practice evidence.
              </p>
            </div>

            <button
              onClick={handleReassessSkillGaps}
              disabled={isReassessingGaps}
              className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Target className="w-3.5 h-3.5" />
              <span>{isReassessingGaps ? 'Re-assessing...' : 'Re-assess Skill Gaps'}</span>
            </button>
          </div>

          {reassessResult && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2 text-xs text-indigo-950 animate-in fade-in">
              <div className="font-bold flex items-center justify-between">
                <span>Skill Gap Re-Assessment Completed</span>
                <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  +{reassessResult.overallReadinessChange}% Readiness
                </span>
              </div>
              <p>{reassessResult.narrative}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {reassessResult.reassessedGaps?.map((g, i) => (
                  <span key={i} className="bg-white border border-indigo-200 px-2.5 py-1 rounded-md text-[11px]">
                    <strong>{g.skill}:</strong> {g.previousLevel} → <strong>{g.updatedLevel}</strong> ({g.status})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600">
                  <th className="py-3 px-3.5 font-bold">Skill</th>
                  <th className="py-3 px-3.5 font-bold">Estimated Level</th>
                  <th className="py-3 px-3.5 font-bold">Required</th>
                  <th className="py-3 px-3.5 font-bold">Learning Progress</th>
                  <th className="py-3 px-3.5 font-bold">AI Trend</th>
                  <th className="py-3 px-3.5 font-bold">Evidence</th>
                  <th className="py-3 px-3.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(learningState.trends || []).map((trend, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-3.5 font-bold text-slate-900">
                      <div>{trend.skillName}</div>
                      <span className="text-[10px] font-normal text-slate-400">{trend.category}</span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-700">
                      <span className="font-semibold">{trend.currentEstimatedLevel}</span>
                      <span className="block text-[10px] text-slate-400">(AI Estimate)</span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600">{trend.requiredLevel}</td>
                    <td className="py-3 px-3.5">
                      <div className="w-28">
                        <div className="flex justify-between text-[10px] mb-1 font-semibold text-slate-600">
                          <span>{trend.learningProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-indigo-600 h-1.5 rounded-full"
                            style={{ width: `${trend.learningProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3.5">{renderTrendBadge(trend.trend)}</td>
                    <td className="py-3 px-3.5 text-slate-600 max-w-xs">
                      <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                        {trend.evidence?.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </td>
                    <td className="py-3 px-3.5 text-right">
                      <button
                        onClick={() => onNavigate('practice')}
                        className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 rounded-md border border-indigo-200 transition"
                      >
                        Drill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WORKLOAD & ADAPTIVE REBALANCING */}
      {activeTab === 'adaptive' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-600" />
                  Weekly Workload & Load Balancing
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Protects against learner fatigue by comparing assigned task durations against your declared availability.
                </p>
              </div>
              <div>{renderLoadBadge(learningState.learningLoad?.load || 'Balanced')}</div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Planned Hours vs Availability</span>
                <span className="font-bold text-indigo-900">
                  {learningState.learningLoad?.plannedHours || 6.5}h / {learnerProfile.weeklyHours || 8}h Goal
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    (learningState.learningLoad?.plannedHours || 6.5) > (learnerProfile.weeklyHours || 8)
                      ? 'bg-rose-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((learningState.learningLoad?.plannedHours || 6.5) /
                          Math.max(1, learnerProfile.weeklyHours || 8)) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-600">
                {learningState.learningLoad?.explanation}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-slate-500">
                <strong>Adaptive Action:</strong> {learningState.learningLoad?.recommendation}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerAdaptation}
                  disabled={isAdapting}
                  className="px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAdapting ? 'Evaluating Path...' : 'Trigger Adaptive Evaluation'}</span>
                </button>
                <button
                  onClick={handleRebalance}
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
                >
                  Rebalance My Week
                </button>
              </div>
            </div>
          </div>

          {/* Applied Adaptive Changes Log */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              Applied Adaptive Learning Adjustments
            </h3>
            <p className="text-xs text-slate-500">
              Record of pedagogical changes autonomously or cooperatively integrated into your active learning sequence.
            </p>

            {(learningState.appliedChanges && learningState.appliedChanges.length > 0) ? (
              <div className="space-y-3 pt-2">
                {learningState.appliedChanges.map((ch) => (
                  <div key={ch.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{ch.title}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-medium">
                        Applied
                      </span>
                    </div>
                    <p className="text-slate-600">
                      <strong>What Changed:</strong> {ch.whatChanged}
                    </p>
                    <p className="text-slate-600">
                      <strong>Why:</strong> {ch.why}
                    </p>
                    <p className="text-indigo-600 text-[11px]">
                      <strong>Expected Advantage:</strong> {ch.expectedBenefit}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                Your learning path is currently aligned with baseline milestones. As you complete more quizzes and projects, the Adaptive Agent will log curriculum enhancements here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: WEEKLY AI LEARNING REPORT */}
      {activeTab === 'weekly_report' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  Weekly AI Learning Audit & Synthesis
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synthesizes activities completed, skill gains, and next week focus from actual performance telemetry.
                </p>
              </div>

              <button
                onClick={handleGenerateWeeklyReport}
                disabled={isGeneratingWeeklyReport}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isGeneratingWeeklyReport ? 'Generating Report...' : 'Generate New Weekly Audit'}</span>
              </button>
            </div>

            {weeklyReport ? (
              <div className="space-y-4 text-xs">
                <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-900 text-sm">
                      Weekly Audit: {weeklyReport.weekStartDate} – {weeklyReport.weekEndDate}
                    </span>
                    <span className="text-[11px] text-indigo-700 font-medium">
                      Audited: {weeklyReport.generatedAt}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-center">
                      <span className="block text-slate-500 text-[10px]">Activities Done</span>
                      <strong className="text-slate-900 text-base">{weeklyReport.activitiesCompleted}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-center">
                      <span className="block text-slate-500 text-[10px]">Quiz Accuracy</span>
                      <strong className="text-emerald-600 text-base">
                        {weeklyReport.practicePerformance?.accuracy || 82}%
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-center">
                      <span className="block text-slate-500 text-[10px]">Communication</span>
                      <strong className="text-purple-600 text-base">
                        {weeklyReport.communicationProgress?.averageScore || 78}%
                      </strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-100 text-center">
                      <span className="block text-slate-500 text-[10px]">Learning Load</span>
                      <strong className="text-slate-900 text-base">{weeklyReport.learningLoad}</strong>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2">
                    <span className="font-bold text-emerald-900 uppercase text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> What Improved This Week
                    </span>
                    <ul className="space-y-1.5 text-slate-700 list-disc list-inside text-xs">
                      {weeklyReport.whatImproved?.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                    <span className="font-bold text-rose-900 uppercase text-[11px] flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-600" /> What Needs Attention Next Week
                    </span>
                    <ul className="space-y-1.5 text-slate-700 list-disc list-inside text-xs">
                      {weeklyReport.whatNeedsAttention?.map((it, i) => (
                        <li key={i}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="font-bold text-indigo-900 uppercase text-[11px] flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" /> Next Week Recommended Focus
                  </span>
                  <ul className="space-y-1.5 text-slate-700 list-decimal list-inside text-xs">
                    {weeklyReport.nextWeekRecommendations?.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <Calendar className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No Weekly Report compiled for this cycle yet.</p>
                <p className="text-xs text-slate-500">
                  Click <strong>"Generate New Weekly Audit"</strong> to synthesize your activity telemetry across quizzes, projects, and interviews.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PATH VERSION HISTORY */}
      {activeTab === 'versions' && (
        <div className="space-y-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Learning Path Version History & Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks every adaptation made to your learning path with transparent pedagogical reasoning and supporting evidence.
            </p>
          </div>

          <div className="space-y-3">
            {(learningState.pathVersions || []).map((ver) => (
              <div key={ver.version} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
                      v{ver.version}
                    </span>
                    <span>{ver.label}</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">{ver.createdAt}</span>
                </div>
                <p className="text-slate-700">
                  <strong>What Changed:</strong> {ver.whatChanged}
                </p>
                <p className="text-slate-600">
                  <strong>Why:</strong> {ver.why}
                </p>
                <div className="text-[11px] text-slate-500 pt-1">
                  <strong>Evidence Used:</strong> {ver.evidenceUsed?.join('; ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Popover / Explainer Modal for Tasks & Actions */}
      {explainingAction && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600">
                <BrainCircuit className="w-5 h-5" />
                <h3 className="text-sm font-bold text-slate-900">Why This Learning Task?</h3>
              </div>
              <button
                onClick={() => setExplainingAction(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Task</span>
                <p className="text-sm font-bold text-slate-900">{explainingAction.title}</p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400">Pedagogical Justification</span>
                <p className="text-slate-700 leading-relaxed mt-0.5">{explainingAction.reason}</p>
              </div>

              {'evidence' in explainingAction && Array.isArray(explainingAction.evidence) && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Telemetry Evidence Used</span>
                  <ul className="list-disc list-inside text-slate-600 space-y-0.5 mt-1">
                    {explainingAction.evidence.map((ev, i) => (
                      <li key={i}>{ev}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setExplainingAction(null)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-indigo-700 transition"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
