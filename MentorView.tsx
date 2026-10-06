import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RotateCcw,
  Zap,
  Lightbulb,
  Compass,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  TrendingUp,
  Target,
  Code,
  Briefcase,
  MessageSquare,
  Video,
} from 'lucide-react';
import {
  LearnerProfile,
  ChatMessage,
  MockInterview,
  LearningPath,
  SkillGapAnalysis,
  MentorStructuredResponse,
} from '../types';
import { AIOrchestrator, AGENT_REGISTRY } from '../services/aiOrchestrator';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface MentorViewProps {
  learnerProfile: LearnerProfile;
  onNavigate: (view: string) => void;
  learningPath?: LearningPath | null;
  skillGapAnalysis?: SkillGapAnalysis | null;
}

export const MentorView: React.FC<MentorViewProps> = ({
  learnerProfile,
  onNavigate,
  learningPath,
  skillGapAnalysis,
}) => {
  const { userId } = useAuth();
  const effectiveUserId = userId || 'user_demo';

  // Build real unified context
  const mentorContext = AIOrchestrator.buildMentorContext(
    effectiveUserId,
    learnerProfile,
    learningPath,
    skillGapAnalysis
  );

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-init',
      sender: 'ai',
      text: `Hello ${learnerProfile.name}! I am your personal EduPath AI Career Mentor, orchestrating guidance across your full learning journey toward becoming a ${learnerProfile.targetRole}.\n\nI am continuously monitoring your verified strengths (${mentorContext.strengths[0]?.skill || 'Core Analytics'}), high-priority gaps (${mentorContext.weakAreas[0]?.skill || 'SQL Window Functions'}), and your ${mentorContext.learningStreak}-day learning momentum. How can I guide you today?`,
      timestamp: 'Just now',
      structuredResponse: {
        answer: `I am actively tracking your roadmap toward ${learnerProfile.targetRole}. Your learning velocity is currently ${mentorContext.learningLoad.load} (${mentorContext.learningLoad.plannedHours}h planned).`,
        why: `Continuous multi-agent monitoring ensures your daily effort focuses on the skills most heavily tested in interviews.`,
        evidence: [
          `Target Role: ${learnerProfile.targetRole}`,
          `Active Streak: ${mentorContext.learningStreak} days`,
          `Current Phase: Week ${mentorContext.currentWeek}`,
        ],
        nextStep: `Ask me what to learn today, request a quick time-based sprint, or jump directly into your next best move.`,
        actionButton: {
          label: `Start Today's Focus`,
          targetView: mentorContext.nextBestAction?.targetView || 'practice',
        },
      },
      agentsConsulted: ['agent_mentor', 'agent_progress', 'agent_learning_path'],
    },
  ]);

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAgentLabel, setActiveAgentLabel] = useState<string>('Orchestrating AI Agents...');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedPrompts = [
    'What should I learn today?',
    'What should I practice next?',
    'Why did my learning path change?',
    'What are my biggest skill gaps?',
    'What skill am I improving fastest?',
    'What project should I build next?',
    'How should I improve my communication?',
    'Am I ready to attempt a mock interview?',
    'Give me a 30-minute learning plan.',
    'Give me a 1-hour learning plan.',
  ];

  const timeSprints = [
    { label: '⚡ 15m Quick Drill', query: 'I have 15 minutes today. Give me a 15-minute learning plan.' },
    { label: '⏱️ 30m Practice Sprint', query: 'I have 30 minutes today. Give me a 30-minute learning plan.' },
    { label: '🎯 1h Deep Dive', query: 'I have 1 hour today. Give me a 1-hour learning plan.' },
    { label: '🚀 2h Capstone Milestone', query: 'I have 2 hours today. What milestone should I build?' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    const intentResult = AIOrchestrator.classifyUserIntent(text);
    const agentDef = Object.values(AGENT_REGISTRY).find((a) => a.id === intentResult.intent) || AGENT_REGISTRY.mentorAgent;
    setActiveAgentLabel(`Consulting ${agentDef.shortName} & Evidence Engine...`);

    try {
      const history = messages.map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text,
      }));

      const res = await AIOrchestrator.routeAIRequest(text, mentorContext, history);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.mentorResponse.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        structuredResponse: res.mentorResponse,
        actionButton: res.mentorResponse.actionButton,
        agentsConsulted: res.mentorResponse.agentsConsulted,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Mentor error:', err);
      const fallbackResponse = AIOrchestrator.getNextBestAction(mentorContext);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: `For your ${mentorContext.targetRole} journey, continuing your practice with ${mentorContext.weakAreas[0]?.skill || 'core skills'} will deliver the highest immediate return on investment.`,
          timestamp: 'Just now',
          structuredResponse: {
            answer: `I recommend moving directly to hands-on practice in ${mentorContext.weakAreas[0]?.skill || 'SQL'}.`,
            why: `Consistent active recall and query writing solidifies key concepts before you advance to comprehensive capstone projects.`,
            evidence: [
              `Target Role: ${mentorContext.targetRole}`,
              `Active Streak: ${mentorContext.learningStreak} days`,
            ],
            nextStep: `Launch the recommended practice sandbox to complete today's goal.`,
            actionButton: {
              label: `Start ${fallbackResponse.skill} Practice`,
              targetView: fallbackResponse.targetView,
            },
          },
          actionButton: {
            label: `Start ${fallbackResponse.skill} Practice`,
            targetView: fallbackResponse.targetView,
          },
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `m-init-${Date.now()}`,
        sender: 'ai',
        text: `Conversation reset. I am ready to guide your ${learnerProfile.targetRole} journey with fresh evidence!`,
        timestamp: 'Just now',
      },
    ]);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-3 max-w-5xl mx-auto w-full">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">AI Career Mentor</h2>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                12 Agents Orchestrated
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Ground truth: {learnerProfile.targetRole}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600">{mentorContext.learningStreak}-day streak</span>
              <span>•</span>
              <span>Load: {mentorContext.learningLoad.load}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleClearHistory}
            className="text-xs text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Time-Aware Quick Sprints */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 pl-1">
          Time-Aware:
        </span>
        {timeSprints.map((sprint, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(sprint.query)}
            disabled={isLoading}
            className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 shadow-2xs whitespace-nowrap transition-all flex items-center gap-1"
          >
            <span>{sprint.label}</span>
          </button>
        ))}
      </div>

      {/* Suggested Questions Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {suggestedPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={isLoading}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-800 border border-slate-200 hover:border-indigo-300 shadow-2xs whitespace-nowrap transition-all flex items-center gap-1.5"
          >
            <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
            <span>{prompt}</span>
          </button>
        ))}
      </div>

      {/* Chat Messages Window */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          const structured = msg.structuredResponse as MentorStructuredResponse | undefined;

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-xs shadow-xs ${
                  isAi ? 'bg-gradient-to-tr from-indigo-600 to-blue-600' : 'bg-slate-800'
                }`}
              >
                {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs space-y-3 ${
                  isAi
                    ? 'bg-slate-50 text-slate-800 border border-slate-200/80'
                    : 'bg-indigo-600 text-white font-medium'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[10px] opacity-70">
                  <span className="font-bold">{isAi ? 'EduPath AI Mentor' : learnerProfile.name}</span>
                  <span>{msg.timestamp}</span>
                </div>

                {/* Structured Output Presentation */}
                {isAi && structured ? (
                  <div className="space-y-3">
                    {/* Primary Answer */}
                    <div className="text-slate-900 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-wrap">
                      {structured.answer || msg.text}
                    </div>

                    {/* Rationale & Why */}
                    {structured.why && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                        <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Why this recommendation:</span>
                        </div>
                        <p className="text-[11px] text-indigo-950 leading-normal">
                          {structured.why}
                        </p>
                      </div>
                    )}

                    {/* Grounded Evidence References */}
                    {structured.evidence && (
                      <div className="p-3 bg-white border border-slate-200/80 rounded-xl space-y-1.5">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Telemetry Evidence Grounding:</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(structured.evidence) ? (
                            structured.evidence.map((ev, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                              >
                                {ev}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-600">{structured.evidence}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recommended Next Step & Action Button */}
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200/60">
                      <div className="text-[11px] text-slate-700">
                        <strong className="text-slate-900 font-semibold">Next Step: </strong>
                        {structured.nextStep}
                      </div>

                      {structured.actionButton && (
                        <button
                          onClick={() => onNavigate(structured.actionButton!.targetView)}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-auto"
                        >
                          <span>{structured.actionButton.label}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Agents Consulted Footer Tag */}
                    {msg.agentsConsulted && msg.agentsConsulted.length > 0 && (
                      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400">
                        <Layers className="w-3 h-3 text-slate-400" />
                        <span>Agents Consulted: </span>
                        <span className="font-medium text-slate-600">
                          {msg.agentsConsulted
                            .map((id) => AGENT_REGISTRY[id]?.shortName || id)
                            .join(' • ')}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-100" />
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-bounce delay-200" />
              <span className="font-semibold text-[11px] text-indigo-800 ml-1">
                {activeAgentLabel}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 sm:p-3 shadow-xs flex items-center gap-2">
        <textarea
          rows={1}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="Ask your mentor anything (e.g., 'What should I learn today?', 'I have 30 minutes', 'Am I ready for interviews?')..."
          className="flex-1 text-xs px-3 py-2 rounded-lg outline-none resize-none border-0 text-slate-800 placeholder:text-slate-400"
        />

        <button
          id="send-mentor-message-btn"
          onClick={() => handleSendMessage()}
          disabled={isLoading || !inputValue.trim()}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
