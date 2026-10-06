import React, { useState, useEffect } from 'react';
import {
  MessageSquareText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  RotateCw,
  Send,
  BookOpen,
  Award,
  Zap,
  Volume2,
  Clock,
  Presentation,
  Lightbulb,
  FileText,
  UserCheck,
  ChevronRight,
  ArrowRight,
  History,
  Target,
  RefreshCw,
} from 'lucide-react';
import { LearnerProfile } from '../types';
import {
  CommunicationPracticeMode,
  CommunicationEvaluation,
  CommunicationAttempt,
  GrammarPracticeExercise,
  VocabularyWord,
  ProfessionalIntroDraft,
  PresentationStructure,
  ImprovedCommunicationResult,
} from '../types/communication';
import { AgentService } from '../services/agentService';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface CommunicationCoachViewProps {
  learnerProfile?: LearnerProfile;
  onNavigate?: (view: string) => void;
}

export const CommunicationCoachView: React.FC<CommunicationCoachViewProps> = ({
  learnerProfile,
  onNavigate,
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'user_alex_demo';
  const roleName = learnerProfile?.targetRole || user?.targetRole || 'Data Analyst';

  // Mode Selection
  const [activeMode, setActiveMode] = useState<CommunicationPracticeMode>('grammar');

  // Mode 1: Grammar & Professional Writing State
  const [grammarExercises, setGrammarExercises] = useState<any[]>([]);
  const [currentGrammarIdx, setCurrentGrammarIdx] = useState<number>(0);
  const [selectedGrammarOption, setSelectedGrammarOption] = useState<string | null>(null);
  const [isGrammarAnswered, setIsGrammarAnswered] = useState<boolean>(false);
  const [grammarScoreCount, setGrammarScoreCount] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 });

  // Mode 1b: Free-Form Text Rewriter / Evaluator
  const [userDraftText, setUserDraftText] = useState<string>(
    'Hi team, basically what happened was the SQL queries was running very slow because of lack of indexes on user_id. We noticed a 40 percent drop in page loading times after we fixed that stuff. Please let me know if anyone have questions.'
  );
  const [contextType, setContextType] = useState<string>('Stakeholder Email');
  const [isRewriting, setIsRewriting] = useState<boolean>(false);
  const [improvedResult, setImprovedResult] = useState<ImprovedCommunicationResult | null>(null);
  const [evaluation, setEvaluation] = useState<CommunicationEvaluation | null>(null);

  // Mode 2: Career Vocabulary Builder State
  const [vocabItems, setVocabItems] = useState<VocabularyWord[]>([]);
  const [currentVocabIdx, setCurrentVocabIdx] = useState<number>(0);
  const [selectedVocabOption, setSelectedVocabOption] = useState<string | null>(null);
  const [isVocabAnswered, setIsVocabAnswered] = useState<boolean>(false);

  // Mode 3: Professional Introduction Generator State
  const [introName, setIntroName] = useState<string>(user?.fullName || 'Alex Rivera');
  const [introEducation, setIntroEducation] = useState<string>(user?.education || "Bachelor's in Information Systems");
  const [introTargetRole, setIntroTargetRole] = useState<string>(roleName);
  const [introProjects, setIntroProjects] = useState<string>('Customer Cohort Retention Analytics Dashboard');
  const [introGoal, setIntroGoal] = useState<string>('Drive business growth through actionable data insights and cohort modeling');
  const [introDraft, setIntroDraft] = useState<ProfessionalIntroDraft | null>(null);
  const [isGeneratingIntro, setIsGeneratingIntro] = useState<boolean>(false);
  const [selectedIntroVariant, setSelectedIntroVariant] = useState<'standard' | 'improved' | 'concise' | 'executive'>('standard');

  // Mode 4: Project Explanation State
  const [projectExplanationMode, setProjectExplanationMode] = useState<'30s' | '60s' | '2m' | 'non_tech'>('60s');
  const [projectSpokenText, setProjectSpokenText] = useState<string>(
    'In my customer cohort retention project, I analyzed 50,000 transaction records to discover why users were churning. I built SQL window function queries to compute retention curves, modeled the data in Power BI, and identified that 68% of drop-offs happened between weeks 3 and 5. This gave leadership 3 concrete steps to protect $180k in annual revenue.'
  );
  const [isEvaluatingProjectPitch, setIsEvaluatingProjectPitch] = useState<boolean>(false);

  // Mode 6: Technical Explanation State
  const [techTopic, setTechTopic] = useState<string>('Database Indexes');
  const [techAudience, setTechAudience] = useState<string>('Non-Technical Marketing Lead');
  const [techUserText, setTechUserText] = useState<string>(
    'A database index is just like the index at the back of a cookbook. If you want recipes with strawberries, instead of reading through all 400 pages, you look up strawberries in the index and jump straight to page 85.'
  );
  const [techEvaluation, setTechEvaluation] = useState<CommunicationEvaluation | null>(null);
  const [isEvaluatingTech, setIsEvaluatingTech] = useState<boolean>(false);

  // Mode 7: Presentation Skills State
  const [presentationTopic, setPresentationTopic] = useState<string>('Q4 Customer Churn & Retention Findings');
  const [presentationAudience, setPresentationAudience] = useState<string>('Executive Leadership (VP Product & CMO)');
  const [presentationPlan, setPresentationPlan] = useState<PresentationStructure | null>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState<boolean>(false);

  // User History & Progress Tracking
  const [historyAttempts, setHistoryAttempts] = useState<CommunicationAttempt[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(true);

  // Load user-isolated communication data on mount
  useEffect(() => {
    setIsLoadingHistory(true);
    const savedAttempts = AuthService.getUserData<CommunicationAttempt[]>(userId, 'communication_attempts', []);
    setHistoryAttempts(savedAttempts);

    // Fetch initial grammar exercises
    AgentService.generateGrammarPractice({ targetRole: roleName }).then((res) => {
      if (res.exercises && res.exercises.length > 0) {
        setGrammarExercises(res.exercises);
      }
    });

    // Fetch initial vocabulary items
    AgentService.generateVocabularyPractice({ targetRole: roleName }).then((res) => {
      if (res.items && res.items.length > 0) {
        setVocabItems(res.items);
      }
    });

    setIsLoadingHistory(false);
  }, [userId, roleName]);

  const saveAttempt = (type: CommunicationPracticeMode, prompt: string, response: string, evalResult?: CommunicationEvaluation) => {
    const newAttempt: CommunicationAttempt = {
      id: `att-${Date.now()}`,
      userId,
      type,
      prompt,
      response,
      evaluation: evalResult,
      createdAt: new Date().toISOString(),
      targetRole: roleName,
    };

    const updated = [newAttempt, ...historyAttempts];
    setHistoryAttempts(updated);
    AuthService.setUserData(userId, 'communication_attempts', updated);
  };

  // 1. Free-form text evaluation handler
  const handleEvaluateAndImprove = async () => {
    if (!userDraftText.trim()) return;
    setIsRewriting(true);

    try {
      const [improveRes, evalRes] = await Promise.all([
        AgentService.improveCommunication({
          userText: userDraftText,
          context: contextType,
          targetRole: roleName,
          communicationGoal: 'Executive Clarity',
        }),
        AgentService.evaluateCommunication(userDraftText, contextType, roleName),
      ]);

      if (improveRes.result) {
        setImprovedResult(improveRes.result);
      }
      if (evalRes.feedback) {
        const mappedEval: CommunicationEvaluation = {
          clarity: evalRes.feedback.clarityScore || 85,
          grammar: evalRes.feedback.grammarScore || 88,
          structure: 84,
          vocabulary: evalRes.feedback.vocabularyScore || 80,
          professionalism: evalRes.feedback.toneScore || 86,
          technicalAccuracy: 85,
          overallScore: evalRes.feedback.overallScore || 84,
          strengths: evalRes.feedback.strengths || ['Clear problem statement', 'Quantified results'],
          improvements: evalRes.feedback.improvements || ['Avoid passive tone', 'Use active voice'],
          correctedVersion: evalRes.feedback.improvedVersion,
          practiceRecommendation: 'Practice your 60-second elevator pitch next.',
        };
        setEvaluation(mappedEval);
        saveAttempt('grammar', contextType, userDraftText, mappedEval);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRewriting(false);
    }
  };

  // 3. Generate Professional Intro Handler
  const handleGenerateIntro = async () => {
    setIsGeneratingIntro(true);
    try {
      const res = await AgentService.generateProfessionalIntro({
        name: introName,
        education: introEducation,
        skills: (learnerProfile?.technicalSkills || []).map((s: any) => s.name || s),
        targetRole: introTargetRole,
        projects: [introProjects],
        careerGoal: introGoal,
      });

      if (res.draft) {
        setIntroDraft(res.draft);
        saveAttempt('intro', `Introduction for ${introTargetRole}`, res.draft.introduction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingIntro(false);
    }
  };

  // 4. Evaluate Project Explanation Pitch
  const handleEvaluateProjectPitch = async () => {
    if (!projectSpokenText.trim()) return;
    setIsEvaluatingProjectPitch(true);

    try {
      const res = await AgentService.evaluateCommunication(
        projectSpokenText,
        `Project Walkthrough (${projectExplanationMode})`,
        roleName
      );

      if (res.feedback) {
        const mapped: CommunicationEvaluation = {
          clarity: res.feedback.clarityScore || 88,
          grammar: res.feedback.grammarScore || 90,
          structure: 92,
          vocabulary: res.feedback.vocabularyScore || 85,
          professionalism: res.feedback.toneScore || 89,
          technicalAccuracy: 90,
          overallScore: res.feedback.overallScore || 89,
          strengths: res.feedback.strengths || ['Strong use of STAR method', 'Specific metric evidence ($180k ARR)'],
          improvements: res.feedback.improvements || ['Maintain steady pacing', 'Emphasize your personal contribution'],
          correctedVersion: res.feedback.improvedVersion,
          practiceRecommendation: 'Practice answering follow-up queries on query bottlenecks.',
        };
        setEvaluation(mapped);
        saveAttempt('project_explanation', `Project Pitch (${projectExplanationMode})`, projectSpokenText, mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingProjectPitch(false);
    }
  };

  // 6. Evaluate Technical Explanation Handler
  const handleEvaluateTech = async () => {
    if (!techUserText.trim()) return;
    setIsEvaluatingTech(true);

    try {
      const res = await AgentService.generateTechnicalExplanation({
        topic: techTopic,
        targetAudience: techAudience,
        targetRole: roleName,
        userSubmission: techUserText,
      });

      if (res.evaluation) {
        setTechEvaluation(res.evaluation);
        saveAttempt('technical_explanation', `${techTopic} to ${techAudience}`, techUserText, res.evaluation);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsEvaluatingTech(false);
    }
  };

  // 7. Generate Presentation Structure Handler
  const handleGeneratePresentation = async () => {
    setIsGeneratingPresentation(true);
    try {
      const res = await AgentService.generatePresentationPractice({
        topic: presentationTopic,
        audience: presentationAudience,
        duration: '5 minutes',
        purpose: 'Secure approval for retention interventions',
      });

      if (res.structure) {
        setPresentationPlan(res.structure);
        saveAttempt('presentation', `${presentationTopic} to ${presentationAudience}`, res.structure.structure?.opening || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPresentation(false);
    }
  };

  const activeGrammarEx = grammarExercises[currentGrammarIdx];
  const activeVocabItem = vocabItems[currentVocabIdx];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Phase 4: COMMUNICATE
            </span>
            <span className="text-xs text-slate-500">• Executive Presence Coach</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">AI Communication & Stakeholder Coach</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Elevate your communication for {roleName} interviews, recruiter pitches, and cross-functional leadership presentations.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-900">
            <History className="w-3.5 h-3.5 text-indigo-600" />
            <span>{historyAttempts.length} Practices Completed</span>
          </div>
        </div>
      </div>

      {/* Navigation Modes Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'grammar', label: '1. Grammar & Writing', icon: FileText },
          { id: 'vocabulary', label: '2. Career Vocabulary', icon: BookOpen },
          { id: 'intro', label: '3. Professional Intro', icon: UserCheck },
          { id: 'project_explanation', label: '4. Project Walkthrough', icon: Presentation },
          { id: 'technical_explanation', label: '5. Technical Explainer', icon: Lightbulb },
          { id: 'presentation', label: '6. Executive Presentation', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMode(tab.id as CommunicationPracticeMode)}
              className={`flex-shrink-0 flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode 1: Grammar & Professional Writing */}
      {activeMode === 'grammar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Interactive Grammar Exercises */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Exercise {currentGrammarIdx + 1} of {grammarExercises.length || 4}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">Role-Specific Grammar & Syntax</h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Score: {grammarScoreCount.correct}/{grammarScoreCount.total}
              </span>
            </div>

            {activeGrammarEx ? (
              <div className="space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-800 font-medium leading-relaxed">
                  {activeGrammarEx.prompt}
                </div>

                {/* Options */}
                <div className="space-y-2">
                  {(activeGrammarEx.options || []).map((opt: string, idx: number) => {
                    const isSelected = selectedGrammarOption === opt;
                    const isCorrect = opt === activeGrammarEx.correctAnswer;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (isGrammarAnswered) return;
                          setSelectedGrammarOption(opt);
                          setIsGrammarAnswered(true);
                          setGrammarScoreCount((prev) => ({
                            correct: prev.correct + (isCorrect ? 1 : 0),
                            total: prev.total + 1,
                          }));
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between ${
                          isGrammarAnswered
                            ? isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : isSelected
                              ? 'bg-rose-50 border-rose-300 text-rose-950'
                              : 'bg-white border-slate-200 text-slate-500 opacity-60'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-50/30'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <span>{opt}</span>
                        {isGrammarAnswered && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                        {isGrammarAnswered && !isCorrect && isSelected && <AlertCircle className="w-4 h-4 text-rose-500" />}
                      </button>
                    );
                  })}
                </div>

                {/* Feedback on answer */}
                {isGrammarAnswered && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs space-y-1.5 animate-fadeIn">
                    <span className="font-bold text-slate-900 block">Rule Explanation</span>
                    <p className="text-slate-600 leading-relaxed">{activeGrammarEx.explanation}</p>
                    {activeGrammarEx.commonMistake && (
                      <p className="text-amber-800 text-[11px] bg-amber-50 p-2 rounded-lg border border-amber-100">
                        <span className="font-semibold">Common Trap:</span> {activeGrammarEx.commonMistake}
                      </p>
                    )}
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => {
                          setSelectedGrammarOption(null);
                          setIsGrammarAnswered(false);
                          setCurrentGrammarIdx((prev) => (prev + 1) % (grammarExercises.length || 1));
                        }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                      >
                        Next Exercise →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">Loading interactive exercises...</div>
            )}
          </div>

          {/* Right: AI Communication Rewriter & Executive Polisher */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  AI Text Polisher
                </span>
                <span className="text-xs text-slate-400">• Executive Refinement</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mt-1">Rewrite Emails, Messages, or Explanations</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Context</label>
                <select
                  value={contextType}
                  onChange={(e) => setContextType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 bg-white"
                >
                  <option value="Stakeholder Email">Stakeholder Email / Status Update</option>
                  <option value="Incident Postmortem">Incident Postmortem / Bug Report</option>
                  <option value="Executive Metric Memo">Executive Metric Memo</option>
                  <option value="Slack Query Clarification">Slack Query Clarification</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Draft Text</label>
                <textarea
                  rows={4}
                  value={userDraftText}
                  onChange={(e) => setUserDraftText(e.target.value)}
                  placeholder="Paste or type your draft text here..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 resize-none font-sans"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleEvaluateAndImprove}
                  disabled={!userDraftText.trim() || isRewriting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
                >
                  {isRewriting ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isRewriting ? 'Analyzing & Elevating...' : 'Analyze & Rewrite'}
                </button>
              </div>
            </div>

            {/* AI Rewritten Results */}
            {improvedResult && (
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                  <span className="font-bold text-emerald-900 block text-[11px]">Corrected Version</span>
                  <p className="text-emerald-950 leading-relaxed font-medium">{improvedResult.correctedVersion}</p>
                </div>

                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                  <span className="font-bold text-indigo-900 block text-[11px]">More Professional (Executive)</span>
                  <p className="text-indigo-950 leading-relaxed font-medium">{improvedResult.moreProfessionalVersion}</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">Simpler Version</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{improvedResult.simplerVersion}</p>
                </div>

                {improvedResult.whyChanged && (
                  <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200/60 text-amber-950 text-[11px]">
                    <span className="font-semibold block">Why It Was Changed:</span>
                    <p className="mt-0.5">{improvedResult.whyChanged}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: Career Vocabulary Builder */}
      {activeMode === 'vocabulary' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Word {currentVocabIdx + 1} of {vocabItems.length || 4}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">High-Impact Career Vocabulary</h2>
              <p className="text-xs text-slate-500">Master executive vocabulary tailored for {roleName} technical screenings.</p>
            </div>
            <button
              onClick={() => {
                setSelectedVocabOption(null);
                setIsVocabAnswered(false);
                setCurrentVocabIdx((prev) => (prev + 1) % (vocabItems.length || 1));
              }}
              className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Next Word</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {activeVocabItem ? (
            <div className="space-y-4">
              <div className="bg-indigo-50/40 p-4 rounded-xl border border-indigo-100 space-y-1.5">
                <div className="flex items-baseline gap-2">
                  <h3 className="text-xl font-extrabold text-indigo-950 tracking-tight">{activeVocabItem.word}</h3>
                  <span className="text-xs font-medium text-indigo-600">/ {roleName} Core Competency /</span>
                </div>
                <p className="text-xs font-semibold text-slate-800">{activeVocabItem.meaning}</p>
                <div className="text-xs text-slate-600 pt-1">
                  <span className="font-semibold text-slate-700">Enterprise Example:</span> "{activeVocabItem.example}"
                </div>
                <div className="text-[11px] text-indigo-700 bg-white/60 p-2 rounded border border-indigo-100/60 mt-2">
                  <span className="font-semibold">Recruiter Context:</span> {activeVocabItem.careerContext}
                </div>
              </div>

              {/* Practice Question */}
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">{activeVocabItem.practiceQuestion}</span>
                <div className="space-y-2">
                  {(activeVocabItem.options || [
                    'We synthesized 50,000 transaction records into an executive retention dashboard.',
                    'The computer synthesized an error message.',
                    'I synthesized my desktop by deleting folders.',
                  ]).map((opt: string, oIdx: number) => {
                    const isSelected = selectedVocabOption === opt;
                    const isCorrect = oIdx === 0;

                    return (
                      <button
                        key={oIdx}
                        onClick={() => {
                          setSelectedVocabOption(opt);
                          setIsVocabAnswered(true);
                        }}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
                          isVocabAnswered
                            ? isCorrect
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold'
                              : isSelected
                              ? 'bg-rose-50 border-rose-300 text-rose-950'
                              : 'bg-white border-slate-200 text-slate-400'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-50/30'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">Loading career vocabulary...</div>
          )}
        </div>
      )}

      {/* Mode 3: Professional Introduction Generator */}
      {activeMode === 'intro' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left: Input parameters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Professional Introduction Builder</h3>
              <p className="text-xs text-slate-500">
                Craft a crisp, credible 60-second elevator pitch connecting your education, skills, and portfolio capstone.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Your Name</label>
                <input
                  type="text"
                  value={introName}
                  onChange={(e) => setIntroName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Education Background</label>
                <input
                  type="text"
                  value={introEducation}
                  onChange={(e) => setIntroEducation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Target Career Role</label>
                <input
                  type="text"
                  value={introTargetRole}
                  onChange={(e) => setIntroTargetRole(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Highlighted Portfolio Project</label>
                <input
                  type="text"
                  value={introProjects}
                  onChange={(e) => setIntroProjects(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Career Goal / Core Value Proposition</label>
                <input
                  type="text"
                  value={introGoal}
                  onChange={(e) => setIntroGoal(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                />
              </div>

              <button
                onClick={handleGenerateIntro}
                disabled={isGeneratingIntro}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5"
              >
                {isGeneratingIntro ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isGeneratingIntro ? 'Drafting Tailored Introductions...' : 'Generate 4 Pitch Variations'}
              </button>
            </div>
          </div>

          {/* Right: Generated Drafts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Your Elevator Pitches</h3>

            {introDraft ? (
              <div className="space-y-4 text-xs">
                {/* Variant Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(['standard', 'improved', 'concise', 'executive'] as const).map((variant) => (
                    <button
                      key={variant}
                      onClick={() => setSelectedIntroVariant(variant)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                        selectedIntroVariant === variant
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {variant}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 leading-relaxed font-medium text-slate-800">
                  {selectedIntroVariant === 'standard' && introDraft.introduction}
                  {selectedIntroVariant === 'improved' &&
                    (introDraft.variants?.improved || introDraft.introduction)}
                  {selectedIntroVariant === 'concise' &&
                    (introDraft.variants?.concise || introDraft.introduction)}
                  {selectedIntroVariant === 'executive' &&
                    (introDraft.variants?.executive || introDraft.introduction)}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-800 block text-[11px]">Strengths of this Pitch</span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside">
                    {(introDraft.strengths || introDraft.bulletSummary || [
                      'Clear connection between skills and business impact',
                      'Highlights a concrete capstone project deliverable',
                    ]).map((s: string, idx: number) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-10 text-center text-xs text-slate-400">
                Click "Generate 4 Pitch Variations" to review personalized introductions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mode 4: Project Explanation Practice */}
      {activeMode === 'project_explanation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 max-w-3xl mx-auto">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
              Recruiter Rubric
            </span>
            <h2 className="text-lg font-bold text-slate-900 mt-1">Project Explanation & Interview Pitch Practice</h2>
            <p className="text-xs text-slate-500">
              Hiring managers ask "Walk me through your favorite project." Practice delivering a structured, punchy answer.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: '30s', label: '30s Elevator Pitch' },
              { id: '60s', label: '60s STAR Walkthrough' },
              { id: '2m', label: '2m Technical Deep Dive' },
              { id: 'non_tech', label: 'Non-Tech Stakeholder' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setProjectExplanationMode(p.id as any)}
                className={`py-2 px-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                  projectExplanationMode === p.id
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-3 text-xs">
            <label className="font-semibold text-slate-700 block">Your Spoken or Written Project Pitch</label>
            <textarea
              rows={5}
              value={projectSpokenText}
              onChange={(e) => setProjectSpokenText(e.target.value)}
              placeholder="Structure your pitch: Situation -> Task -> Action -> Result..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 resize-none font-sans"
            />

            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Word count: {projectSpokenText.split(/\s+/).filter(Boolean).length} words (ideal: 120-140 words for 60s)
              </span>
              <button
                onClick={handleEvaluateProjectPitch}
                disabled={!projectSpokenText.trim() || isEvaluatingProjectPitch}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isEvaluatingProjectPitch ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
                {isEvaluatingProjectPitch ? 'Scoring Pitch...' : 'Evaluate My Pitch'}
              </button>
            </div>
          </div>

          {/* Evaluation card */}
          {evaluation && (
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm">Pitch Evaluation Feedback</span>
                <span className="text-xs font-bold text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
                  Overall: {evaluation.overallScore || 88}/100
                </span>
              </div>

              {/* 6 Dimension radar breakdown */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Clarity</span>
                  <span className="font-bold text-slate-800">{evaluation.clarity}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Grammar</span>
                  <span className="font-bold text-slate-800">{evaluation.grammar}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Structure</span>
                  <span className="font-bold text-slate-800">{evaluation.structure}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Vocabulary</span>
                  <span className="font-bold text-slate-800">{evaluation.vocabulary}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Executive Tone</span>
                  <span className="font-bold text-slate-800">{evaluation.professionalism}%</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-100">
                  <span className="text-slate-400 block text-[10px]">Tech Accuracy</span>
                  <span className="font-bold text-slate-800">{evaluation.technicalAccuracy || 88}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 block">Strengths</span>
                  <ul className="text-emerald-950 list-disc list-inside space-y-0.5">
                    {evaluation.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 space-y-1">
                  <span className="font-bold text-amber-900 block">Areas for Improvement</span>
                  <ul className="text-amber-950 list-disc list-inside space-y-0.5">
                    {evaluation.improvements.map((i, idx) => (
                      <li key={idx}>{i}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {evaluation.correctedVersion && (
                <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-800 block text-[11px]">Recommended Script Polish</span>
                  <p className="text-slate-700 leading-relaxed font-medium">{evaluation.correctedVersion}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 5: Technical Explanation Coach */}
      {activeMode === 'technical_explanation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 max-w-3xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Explain Complex Concepts to Non-Technical Stakeholders</h2>
            <p className="text-xs text-slate-500">
              The #1 soft skill test for analysts: Can you explain database indexing or cohort analysis without losing your marketing or sales partner?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Technical Concept</label>
              <select
                value={techTopic}
                onChange={(e) => setTechTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Database Indexes">Database Indexes (B-Trees)</option>
                <option value="SQL JOINs">SQL JOINs (Inner vs Left)</option>
                <option value="Cohort Retention">Cohort Retention Curves</option>
                <option value="A/B Test Significance">Statistical Significance & P-Values</option>
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Target Audience</label>
              <select
                value={techAudience}
                onChange={(e) => setTechAudience(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
              >
                <option value="Non-Technical Marketing Lead">Non-Technical Marketing Lead</option>
                <option value="VP of Product">VP of Product</option>
                <option value="Finance Director">Finance Director</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <label className="font-semibold text-slate-700 block">Your Real-World Analogy Explanation</label>
            <textarea
              rows={4}
              value={techUserText}
              onChange={(e) => setTechUserText(e.target.value)}
              placeholder="Use an intuitive real-world analogy (e.g. recipe books, library card catalogs)..."
              className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 resize-none font-sans"
            />

            <div className="flex justify-end">
              <button
                onClick={handleEvaluateTech}
                disabled={!techUserText.trim() || isEvaluatingTech}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isEvaluatingTech ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                {isEvaluatingTech ? 'Evaluating Analogy...' : 'Evaluate Analogy & Clarity'}
              </button>
            </div>
          </div>

          {techEvaluation && (
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">Analogy Score: {techEvaluation.clarity}/100</span>
                <span className="text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                  {techEvaluation.clarity >= 85 ? 'Executive Ready' : 'Needs Simplification'}
                </span>
              </div>
              <div className="text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800">Coach Feedback:</span> {techEvaluation.strengths.join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 6: Executive Presentation Skills */}
      {activeMode === 'presentation' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5 max-w-3xl mx-auto">
          <div>
            <h2 className="text-lg font-bold text-slate-900">5-Minute Executive Presentation Blueprint</h2>
            <p className="text-xs text-slate-500">
              Structure presentations using the executive playbook: Hook opening, quantified findings, concrete case illustration, and proactive Q&A anticipation.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Presentation Topic</label>
              <input
                type="text"
                value={presentationTopic}
                onChange={(e) => setPresentationTopic(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Audience</label>
              <input
                type="text"
                value={presentationAudience}
                onChange={(e) => setPresentationAudience(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
              />
            </div>
          </div>

          <button
            onClick={handleGeneratePresentation}
            disabled={isGeneratingPresentation}
            className="w-full py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5"
          >
            {isGeneratingPresentation ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
            {isGeneratingPresentation ? 'Drafting Executive Presentation Plan...' : 'Generate 5-Minute Presentation Structure'}
          </button>

          {presentationPlan && (
            <div className="space-y-4 pt-3 border-t border-slate-100 text-xs animate-fadeIn">
              <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-200 space-y-1">
                <span className="font-bold text-indigo-900 block text-[11px]">1. The Opening Hook (First 30 seconds)</span>
                <p className="text-indigo-950 leading-relaxed font-medium">{presentationPlan.structure?.opening}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="font-bold text-slate-900 block text-[11px]">2. Main Strategic Takeaways</span>
                <ul className="space-y-1.5 text-slate-700 list-disc list-inside">
                  {(presentationPlan.structure?.mainPoints || []).map((pt: any, idx: number) => (
                    <li key={idx} className="leading-snug">
                      {typeof pt === 'string' ? pt : `${pt.title}: ${pt.explanation}`}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1">
                <span className="font-bold text-emerald-900 block text-[11px]">3. Decisive Closing & Call to Action</span>
                <p className="text-emerald-950 leading-relaxed font-medium">{presentationPlan.structure?.closing}</p>
              </div>

              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                <span className="font-bold text-amber-900 block text-[11px]">Anticipated Stakeholder Q&A</span>
                <ul className="space-y-1 text-amber-950 list-disc list-inside">
                  {(presentationPlan.structure?.possibleQuestions || [
                    'What is the engineering bandwidth needed for automated triggers?',
                    'How does this cohort compare to baseline metrics from last year?',
                  ]).map((q, idx) => (
                    <li key={idx}>{q}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
