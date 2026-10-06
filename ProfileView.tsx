import React, { useState } from 'react';
import {
  User,
  GraduationCap,
  Briefcase,
  Target,
  Award,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Edit2,
  Save,
  Plus,
  X,
  Code2,
  ExternalLink,
  RotateCw,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  LearnerProfile,
  SkillItem,
  CareerProfileAnalysisResult,
  SkillLevel,
} from '../types';
import { ResumeAnalyzer } from '../services/resumeAnalyzer';
import { ResumeUploadSection, ResumeAnalysisState } from '../components/ResumeUploadSection';
import { CareerAnalysisResults } from '../components/CareerAnalysisResults';
import { ProfileCompletenessCard } from '../components/ProfileCompletenessCard';

interface ProfileViewProps {
  learnerProfile: LearnerProfile;
  onUpdateProfile: (updated: LearnerProfile) => void;
  onNavigate: (view: string) => void;
  careerAnalysisResult?: CareerProfileAnalysisResult | null;
  onUpdateCareerAnalysis?: (analysis: CareerProfileAnalysisResult) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  learnerProfile,
  onUpdateProfile,
  onNavigate,
  careerAnalysisResult,
  onUpdateCareerAnalysis,
}) => {
  const [isEditingManualProfile, setIsEditingManualProfile] = useState(false);
  const [formData, setFormData] = useState<LearnerProfile>({ ...learnerProfile });
  const [activeTab, setActiveTab] = useState<'analysis' | 'manual'>(
    careerAnalysisResult ? 'analysis' : 'manual'
  );

  // Resume analysis state & file preservation
  const [analysisState, setAnalysisState] = useState<ResumeAnalysisState>(
    careerAnalysisResult ? 'SUCCESS' : 'IDLE'
  );
  const [cachedFileData, setCachedFileData] = useState<{
    file: File;
    text?: string;
    base64?: string;
    mimeType?: string;
  } | null>(null);
  const [isManualProfileActive, setIsManualProfileActive] = useState<boolean>(!careerAnalysisResult);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<SkillLevel>('Intermediate');

  // Active analysis fallback (demo analysis if none exists yet)
  const currentAnalysis =
    careerAnalysisResult || ResumeAnalyzer.getDemoAnalysis(learnerProfile);

  // Profile Completeness
  const completeness = ResumeAnalyzer.calculateCompleteness(formData);

  const handleSaveProfile = () => {
    onUpdateProfile(formData);
    setIsEditingManualProfile(false);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: SkillItem = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim(),
      level: newSkillLevel,
      category: 'Technical',
      progress: newSkillLevel === 'Advanced' ? 85 : newSkillLevel === 'Intermediate' ? 65 : 35,
      targetLevel: 'Advanced',
      status: 'In Progress',
    };
    const updated = {
      ...formData,
      technicalSkills: [...formData.technicalSkills, newSkill],
    };
    setFormData(updated);
    onUpdateProfile(updated);
    setNewSkillName('');
  };

  const handleRemoveSkill = (id: string) => {
    const updated = {
      ...formData,
      technicalSkills: formData.technicalSkills.filter((s) => s.id !== id),
    };
    setFormData(updated);
    onUpdateProfile(updated);
  };

  // Trigger Gemini Analysis with automatic retry, error isolation, and data preservation
  const handleAnalyzeResume = async (fileData?: {
    file: File;
    text?: string;
    base64?: string;
    mimeType?: string;
  }) => {
    setIsAnalyzing(true);
    setAnalysisState('ANALYZING');
    setAnalysisError(null);

    // Keep uploaded file in component state so user can retry without re-selecting file
    if (fileData) {
      setCachedFileData(fileData);
    }

    try {
      let updatedProfile = { ...formData };
      if (fileData?.file) {
        updatedProfile = {
          ...updatedProfile,
          resumeFileName: fileData.file.name,
          resumeFileSize: fileData.file.size,
          resumeFileMime: fileData.mimeType || fileData.file.type,
          resumeText: fileData.text || updatedProfile.resumeText,
          isDemoProfile: false, // user uploaded their own resume
        };
        setFormData(updatedProfile);
        onUpdateProfile(updatedProfile);
      }

      // Execute server-side Gemini Agent
      const result = await ResumeAnalyzer.analyzeProfileAndResume(
        updatedProfile,
        fileData
          ? {
              text: fileData.text,
              fileName: fileData.file.name,
              base64: fileData.base64,
              mimeType: fileData.mimeType,
            }
          : cachedFileData
          ? {
              text: cachedFileData.text,
              fileName: cachedFileData.file.name,
              base64: cachedFileData.base64,
              mimeType: cachedFileData.mimeType,
            }
          : undefined
      );

      if (onUpdateCareerAnalysis) {
        onUpdateCareerAnalysis(result);
      }

      // Also sync extracted skills to profile if profile had few skills
      if (result.technicalSkills && result.technicalSkills.length > 0) {
        const existingNames = new Set(
          formData.technicalSkills.map((s) => s.name.toLowerCase())
        );
        const newExtracted = result.technicalSkills
          .filter((s) => !existingNames.has(s.skill.toLowerCase()))
          .map((s, idx) => ({
            id: `ai-extracted-${Date.now()}-${idx}`,
            name: s.skill,
            level: s.estimatedLevel,
            category: 'Technical',
            progress: s.estimatedLevel === 'Advanced' ? 85 : s.estimatedLevel === 'Intermediate' ? 65 : 35,
            targetLevel: 'Advanced' as SkillLevel,
            confidence: s.confidence,
            evidence: s.evidence,
            isAiDetected: true,
          }));

        if (newExtracted.length > 0) {
          const syncedProfile = {
            ...updatedProfile,
            technicalSkills: [...updatedProfile.technicalSkills, ...newExtracted],
          };
          setFormData(syncedProfile);
          onUpdateProfile(syncedProfile);
        }
      }

      setAnalysisState('SUCCESS');
      setIsManualProfileActive(false);
      setActiveTab('analysis');
    } catch (err: any) {
      console.error('Career profile analysis failed:', err);
      const isTemp =
        err?.isTemporary !== false &&
        (err?.status === 503 ||
          err?.status === 429 ||
          err?.status === 504 ||
          err?.errorType === 'UNAVAILABLE' ||
          err?.errorType === 'RESOURCE_EXHAUSTED' ||
          err?.errorType === 'NETWORK_FAILURE' ||
          err?.errorType === 'TIMEOUT' ||
          String(err?.message || '').includes('503') ||
          String(err?.message || '').includes('UNAVAILABLE') ||
          String(err?.message || '').includes('busy') ||
          String(err?.message || '').includes('temporarily'));

      setAnalysisState(isTemp ? 'TEMPORARY_ERROR' : 'PERMANENT_ERROR');
      setAnalysisError(
        err.message ||
          'AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile.'
      );
      // NOTE: formData, manual entries, and cachedFileData are strictly PRESERVED!
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetryAnalysis = () => {
    handleAnalyzeResume(cachedFileData || undefined);
  };

  const handleContinueWithManualProfile = () => {
    setIsManualProfileActive(true);
    setActiveTab('manual');
  };

  const handleClearResumeFile = () => {
    const updated = {
      ...formData,
      resumeFileName: undefined,
      resumeFileSize: undefined,
      resumeText: undefined,
    };
    setFormData(updated);
    onUpdateProfile(updated);
  };

  const handleUpdateSkillLevelFromAI = (
    skillName: string,
    confirmedLevel: SkillLevel
  ) => {
    if (!currentAnalysis) return;

    // Update in analysis object
    const updatedTechnical = currentAnalysis.technicalSkills.map((s) => {
      if (s.skill.toLowerCase() === skillName.toLowerCase()) {
        return {
          ...s,
          userConfirmedLevel: confirmedLevel,
        };
      }
      return s;
    });

    const updatedAnalysis: CareerProfileAnalysisResult = {
      ...currentAnalysis,
      technicalSkills: updatedTechnical,
    };

    if (onUpdateCareerAnalysis) {
      onUpdateCareerAnalysis(updatedAnalysis);
    }

    // Update in profile technicalSkills as well
    const updatedProfileSkills = formData.technicalSkills.map((s) => {
      if (s.name.toLowerCase() === skillName.toLowerCase()) {
        return {
          ...s,
          level: confirmedLevel,
          userConfirmedLevel: confirmedLevel,
        };
      }
      return s;
    });

    const updatedProfile = {
      ...formData,
      technicalSkills: updatedProfileSkills,
    };
    setFormData(updatedProfile);
    onUpdateProfile(updatedProfile);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Profile Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-indigo-700 text-white font-extrabold text-2xl flex items-center justify-center shadow-md shadow-indigo-600/20">
            {formData.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">{formData.name}</h2>

              {/* Demo Profile Label */}
              {formData.isDemoProfile ? (
                <span className="text-[11px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                  <span>Demo Profile</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold bg-emerald-50 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span>Active Profile</span>
                </span>
              )}

              <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200">
                Target: {formData.targetRole}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>{formData.currentRole}</span>
              <span>•</span>
              <span>{formData.currentEducation}</span>
              <span>•</span>
              <span>{formData.yearsExperience} experience</span>
              {formData.isDemoProfile && (
                <span className="text-amber-700 font-medium">
                  (Sample candidate data for inspection)
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('skill_gap')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs shadow-indigo-600/20"
          >
            <Target className="w-3.5 h-3.5" />
            <span>View Skill Gaps</span>
          </button>
        </div>
      </div>

      {/* Profile Completeness Indicator Card */}
      <ProfileCompletenessCard
        score={completeness.score}
        breakdown={completeness.breakdown}
        suggestions={completeness.suggestions}
        onActionClick={() => setActiveTab('manual')}
      />

      {/* Prominent Resume & Career Profile Analysis Section */}
      <ResumeUploadSection
        currentFileName={formData.resumeFileName}
        currentFileSize={formData.resumeFileSize}
        isAnalyzing={isAnalyzing}
        analysisError={analysisError}
        analysisState={analysisState}
        onAnalyze={handleAnalyzeResume}
        onClearFile={handleClearResumeFile}
        onRetry={handleRetryAnalysis}
        onContinueManualProfile={handleContinueWithManualProfile}
        onDismissError={() => {
          setAnalysisError(null);
          setAnalysisState('IDLE');
        }}
        lastAnalyzedAt={careerAnalysisResult?.analyzedAt}
        isManualProfileActive={isManualProfileActive}
      />

      {/* Manual Profile Fallback Mode Banner */}
      {isManualProfileActive && (
        <div id="manual-profile-mode-banner" className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-start gap-3.5 text-xs text-sky-950 shadow-2xs animate-in fade-in duration-200">
          <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Info className="w-4 h-4 text-sky-600" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-950 text-sm">
                Using manually entered profile information
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-300">
                Active Source
              </span>
            </div>
            <p className="text-sky-800 leading-relaxed font-medium">
              EduPath AI is personalizing your skill gaps, practice challenges, and AI mentor guidance using your self-reported profile skills ({formData.technicalSkills.length} skills) and target role ({formData.targetRole}).
            </p>
          </div>
        </div>
      )}

      {/* View Switcher Tabs: AI Career Profile vs Manual Profile */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab('analysis')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'analysis'
              ? 'bg-white text-indigo-700 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>
            AI Career Profile {careerAnalysisResult ? `(${careerAnalysisResult.technicalSkills.length} Verified Skills)` : '(Not Analyzed)'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 ${
            activeTab === 'manual'
              ? 'bg-white text-indigo-700 border-t border-x border-slate-200 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <User className="w-3.5 h-3.5 text-slate-600" />
          <span>
            Manual Profile & Preferences {isManualProfileActive ? '(Active: Using manually entered profile)' : ''}
          </span>
        </button>
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'analysis' ? (
        <CareerAnalysisResults
          analysis={currentAnalysis}
          onUpdateSkillLevel={handleUpdateSkillLevelFromAI}
          onNavigateToSkillGap={() => onNavigate('skill_gap')}
          isDemoAnalysis={Boolean(formData.isDemoProfile && currentAnalysis.isDemoAnalysis)}
        />
      ) : (
        /* Manual Profile Management Tab */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Personal & Career Information Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Personal & Career Information
                </h3>
                {isEditingManualProfile ? (
                  <button
                    onClick={handleSaveProfile}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditingManualProfile(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingManualProfile ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Current Role</label>
                    <input
                      type="text"
                      value={formData.currentRole}
                      onChange={(e) => setFormData({ ...formData, currentRole: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Target Career Role</label>
                    <input
                      type="text"
                      value={formData.targetRole}
                      onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Education</label>
                    <input
                      type="text"
                      value={formData.currentEducation}
                      onChange={(e) => setFormData({ ...formData, currentEducation: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-semibold text-slate-700 block mb-1">Career Goal Statement</label>
                    <textarea
                      rows={2}
                      value={formData.careerGoal}
                      onChange={(e) => setFormData({ ...formData, careerGoal: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Current Role</span>
                    <span className="font-bold text-slate-800 text-sm mt-0.5 block">{formData.currentRole}</span>
                  </div>
                  <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <span className="text-indigo-600 block text-[11px] font-semibold">Target Career Role</span>
                    <span className="font-extrabold text-indigo-950 text-sm mt-0.5 block">{formData.targetRole}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Education</span>
                    <span className="font-semibold text-slate-800 text-xs mt-0.5 block">{formData.currentEducation}</span>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Experience & Commitment</span>
                    <span className="font-semibold text-slate-800 text-xs mt-0.5 block">
                      {formData.yearsExperience} • {formData.weeklyHours} hrs/week ({formData.learningPreference})
                    </span>
                  </div>
                  <div className="sm:col-span-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 block text-[11px]">Primary Career Goal</span>
                    <p className="font-medium text-slate-800 text-xs mt-0.5">{formData.careerGoal}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Technical Skills Portfolio */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  Self-Reported Technical Skills ({formData.technicalSkills.length})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {formData.technicalSkills.map((skill) => (
                  <div
                    key={skill.id}
                    className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">{skill.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {skill.level} {skill.targetLevel ? `• Target: ${skill.targetLevel}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-indigo-600">{skill.progress}%</span>
                      <button
                        onClick={() => handleRemoveSkill(skill.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove skill"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Skill Form */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="Add custom skill (e.g. Docker, dbt, Snowflake)"
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-600 outline-none flex-1 min-w-[160px]"
                />
                <select
                  value={newSkillLevel}
                  onChange={(e) => setNewSkillLevel(e.target.value as SkillLevel)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
                <button
                  onClick={handleAddSkill}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Certifications & Portfolio Projects */}
          <div className="space-y-6">
            {/* Certifications Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Certifications ({formData.certifications.length})
              </h3>
              <div className="space-y-2">
                {formData.certifications.map((c) => (
                  <div key={c.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-xs">
                    <div className="font-bold text-slate-800">{c.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {c.issuer} {c.year ? `• ${c.year}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Projects Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                Portfolio Projects ({formData.projects.length})
              </h3>
              <div className="space-y-2.5">
                {formData.projects.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1">
                    <div className="font-bold text-slate-900">{p.title || p.name}</div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{p.description}</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(p.tech || p.technologies || []).map((t) => (
                        <span key={t} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
