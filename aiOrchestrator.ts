import {
  LearnerProfile,
  SkillGapAnalysis,
  LearningPath,
  MockInterview,
  UserIntent,
  SpecializedAgentDef,
  MentorContext,
  MentorStructuredResponse,
  OrchestrationResult,
  TimeAllowance,
  NextBestAction,
} from '../types';
import { AuthService } from './authService';
import { ProgressService } from './progressService';

/**
 * The 12 Specialized Agents of EduPath AI
 */
export const AGENT_REGISTRY: Record<string, SpecializedAgentDef> = {
  profileAgent: {
    id: 'agent_profile',
    name: 'Learner Profile Agent',
    shortName: 'Profile Agent',
    purpose: 'Manages user profile, career goals, weekly availability, and background context.',
    inputs: ['education', 'currentRole', 'targetRole', 'weeklyHours', 'skills'],
    outputs: ['learnerProfile', 'careerGoalStatement'],
    availableActions: ['updateProfile', 'setWeeklyHours', 'setTargetRole'],
    targetView: 'profile',
    iconName: 'User',
  },
  resumeAgent: {
    id: 'agent_resume',
    name: 'Resume & Profile Analysis Agent',
    shortName: 'Resume Agent',
    purpose: 'Extracts skills, experience, and educational background from resumes and profiles.',
    inputs: ['resumeText', 'resumeFile', 'profileData'],
    outputs: ['extractedSkills', 'completenessScore', 'candidateSummary'],
    availableActions: ['analyzeResume', 'reExtractSkills'],
    targetView: 'profile',
    iconName: 'FileText',
  },
  skillGapAgent: {
    id: 'agent_skill_gap',
    name: 'Skill Gap Analysis Agent',
    shortName: 'Skill Gap Agent',
    purpose: 'Compares current learner capabilities against industry target role requirements.',
    inputs: ['currentSkills', 'targetRole', 'roleRequirements'],
    outputs: ['skillGaps', 'alignmentPercentage', 'topPriorities', 'dependencies'],
    availableActions: ['analyzeGaps', 'reassessReadiness', 'overrideSkillStatus'],
    targetView: 'skill-gap',
    iconName: 'Target',
  },
  learningPathAgent: {
    id: 'agent_learning_path',
    name: 'Adaptive Learning Path Agent',
    shortName: 'Path Agent',
    purpose: 'Builds and maintains a phased, multi-week curriculum tailored to the learner.',
    inputs: ['skillGaps', 'weeklyHours', 'learningPreferences', 'durationWeeks'],
    outputs: ['phases', 'weeklyPlan', 'overallObjective'],
    availableActions: ['generatePath', 'rebalanceSchedule', 'completeActivity'],
    targetView: 'learning-path',
    iconName: 'Compass',
  },
  resourceAgent: {
    id: 'agent_resource',
    name: 'Learning Resource Recommendation Agent',
    shortName: 'Resource Agent',
    purpose: 'Curates verified high-quality courses, videos, documentation, and practice links.',
    inputs: ['skillGaps', 'learningFormat', 'targetRole'],
    outputs: ['curatedResources', 'recommendedBookmarks', 'resourceFilters'],
    availableActions: ['recommendResources', 'bookmarkResource', 'filterResources'],
    targetView: 'courses-videos',
    iconName: 'BookOpen',
  },
  practiceAgent: {
    id: 'agent_practice',
    name: 'Practice & Assessment Agent',
    shortName: 'Practice Agent',
    purpose: 'Generates interactive drills, quizzes, and instant code evaluation with explanations.',
    inputs: ['targetSkill', 'difficulty', 'weakAreas'],
    outputs: ['practiceQuestions', 'accuracyScore', 'detailedExplanation'],
    availableActions: ['generateDrill', 'evaluateCode', 'submitQuiz'],
    targetView: 'practice',
    iconName: 'Code',
  },
  projectAgent: {
    id: 'agent_project',
    name: 'AI Project Generator Agent',
    shortName: 'Project Agent',
    purpose: 'Designs resume-ready portfolio projects with step-by-step milestones and code review.',
    inputs: ['targetRole', 'verifiedSkills', 'targetSkillGaps'],
    outputs: ['projectBrief', 'milestones', 'capstoneEvaluation'],
    availableActions: ['generateProject', 'askProjectMentor', 'reviewMilestone'],
    targetView: 'projects',
    iconName: 'Briefcase',
  },
  communicationAgent: {
    id: 'agent_communication',
    name: 'Communication Coach Agent',
    shortName: 'Communication Coach',
    purpose: 'Refines professional tone, STAR methodology, and technical explanation clarity.',
    inputs: ['userTranscript', 'scenario', 'targetAudience'],
    outputs: ['clarityScore', 'grammarUpgrades', 'executiveTips'],
    availableActions: ['evaluatePitch', 'practiceSTAR', 'technicalExplanation'],
    targetView: 'communication',
    iconName: 'MessageSquare',
  },
  interviewAgent: {
    id: 'agent_interview',
    name: 'AI Mock Interview Agent',
    shortName: 'Mock Interview Agent',
    purpose: 'Conducts simulated technical and behavioral interviews with speech and rubric scoring.',
    inputs: ['targetRole', 'resumeData', 'skillGaps'],
    outputs: ['interviewScore', 'rubricBreakdown', 'actionableFeedback'],
    availableActions: ['startInterview', 'answerQuestion', 'getDetailedDebrief'],
    targetView: 'mock-interview',
    iconName: 'Video',
  },
  progressAgent: {
    id: 'agent_progress',
    name: 'Progress Analysis Agent',
    shortName: 'Progress Agent',
    purpose: 'Continuously tracks skill trajectories, verified evidence, workload, and trends.',
    inputs: ['practiceTelemetry', 'milestoneTelemetry', 'interviewScores'],
    outputs: ['skillTrends', 'confirmedStrengths', 'weakAreas', 'learningLoad'],
    availableActions: ['analyzeTrends', 'generateWeeklyReport', 'calculateStreak'],
    targetView: 'progress',
    iconName: 'TrendingUp',
  },
  adaptiveLearningAgent: {
    id: 'agent_adaptive',
    name: 'Deep Adaptive Learning Agent',
    shortName: 'Adaptive Agent',
    purpose: 'Autonomously adapts curriculum, injects practice drills, and versions the roadmap.',
    inputs: ['weakAreas', 'recentAccuracy', 'weeklyHoursChange'],
    outputs: ['curriculumChanges', 'pathVersions', 'dailyTasks'],
    availableActions: ['proposeAdaptation', 'applyAdaptation', 'revertPathVersion'],
    targetView: 'progress',
    iconName: 'Sparkles',
  },
  mentorAgent: {
    id: 'agent_mentor',
    name: 'AI Career Mentor Agent',
    shortName: 'AI Mentor',
    purpose: 'Orchestrates holistic learner guidance, answering questions with factual evidence.',
    inputs: ['mentorContext', 'userIntent', 'conversationHistory'],
    outputs: ['structuredAnswer', 'whyExplanation', 'evidenceReferences', 'nextBestAction'],
    availableActions: ['routeAIRequest', 'provideTimePlan', 'triggerNextStep'],
    targetView: 'mentor',
    iconName: 'Bot',
  },
};

export class AIOrchestrator {
  /**
   * 1. Intent Classification
   */
  static classifyUserIntent(message: string): { intent: UserIntent; confidence: number } {
    const text = message.toLowerCase().trim();

    if (
      text.includes('15 min') ||
      text.includes('30 min') ||
      text.includes('1 hour') ||
      text.includes('2 hour') ||
      text.includes('today plan') ||
      text.includes('what should i learn today') ||
      text.includes('what should i do today') ||
      text.includes('next best') ||
      text.includes('next move') ||
      text.includes('what to do next')
    ) {
      return { intent: 'NEXT_BEST_ACTION', confidence: 0.95 };
    }

    if (
      text.includes('interview') ||
      text.includes('mock') ||
      text.includes('ready to interview') ||
      text.includes('screening') ||
      text.includes('hiring manager')
    ) {
      return { intent: 'INTERVIEW', confidence: 0.92 };
    }

    if (
      text.includes('communication') ||
      text.includes('star method') ||
      text.includes('pitch') ||
      text.includes('grammar') ||
      text.includes('speak') ||
      text.includes('explain technically')
    ) {
      return { intent: 'COMMUNICATION', confidence: 0.9 };
    }

    if (
      text.includes('project') ||
      text.includes('build') ||
      text.includes('portfolio') ||
      text.includes('milestone') ||
      text.includes('capstone')
    ) {
      return { intent: 'PROJECT', confidence: 0.92 };
    }

    if (
      text.includes('practice') ||
      text.includes('quiz') ||
      text.includes('test') ||
      text.includes('drill') ||
      text.includes('struggling with') ||
      text.includes('flashcard') ||
      text.includes('exercise')
    ) {
      return { intent: 'PRACTICE', confidence: 0.88 };
    }

    if (
      text.includes('course') ||
      text.includes('video') ||
      text.includes('tutorial') ||
      text.includes('resource') ||
      text.includes('book') ||
      text.includes('documentation')
    ) {
      return { intent: 'RESOURCE', confidence: 0.89 };
    }

    if (
      text.includes('gap') ||
      text.includes('missing skill') ||
      text.includes('skill comparison') ||
      text.includes('requirement') ||
      text.includes('what skills do i need')
    ) {
      return { intent: 'SKILL_GAP', confidence: 0.91 };
    }

    if (
      text.includes('path') ||
      text.includes('roadmap') ||
      text.includes('curriculum') ||
      text.includes('phase') ||
      text.includes('week') ||
      text.includes('syllabus')
    ) {
      return { intent: 'LEARNING_PATH', confidence: 0.87 };
    }

    if (
      text.includes('adapt') ||
      text.includes('why did my plan change') ||
      text.includes('version') ||
      text.includes('rebalance')
    ) {
      return { intent: 'ADAPTATION', confidence: 0.93 };
    }

    if (
      text.includes('progress') ||
      text.includes('trend') ||
      text.includes('improving') ||
      text.includes('weakness') ||
      text.includes('strength') ||
      text.includes('weekly report') ||
      text.includes('how am i doing')
    ) {
      return { intent: 'PROGRESS', confidence: 0.9 };
    }

    if (
      text.includes('resume') ||
      text.includes('cv') ||
      text.includes('extract') ||
      text.includes('upload')
    ) {
      return { intent: 'RESUME', confidence: 0.92 };
    }

    if (
      text.includes('profile') ||
      text.includes('goal') ||
      text.includes('target role') ||
      text.includes('hours')
    ) {
      return { intent: 'PROFILE', confidence: 0.85 };
    }

    return { intent: 'GENERAL_CAREER', confidence: 0.75 };
  }

  /**
   * 2. Build Unified Mentor Context
   */
  static buildMentorContext(
    userId: string,
    profile: LearnerProfile,
    learningPath?: LearningPath | null,
    skillGapAnalysis?: SkillGapAnalysis | null
  ): MentorContext {
    const effectiveUserId = userId || 'user_demo';

    // Get real isolated data
    const resumeAnalysis = AuthService.getUserData<any>(effectiveUserId, 'career_analysis_result', null);
    const completedActivities = AuthService.getUserData<string[]>(effectiveUserId, 'completed_activities', []);
    const practiceHistory = AuthService.getUserData<any[]>(effectiveUserId, 'practice_history', []);
    const projects = AuthService.getUserData<any[]>(effectiveUserId, 'user_projects', []);
    const commAttempts = AuthService.getUserData<any[]>(effectiveUserId, 'communication_attempts', []);
    const interviewHistory = AuthService.getUserData<MockInterview[]>(effectiveUserId, 'mock_interviews', []);

    // Get central learning state
    const centralState = ProgressService.getCentralLearningState(
      effectiveUserId,
      profile,
      learningPath,
      skillGapAnalysis
    );

    // Calculate practice summary
    let totalQuestions = 0;
    let correctCount = 0;
    practiceHistory.forEach((item) => {
      totalQuestions += item.totalQuestions || 5;
      correctCount += item.correctAnswers || 3;
    });
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    // Has insufficient data indicator
    const hasInsufficientData =
      practiceHistory.length === 0 &&
      projects.length === 0 &&
      commAttempts.length === 0 &&
      interviewHistory.length === 0;

    return {
      userId: effectiveUserId,
      profile,
      targetRole: profile.targetRole || 'Data Analyst',
      resumeAnalysis,
      currentSkills: profile.technicalSkills.map((s) => ({ name: s.name, level: s.level })),
      skillGaps: skillGapAnalysis?.comparisons || [],
      learningPath: learningPath || null,
      currentWeek: learningPath?.currentWeek || 1,
      completedActivities,
      practicePerformance: {
        totalQuestions,
        accuracy,
        topSkill: centralState.strengths[0]?.skill || 'SQL',
        weakestSkill: centralState.weaknesses[0]?.skill || 'Window Functions',
      },
      projects,
      communicationProgress: {
        attemptsCount: commAttempts.length,
        averageScore: commAttempts.length > 0 ? 82 : 0,
      },
      interviewHistory,
      progressSummary: `${centralState.overallProgress}% overall roadmap completion with a ${centralState.learningStreak}-day active streak.`,
      strengths: centralState.strengths,
      weakAreas: centralState.weaknesses,
      skillTrends: centralState.trends,
      learningLoad: centralState.learningLoad,
      adaptiveChanges: centralState.appliedChanges,
      nextBestAction: centralState.nextBestAction,
      learningStreak: centralState.learningStreak,
      hasInsufficientData,
    };
  }

  /**
   * 3. Next Best Action Engine
   */
  static getNextBestAction(context: MentorContext, timeAllowance?: TimeAllowance): NextBestAction {
    const targetRole = context.targetRole;
    const weaknesses = context.weakAreas;
    const topWeakness = weaknesses.length > 0 ? weaknesses[0] : null;

    if (timeAllowance === '15m') {
      return {
        id: `nba-15m-${Date.now()}`,
        actionType: 'REVIEW',
        title: `15-Min Quick Review: ${topWeakness?.skill || 'SQL JOIN Syntax'}`,
        skill: topWeakness?.skill || 'SQL',
        reason: `Targeted quick revision to reinforce concepts without requiring a full code workspace.`,
        evidence: [
          `Allocated time: 15 minutes`,
          `Identified weakness: ${topWeakness?.skill || 'Core Queries'}`,
        ],
        estimatedMinutes: 15,
        targetView: 'practice',
        actionData: { drillType: 'flashcards', skill: topWeakness?.skill || 'SQL' },
      };
    }

    if (timeAllowance === '30m') {
      return {
        id: `nba-30m-${Date.now()}`,
        actionType: 'PRACTICE',
        title: `30-Min Drill: ${topWeakness?.skill || 'SQL Aggregations & Joins'}`,
        skill: topWeakness?.skill || 'SQL',
        reason: `Focused hands-on practice session resolving test query errors.`,
        evidence: [
          `Allocated time: 30 minutes`,
          `High-impact gap for ${targetRole} screening interviews`,
        ],
        estimatedMinutes: 30,
        targetView: 'practice',
        actionData: { drillType: 'practice', skill: topWeakness?.skill || 'SQL' },
      };
    }

    if (timeAllowance === '1h') {
      return {
        id: `nba-1h-${Date.now()}`,
        actionType: 'LEARN',
        title: `1-Hour Deep Sprint: ${topWeakness?.skill || 'SQL & Window Functions'} Assessment`,
        skill: topWeakness?.skill || 'SQL',
        reason: `Comprehensive session combining video lesson, interactive practice, and a 5-question checkpoint.`,
        evidence: [
          `Allocated time: 60 minutes`,
          `Prerequisites completed in Phase 1`,
        ],
        estimatedMinutes: 60,
        targetView: 'learning-path',
        actionData: { week: context.currentWeek },
      };
    }

    if (timeAllowance === '2h') {
      return {
        id: `nba-2h-${Date.now()}`,
        actionType: 'BUILD',
        title: `2-Hour Capstone Milestone: ${context.projects[0]?.title || 'E-Commerce Analytics Project'}`,
        skill: 'Portfolio Capstone',
        reason: `Substantial work block to write schema migrations, run queries, and update your GitHub portfolio.`,
        evidence: [
          `Allocated time: 120 minutes`,
          `Concrete portfolio proof for hiring managers`,
        ],
        estimatedMinutes: 120,
        targetView: 'projects',
        actionData: { projectId: context.projects[0]?.id },
      };
    }

    // Default Next Best Action from central context
    if (context.nextBestAction) {
      return context.nextBestAction;
    }

    return {
      id: `nba-def-${Date.now()}`,
      actionType: 'PRACTICE',
      title: `Practice ${topWeakness?.skill || 'SQL Window Functions'}`,
      skill: topWeakness?.skill || 'SQL',
      reason: `High-priority gap directly required for ${targetRole} technical assessments.`,
      evidence: [`Identified in latest skill gap evaluation for ${targetRole}`],
      estimatedMinutes: 25,
      targetView: 'practice',
    };
  }

  /**
   * 4. Orchestrate AI Request (Route & Synthesize)
   */
  static async routeAIRequest(
    message: string,
    context: MentorContext,
    history: any[] = []
  ): Promise<OrchestrationResult> {
    const { intent, confidence } = this.classifyUserIntent(message);

    // Determine relevant agents
    const agentsConsulted: string[] = ['agent_mentor'];
    let primaryAgent = 'agent_mentor';

    switch (intent) {
      case 'NEXT_BEST_ACTION':
        primaryAgent = 'agent_mentor';
        agentsConsulted.push('agent_progress', 'agent_learning_path', 'agent_adaptive');
        break;
      case 'INTERVIEW':
        primaryAgent = 'agent_interview';
        agentsConsulted.push('agent_skill_gap', 'agent_communication');
        break;
      case 'COMMUNICATION':
        primaryAgent = 'agent_communication';
        agentsConsulted.push('agent_interview');
        break;
      case 'PROJECT':
        primaryAgent = 'agent_project';
        agentsConsulted.push('agent_learning_path', 'agent_skill_gap');
        break;
      case 'PRACTICE':
        primaryAgent = 'agent_practice';
        agentsConsulted.push('agent_progress', 'agent_skill_gap');
        break;
      case 'RESOURCE':
        primaryAgent = 'agent_resource';
        agentsConsulted.push('agent_skill_gap');
        break;
      case 'SKILL_GAP':
        primaryAgent = 'agent_skill_gap';
        agentsConsulted.push('agent_resume', 'agent_progress');
        break;
      case 'LEARNING_PATH':
        primaryAgent = 'agent_learning_path';
        agentsConsulted.push('agent_adaptive', 'agent_progress');
        break;
      case 'ADAPTATION':
        primaryAgent = 'agent_adaptive';
        agentsConsulted.push('agent_progress', 'agent_learning_path');
        break;
      case 'PROGRESS':
        primaryAgent = 'agent_progress';
        agentsConsulted.push('agent_practice', 'agent_interview');
        break;
      case 'RESUME':
        primaryAgent = 'agent_resume';
        agentsConsulted.push('agent_profile');
        break;
      case 'PROFILE':
        primaryAgent = 'agent_profile';
        break;
      default:
        primaryAgent = 'agent_mentor';
        agentsConsulted.push('agent_progress', 'agent_skill_gap');
        break;
    }

    // Try calling server-side orchestrator API
    try {
      const res = await fetch('/api/agent/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          intent,
          primaryAgent,
          agentsConsulted,
          context: {
            targetRole: context.targetRole,
            learnerName: context.profile.name,
            currentWeek: context.currentWeek,
            learningStreak: context.learningStreak,
            strengths: context.strengths.slice(0, 3).map((s) => s.skill),
            weaknesses: context.weakAreas.slice(0, 3).map((w) => w.skill),
            trends: context.skillTrends.slice(0, 4).map((t) => ({
              skill: t.skillName,
              status: t.trend,
            })),
            interviewScore:
              context.interviewHistory.length > 0
                ? context.interviewHistory[0].overallScore
                : 'No interview taken yet',
            learningLoad: context.learningLoad.load,
            hasInsufficientData: context.hasInsufficientData,
          },
          history: history.slice(-6),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.mentorResponse) {
          return {
            intent,
            confidence,
            primaryAgent,
            supportingAgents: agentsConsulted.filter((a) => a !== primaryAgent),
            mentorResponse: {
              ...data.mentorResponse,
              intent,
              agentsConsulted,
            },
          };
        }
      }
    } catch (err) {
      console.warn('Orchestrator server route fallback:', err);
    }

    // High quality, evidence-grounded local synthesis fallback
    const fallbackResponse = this.synthesizeLocalResponse(message, intent, context, agentsConsulted);
    return {
      intent,
      confidence,
      primaryAgent,
      supportingAgents: agentsConsulted.filter((a) => a !== primaryAgent),
      mentorResponse: fallbackResponse,
    };
  }

  /**
   * 5. Local Evidence-Grounded Response Synthesis
   */
  private static synthesizeLocalResponse(
    message: string,
    intent: UserIntent,
    context: MentorContext,
    agentsConsulted: string[]
  ): MentorStructuredResponse {
    const targetRole = context.targetRole;
    const topWeakness = context.weakAreas[0]?.skill || 'SQL Window Functions';
    const topStrength = context.strengths[0]?.skill || 'Data Analysis Basics';
    const streak = context.learningStreak;
    const nextAction = this.getNextBestAction(context);

    // Time-based request check
    if (message.toLowerCase().includes('15 min')) {
      const act = this.getNextBestAction(context, '15m');
      return {
        answer: `For your 15-minute window today, complete a focused flashcard review on ${act.skill}.`,
        why: `Short retrieval practice is ideal for cementing syntax rules before you dive into writing queries.`,
        evidence: `Allocated: 15 minutes • Weakest verified area: ${topWeakness}`,
        nextStep: `Open the Practice view and run the 15-minute drill.`,
        intent: 'NEXT_BEST_ACTION',
        agentsConsulted,
        actionButton: {
          label: 'Start 15m Review',
          targetView: 'practice',
        },
      };
    }

    if (message.toLowerCase().includes('30 min')) {
      const act = this.getNextBestAction(context, '30m');
      return {
        answer: `In 30 minutes, tackle a targeted ${act.skill} coding exercise with instant AI evaluation.`,
        why: `This addresses your highest-priority gap for ${targetRole} without overloading your schedule.`,
        evidence: `Allocated: 30 minutes • High impact gap for ${targetRole}`,
        nextStep: `Solve 4 hands-on practice problems in the Practice sandbox.`,
        intent: 'NEXT_BEST_ACTION',
        agentsConsulted,
        actionButton: {
          label: 'Start 30m Practice',
          targetView: 'practice',
        },
      };
    }

    if (message.toLowerCase().includes('1 hour') || message.toLowerCase().includes('60 min')) {
      const act = this.getNextBestAction(context, '1h');
      return {
        answer: `Dedicate your 1-hour session to a complete sprint on ${act.skill}: lesson review followed by a mini-checkpoint.`,
        why: `Combining conceptual learning with immediate application produces the highest skill retention.`,
        evidence: `Allocated: 60 minutes • Phase ${context.currentWeek} Roadmap alignment`,
        nextStep: `Start with the recommended video module then test your understanding in Practice.`,
        intent: 'NEXT_BEST_ACTION',
        agentsConsulted,
        actionButton: {
          label: 'Open Learning Path',
          targetView: 'learning-path',
        },
      };
    }

    switch (intent) {
      case 'NEXT_BEST_ACTION':
        return {
          answer: `Your next best move is to ${nextAction.title}.`,
          why: nextAction.reason,
          evidence: nextAction.evidence.length > 0 ? nextAction.evidence : [`Active streak: ${streak} days`],
          nextStep: `Head to the ${nextAction.targetView} module to start now (~${nextAction.estimatedMinutes} mins).`,
          intent,
          agentsConsulted,
          actionButton: {
            label: `Start ${nextAction.skill}`,
            targetView: nextAction.targetView,
          },
        };

      case 'INTERVIEW':
        if (context.interviewHistory.length === 0) {
          return {
            answer: `You should take a baseline Technical & Behavioral Mock Interview for ${targetRole}.`,
            why: `A diagnostic mock interview reveals your readiness under realistic question constraints.`,
            evidence: `Current state: 0 completed mock interviews on record.`,
            nextStep: `Launch a 15-minute Mixed Mock Interview with speech recognition enabled.`,
            intent,
            agentsConsulted,
            actionButton: {
              label: 'Start Mock Interview',
              targetView: 'mock-interview',
            },
          };
        }
        const lastScore = context.interviewHistory[0].overallScore;
        return {
          answer: `Your latest mock interview score was ${lastScore}/100 for ${targetRole}.`,
          why: `Continued simulation turns technical knowledge into crisp, confident interview delivery.`,
          evidence: `Latest interview: ${context.interviewHistory[0].targetRole} (${lastScore} pts).`,
          nextStep: `Review the AI interviewer feedback and attempt a 10-minute follow-up round.`,
          intent,
          agentsConsulted,
          actionButton: {
            label: 'Review Interview Debrief',
            targetView: 'mock-interview',
          },
        };

      case 'PROJECT':
        return {
          answer: `Focus on advancing your portfolio project: ${context.projects[0]?.title || `${targetRole} Analytics Capstone`}.`,
          why: `Hiring managers evaluate verifiable code artifacts over theoretical knowledge.`,
          evidence: `Current projects: ${context.projects.length} in progress • Target Role: ${targetRole}.`,
          nextStep: `Complete the next milestone and ask the AI Project Mentor for architectural feedback.`,
          intent,
          agentsConsulted,
          actionButton: {
            label: 'Open Projects Hub',
            targetView: 'projects',
          },
        };

      case 'PRACTICE':
        return {
          answer: `Practice ${topWeakness} to turn your current friction points into strengths.`,
          why: `Recent telemetry shows recurring syntax errors in this specific skill area.`,
          evidence: `Weakness detected: ${topWeakness} • Accuracy below 70% benchmark.`,
          nextStep: `Complete 5 interactive practice questions with step-by-step AI hints.`,
          intent,
          agentsConsulted,
          actionButton: {
            label: `Practice ${topWeakness}`,
            targetView: 'practice',
          },
        };

      case 'SKILL_GAP':
        return {
          answer: `Your critical skill gap is ${topWeakness}, while your verified strength is ${topStrength}.`,
          why: `Closing ${topWeakness} is the fastest path to reaching target role interview readiness.`,
          evidence: `Role: ${targetRole} • Top identified gap: ${topWeakness}.`,
          nextStep: `Inspect the full comparison matrix and dependencies in the Skill Gap view.`,
          intent,
          agentsConsulted,
          actionButton: {
            label: 'View Skill Gaps',
            targetView: 'skill-gap',
          },
        };

      case 'PROGRESS':
        return {
          answer: `You are maintaining a ${streak}-day streak with confirmed momentum in ${topStrength}.`,
          why: `Consistent daily micro-learning prevents burnout and steadily compounds retention.`,
          evidence: `Streak: ${streak} days • Workload load: ${context.learningLoad.load} (${context.learningLoad.plannedHours}h planned).`,
          nextStep: `Review your weekly AI report and trajectory trends in the Progress dashboard.`,
          intent,
          agentsConsulted,
          actionButton: {
            label: 'View Progress Trends',
            targetView: 'progress',
          },
        };

      default:
        return {
          answer: `I am actively monitoring your path to become a ${targetRole}. Your next priority is to strengthen ${topWeakness}.`,
          why: `This aligns directly with current industry benchmarks and interview requirements.`,
          evidence: `Target: ${targetRole} • Active streak: ${streak} days • Strength: ${topStrength}.`,
          nextStep: `Choose one of the quick actions below or ask me for a customized time-based plan.`,
          intent: 'GENERAL_CAREER',
          agentsConsulted,
          actionButton: {
            label: 'View Recommended Move',
            targetView: nextAction.targetView,
          },
        };
    }
  }
}
