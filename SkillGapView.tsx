import React, { useState, useEffect } from 'react';
import {
  Target,
  Sparkles,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCw,
  Zap,
  BookOpen,
  Code2,
  Award,
  ChevronRight,
  ShieldAlert,
  Loader2,
  Layers,
  Edit3,
  Flame,
} from 'lucide-react';
import {
  LearnerProfile,
  SkillGapAnalysis,
  SkillComparisonStatus,
  CareerProfileAnalysisResult,
  TargetRoleProfile,
} from '../types';
import { SkillGapAnalyzer } from '../services/skillGapAnalyzer';
import { SkillComparisonTable } from '../components/SkillComparisonTable';
import { TopPriorityGapsCard } from '../components/TopPriorityGapsCard';
import { SkillDependenciesCard } from '../components/SkillDependenciesCard';
import { SkillGapQACard } from '../components/SkillGapQACard';
import { SkillAlignmentRadar } from '../components/SkillAlignmentRadar';

interface SkillGapViewProps {
  learnerProfile: LearnerProfile;
  onNavigate: (view: string) => void;
  careerAnalysisResult?: CareerProfileAnalysisResult | null;
  skillGapAnalysis?: SkillGapAnalysis | null;
  onUpdateSkillGapAnalysis: (analysis: SkillGapAnalysis) => void;
}

const PRESET_ROLES = [
  'Data Analyst',
  'Data Scientist',
  'Software Developer',
  'AI Engineer',
  'Machine Learning Engineer',
  'Business Intelligence Engineer',
  'Cloud Engineer',
  'Product Manager',
  'Cybersecurity Analyst',
];

export const SkillGapView: React.FC<SkillGapViewProps> = ({
  learnerProfile,
  onNavigate,
  careerAnalysisResult,
  skillGapAnalysis,
  onUpdateSkillGapAnalysis,
}) => {
  const [targetRole, setTargetRole] = useState(
    skillGapAnalysis?.targetRole || learnerProfile.targetRole || 'Data Analyst'
  );
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [roleRequirements, setRoleRequirements] = useState<TargetRoleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Initialize with existing analysis or demo baseline if not yet analyzed
  const activeAnalysis =
    skillGapAnalysis ||
    SkillGapAnalyzer.getDemoSkillGapAnalysis(learnerProfile, targetRole);

  // Check if learner's profile has changed since the last analysis
  const currentFingerprint = SkillGapAnalyzer.generateProfileFingerprint(learnerProfile);
  const isProfileChanged =
    activeAnalysis.learnerProfileFingerprint &&
    activeAnalysis.learnerProfileFingerprint !== currentFingerprint;
  const isTargetRoleChanged = activeAnalysis.targetRole !== targetRole;

  const handleRoleChange = (newRole: string) => {
    if (newRole === 'CUSTOM') {
      setIsCustomRole(true);
    } else {
      setIsCustomRole(false);
      setTargetRole(newRole);
    }
  };

  const handleRunAnalysis = async () => {
    const finalRole = isCustomRole && customRoleInput.trim() ? customRoleInput.trim() : targetRole;
    setIsAnalyzing(true);
    setError(null);
    setStatusMessage(null);

    try {
      // 1. Fetch or generate target role requirements
      const reqs = await SkillGapAnalyzer.generateRoleRequirements(finalRole);
      setRoleRequirements(reqs);

      // 2. Run Gemini skill gap analysis
      const analysis = await SkillGapAnalyzer.analyzeSkillGaps(
        learnerProfile,
        careerAnalysisResult,
        finalRole,
        reqs
      );

      onUpdateSkillGapAnalysis(analysis);
      setStatusMessage(`Skill gap analysis complete for ${finalRole}.`);
    } catch (err: any) {
      console.error('Skill gap analysis error:', err);
      setError(
        err.message ||
          'Failed to execute Gemini skill gap analysis. Loaded benchmark profile instead.'
      );
      // Fallback to grounded demo model so learner is never blocked
      const demo = SkillGapAnalyzer.getDemoSkillGapAnalysis(learnerProfile, finalRole);
      onUpdateSkillGapAnalysis(demo);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUserOverride = (
    skillName: string,
    newStatus: SkillComparisonStatus,
    userLevel?: string
  ) => {
    if (!activeAnalysis) return;
    const updatedComparisons = activeAnalysis.comparisons.map((c) => {
      if (c.skill.toLowerCase() === skillName.toLowerCase()) {
        return {
          ...c,
          userOverride: {
            isOverridden: true,
            userStatus: newStatus,
            userConfirmedLevel: userLevel || c.currentLevel,
            notes: 'Verified by learner',
          },
        };
      }
      return c;
    });

    const updatedCounts = {
      strong: updatedComparisons.filter(
        (c) => (c.userOverride?.isOverridden ? c.userOverride.userStatus : c.status) === 'Strong'
      ).length,
      developing: updatedComparisons.filter(
        (c) => (c.userOverride?.isOverridden ? c.userOverride.userStatus : c.status) === 'Developing'
      ).length,
      gap: updatedComparisons.filter(
        (c) => (c.userOverride?.isOverridden ? c.userOverride.userStatus : c.status) === 'Gap'
      ).length,
      unknown: updatedComparisons.filter(
        (c) => (c.userOverride?.isOverridden ? c.userOverride.userStatus : c.status) === 'Unknown'
      ).length,
    };

    onUpdateSkillGapAnalysis({
      ...activeAnalysis,
      comparisons: updatedComparisons,
      counts: updatedCounts,
    });
  };

  const handleResetOverride = (skillName: string) => {
    if (!activeAnalysis) return;
    const updatedComparisons = activeAnalysis.comparisons.map((c) => {
      if (c.skill.toLowerCase() === skillName.toLowerCase()) {
        return {
          ...c,
          userOverride: undefined,
        };
      }
      return c;
    });

    onUpdateSkillGapAnalysis({
      ...activeAnalysis,
      comparisons: updatedComparisons,
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Target Role Selection & Action */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Skill Gap Agent</span>
            </span>
            {activeAnalysis.isDemoAnalysis && !careerAnalysisResult ? (
              <span className="text-[10px] font-bold tracking-wide bg-sky-100 text-sky-900 border border-sky-300 px-2.5 py-0.5 rounded-full">
                Using manually entered profile information
              </span>
            ) : activeAnalysis.isDemoAnalysis ? (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                Demo Profile
              </span>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                Gemini Verified
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            AI Skill Gap Analysis
          </h2>
          <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
            Discover what you already know, what you need to improve, and what to learn next for your target career.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Target Role Dropdown */}
          <div className="flex items-center gap-2">
            {!isCustomRole ? (
              <select
                value={targetRole}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="text-xs px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              >
                {PRESET_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
                <option value="CUSTOM">+ Custom Role...</option>
              </select>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Enter target role..."
                  value={customRoleInput}
                  onChange={(e) => setCustomRoleInput(e.target.value)}
                  className="text-xs px-3 py-2 rounded-xl border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
                <button
                  type="button"
                  onClick={() => setIsCustomRole(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Re-run / Analyze Button */}
          <button
            id="analyze-my-skill-gaps-btn"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer hover:scale-101"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Evaluating Benchmarks...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>
                  {skillGapAnalysis ? 'Re-run Skill Gap Analysis' : 'Analyze My Skill Gaps'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Profile or Role Changed Alert */}
      {(isProfileChanged || isTargetRoleChanged) && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Your profile or target role has changed.</strong> Re-run Skill Gap Analysis to update your results.
            </span>
          </div>
          <button
            type="button"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
          >
            <RotateCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Update Now</span>
          </button>
        </div>
      )}

      {/* Notice if Career Profile Analysis has not yet been executed */}
      {!careerAnalysisResult && (
        <div id="skill-gap-manual-mode-banner" className="p-4 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-600 shrink-0" />
            <span>
              <strong>Using manually entered profile information:</strong> Skill gaps are computed from your self-reported profile skills ({learnerProfile.technicalSkills.length} skills) for {targetRole}. You can analyze your resume with AI anytime.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('profile')}
            className="px-3 py-1.5 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs rounded-lg transition-colors shrink-0"
          >
            Go to Profile Analysis
          </button>
        </div>
      )}

      {/* Status / Error Notifications */}
      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-emerald-700 hover:underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:underline font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Overall Career Readiness & Visualization */}
      <SkillAlignmentRadar analysis={activeAnalysis} />

      {/* 3. Personalized Gap Summary */}
      {activeAnalysis.summary && (
        <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Personalized AI Gap Assessment Summary
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Evaluated {new Date(activeAnalysis.analyzedAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed">
            {activeAnalysis.summary}
          </p>
        </div>
      )}

      {/* 4. Top Learning Priorities */}
      <TopPriorityGapsCard
        topPriorities={activeAnalysis.topPriorities}
        onStartLearning={(skill) => {
          onNavigate('practice');
        }}
      />

      {/* 5. Current vs Required Skills Comparison Table */}
      <SkillComparisonTable
        comparisons={activeAnalysis.comparisons}
        onUserOverride={handleUserOverride}
        onResetOverride={handleResetOverride}
      />

      {/* 6. Skill Dependencies / Prerequisite Architecture */}
      <SkillDependenciesCard dependencies={activeAnalysis.dependencies} />

      {/* 7. What You Should Learn Next (Learning Recommendation Preview) */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-indigo-950">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-indigo-200 text-[11px] font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Next Phase: Structured Curriculum</span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            What You Should Learn Next
          </h3>
          <p className="text-xs text-indigo-200 max-w-xl leading-relaxed">
            EduPath AI will synthesize these skill gaps, prerequisite dependencies, and your target timeline into an adaptive week-by-week learning roadmap.
          </p>
        </div>

        <button
          id="build-my-learning-path-btn"
          onClick={() => onNavigate('learning_path')}
          className="px-6 py-3 bg-white text-indigo-900 hover:bg-indigo-50 font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md hover:scale-102 cursor-pointer shrink-0"
        >
          <span>Build My Learning Path</span>
          <ArrowRight className="w-4 h-4 fill-indigo-900" />
        </button>
      </div>

      {/* 8. Natural Language Skill Gap Q&A */}
      <SkillGapQACard
        analysis={activeAnalysis}
        learnerProfile={learnerProfile}
      />
    </div>
  );
};
