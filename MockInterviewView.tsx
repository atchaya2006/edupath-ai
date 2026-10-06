import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Award,
  RotateCcw,
  Clock,
  Target,
  User,
  Zap,
  ChevronRight,
  HelpCircle,
  SkipForward,
  Play,
  BarChart3,
  Calendar,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Mic,
  MicOff,
  TrendingUp,
  ThumbsUp,
  FileText,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import {
  LearnerProfile,
  SkillGapAnalysis,
  LearningPath,
  AIProject,
  CommunicationAttempt,
} from '../types';
import {
  InterviewType,
  InterviewDifficulty,
  InterviewStyle,
  InterviewQuestion,
  InterviewPlan,
  InterviewEvaluation,
  InterviewAttempt,
  MockInterview,
  InterviewCoachMessage,
  WeakAreaAnalysis,
  InterviewPreparationPlan,
} from '../types/interview';
import { AgentService } from '../services/agentService';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface MockInterviewViewProps {
  onNavigate: (view: string) => void;
  learnerProfile?: LearnerProfile;
  skillGapAnalysis?: SkillGapAnalysis | null;
  learningPath?: LearningPath | null;
}

export const MockInterviewView: React.FC<MockInterviewViewProps> = ({
  onNavigate,
  learnerProfile,
  skillGapAnalysis,
  learningPath,
}) => {
  const { user, userId } = useAuth();
  const effectiveUserId = userId || 'user_demo';

  // Navigation tab inside Mock Interview: 'interview' | 'history'
  const [activeTab, setActiveTab] = useState<'interview' | 'history'>('interview');

  // Interview state: 'config' | 'in_progress' | 'turn_feedback' | 'completed'
  const [interviewState, setInterviewState] = useState<'config' | 'in_progress' | 'turn_feedback' | 'completed'>('config');

  // Configuration settings
  const [targetRole, setTargetRole] = useState(learnerProfile?.targetRole || user?.targetRole || 'Data Analyst');
  const [interviewType, setInterviewType] = useState<InterviewType>('mixed');
  const [difficulty, setDifficulty] = useState<InterviewDifficulty>('intermediate');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [customQuestionCount, setCustomQuestionCount] = useState<string>('5');
  const [isCustomCount, setIsCustomCount] = useState<boolean>(false);
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [interviewStyle, setInterviewStyle] = useState<InterviewStyle>('professional');

  // Loaded user projects and communication attempts for integration
  const [userProjects, setUserProjects] = useState<AIProject[]>([]);
  const [commMetrics, setCommMetrics] = useState<{ averageScore: number; modesPracticed: string[] }>({
    averageScore: 78,
    modesPracticed: ['STAR Framework', 'Technical Explanation'],
  });

  // Current active interview session data
  const [activePlan, setActivePlan] = useState<InterviewPlan | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestion | null>(null);
  const [candidateInput, setCandidateInput] = useState<string>('');
  const [attempts, setAttempts] = useState<InterviewAttempt[]>([]);
  const [currentEvaluation, setCurrentEvaluation] = useState<InterviewEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);

  // Follow-up interaction
  const [activeFollowUpQuestion, setActiveFollowUpQuestion] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string>('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState<boolean>(false);
  const [followUpSubmitted, setFollowUpSubmitted] = useState<boolean>(false);

  // Hint state
  const [activeHint, setActiveHint] = useState<string | null>(null);
  const [isLoadingHint, setIsLoadingHint] = useState<boolean>(false);

  // Timer state
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  // Speech-to-text safety gating
  const [isSpeechSupported, setIsSpeechSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const recognitionRef = useRef<any>(null);

  // Final summary and report
  const [completedInterview, setCompletedInterview] = useState<MockInterview | null>(null);
  const [weakAreaAnalysis, setWeakAreaAnalysis] = useState<WeakAreaAnalysis | null>(null);
  const [prepPlan, setPrepPlan] = useState<InterviewPreparationPlan | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);

  // Ask AI Interview Coach interactive chat
  const [coachMessages, setCoachMessages] = useState<InterviewCoachMessage[]>([]);
  const [coachInput, setCoachInput] = useState<string>('');
  const [isCoachThinking, setIsCoachThinking] = useState<boolean>(false);

  // History state
  const [pastInterviews, setPastInterviews] = useState<MockInterview[]>([]);
  const [selectedPastInterview, setSelectedPastInterview] = useState<MockInterview | null>(null);

  // Load user data on mount and whenever userId changes
  useEffect(() => {
    if (!effectiveUserId) return;

    // Load user projects
    const savedProjects = AuthService.getUserData<AIProject[]>(effectiveUserId, 'ai_projects', []);
    setUserProjects(savedProjects);

    // Load communication metrics
    const stats = AgentService.getCommunicationStats(effectiveUserId);
    setCommMetrics({
      averageScore: stats.averageScore || 78,
      modesPracticed: stats.modesPracticed.length > 0 ? stats.modesPracticed : ['STAR Framework', 'Technical Explanation'],
    });

    // Load past interviews for this user
    const savedInterviews = AuthService.getUserData<MockInterview[]>(effectiveUserId, 'mock_interviews', []);
    setPastInterviews(savedInterviews);

    // If adaptive difficulty selected, inspect past performance
    if (savedInterviews.length > 0) {
      const last = savedInterviews[savedInterviews.length - 1];
      if (last.overallScore && last.overallScore >= 82) {
        setDifficulty('advanced');
      } else if (last.overallScore && last.overallScore < 65) {
        setDifficulty('beginner');
      }
    }

    // Safely check for browser speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        setIsSpeechSupported(true);
        try {
          const rec = new SpeechRec();
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';

          rec.onresult = (event: any) => {
            let current = '';
            for (let i = 0; i < event.results.length; i++) {
              current += event.results[i][0].transcript;
            }
            setCandidateInput((prev) => (prev ? prev + ' ' + current : current));
          };

          rec.onerror = () => {
            setIsListening(false);
          };

          rec.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current = rec;
        } catch {
          setIsSpeechSupported(false);
        }
      }
    }
  }, [effectiveUserId]);

  // Timer loop during active interview
  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((sec) => sec + 1);
      }, 1000);
    } else if (!isTimerRunning && secondsElapsed !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, secondsElapsed]);

  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start a new mock interview session
  const handleStartInterview = async () => {
    setIsGeneratingPlan(true);
    setCandidateInput('');
    setActiveHint(null);
    setActiveFollowUpQuestion(null);
    setFollowUpAnswer('');
    setFollowUpSubmitted(false);
    setAttempts([]);
    setCurrentQuestionIndex(0);
    setSecondsElapsed(0);
    setIsTimerRunning(true);

    const actualCount = isCustomCount ? Math.max(3, parseInt(customQuestionCount) || 5) : questionCount;

    try {
      const plan = await AgentService.generateInterviewPlan({
        targetRole,
        interviewType,
        difficulty,
        style: interviewStyle,
        questionCount: actualCount,
        duration: durationMinutes,
        userProfile: learnerProfile || { targetRole, yearsExperience: '1-2 years' },
        skills: learnerProfile?.technicalSkills || [],
        skillGaps: skillGapAnalysis?.topPriorities || [],
        projects: userProjects.length > 0 ? userProjects : (learnerProfile?.projects || []),
        communicationPerformance: commMetrics,
        interviewHistory: pastInterviews,
      });

      setActivePlan(plan);
      if (plan.questions && plan.questions.length > 0) {
        setCurrentQuestion(plan.questions[0]);
      }
      setInterviewState('in_progress');
    } catch (err) {
      console.error('Failed to start interview:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Get pedagogical hint
  const handleGetHint = async () => {
    if (!currentQuestion) return;
    if (currentQuestion.hint) {
      setActiveHint(currentQuestion.hint);
      return;
    }

    setIsLoadingHint(true);
    try {
      const res = await AgentService.getQuestionHint({
        question: currentQuestion.question,
        questionType: currentQuestion.type,
        skill: currentQuestion.skill,
        targetRole,
      });
      setActiveHint(res.hint);
    } catch {
      setActiveHint('Focus on structuring your thoughts: State the problem, your actions, and the concrete outcome.');
    } finally {
      setIsLoadingHint(false);
    }
  };

  // Skip question
  const handleSkipQuestion = () => {
    if (!currentQuestion) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const skippedAttempt: InterviewAttempt = {
      id: `att-${Date.now()}`,
      interviewId: `int-${Date.now()}`,
      userId: effectiveUserId,
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      questionType: currentQuestion.type,
      skill: currentQuestion.skill,
      topic: currentQuestion.topic,
      status: 'skipped',
      createdAt: new Date().toISOString(),
    };

    const nextAttempts = [...attempts, skippedAttempt];
    setAttempts(nextAttempts);
    advanceToNextQuestion(nextAttempts);
  };

  // Submit answer for evaluation
  const handleSubmitAnswer = async () => {
    if (!candidateInput.trim() || !currentQuestion || isEvaluating) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsEvaluating(true);

    try {
      const res = await AgentService.evaluateInterviewAnswer({
        question: currentQuestion.question,
        userAnswer: candidateInput,
        questionType: currentQuestion.type,
        targetRole,
        skill: currentQuestion.skill,
        difficulty,
        style: interviewStyle,
      });

      setCurrentEvaluation(res.evaluation);

      // Create attempt record
      const attemptRecord: InterviewAttempt = {
        id: `att-${Date.now()}`,
        interviewId: `int-${Date.now()}`,
        userId: effectiveUserId,
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        questionType: currentQuestion.type,
        skill: currentQuestion.skill,
        topic: currentQuestion.topic,
        answer: candidateInput,
        evaluation: res.evaluation,
        status: 'answered',
        createdAt: new Date().toISOString(),
      };

      setAttempts((prev) => [...prev, attemptRecord]);
      setInterviewState('turn_feedback');

      // Generate conversational follow-up question if allowed
      if (currentQuestion.followUpAllowed && candidateInput.trim().length > 30) {
        try {
          const followUpRes = await AgentService.generateFollowUpQuestion({
            currentQuestion: currentQuestion.question,
            userAnswer: candidateInput,
            targetRole,
            skill: currentQuestion.skill,
            difficulty,
          });
          setActiveFollowUpQuestion(followUpRes.followUpQuestion);
        } catch {
          setActiveFollowUpQuestion(null);
        }
      } else {
        setActiveFollowUpQuestion(null);
      }
    } catch (err) {
      console.error('Evaluation error:', err);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Submit follow-up response
  const handleSubmitFollowUp = async () => {
    if (!followUpAnswer.trim() || !activeFollowUpQuestion) return;
    setIsSubmittingFollowUp(true);

    try {
      const res = await AgentService.evaluateInterviewAnswer({
        question: activeFollowUpQuestion,
        userAnswer: followUpAnswer,
        questionType: currentQuestion?.type || 'technical',
        targetRole,
        skill: currentQuestion?.skill,
        difficulty,
      });

      // Append follow-up evaluation to latest attempt
      setAttempts((prev) => {
        const updated = [...prev];
        if (updated.length > 0) {
          const last = updated[updated.length - 1];
          last.followUpQuestion = activeFollowUpQuestion;
          last.followUpAnswer = followUpAnswer;
          last.followUpEvaluation = res.evaluation;
        }
        return updated;
      });

      setFollowUpSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  // Advance to next question or complete interview
  const advanceToNextQuestion = (currentAttemptsList?: InterviewAttempt[]) => {
    const listToUse = currentAttemptsList || attempts;
    const nextIndex = currentQuestionIndex + 1;
    const totalQuestions = activePlan?.questions.length || 0;

    if (nextIndex < totalQuestions && activePlan) {
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestion(activePlan.questions[nextIndex]);
      setCandidateInput('');
      setActiveHint(null);
      setActiveFollowUpQuestion(null);
      setFollowUpAnswer('');
      setFollowUpSubmitted(false);
      setCurrentEvaluation(null);
      setInterviewState('in_progress');
    } else {
      finalizeInterview(listToUse);
    }
  };

  // Finalize interview session, generate report, and persist to user profile
  const finalizeInterview = async (completedAttemptsList: InterviewAttempt[]) => {
    setIsTimerRunning(false);
    setIsGeneratingReport(true);
    setInterviewState('completed');

    // Calculate actual scores strictly from evaluation
    const scoredAttempts = completedAttemptsList.filter((a) => a.status === 'answered' && a.evaluation);
    const totalScore = scoredAttempts.reduce((sum, a) => sum + (a.evaluation?.score || 0), 0);
    const overallScore = scoredAttempts.length > 0 ? Math.round(totalScore / scoredAttempts.length) : 60;

    // Calculate category breakdown
    const techAttempts = scoredAttempts.filter((a) => a.questionType === 'technical');
    const projAttempts = scoredAttempts.filter((a) => a.questionType === 'project');
    const behAttempts = scoredAttempts.filter((a) => a.questionType === 'behavioral');
    const hrAttempts = scoredAttempts.filter((a) => a.questionType === 'hr');

    const calcAvg = (arr: InterviewAttempt[]) =>
      arr.length > 0 ? Math.round(arr.reduce((s, a) => s + (a.evaluation?.score || 0), 0) / arr.length) : undefined;

    const breakdown = {
      technical: calcAvg(techAttempts),
      project: calcAvg(projAttempts),
      behavioral: calcAvg(behAttempts),
      communication: calcAvg(scoredAttempts),
      problemSolving: calcAvg(techAttempts.concat(projAttempts)),
    };

    // Synthesize strengths and improvement areas
    const gatheredStrengths = Array.from(
      new Set(scoredAttempts.flatMap((a) => a.evaluation?.strengths || []))
    ).slice(0, 4);
    const gatheredImprovements = Array.from(
      new Set(scoredAttempts.flatMap((a) => a.evaluation?.improvementAreas || []))
    ).slice(0, 4);

    try {
      // Weak area analysis
      const analysis = await AgentService.analyzeInterviewPerformance({
        attempts: completedAttemptsList,
        targetRole,
        skills: learnerProfile?.technicalSkills || [],
        previousInterviews: pastInterviews,
      });
      setWeakAreaAnalysis(analysis);

      // Preparation sprint plan
      const prep = await AgentService.generateInterviewPreparationPlan({
        targetRole,
        weakAreas: analysis.needsPractice || gatheredImprovements,
        overallScore,
      });
      setPrepPlan(prep);

      // Formulate final interview object
      const newInterview: MockInterview = {
        id: `mock-${Date.now()}`,
        userId: effectiveUserId,
        targetRole,
        interviewType,
        difficulty,
        style: interviewStyle,
        questionCount: activePlan?.questions.length || completedAttemptsList.length,
        durationMinutes: Math.max(1, Math.round(secondsElapsed / 60)),
        startedAt: new Date(Date.now() - secondsElapsed * 1000).toISOString(),
        completedAt: new Date().toISOString(),
        status: 'completed',
        overallScore,
        scoreBreakdown: breakdown,
        strengths: gatheredStrengths.length > 0 ? gatheredStrengths : ['Clear communication', 'Solid technical basics'],
        areasToImprove: gatheredImprovements.length > 0 ? gatheredImprovements : ['Quantify metrics', 'Use STAR structure'],
        recommendedNextSteps: [
          `Review ${analysis.needsPractice?.[0] || 'SQL JOINs'} in the Practice Center`,
          'Practice a 60-second structured project elevator pitch',
          'Rehearse STAR responses for behavioral conflict scenarios',
        ],
        weakAreaAnalysis: analysis,
        preparationPlan: prep,
        questions: activePlan?.questions || [],
        attempts: completedAttemptsList,
      };

      setCompletedInterview(newInterview);

      // Persist user-isolated mock interview history
      const updatedInterviews = [newInterview, ...pastInterviews];
      setPastInterviews(updatedInterviews);
      AuthService.setUserData(effectiveUserId, 'mock_interviews', updatedInterviews);

      // Seed initial coach prompt
      setCoachMessages([
        {
          id: 'coach-init',
          sender: 'coach',
          text: `Hello! I'm your AI Interview Coach. You completed your **${interviewType.toUpperCase()} Interview** for **${targetRole}** with an AI-estimated practice score of **${overallScore}%**. You showed strong responses in ${gatheredStrengths[0] || 'your core explanations'}, and our primary focus for refinement is ${gatheredImprovements[0] || 'STAR structuring'}. How can I help you improve?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      console.error('Error generating report:', err);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Ask AI Interview Coach question
  const handleSendCoachMessage = async (queryText?: string) => {
    const text = (queryText || coachInput).trim();
    if (!text || isCoachThinking) return;

    const userMsg: InterviewCoachMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setCoachMessages((prev) => [...prev, userMsg]);
    setCoachInput('');
    setIsCoachThinking(true);

    try {
      const recentAttempt = attempts[attempts.length - 1];
      const res = await AgentService.answerInterviewCoachQuestion({
        question: text,
        targetRole,
        recentQuestion: recentAttempt?.question,
        recentAnswer: recentAttempt?.answer,
        recentFeedback: recentAttempt?.evaluation?.feedback,
      });

      const coachMsg: InterviewCoachMessage = {
        id: `coach-${Date.now()}`,
        sender: 'coach',
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setCoachMessages((prev) => [...prev, coachMsg]);
    } catch (err) {
      console.error(err);
      setCoachMessages((prev) => [
        ...prev,
        {
          id: `coach-err-${Date.now()}`,
          sender: 'coach',
          text: 'To improve your interview responses, structure them with concrete Situation, Action, and Quantifiable Result steps. Ask me for a specific example!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsCoachThinking(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Primary Header & Subtitle */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              <span>AI Interview Agent</span>
            </span>
            <span className="text-xs text-slate-500">• Tailored Career Preparation</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mt-1.5">
            AI Mock Interview
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xl">
            Practice realistic interviews tailored to your target career. The AI Interview Coach evaluates observable technical correctness, STAR methodology, and executive delivery.
          </p>
        </div>

        {/* View Switching Tabs & Restart */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 text-xs font-semibold">
            <button
              onClick={() => {
                setActiveTab('interview');
                setSelectedPastInterview(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'interview'
                  ? 'bg-white text-indigo-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Interview Studio</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Practice History ({pastInterviews.length})</span>
            </button>
          </div>

          {interviewState !== 'config' && (
            <button
              onClick={() => {
                setIsTimerRunning(false);
                setInterviewState('config');
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================
          TAB 1: INTERVIEW STUDIO (CONFIG, ACTIVE, COMPLETED)
         ========================================================= */}
      {activeTab === 'interview' && (
        <>
          {/* STATE 1: CONFIGURATION MODE */}
          {interviewState === 'config' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column (2 Cols): Configuration Controls */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        Configure Your Mock Interview
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Customize the interview type, difficulty, and duration to match your career goals.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                      Step 1 of 2
                    </span>
                  </div>

                  {/* Role & Experience Info Card */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Target Role
                      </span>
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-indigo-600" />
                        <input
                          type="text"
                          value={targetRole}
                          onChange={(e) => setTargetRole(e.target.value)}
                          className="font-bold text-slate-900 bg-white px-2 py-1 rounded border border-slate-300 text-xs w-full focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Experience Level
                      </span>
                      <div className="flex items-center gap-2 text-slate-700 font-semibold pt-1">
                        <User className="w-4 h-4 text-slate-500" />
                        <span>{learnerProfile?.yearsExperience || 'Student / Early Career (1-2 yrs)'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Interview Type Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-800 block">
                      Select Interview Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {[
                        {
                          type: 'mixed' as InterviewType,
                          title: 'Mixed Interview',
                          desc: 'HR + Tech + Project + Behavioral (Recommended)',
                          badge: 'Full Loop',
                        },
                        {
                          type: 'technical' as InterviewType,
                          title: 'Technical Interview',
                          desc: 'SQL, Python, Data Modeling, & Metrics',
                          badge: 'Core Hard Skills',
                        },
                        {
                          type: 'project' as InterviewType,
                          title: 'Project Interview',
                          desc: 'Deep dive into your actual portfolio projects',
                          badge: 'Real Projects',
                        },
                        {
                          type: 'behavioral' as InterviewType,
                          title: 'Behavioral Interview',
                          desc: 'STAR framework, teamwork, and conflict handling',
                          badge: 'STAR Method',
                        },
                        {
                          type: 'hr' as InterviewType,
                          title: 'HR Interview',
                          desc: 'Self-intro, career motivation, and culture fit',
                          badge: 'Culture & Goals',
                        },
                      ].map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => setInterviewType(item.type)}
                          className={`p-3.5 rounded-xl border text-left transition-all relative ${
                            interviewType === item.type
                              ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/10'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-bold text-slate-900">{item.title}</span>
                            <span
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                interviewType === item.type
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 leading-snug">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty & Interview Style */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Difficulty */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Difficulty</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['beginner', 'intermediate', 'advanced', 'adaptive'] as InterviewDifficulty[]).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDifficulty(d)}
                            className={`py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all ${
                              difficulty === d
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interview Style */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Interviewer Style</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['friendly', 'professional', 'challenging'] as InterviewStyle[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setInterviewStyle(st)}
                            className={`py-2 px-2 rounded-lg border text-xs font-semibold capitalize text-center transition-all ${
                              interviewStyle === st
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Question Count & Estimated Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* Number of Questions */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Questions</label>
                      <div className="flex items-center gap-2">
                        {[5, 10, 15].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => {
                              setQuestionCount(cnt);
                              setIsCustomCount(false);
                            }}
                            className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-colors ${
                              !isCustomCount && questionCount === cnt
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {cnt} Qs
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setIsCustomCount(true)}
                          className={`py-2 px-3 rounded-lg border text-xs font-bold transition-colors ${
                            isCustomCount
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          Custom
                        </button>
                      </div>
                      {isCustomCount && (
                        <div className="pt-1">
                          <input
                            type="number"
                            min="3"
                            max="15"
                            value={customQuestionCount}
                            onChange={(e) => setCustomQuestionCount(e.target.value)}
                            placeholder="Enter 3 to 15 questions"
                            className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-800 block">Estimated Duration</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[5, 10, 15, 30].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => setDurationMinutes(mins)}
                            className={`py-2 rounded-lg border text-xs font-bold transition-colors ${
                              durationMinutes === mins
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Tailored to <strong>{targetRole}</strong> • <strong>{difficulty}</strong> level
                    </div>
                    <button
                      id="start-mock-interview-btn"
                      onClick={handleStartInterview}
                      disabled={isGeneratingPlan}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isGeneratingPlan ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Interview Plan...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-white" />
                          <span>Start Mock Interview</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column (1 Col): Cross-Agent Context Telemetry */}
              <div className="space-y-4">
                {/* Profile Evidence Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Personalized Inputs</span>
                  </div>

                  {/* Verified Projects Found */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Verified Portfolio Projects ({userProjects.length})
                    </span>
                    {userProjects.length > 0 ? (
                      <div className="space-y-1.5">
                        {userProjects.slice(0, 2).map((p) => (
                          <div key={p.id} className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                            <span className="font-bold text-slate-800 block truncate">{p.title}</span>
                            <span className="text-[10px] text-slate-500">
                              {p.technologies?.slice(0, 3).join(', ') || p.difficulty}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-800">
                        No portfolio projects found yet. The AI will ask conceptual project delivery questions.
                      </div>
                    )}
                  </div>

                  {/* Priority Skill Gaps */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Target Technical Competencies
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {(skillGapAnalysis?.topPriorities || [
                        { skill: 'SQL JOINs' },
                        { skill: 'Power BI DAX' },
                        { skill: 'Statistics' },
                        { skill: 'Data Quality' },
                      ]).map((g: any, i: number) => (
                        <span
                          key={i}
                          className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          {typeof g === 'string' ? g : g.skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Communication Metrics */}
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Communication Coach Alignment
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Practice Score</span>
                      <span className="font-extrabold text-indigo-700">{commMetrics.averageScore}%</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Interview agent prompts candidate to use the STAR method and name quantitative metrics.
                    </p>
                  </div>
                </div>

                {/* Adaptive Difficulty Banner */}
                <div className="p-4 rounded-xl bg-indigo-50/80 border border-indigo-100 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-950">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    <span>Adaptive Preparation Engine</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    Questions dynamically branch based on your answers. If you demonstrate strong mastery of basic SQL, the interviewer automatically introduces query optimization follow-ups.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: ACTIVE INTERVIEW (IN_PROGRESS & TURN_FEEDBACK) */}
          {(interviewState === 'in_progress' || interviewState === 'turn_feedback') && currentQuestion && (
            <div className="max-w-4xl mx-auto space-y-5">
              {/* Focused Header Bar */}
              <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      AI Interviewer • {targetRole}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Style: <strong className="text-slate-600 capitalize">{interviewStyle}</strong> • Level: <strong className="text-slate-600 capitalize">{difficulty}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Timer */}
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{formatTimer(secondsElapsed)}</span>
                  </div>

                  {/* Question Counter */}
                  <div className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-lg">
                    Question {currentQuestionIndex + 1} of {activePlan?.questions.length || 5}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentQuestionIndex + (interviewState === 'turn_feedback' ? 1 : 0.5)) / (activePlan?.questions.length || 5)) * 100}%`,
                  }}
                />
              </div>

              {/* Main Question Card */}
              <div className="bg-white rounded-2xl border-2 border-indigo-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full">
                      {currentQuestion.type} Question
                    </span>
                    {currentQuestion.skill && (
                      <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {currentQuestion.skill}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Topic: {currentQuestion.topic || 'Core Competency'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed">
                  "{currentQuestion.question}"
                </h3>

                {currentQuestion.purpose && (
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 flex items-start gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span><strong>Interviewer Intent:</strong> {currentQuestion.purpose}</span>
                  </div>
                )}

                {/* Pedagogical Hint Popover / Box */}
                {activeHint && (
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 animate-fadeIn">
                    <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Interview Coach Hint:</span>
                      <p className="mt-0.5 leading-relaxed">{activeHint}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* =========================================================
                  SUB-STATE A: ACTIVE INPUT (Candidate Typing / Speaking)
                 ========================================================= */}
              {interviewState === 'in_progress' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Your Answer</span>
                    </label>

                    {/* Word count & Speech Recognition toggle */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {candidateInput.trim() ? candidateInput.trim().split(/\s+/).length : 0} words
                      </span>

                      {isSpeechSupported && (
                        <button
                          type="button"
                          onClick={toggleSpeechRecognition}
                          className={`text-xs px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-semibold transition-colors ${
                            isListening
                              ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Voice Input (Uses Browser Web Speech API)"
                        >
                          {isListening ? (
                            <>
                              <MicOff className="w-3.5 h-3.5 text-rose-600" />
                              <span>Listening...</span>
                            </>
                          ) : (
                            <>
                              <Mic className="w-3.5 h-3.5 text-slate-600" />
                              <span>Start Speaking</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={6}
                    value={candidateInput}
                    onChange={(e) => setCandidateInput(e.target.value)}
                    placeholder={
                      currentQuestion.type === 'behavioral'
                        ? 'Structure your answer using STAR: Situation (context), Task (objective), Action (specific steps you took), and Result (quantifiable outcome)...'
                        : currentQuestion.type === 'project'
                        ? 'Explain your project: Problem context -> Architecture & tools -> Concrete technical challenge -> Measurable result...'
                        : 'Explain the core concept, implementation details, concrete example, and scale/performance trade-offs...'
                    }
                    className="w-full text-xs sm:text-sm font-normal p-4 rounded-xl border border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none leading-relaxed text-slate-800"
                  />

                  {/* Action Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGetHint}
                        disabled={isLoadingHint || Boolean(activeHint)}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span>{isLoadingHint ? 'Fetching Hint...' : activeHint ? 'Hint Shown' : 'Get Hint'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSkipQuestion}
                        className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5 text-slate-400" />
                        <span>Skip Question</span>
                      </button>
                    </div>

                    <button
                      id="submit-interview-answer-btn"
                      onClick={handleSubmitAnswer}
                      disabled={isEvaluating || !candidateInput.trim()}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isEvaluating ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Interviewer Evaluating Answer...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Submit Answer</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* =========================================================
                  SUB-STATE B: TURN FEEDBACK & DYNAMIC FOLLOW-UP
                 ========================================================= */}
              {interviewState === 'turn_feedback' && currentEvaluation && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Your Answer Recap */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Your Response
                    </span>
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
                      "{candidateInput}"
                    </p>
                  </div>

                  {/* AI Evaluation Card */}
                  <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                      <div className="flex items-center gap-2">
                        <Award className="w-5 h-5 text-indigo-600" />
                        <h4 className="text-sm font-bold text-indigo-950">AI Answer Evaluation</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-medium">
                          AI-estimated practice feedback
                        </span>
                        <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-0.5 rounded-lg">
                          {currentEvaluation.score} / 100
                        </span>
                      </div>
                    </div>

                    {/* Feedback summary */}
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {currentEvaluation.feedback}
                    </p>

                    {/* Strengths & Improvement Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Strengths */}
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs space-y-1.5">
                        <span className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          What you did well
                        </span>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          {currentEvaluation.strengths.map((s, i) => (
                            <li key={i} className="leading-snug">{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Improvement */}
                      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-100 text-xs space-y-1.5">
                        <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                          What could improve
                        </span>
                        <ul className="space-y-1 text-slate-600 list-disc list-inside">
                          {currentEvaluation.improvementAreas.map((imp, i) => (
                            <li key={i} className="leading-snug">{imp}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Suggested Answer Structure */}
                    {currentEvaluation.suggestedAnswerStructure && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                        <span className="font-bold text-slate-800 block text-[11px]">
                          Suggested Answer Structure:
                        </span>
                        <p className="text-slate-600 leading-relaxed font-mono text-[11px]">
                          {currentEvaluation.suggestedAnswerStructure}
                        </p>
                      </div>
                    )}

                    {/* Follow-up question if generated */}
                    {activeFollowUpQuestion && !followUpSubmitted && (
                      <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 border-2 border-indigo-200 space-y-3">
                        <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
                          <Bot className="w-4 h-4 text-indigo-600" />
                          <span>Interviewer Follow-up:</span>
                        </div>
                        <p className="text-xs text-slate-900 font-semibold leading-relaxed">
                          "{activeFollowUpQuestion}"
                        </p>
                        <textarea
                          rows={3}
                          value={followUpAnswer}
                          onChange={(e) => setFollowUpAnswer(e.target.value)}
                          placeholder="Provide your follow-up answer or clarify your technical reasoning..."
                          className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:border-indigo-600 outline-none text-slate-800"
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">
                            Optional follow-up to strengthen your score.
                          </span>
                          <button
                            type="button"
                            onClick={handleSubmitFollowUp}
                            disabled={isSubmittingFollowUp || !followUpAnswer.trim()}
                            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                          >
                            {isSubmittingFollowUp ? 'Evaluating Follow-up...' : 'Submit Follow-up'}
                          </button>
                        </div>
                      </div>
                    )}

                    {followUpSubmitted && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Follow-up response recorded and factored into your session report!</span>
                      </div>
                    )}

                    {/* Advance Button */}
                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => advanceToNextQuestion()}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                      >
                        <span>
                          {currentQuestionIndex + 1 < (activePlan?.questions.length || 5)
                            ? 'Next Question'
                            : 'View Comprehensive Report'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STATE 3: INTERVIEW COMPLETE & COMPREHENSIVE REPORT */}
          {interviewState === 'completed' && completedInterview && (
            <div className="space-y-6 animate-fadeIn">
              {/* Completion Banner */}
              <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 lg:p-8 text-white shadow-sm border border-indigo-950 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-xs mb-2 border border-white/10">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    <span>Interview Complete 🎉</span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-white">
                    {completedInterview.targetRole} Interview Complete
                  </h2>
                  <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                    Here is your complete AI performance diagnostic. Scores are calculated from observable rubric points across your responses.
                  </p>
                </div>

                {/* Score badge */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center gap-4 text-center shrink-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-200 block">Practice Score</span>
                    <span className="text-4xl font-black text-white">{completedInterview.overallScore}%</span>
                  </div>
                  <div className="h-10 w-px bg-white/20" />
                  <div className="text-left text-xs space-y-0.5 text-indigo-200">
                    <div>Questions: <strong className="text-white">{completedInterview.questions.length}</strong></div>
                    <div>Answered: <strong className="text-white">{completedInterview.attempts.filter((a) => a.status === 'answered').length}</strong></div>
                    <div>Skipped: <strong className="text-white">{completedInterview.attempts.filter((a) => a.status === 'skipped').length}</strong></div>
                  </div>
                </div>
              </div>

              {/* Main Report Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (2 Cols): Score Breakdown, Strengths, Weak Areas, Prep Plan */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Category Score Breakdown */}
                  {completedInterview.scoreBreakdown && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        Performance Score Breakdown
                      </h3>
                      <p className="text-xs text-slate-500">
                        Category metrics calculated from your actual interview evaluations (relevant to {interviewType} mode).
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {completedInterview.scoreBreakdown.technical !== undefined && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-700">Technical Knowledge</span>
                              <span className="font-extrabold text-indigo-700">{completedInterview.scoreBreakdown.technical}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${completedInterview.scoreBreakdown.technical}%` }} />
                            </div>
                          </div>
                        )}

                        {completedInterview.scoreBreakdown.communication !== undefined && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-700">Communication & Clarity</span>
                              <span className="font-extrabold text-blue-700">{completedInterview.scoreBreakdown.communication}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${completedInterview.scoreBreakdown.communication}%` }} />
                            </div>
                          </div>
                        )}

                        {completedInterview.scoreBreakdown.project !== undefined && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-700">Project Explanation</span>
                              <span className="font-extrabold text-emerald-700">{completedInterview.scoreBreakdown.project}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${completedInterview.scoreBreakdown.project}%` }} />
                            </div>
                          </div>
                        )}

                        {completedInterview.scoreBreakdown.behavioral !== undefined && (
                          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-700">Behavioral Responses</span>
                              <span className="font-extrabold text-purple-700">{completedInterview.scoreBreakdown.behavioral}%</span>
                            </div>
                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${completedInterview.scoreBreakdown.behavioral}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Areas to Improve */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Observed Strengths
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {completedInterview.strengths?.map((st, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Areas to Improve */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
                      <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Priority Areas to Improve
                      </span>
                      <ul className="space-y-2 text-xs text-slate-700">
                        {completedInterview.areasToImprove?.map((imp, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Weak Area Detection */}
                  {weakAreaAnalysis && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Target className="w-4 h-4 text-rose-600" />
                            Weak Area Detection & Skill Mapping
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Synthesized from skipped questions, missing points, and rubric deficiencies.
                          </p>
                        </div>
                        <button
                          onClick={() => onNavigate('practice')}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                        >
                          <span>Practice These Weak Areas</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                          <span className="text-[10px] uppercase font-bold text-emerald-800 block mb-1">Strong Areas</span>
                          <div className="space-y-1 text-slate-700 font-medium">
                            {weakAreaAnalysis.strongAreas.map((s, i) => (
                              <div key={i} className="leading-snug">• {s}</div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <span className="text-[10px] uppercase font-bold text-amber-800 block mb-1">Developing</span>
                          <div className="space-y-1 text-slate-700 font-medium">
                            {weakAreaAnalysis.developingAreas.map((d, i) => (
                              <div key={i} className="leading-snug">• {d}</div>
                            ))}
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                          <span className="text-[10px] uppercase font-bold text-rose-800 block mb-1">Needs Practice</span>
                          <div className="space-y-1 text-slate-700 font-medium">
                            {weakAreaAnalysis.needsPractice.map((n, i) => (
                              <div key={i} className="leading-snug">• {n}</div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5-Day Interview Preparation Sprint */}
                  {prepPlan && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-indigo-600" />
                            5-Day Personalized Interview Preparation Plan
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Targeted daily sprint aligned with your observed gaps and Learning Path.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        {prepPlan.days.map((dayItem) => (
                          <div
                            key={dayItem.day}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-start gap-3 text-xs"
                          >
                            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                              D{dayItem.day}
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900">{dayItem.focus}</span>
                                {dayItem.relatedSkill && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                                    {dayItem.relatedSkill}
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-600 mt-0.5 text-[11px] leading-relaxed">
                                {dayItem.description}
                              </p>
                              <div className="mt-1.5 text-[11px] font-semibold text-slate-800 bg-white p-2 rounded border border-slate-200">
                                💡 Action: {dayItem.suggestedAction}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {prepPlan.keyAdvice && (
                        <div className="p-3 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 font-medium">
                          ⭐ <strong>Golden Interview Rule:</strong> {prepPlan.keyAdvice}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column (1 Col): Interactive AI Interview Coach Chat */}
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col h-[640px]">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                        Ask AI Interview Coach
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Get personalized feedback on any answer, question, or technique from this interview.
                      </p>
                    </div>

                    {/* Quick Suggestion Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Why was my answer weak?',
                        'How to answer "Tell me about yourself"?',
                        'Help me explain my project',
                        'Give me another SQL question',
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => handleSendCoachMessage(chip)}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-md border border-slate-200 transition-colors text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
                      {coachMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex items-start gap-2 ${
                            msg.sender === 'user' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {msg.sender === 'coach' && (
                            <div className="w-6 h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div
                            className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                              msg.sender === 'user'
                                ? 'bg-indigo-600 text-white rounded-br-none'
                                : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-bl-none'
                            }`}
                          >
                            <p className="whitespace-pre-line text-[11px]">{msg.text}</p>
                            <span
                              className={`text-[9px] block mt-1 ${
                                msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                              }`}
                            >
                              {msg.timestamp}
                            </span>
                          </div>
                        </div>
                      ))}

                      {isCoachThinking && (
                        <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                          <Bot className="w-4 h-4 animate-spin text-indigo-600" />
                          <span>Coach is formulating advice...</span>
                        </div>
                      )}
                    </div>

                    {/* Input Field */}
                    <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                      <input
                        type="text"
                        value={coachInput}
                        onChange={(e) => setCoachInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendCoachMessage();
                        }}
                        placeholder="Ask how to improve an answer..."
                        className="flex-1 text-xs p-2.5 rounded-lg border border-slate-300 focus:border-indigo-600 outline-none text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendCoachMessage()}
                        disabled={isCoachThinking || !coachInput.trim()}
                        className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setInterviewState('config')}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Start Another Practice Session</span>
                    </button>
                    <button
                      onClick={() => onNavigate('learning_path')}
                      className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                    >
                      Return to Learning Path
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* =========================================================
          TAB 2: PRACTICE HISTORY & PROGRESS OVER TIME
         ========================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Header Progress Overview */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Your Interview Practice History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track actual score progression across completed mock interviews. Practice feedback reflects rubric scoring.
                </p>
              </div>

              {pastInterviews.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    Total Attempts: <strong>{pastInterviews.length}</strong>
                  </span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    Latest: {pastInterviews[0].overallScore}%
                  </span>
                </div>
              )}
            </div>

            {/* Score Progression Strip (Only real attempts) */}
            {pastInterviews.length > 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-slate-700">Progression:</span>
                {pastInterviews
                  .slice()
                  .reverse()
                  .map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-semibold flex items-center gap-1.5">
                        <span className="text-slate-400">Interview {idx + 1}:</span>
                        <strong className="text-indigo-700">{item.overallScore}%</strong>
                      </div>
                      {idx < pastInterviews.length - 1 && (
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </div>
                  ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200/60">
                No mock interviews recorded yet for your account. Start your first session to establish your baseline!
              </div>
            )}
          </div>

          {/* Past Interview Cards List */}
          {pastInterviews.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
                Completed Sessions ({pastInterviews.length})
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastInterviews.map((session) => (
                  <div
                    key={session.id}
                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 hover:border-indigo-300 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">
                        {session.targetRole} • {session.interviewType.toUpperCase()}
                      </span>
                      <span className="text-sm font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-lg">
                        {session.overallScore}%
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(session.completedAt || session.startedAt).toLocaleDateString()}
                      </span>
                      <span>•</span>
                      <span>{session.questionCount} Questions</span>
                      <span>•</span>
                      <span className="capitalize">{session.difficulty}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/70 text-xs text-slate-600">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Main Improvement Focus:
                      </span>
                      <p className="mt-0.5 truncate">{session.areasToImprove?.[0] || 'Technical metrics quantification'}</p>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedPastInterview(session);
                      }}
                      className="w-full py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <span>View Full Questions & Feedback</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Selected Past Interview Modal / Drawer */}
          {selectedPastInterview && (
            <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4 shadow-xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedPastInterview.targetRole} ({selectedPastInterview.interviewType})
                    </h3>
                    <span className="text-xs text-slate-500">
                      Completed on {new Date(selectedPastInterview.completedAt || '').toLocaleDateString()} • Score: {selectedPastInterview.overallScore}%
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedPastInterview(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-bold text-slate-800 block">Interview Transcript & Evaluations</span>
                  {selectedPastInterview.attempts.map((att, idx) => (
                    <div key={att.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                      <span className="font-bold text-indigo-900 block">
                        Q{idx + 1}: {att.question}
                      </span>
                      <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                        {att.answer || '<Skipped>'}
                      </p>
                      {att.evaluation && (
                        <div className="text-[11px] text-slate-600 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
                          <strong>AI Score:</strong> {att.evaluation.score}% • <strong>Feedback:</strong> {att.evaluation.feedback}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => setSelectedPastInterview(null)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Close Transcript
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
