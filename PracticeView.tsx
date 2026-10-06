import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Brain,
  Code2,
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  MessageSquare,
  Clock,
  Layers,
  Send,
  RefreshCw,
  ExternalLink,
  Target,
  FileCode,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { LearnerProfile } from '../types/learner';
import {
  PracticeMode,
  PracticeDifficulty,
  PracticeQuestion,
  PracticeEvaluation,
  PracticeAttempt,
  PracticePerformanceReport,
  FlashcardItem,
} from '../types/practice';
import { PracticeService } from '../services/practiceService';

interface PracticeViewProps {
  learnerProfile: LearnerProfile;
  initialSkill?: string;
  onNavigateToResources?: (skill: string) => void;
}

export const PracticeView: React.FC<PracticeViewProps> = ({
  learnerProfile,
  initialSkill,
  onNavigateToResources,
}) => {
  const { user, userId } = useAuth();

  // Primary Configuration
  const [selectedSkill, setSelectedSkill] = useState<string>(
    initialSkill || learnerProfile.technicalSkills?.[0]?.name || 'SQL'
  );
  const [activeMode, setActiveMode] = useState<PracticeMode>('multiple_choice');
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('Intermediate');
  const [customTopic, setCustomTopic] = useState<string>('');

  // Practice Session State
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState<boolean>(false);

  // User Interaction State for Active Question
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [codeAnswer, setCodeAnswer] = useState<string>('');
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<PracticeEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

  // Session Scoring
  const [sessionCorrectCount, setSessionCorrectCount] = useState<number>(0);
  const [sessionTotalAnswered, setSessionTotalAnswered] = useState<number>(0);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [recordedQuestionSummaries, setRecordedQuestionSummaries] = useState<any[]>([]);

  // Flashcards State
  const [flashcards, setFlashcards] = useState<FlashcardItem[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isLoadingCards, setIsLoadingCards] = useState<boolean>(false);

  // Ask AI Drawer State
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState<boolean>(false);
  const [aiAssistantReply, setAiAssistantReply] = useState<string | null>(null);
  const [aiAssistantLoading, setAiAssistantLoading] = useState<boolean>(false);
  const [aiQueryType, setAiQueryType] = useState<string>('hint');

  // Performance Report & History Tab State
  const [activeTab, setActiveTab] = useState<'practice' | 'history' | 'diagnostic'>('practice');
  const [attempts, setAttempts] = useState<PracticeAttempt[]>([]);
  const [performanceReport, setPerformanceReport] = useState<PracticePerformanceReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState<boolean>(false);

  // User's available skills from profile
  const candidateSkills = [
    ...learnerProfile.technicalSkills.map((s) => s.name),
    'SQL',
    'Power BI',
    'Python',
    'Statistics & Probability',
    'Data Warehousing',
  ].filter((v, i, a) => a.indexOf(v) === i);

  // Load user attempts on mount
  useEffect(() => {
    if (userId) {
      const storedAttempts = PracticeService.getUserAttempts(userId);
      setAttempts(storedAttempts);
    }
  }, [userId]);

  // Generate Questions when skill or mode changes
  useEffect(() => {
    if (activeMode === 'flashcards') {
      loadFlashcards();
    } else {
      loadQuestions();
    }
  }, [selectedSkill, activeMode, difficulty]);

  const loadQuestions = async () => {
    setIsLoadingQuestions(true);
    setSessionCompleted(false);
    setCurrentIndex(0);
    setSelectedOption(null);
    setTextAnswer('');
    setCodeAnswer('');
    setShowExplanation(false);
    setEvaluation(null);
    setSessionCorrectCount(0);
    setSessionTotalAnswered(0);
    setRecordedQuestionSummaries([]);
    setSessionStartTime(Date.now());

    try {
      const qCount = activeMode === 'quick_quiz' ? 5 : 3;
      const fetched = await PracticeService.generateQuestions({
        skill: selectedSkill,
        topic: customTopic || undefined,
        count: qCount,
        type: activeMode,
        difficulty,
        targetRole: user?.targetRole || learnerProfile.targetRole,
        learnerProfile,
      });

      setQuestions(fetched);
      if (fetched.length > 0 && fetched[0].starterCode) {
        setCodeAnswer(fetched[0].starterCode);
      }
    } catch (err) {
      console.error('Error loading practice questions:', err);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  const loadFlashcards = async () => {
    setIsLoadingCards(true);
    setIsFlipped(false);
    setCurrentFlashcardIndex(0);
    try {
      const cards = await PracticeService.generateFlashcards(
        selectedSkill,
        customTopic || undefined,
        6,
        [],
        learnerProfile
      );
      setFlashcards(cards);
    } catch (err) {
      console.error('Error loading flashcards:', err);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  // Handle Option Click for Multiple Choice / Quick Quiz
  const handleSelectOption = (index: number) => {
    if (showExplanation) return;
    setSelectedOption(index);
  };

  // Check / Submit Multiple Choice
  const handleCheckMultipleChoice = () => {
    if (selectedOption === null || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    setShowExplanation(true);
    setSessionTotalAnswered((prev) => prev + 1);
    if (isCorrect) {
      setSessionCorrectCount((prev) => prev + 1);
    }

    setRecordedQuestionSummaries((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        type: currentQuestion.type,
        userAnswer: currentQuestion.options?.[selectedOption] || '',
        correctAnswer: currentQuestion.options?.[currentQuestion.correctAnswer || 0] || '',
        score: isCorrect ? 100 : 0,
        verdict: isCorrect ? 'Correct' : 'Incorrect',
        feedbackSummary: isCorrect
          ? 'Correctly identified the underlying mechanism.'
          : 'Incorrect option selected. Review explanation.',
      },
    ]);
  };

  // Submit Short Answer / Coding for AI Evaluation
  const handleSubmitForAiEvaluation = async () => {
    if (!currentQuestion) return;
    const answer = currentQuestion.type === 'coding' ? codeAnswer : textAnswer;
    if (!answer.trim()) return;

    setIsEvaluating(true);
    try {
      const result = await PracticeService.evaluateAnswer({
        question: currentQuestion,
        userAnswer: answer,
        type: activeMode,
        skill: selectedSkill,
        topic: currentQuestion.topic,
        targetRole: user?.targetRole || learnerProfile.targetRole,
      });

      setEvaluation(result);
      setShowExplanation(true);
      setSessionTotalAnswered((prev) => prev + 1);
      if (result.passed) {
        setSessionCorrectCount((prev) => prev + 1);
      }

      setRecordedQuestionSummaries((prev) => [
        ...prev,
        {
          questionId: currentQuestion.id,
          question: currentQuestion.question,
          type: currentQuestion.type,
          userAnswer: answer,
          score: result.score,
          verdict: result.verdict,
          feedbackSummary: result.whatWentWell?.[0] || 'Evaluated by EduPath AI',
        },
      ]);
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Move to next question or complete session
  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setSelectedOption(null);
      setTextAnswer('');
      setShowExplanation(false);
      setEvaluation(null);
      setAiAssistantReply(null);
      if (questions[nextIdx]?.starterCode) {
        setCodeAnswer(questions[nextIdx].starterCode || '');
      } else {
        setCodeAnswer('');
      }
    } else {
      finishPracticeSession();
    }
  };

  const finishPracticeSession = () => {
    setSessionCompleted(true);
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const totalQ = questions.length;
    const scorePct = totalQ > 0 ? Math.round((sessionCorrectCount / totalQ) * 100) : 0;

    // Identify weak topics
    const weakTopics: string[] = [];
    const strengths: string[] = [];
    recordedQuestionSummaries.forEach((sum) => {
      if (sum.score < 70) {
        weakTopics.push(`${selectedSkill}: ${currentQuestion?.topic || 'Concept understanding'}`);
      } else {
        strengths.push(`${selectedSkill}: ${currentQuestion?.topic || 'Core logic'}`);
      }
    });

    const newAttempt: PracticeAttempt = {
      id: `attempt_${Date.now()}`,
      userId: userId || 'user_demo',
      practiceType: activeMode,
      skill: selectedSkill,
      topic: customTopic || currentQuestion?.topic || 'Comprehensive Review',
      difficulty,
      timestamp: new Date().toISOString(),
      totalQuestions: totalQ,
      correctCount: sessionCorrectCount,
      partialCount: 0,
      incorrectCount: totalQ - sessionCorrectCount,
      scorePercentage: scorePct,
      durationSeconds,
      questionSummaries: recordedQuestionSummaries,
      weakTopicsIdentified: weakTopics,
      strengthsIdentified: strengths,
    };

    if (userId) {
      PracticeService.saveUserAttempt(userId, newAttempt);
      setAttempts([newAttempt, ...attempts]);
    }
  };

  // Flashcards handling
  const handleFlashcardStatus = (status: 'know' | 'need_practice') => {
    if (flashcards.length === 0) return;
    const updated = [...flashcards];
    updated[currentFlashcardIndex].status = status;
    setFlashcards(updated);

    if (userId) {
      PracticeService.saveUserFlashcards(userId, updated);
    }

    if (currentFlashcardIndex < flashcards.length - 1) {
      setIsFlipped(false);
      setCurrentFlashcardIndex(currentFlashcardIndex + 1);
    }
  };

  // Ask AI Coach
  const handleAskAi = async (type: 'hint' | 'explain_concept' | 'why_wrong' | 'easier_question' | 'similar_problem') => {
    if (!currentQuestion) return;
    setIsAiDrawerOpen(true);
    setAiQueryType(type);
    setAiAssistantLoading(true);
    setAiAssistantReply(null);

    const userAns =
      selectedOption !== null && currentQuestion.options
        ? currentQuestion.options[selectedOption]
        : activeMode === 'coding'
        ? codeAnswer
        : textAnswer;

    try {
      const reply = await PracticeService.askPracticeAssistant({
        question: currentQuestion,
        userAnswer: userAns,
        queryType: type,
        learnerProfile,
      });
      setAiAssistantReply(reply);
    } catch (err) {
      console.error(err);
    } finally {
      setAiAssistantLoading(false);
    }
  };

  // Load Performance Diagnostic
  const loadPerformanceDiagnostic = async () => {
    setIsLoadingReport(true);
    try {
      const report = await PracticeService.analyzePerformance(
        attempts,
        learnerProfile,
        user?.targetRole || learnerProfile.targetRole
      );
      setPerformanceReport(report);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReport(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-16">
      
      {/* 1. Header Information Strip */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                AI Practice & Assessment Agent
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                <Zap className="w-3 h-3 text-emerald-500" />
                Adaptive
              </span>
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight mt-0.5">
              Targeted Skill Drills & Code Verification
            </h1>
          </div>
        </div>

        {/* User Telemetry Pill */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5 text-xs">
            <Flame className="w-4 h-4 text-amber-500" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none font-semibold">Streak</span>
              <span className="font-bold text-slate-800">{learnerProfile.streakDays || 5} Days Active</span>
            </div>
          </div>

          <div className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5 text-xs">
            <Award className="w-4 h-4 text-indigo-600" />
            <div>
              <span className="text-[10px] text-slate-400 block leading-none font-semibold">Verified Drills</span>
              <span className="font-bold text-slate-800">{attempts.length} Completed</span>
            </div>
          </div>

          {/* Navigation to Learning Resources */}
          {onNavigateToResources && (
            <button
              id="practice-explore-resources-btn"
              type="button"
              onClick={() => onNavigateToResources(selectedSkill)}
              className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Resources</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Mode Selector Bar & Focus Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Practice Modes */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {[
              { id: 'multiple_choice', label: 'Interactive Quiz', icon: HelpCircle },
              { id: 'short_answer', label: 'Technical Explanation', icon: MessageSquare },
              { id: 'coding', label: 'Coding Verification', icon: Code2 },
              { id: 'flashcards', label: 'Concept Flashcards', icon: Layers },
              { id: 'quick_quiz', label: '5-Question Sprint', icon: Clock },
            ].map((m) => {
              const Icon = m.icon;
              const isActive = activeMode === m.id && activeTab === 'practice';
              return (
                <button
                  key={m.id}
                  id={`practice-mode-tab-${m.id}`}
                  type="button"
                  onClick={() => {
                    setActiveMode(m.id as PracticeMode);
                    setActiveTab('practice');
                  }}
                  className={`px-3 py-2 rounded-lg flex items-center gap-1.5 transition-all ${
                    isActive
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Secondary View Tabs */}
          <div className="flex items-center gap-2">
            <button
              id="practice-diagnostic-tab-btn"
              type="button"
              onClick={() => {
                setActiveTab('diagnostic');
                loadPerformanceDiagnostic();
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'diagnostic'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-indigo-600" />
              <span>AI Diagnostics</span>
            </button>

            <button
              id="practice-history-tab-btn"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                activeTab === 'history'
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Past Attempts ({attempts.length})</span>
            </button>
          </div>
        </div>

        {/* Skill, Topic & Difficulty Filter Row */}
        {activeTab === 'practice' && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Targeted Skill
              </label>
              <select
                id="practice-skill-select"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none font-semibold text-slate-800"
              >
                {candidateSkills.map((sk) => (
                  <option key={sk} value={sk}>
                    {sk}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Sub-Topic (Optional Focus)
              </label>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="e.g. Window Functions, CTEs, Joins"
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
                Assessment Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as PracticeDifficulty)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none font-semibold text-slate-800"
              >
                <option value="Beginner">Beginner (Foundations)</option>
                <option value="Intermediate">Intermediate (Core Workplace)</option>
                <option value="Advanced">Advanced (Senior / Edge Cases)</option>
                <option value="Adaptive">Adaptive (Auto-tunes to Weak Gaps)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 3. MAIN WORKSPACE */}

      {/* TAB A: DIAGNOSTICS & WEAK AREAS */}
      {activeTab === 'diagnostic' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">AI Diagnostic Performance Analysis</h2>
              <p className="text-xs text-slate-500">
                Continuous mastery estimation based on your quiz submissions and code reviews.
              </p>
            </div>
            <button
              type="button"
              onClick={loadPerformanceDiagnostic}
              disabled={isLoadingReport}
              className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReport ? 'animate-spin' : ''}`} />
              <span>Re-Analyze</span>
            </button>
          </div>

          {isLoadingReport ? (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Brain className="w-8 h-8 text-indigo-500 animate-pulse mx-auto" />
              <p className="text-xs font-medium">Synthesizing practice telemetry and mistake patterns...</p>
            </div>
          ) : performanceReport ? (
            <div className="space-y-6">
              {/* Top Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                  <span className="text-[11px] font-bold text-indigo-600 block uppercase">Overall Accuracy</span>
                  <span className="text-3xl font-extrabold text-indigo-950 mt-1 block">
                    {performanceReport.overallScore}%
                  </span>
                  <span className="text-[11px] text-indigo-700">Across {performanceReport.totalAttempts} sessions</span>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-100">
                  <span className="text-[11px] font-bold text-amber-700 block uppercase">Detected Gap Areas</span>
                  <span className="text-3xl font-extrabold text-amber-950 mt-1 block">
                    {performanceReport.weakAreas.length} Topics
                  </span>
                  <span className="text-[11px] text-amber-700">Recommended for targeted warmup</span>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[11px] font-bold text-emerald-700 block uppercase">Active Day Streak</span>
                  <span className="text-3xl font-extrabold text-emerald-950 mt-1 block">
                    {performanceReport.streakDays} Days
                  </span>
                  <span className="text-[11px] text-emerald-700">High consistency index</span>
                </div>
              </div>

              {/* Skills Mastery Grid */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Skill Mastery Breakdown
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {performanceReport.skillsMastery.map((sm, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-900 block">{sm.skill}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              sm.status === 'Strong'
                                ? 'bg-emerald-100 text-emerald-800'
                                : sm.status === 'Developing'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {sm.status}
                          </span>
                          <span className="text-[10px] text-slate-400">{sm.attemptsCount} drills logged</span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-lg font-black text-slate-800 block">{sm.accuracyPercentage}%</span>
                        <span className="text-[10px] text-slate-400">Accuracy</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weak Areas & Targeted Recommendations */}
              {performanceReport.weakAreas.length > 0 && (
                <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/70 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Recurring Mistake Patterns Detected</span>
                  </div>
                  <div className="space-y-2.5">
                    {performanceReport.weakAreas.map((wa, idx) => (
                      <div key={idx} className="p-3 bg-white rounded-xl border border-amber-200 text-xs">
                        <div className="flex items-center justify-between font-bold text-slate-800">
                          <span>{wa.topic}</span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                            Missed {wa.frequency} times
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-1">{wa.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Next Practice Callout */}
              {performanceReport.recommendedNextPractice && (
                <div className="p-5 rounded-2xl bg-indigo-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-indigo-300 text-[11px] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Recommended Next Practice Drill</span>
                    </div>
                    <h4 className="text-base font-bold mt-1 text-white">
                      {performanceReport.recommendedNextPractice.skill}: {performanceReport.recommendedNextPractice.topic}
                    </h4>
                    <p className="text-xs text-indigo-200 mt-0.5 max-w-xl">
                      {performanceReport.recommendedNextPractice.reason}
                    </p>
                  </div>
                  <button
                    id="diagnostic-start-recommended-btn"
                    type="button"
                    onClick={() => {
                      setSelectedSkill(performanceReport.recommendedNextPractice.skill);
                      setCustomTopic(performanceReport.recommendedNextPractice.topic);
                      setActiveMode(performanceReport.recommendedNextPractice.type);
                      setActiveTab('practice');
                    }}
                    className="px-5 py-2.5 bg-white text-indigo-950 hover:bg-indigo-50 font-bold text-xs rounded-xl shrink-0 transition-all shadow-md"
                  >
                    Start Drill Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              Complete at least one practice drill to view your AI diagnostic report.
            </div>
          )}
        </div>
      )}

      {/* TAB B: PAST ATTEMPTS HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your Practice Session History</h2>
              <p className="text-xs text-slate-500">
                Every practice drill and quiz result is archived here for your review.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-400">{attempts.length} Total Sessions</span>
          </div>

          {attempts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Award className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs">No completed attempts recorded yet for this profile.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attempts.map((att) => (
                <div
                  key={att.id}
                  className="p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-slate-50/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{att.skill}</span>
                      <span className="text-[10px] uppercase font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                        {att.practiceType}
                      </span>
                      <span className="text-slate-400 text-[11px]">• {att.difficulty}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {att.topic || 'General Practice'} • {new Date(att.timestamp).toLocaleDateString()} at{' '}
                      {new Date(att.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span
                        className={`text-base font-extrabold block ${
                          att.scorePercentage >= 80
                            ? 'text-emerald-600'
                            : att.scorePercentage >= 60
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {att.scorePercentage}%
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {att.correctCount}/{att.totalQuestions} Passed
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkill(att.skill);
                        setActiveMode(att.practiceType);
                        setActiveTab('practice');
                      }}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold text-xs"
                    >
                      Retry Drill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB C: ACTIVE PRACTICE RUNNER */}
      {activeTab === 'practice' && (
        <>
          {/* FLASHCARDS RUNNER */}
          {activeMode === 'flashcards' ? (
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Interactive Flashcards: {selectedSkill}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Flip cards to reinforce technical definitions, syntax nuances, and interview terminology.
                  </p>
                </div>
                {flashcards.length > 0 && (
                  <div className="text-xs font-bold text-slate-400">
                    Card {currentFlashcardIndex + 1} of {flashcards.length}
                  </div>
                )}
              </div>

              {isLoadingCards ? (
                <div className="py-16 text-center text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-medium">Generating bite-sized memory flashcards...</p>
                </div>
              ) : flashcards.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No flashcards available. Try selecting another skill.
                </div>
              ) : (
                <div className="space-y-6 max-w-xl mx-auto">
                  {/* 3D Flip Card Container */}
                  <div
                    id="flashcard-card"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="min-h-[260px] p-8 rounded-3xl border-2 border-indigo-200/70 bg-gradient-to-br from-white to-indigo-50/30 shadow-md cursor-pointer hover:border-indigo-400 transition-all flex flex-col justify-between relative group select-none"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-4">
                        <span className="uppercase tracking-wider text-indigo-600">
                          {flashcards[currentFlashcardIndex].topic}
                        </span>
                        <span>{isFlipped ? 'Answer (Click to flip)' : 'Question (Click to flip)'}</span>
                      </div>

                      <div className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed whitespace-pre-line">
                        {isFlipped
                          ? flashcards[currentFlashcardIndex].back
                          : flashcards[currentFlashcardIndex].front}
                      </div>

                      {flashcards[currentFlashcardIndex].hint && !isFlipped && (
                        <div className="mt-4 p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/60 text-xs text-amber-800 flex items-start gap-2">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Hint:</strong> {flashcards[currentFlashcardIndex].hint}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-center text-[11px] text-slate-400 pt-4 border-t border-slate-100">
                      Tap card to reveal {isFlipped ? 'prompt' : 'answer'}
                    </div>
                  </div>

                  {/* Rating Controls */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <button
                      id="flashcard-need-practice-btn"
                      type="button"
                      onClick={() => handleFlashcardStatus('need_practice')}
                      className="px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Need More Practice</span>
                    </button>

                    <button
                      id="flashcard-know-btn"
                      type="button"
                      onClick={() => handleFlashcardStatus('know')}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>I Know This!</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : sessionCompleted ? (
            /* END OF SESSION ASSESSMENT SUMMARY REPORT */
            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Assessment Completed!
                </h2>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Your results have been evaluated by EduPath AI and archived in your private history.
                </p>
              </div>

              {/* Score Metric Card */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 max-w-md mx-auto text-center space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Assessment Score
                </span>
                <div className="text-5xl font-black text-indigo-900">
                  {questions.length > 0 ? Math.round((sessionCorrectCount / questions.length) * 100) : 0}%
                </div>
                <p className="text-xs font-semibold text-slate-600">
                  {sessionCorrectCount} of {questions.length} Questions Answered Correctly
                </p>
              </div>

              {/* Question Summaries */}
              <div className="space-y-3 max-w-2xl mx-auto">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Review Question Breakdown
                </h3>
                {recordedQuestionSummaries.map((sum, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-white space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">
                        {idx + 1}. {sum.question}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sum.score >= 70
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {sum.verdict} ({sum.score}%)
                      </span>
                    </div>
                    <p className="text-slate-500 text-[11px]">{sum.feedbackSummary}</p>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-4 border-t border-slate-100">
                <button
                  id="practice-restart-btn"
                  type="button"
                  onClick={loadQuestions}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retake / New Drills</span>
                </button>

                <button
                  id="practice-view-diagnostic-btn"
                  type="button"
                  onClick={() => {
                    setActiveTab('diagnostic');
                    loadPerformanceDiagnostic();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs"
                >
                  <Brain className="w-3.5 h-3.5" />
                  <span>View Diagnostic Mastery</span>
                </button>
              </div>
            </div>
          ) : (
            /* ACTIVE QUESTION CARD */
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
              {isLoadingQuestions ? (
                <div className="py-20 text-center text-slate-400 space-y-3">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600" />
                  <p className="text-xs font-semibold">
                    Synthesizing realistic {selectedSkill} assessment questions...
                  </p>
                </div>
              ) : currentQuestion ? (
                <div className="space-y-6">
                  {/* Question Header & Tracker */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wide">
                        Question {currentIndex + 1} of {questions.length}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        • {currentQuestion.topic || selectedSkill}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Socratic Hint Button */}
                      <button
                        id="ask-ai-hint-btn"
                        type="button"
                        onClick={() => handleAskAi('hint')}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                        <span>AI Hint</span>
                      </button>

                      {/* Explain Concept Button */}
                      <button
                        id="ask-ai-explain-btn"
                        type="button"
                        onClick={() => handleAskAi('explain_concept')}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1 transition-colors"
                      >
                        <Brain className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Explain Theory</span>
                      </button>
                    </div>
                  </div>

                  {/* Question Body */}
                  <div className="space-y-3">
                    {currentQuestion.backgroundScenario && (
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 text-xs text-slate-700 leading-relaxed">
                        <strong className="block text-slate-900 mb-0.5">Workplace Scenario:</strong>
                        {currentQuestion.backgroundScenario}
                      </div>
                    )}

                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-relaxed">
                      {currentQuestion.question}
                    </h3>
                  </div>

                  {/* MODE A: MULTIPLE CHOICE OPTIONS */}
                  {(activeMode === 'multiple_choice' || activeMode === 'quick_quiz') && (
                    <div className="space-y-2.5 pt-2">
                      {currentQuestion.options?.map((optionText, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === currentQuestion.correctAnswer;
                        let optionClass = 'border-slate-200 hover:border-slate-300 bg-white text-slate-800';

                        if (showExplanation) {
                          if (isCorrect) {
                            optionClass = 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-bold';
                          } else if (isSelected && !isCorrect) {
                            optionClass = 'border-rose-500 bg-rose-50 text-rose-900 font-semibold';
                          } else {
                            optionClass = 'border-slate-200 bg-slate-50/50 text-slate-400 opacity-60';
                          }
                        } else if (isSelected) {
                          optionClass = 'border-indigo-600 bg-indigo-50 text-indigo-950 font-bold shadow-xs';
                        }

                        return (
                          <button
                            key={idx}
                            id={`practice-option-${idx}`}
                            type="button"
                            disabled={showExplanation}
                            onClick={() => handleSelectOption(idx)}
                            className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm flex items-start gap-3 transition-all ${optionClass}`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 font-bold ${
                                isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{optionText}</span>
                            {showExplanation && isCorrect && (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                            )}
                            {showExplanation && isSelected && !isCorrect && (
                              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* MODE B: SHORT ANSWER TEXTAREA */}
                  {activeMode === 'short_answer' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-700">
                        Your Detailed Technical Explanation:
                      </label>
                      <textarea
                        id="practice-short-answer-input"
                        rows={5}
                        disabled={showExplanation}
                        value={textAnswer}
                        onChange={(e) => setTextAnswer(e.target.value)}
                        placeholder="Explain the underlying principles, data structure considerations, trade-offs, and edge cases..."
                        className="w-full p-3.5 text-xs sm:text-sm font-sans bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-600 outline-none"
                      />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Min recommended: 15-20 words</span>
                        <span>{textAnswer.split(/\s+/).filter(Boolean).length} words</span>
                      </div>
                    </div>
                  )}

                  {/* MODE C: CODING DRILL */}
                  {activeMode === 'coding' && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <FileCode className="w-4 h-4 text-indigo-600" />
                          <span>Code Editor & Query Drill</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">SQL / Script Drill</span>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-slate-300">
                        <textarea
                          id="practice-code-input"
                          rows={8}
                          disabled={showExplanation}
                          value={codeAnswer}
                          onChange={(e) => setCodeAnswer(e.target.value)}
                          placeholder="Write your query or solution here..."
                          className="w-full p-4 font-mono text-xs bg-slate-900 text-emerald-400 focus:outline-none resize-y"
                        />
                      </div>

                      {currentQuestion.testCases && currentQuestion.testCases.length > 0 && (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                          <span className="font-bold text-slate-700 block">Test Case Verification:</span>
                          {currentQuestion.testCases.map((tc, idx) => (
                            <div key={idx} className="text-[11px] text-slate-600">
                              Input: <code className="text-indigo-700">{tc.input}</code> → Expected:{' '}
                              <code className="text-emerald-700">{tc.expectedOutput}</code>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* EXPLANATION / EVALUATION FEEDBACK BOX */}
                  {showExplanation && (
                    <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-4 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                            AI Diagnostic Explanation
                          </span>
                        </div>
                        {evaluation && (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              evaluation.passed
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            Score: {evaluation.score}% ({evaluation.verdict})
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                        {currentQuestion.explanation}
                      </p>

                      {/* Code Review Details if available */}
                      {evaluation?.codeReview && (
                        <div className="p-3.5 bg-white rounded-xl border border-indigo-200 space-y-2 text-xs">
                          <strong className="block text-slate-900 font-bold">AI Code Verification Review:</strong>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                            <div>Time Complexity: <span className="font-mono font-bold text-indigo-700">{evaluation.codeReview.timeComplexity}</span></div>
                            <div>Space Complexity: <span className="font-mono font-bold text-indigo-700">{evaluation.codeReview.spaceComplexity}</span></div>
                          </div>
                          {evaluation.codeReview.potentialBugs?.length > 0 && (
                            <div className="text-[11px] text-rose-700">
                              <strong>Watch Out For:</strong> {evaluation.codeReview.potentialBugs.join(', ')}
                            </div>
                          )}
                          {evaluation.codeReview.suggestedRefactoring && (
                            <div className="text-[11px] text-slate-600">
                              <strong>Refactoring Suggestion:</strong> {evaluation.codeReview.suggestedRefactoring}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* BOTTOM ACTION BUTTONS */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div />

                    {!showExplanation ? (
                      activeMode === 'multiple_choice' || activeMode === 'quick_quiz' ? (
                        <button
                          id="practice-check-btn"
                          type="button"
                          disabled={selectedOption === null}
                          onClick={handleCheckMultipleChoice}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-40 transition-all"
                        >
                          Verify Answer
                        </button>
                      ) : (
                        <button
                          id="practice-evaluate-btn"
                          type="button"
                          disabled={
                            isEvaluating ||
                            (activeMode === 'coding' ? !codeAnswer.trim() : !textAnswer.trim())
                          }
                          onClick={handleSubmitForAiEvaluation}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs disabled:opacity-40 transition-all flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                          <span>{isEvaluating ? 'Running AI Evaluation...' : 'Submit for AI Evaluation'}</span>
                        </button>
                      )
                    ) : (
                      <button
                        id="practice-next-btn"
                        type="button"
                        onClick={handleNextQuestion}
                        className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                      >
                        <span>
                          {currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Assessment'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Click 'Retake / New Drills' to start practice.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* 4. AI SOCRATIC COACH DRAWER / MODAL */}
      {isAiDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-indigo-600" />
                <h4 className="text-sm font-bold text-slate-900">
                  {aiQueryType === 'hint' && 'Socratic Practice Hint'}
                  {aiQueryType === 'explain_concept' && 'Underlying Theory & Concept'}
                  {aiQueryType === 'why_wrong' && 'Misconception Analysis'}
                  {aiQueryType === 'easier_question' && 'Warmup Practice Drill'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {aiAssistantLoading ? (
              <div className="py-10 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs font-semibold">EduPath AI is formulating personalized guidance...</p>
              </div>
            ) : (
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line max-h-80 overflow-y-auto">
                {aiAssistantReply}
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAskAi('easier_question')}
                  className="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                >
                  Try Warmup Problem
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsAiDrawerOpen(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl"
              >
                Got It, Back to Problem
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
