import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Target,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  Play,
  RotateCw,
  Award,
  Zap,
  CheckSquare,
  Square,
  AlertCircle,
  Brain,
  Compass,
  Bot,
} from 'lucide-react';
import {
  LearnerProfile,
  TodayPlanItem,
  CareerProfileAnalysisResult,
  SkillGapAnalysis,
  LearningPath,
  MockInterview,
} from '../types';
import { AgentService } from '../services/agentService';
import { ResumeAnalyzer } from '../services/resumeAnalyzer';
import { ProgressService } from '../services/progressService';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface DashboardViewProps {
  learnerProfile: LearnerProfile;
  todayPlan: TodayPlanItem[];
  onTogglePlanItem: (id: string) => void;
  onNavigate: (view: string) => void;
  careerAnalysisResult?: CareerProfileAnalysisResult | null;
  skillGapAnalysis?: SkillGapAnalysis | null;
  learningPath?: LearningPath | null;
  completedActivityIds?: string[];
  learningStreak?: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  learnerProfile,
  todayPlan,
  onTogglePlanItem,
  onNavigate,
  careerAnalysisResult,
  skillGapAnalysis,
  learningPath,
  completedActivityIds = [],
  learningStreak = 5,
}) => {
  const [aiRecommendation, setAiRecommendation] = useState<string>(
    'You are improving in SQL, but your JOIN accuracy is still below your target. I recommend completing a 15-minute JOIN practice session today.'
  );
  const [isRefreshingRec, setIsRefreshingRec] = useState<boolean>(false);
  const [recFocusSkill, setRecFocusSkill] = useState<string>('SQL JOINs');
  const [recMinutes, setRecMinutes] = useState<number>(15);

  const { userId } = useAuth();
  const effectiveUserId = userId || 'user_demo';
  const savedInterviews = AuthService.getUserData<MockInterview[]>(effectiveUserId, 'mock_interviews', []);
  const latestInterview = savedInterviews.length > 0 ? savedInterviews[0] : null;

  const learningState = ProgressService.getCentralLearningState(
    effectiveUserId,
    learnerProfile,
    learningPath,
    skillGapAnalysis
  );

  const completeness = ResumeAnalyzer.calculateCompleteness(learnerProfile);
  const analysis = careerAnalysisResult || ResumeAnalyzer.getDemoAnalysis(learnerProfile);
  const skillsCount = analysis?.technicalSkills?.length || learnerProfile.technicalSkills.length;
  const projectsCount = analysis?.projects?.length || learnerProfile.projects.length;
  const certsCount = analysis?.certifications?.length || learnerProfile.certifications.length;
  const isDemo = Boolean(learnerProfile.isDemoProfile);

  const handleRefreshRecommendation = async () => {
    setIsRefreshingRec(true);
    try {
      const res = await AgentService.getDailyRecommendation(learnerProfile);
      if (res.recommendation) {
        setAiRecommendation(res.recommendation);
      }
      if (res.focusSkill) {
        setRecFocusSkill(res.focusSkill);
      }
      if (res.suggestedMinutes) {
        setRecMinutes(res.suggestedMinutes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshingRec(false);
    }
  };

  const skillBars = [
    { name: 'SQL', progress: 65, level: 'Intermediate', color: 'bg-indigo-600' },
    { name: 'Python', progress: 70, level: 'Intermediate', color: 'bg-blue-600' },
    { name: 'Excel', progress: 75, level: 'Intermediate', color: 'bg-emerald-600' },
    { name: 'Power BI', progress: 35, level: 'Beginner', color: 'bg-amber-500' },
    { name: 'Statistics', progress: 40, level: 'Beginner', color: 'bg-rose-500' },
    { name: 'Communication', progress: 60, level: 'Intermediate', color: 'bg-purple-600' },
  ];

  const agentSteps = [
    { name: 'Profile & Resume Analysis', status: 'active' },
    { name: 'Skill Extraction Agent', status: 'completed' },
    { name: 'Skill Gap Analysis Agent', status: 'completed' },
    { name: 'Adaptive Learning Path Agent', status: 'active' },
    { name: 'Resource Recommendation Agent', status: 'active' },
    { name: 'Practice & Assessment Agent', status: 'ready' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-sm border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Adaptive Career Journey</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
            Good morning, {learnerProfile.name} 👋
          </h2>
          <p className="text-sm text-indigo-200 mt-1 max-w-xl">
            Here's your learning journey today. We've mapped out targeted practice to accelerate your path to becoming a <span className="font-bold text-white underline decoration-indigo-400">{learnerProfile.targetRole}</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            id="dashboard-cta-continue-learning-btn"
            onClick={() => onNavigate('practice')}
            className="px-5 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 font-bold text-xs flex items-center gap-2 transition-all shadow-md hover:scale-102"
          >
            <Play className="w-3.5 h-3.5 fill-indigo-900" />
            <span>Resume Current Lesson</span>
          </button>
          <button
            id="dashboard-cta-skill-gap-btn"
            onClick={() => onNavigate('skill_gap')}
            className="px-4 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700 text-white font-semibold text-xs border border-indigo-500/40 flex items-center gap-1.5 transition-colors"
          >
            <span>Inspect 4 Skill Gaps</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Career Profile Status Card (Prompt 2 requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm shadow-indigo-600/20">
            <Sparkles className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                AI Career Profile
              </h3>
              {isDemo ? (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                  Demo Profile
                </span>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Profile Analyzed ✓
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {learnerProfile.resumeFileName
                ? `Evidence verified from resume "${learnerProfile.resumeFileName}" for ${learnerProfile.targetRole}.`
                : `Verified candidate evidence & competencies mapped for ${learnerProfile.targetRole}.`}
            </p>
          </div>
        </div>

        {/* Quick Stats: Skills, Projects, Certifications, Completeness */}
        <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto justify-between lg:justify-end">
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Skills Detected</span>
            <span className="font-extrabold text-slate-800 text-sm">{skillsCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Projects Detected</span>
            <span className="font-extrabold text-slate-800 text-sm">{projectsCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Certifications</span>
            <span className="font-extrabold text-slate-800 text-sm">{certsCount}</span>
          </div>
          <div className="px-3 py-1.5 bg-indigo-50/60 rounded-lg border border-indigo-100">
            <span className="text-indigo-600 block text-[10px] uppercase font-semibold">Profile Completeness</span>
            <span className="font-extrabold text-indigo-950 text-sm">{completeness.score}%</span>
          </div>

          <button
            id="view-ai-analysis-btn"
            onClick={() => onNavigate('profile')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shadow-indigo-600/20 hover:scale-102"
          >
            <span>View AI Analysis</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* AI Skill Alignment Integration Card (Prompt 3 requirement) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-600/20">
              <Target className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  AI Skill Alignment
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded-full border border-indigo-200">
                  {skillGapAnalysis?.targetRole || learnerProfile.targetRole || 'Data Analyst'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                AI-estimated profile alignment indicator based on industry benchmarks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs w-full lg:w-auto justify-between lg:justify-end">
            <div className="px-3 py-1.5 bg-emerald-50/70 rounded-lg border border-emerald-200/80">
              <span className="text-emerald-700 block text-[10px] uppercase font-bold">Alignment</span>
              <span className="font-black text-emerald-900 text-sm">
                {skillGapAnalysis?.alignmentPercentage || 68}%
              </span>
            </div>
            <div className="px-3 py-1.5 bg-rose-50/70 rounded-lg border border-rose-200/80">
              <span className="text-rose-700 block text-[10px] uppercase font-bold">Top Skill Gap</span>
              <span className="font-extrabold text-rose-900 text-xs">
                {skillGapAnalysis?.topPriorities?.[0]?.skill || 'Power BI'}
              </span>
            </div>
            <div className="px-3 py-1.5 bg-indigo-50/70 rounded-lg border border-indigo-200/80">
              <span className="text-indigo-700 block text-[10px] uppercase font-bold">Next Recommended</span>
              <span className="font-extrabold text-indigo-900 text-xs">
                {skillGapAnalysis?.topPriorities?.[1]?.skill || 'Statistics'}
              </span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200/70">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Learning Path</span>
              <span className="font-bold text-indigo-700 text-xs">
                {learningPath ? `${learningPath.durationWeeks} Wks • Phase 2 Active` : 'Not generated yet'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="view-skill-gap-analysis-btn"
                onClick={() => onNavigate('skill_gap')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>View Skill Gap Analysis</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                id="build-my-learning-path-btn"
                onClick={() => onNavigate('learning_path')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs shadow-indigo-600/20 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{learningPath ? 'Open Learning Path' : 'Build My Learning Path'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Card: Your AI Learning Path (Prompt 4 Section 13 requirement) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-800/80 p-6 text-white shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Adaptive Roadmap Active</span>
                </span>
                <span className="text-xs text-indigo-300">• Paced at {learningPath?.weeklyHours || 7} hrs/week</span>
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Your AI Learning Path
              </h2>
            </div>
          </div>

          <button
            id="dashboard-continue-learning-btn"
            onClick={() => onNavigate('learning_path')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer self-start md:self-auto"
          >
            <span>Continue Learning</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Key Metrics: Current Phase, Today's Task, Weekly Progress, Streak, Next Skill */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          {/* Current Learning Phase */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Current Phase
            </span>
            <span className="font-bold text-white text-xs mt-1 block truncate">
              {learningPath?.phases?.find((p) => p.current || p.status === 'In Progress')?.title.split('—')[1] ||
                learningPath?.phases?.find((p) => p.current || p.status === 'In Progress')?.title ||
                'Phase 2: SQL & Data Analysis'}
            </span>
          </div>

          {/* Today's Task */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Today's Task
            </span>
            <span className="font-bold text-white text-xs mt-1 block truncate">
              {(() => {
                const curW = learningPath?.weeks?.find((w) => w.isCurrent) || learningPath?.weeks?.[0];
                const act = curW?.activities?.find((a) => !completedActivityIds.includes(a.id) && !a.completed);
                return act?.title || curW?.activities?.[0]?.title || 'SQL JOIN Practice';
              })()}
            </span>
          </div>

          {/* Weekly Progress */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Weekly Progress
            </span>
            <span className="font-bold text-emerald-400 text-xs mt-1 block">
              {(() => {
                const curW = learningPath?.weeks?.find((w) => w.isCurrent) || learningPath?.weeks?.[0];
                const total = curW?.activities?.length || 6;
                const done = curW?.activities?.filter((a) => completedActivityIds.includes(a.id) || a.completed).length || 4;
                return `${done} / ${total} tasks completed`;
              })()}
            </span>
          </div>

          {/* Learning Streak */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Learning Streak
            </span>
            <span className="font-bold text-amber-400 text-xs mt-1 block">
              🔥 {learningStreak} Day Streak
            </span>
          </div>

          {/* Next Skill */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">
              Next Skill
            </span>
            <span className="font-bold text-indigo-200 text-xs mt-1 block truncate">
              {skillGapAnalysis?.topPriorities?.[0]?.skill || 'Power BI'}
            </span>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Career Goal */}
        <div
          onClick={() => onNavigate('profile')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Career Goal</span>
            <Target className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-base font-bold text-slate-900 truncate">
            {learnerProfile.targetRole}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span>Target: 6 months</span>
          </div>
        </div>

        {/* Overall Progress */}
        <div
          onClick={() => onNavigate('progress')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Overall Progress</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {learnerProfile.overallProgress}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${learnerProfile.overallProgress}%` }}
            />
          </div>
        </div>

        {/* Skills Acquired */}
        <div
          onClick={() => onNavigate('skill_gap')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Skills Acquired</span>
            <Award className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {learnerProfile.skillsAcquiredCount}
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready for target role</span>
          </div>
        </div>

        {/* Skills In Progress */}
        <div
          onClick={() => onNavigate('learning_path')}
          className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Skills In Progress</span>
            <Clock className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {learnerProfile.skillsInProgressCount}
          </div>
          <div className="text-[11px] text-indigo-600 font-medium mt-1">
            Active this week
          </div>
        </div>

        {/* Remaining Skill Gaps */}
        <div
          onClick={() => onNavigate('skill_gap')}
          className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold text-slate-500">Remaining Skill Gaps</span>
            <AlertCircle className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-xl font-black text-rose-600">
            {learnerProfile.remainingGapsCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Power BI, Stats, Adv SQL
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Today's Learning Plan & Skill Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily AI Briefing & Next Best Action (Prompt 10 Section 26) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-sm border border-indigo-800/80 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-800/50 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-slate-950" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    Daily AI Briefing
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      Real-time Telemetry
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-200/80">
                    Grounded in your actual learning telemetry, streaks, and assessment results.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('mentor')}
                className="self-start sm:self-auto text-xs font-semibold text-amber-300 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <span>Ask AI Mentor</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5 Factual Indicators Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Focus</span>
                <span className="text-xs font-bold text-white block truncate">
                  {learningState.nextBestAction?.skill || 'SQL Window Functions'}
                </span>
                <span className="text-[10px] text-indigo-200">~{learningState.nextBestAction?.estimatedMinutes || 25} mins</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Week Progress</span>
                <span className="text-xs font-bold text-emerald-400 block">
                  Week {learningState.learningPath?.currentWeek || 1} Active
                </span>
                <span className="text-[10px] text-slate-300">{learningState.overallProgress}% of roadmap</span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Needs Attention</span>
                <span className="text-xs font-bold text-rose-300 block truncate">
                  {learningState.weaknesses[0]?.skill || 'None detected'}
                </span>
                <span className="text-[10px] text-slate-300">
                  {learningState.weaknesses[0] ? `${learningState.weaknesses[0].severity} Priority` : 'All skills passing'}
                </span>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Learning Load</span>
                <span className="text-xs font-bold text-amber-300 block capitalize">
                  {learningState.learningLoad.load}
                </span>
                <span className="text-[10px] text-slate-300">
                  {learningState.learningLoad.plannedHours}h / {learningState.learningLoad.weeklyAvailableHours}h available
                </span>
              </div>
            </div>

            {/* Next Best Action Banner */}
            {learningState.nextBestAction && (
              <div className="bg-white/10 border border-white/15 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                      Recommended Next Action
                    </span>
                    <span className="text-xs text-indigo-200">
                      {learningState.nextBestAction.skill} • {learningState.nextBestAction.estimatedMinutes} mins
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-white">
                    {learningState.nextBestAction.title}
                  </h5>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    {learningState.nextBestAction.reason}
                  </p>
                </div>

                <button
                  id="dashboard-start-next-best-action-btn"
                  onClick={() => onNavigate(learningState.nextBestAction?.targetView || 'practice')}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
                >
                  <span>Start Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Section: Today's Learning Plan */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  Today's Learning Plan
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  AI-calculated daily milestone balancing theory, practice, and soft skills.
                </p>
              </div>
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                110 mins planned
              </span>
            </div>

            <div className="space-y-2.5">
              {todayPlan.map((item, idx) => (
                <div
                  key={item.id}
                  onClick={() => onTogglePlanItem(item.id)}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                    item.completed
                      ? 'bg-slate-50/70 border-slate-200 opacity-75'
                      : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Toggle task"
                      className="text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                    <div>
                      <span
                        className={`text-xs font-semibold ${
                          item.completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {idx + 1}. {item.title}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{item.skill}</span>
                        <span className="text-[10px] text-slate-300">•</span>
                        <span className="text-[10px] font-medium text-indigo-600 capitalize">
                          {item.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      {item.duration}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {todayPlan.filter((p) => p.completed).length} of {todayPlan.length} tasks completed
              </span>
              <button
                onClick={() => onNavigate('practice')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Start Practice Quiz</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section: Skill Progress */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Skill Progress
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visual progress toward target competency thresholds.
                </p>
              </div>
              <button
                onClick={() => onNavigate('skill_gap')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
              >
                <span>Full Gap Analysis</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {skillBars.map((skill) => (
                <div key={skill.name} className="p-3 rounded-lg bg-slate-50/70 border border-slate-200/60">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-bold text-slate-800">{skill.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-medium">{skill.level}</span>
                      <span className="font-extrabold text-slate-900">{skill.progress}%</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className={`${skill.color} h-full rounded-full transition-all duration-500`}
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Continue Learning & Dynamic AI Recommendation */}
        <div className="space-y-6">
          {/* Section: Continue Learning */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/40 rounded-xl border border-indigo-100 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                Phase 2 • Current Module
              </span>
              <span className="text-xs font-semibold text-slate-500">75% Complete</span>
            </div>

            <h4 className="text-sm font-bold text-slate-900">
              SQL Mastery & Window Functions
            </h4>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Multi-table joins, RANK, DENSE_RANK, and time-series aggregation for analytical assessments.
            </p>

            <div className="mt-4 pt-4 border-t border-indigo-200/50 flex items-center justify-between">
              <div className="text-xs text-slate-500">
                Next: <span className="font-semibold text-slate-800">LEAD & LAG Practice</span>
              </div>
              <button
                id="continue-learning-btn"
                onClick={() => onNavigate('practice')}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all hover:scale-102"
              >
                <span>Continue</span>
                <Play className="w-3 h-3 fill-white" />
              </button>
            </div>
          </div>

          {/* Section: AI Recommendation */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Brain className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  AI Recommendation
                </h4>
              </div>
              <button
                id="dashboard-refresh-ai-recommendation-btn"
                onClick={handleRefreshRecommendation}
                disabled={isRefreshingRec}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${isRefreshingRec ? 'animate-spin' : ''}`} />
                <span>{isRefreshingRec ? 'Adapting...' : 'Refresh'}</span>
              </button>
            </div>

            <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70 text-xs text-slate-700 leading-relaxed italic relative">
              <p>"{aiRecommendation}"</p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">Focus: <strong className="text-slate-800">{recFocusSkill}</strong></span>
              <span className="text-slate-500">Time: <strong className="text-indigo-700">{recMinutes} mins</strong></span>
            </div>

            <button
              onClick={() => onNavigate('practice')}
              className="w-full mt-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Launch Recommended Practice</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Section: Interview Practice Card */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Interview Practice
                </h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                AI Interviewer
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs space-y-1.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Interview Score:</span>
                <strong className={latestInterview ? 'text-indigo-700' : 'text-slate-500'}>
                  {latestInterview ? `${latestInterview.overallScore}%` : 'No interviews yet'}
                </strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Main Focus:</span>
                <strong className="text-slate-800 truncate max-w-[140px]">
                  {latestInterview?.areasToImprove?.[0] || 'Technical SQL & Projects'}
                </strong>
              </div>
            </div>

            <button
              id="dashboard-start-mock-interview-btn"
              onClick={() => onNavigate('mock_interview')}
              className="w-full mt-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Start Mock Interview</span>
            </button>
          </div>

          {/* Section: Weekly AI Summary Card (Prompt 10 Section 27) */}
          <div className="bg-gradient-to-br from-indigo-50/90 to-purple-50/40 rounded-xl border border-indigo-100 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-800 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                Weekly AI Trajectory Audit
              </span>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                {learningState.learningStreak}d Streak
              </span>
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Confirmed Strength:</span>
                <span className="font-semibold text-slate-900 truncate max-w-[150px]">
                  {learningState.strengths[0]?.skill || 'Core Queries'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Needs Attention:</span>
                <span className="font-semibold text-rose-600 truncate max-w-[150px]">
                  {learningState.weaknesses[0]?.skill || 'Window Functions'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Curriculum Load:</span>
                <span className="font-semibold text-amber-700 capitalize">
                  {learningState.learningLoad.load}
                </span>
              </div>
            </div>

            <button
              id="dashboard-view-weekly-report-btn"
              onClick={() => onNavigate('progress')}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <span>View Full Progress Report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Adaptive Agent Workflow Status */}
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-indigo-600" />
                Multi-Agent Workflow
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Autonomous
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              EduPath AI continuously rebalances your roadmap based on practice performance.
            </p>

            <div className="space-y-1.5">
              {agentSteps.map((agent, i) => (
                <div key={i} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    {agent.name}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
