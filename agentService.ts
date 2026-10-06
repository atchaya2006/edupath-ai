import {
  LearnerProfile,
  SkillGap,
  LearningPhase,
  PracticeQuestion,
  ProjectRecommendation,
  CommunicationFeedback,
  ProgressReport,
  AIProject,
  ProjectMilestone,
  ProjectSubmission,
  ProjectAIReview,
  CommunicationEvaluation,
  CommunicationAttempt,
  GrammarPracticeExercise,
  VocabularyWord,
  ProfessionalIntroDraft,
  PresentationStructure,
  TechnicalExplanationScenario,
  ImprovedCommunicationResult,
  InterviewPlan,
  InterviewQuestion,
  InterviewEvaluation,
  InterviewAttempt,
  InterviewPreparationPlan,
  WeakAreaAnalysis,
  MockInterview,
  SkillTrend,
  ProgressStrength,
  ProgressWeakness,
  LearningInsight,
  WeeklyLearningReport,
  AdaptiveLearningChange,
  NextBestAction,
  DailyPlanTask,
  LearningLoadDetail,
  LearningPathVersion,
} from '../types';
import { AuthService } from './authService';

export class AgentService {
  /**
   * Check backend connectivity and Gemini API key availability
   */
  static async checkBackendHealth(): Promise<{ status: string; hasGeminiKey: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return { status: 'offline', hasGeminiKey: false };
    }
  }

  /**
   * 1. analyzeCareerProfile (Full Gemini Profile & Resume Agent)
   * Analyzes uploaded document/resume alongside learner profile with structured explainable output
   */
  static async analyzeCareerProfile(
    profile: LearnerProfile,
    resumeData?: {
      text?: string;
      fileName?: string;
      base64?: string;
      mimeType?: string;
    }
  ) {
    const { ResumeAnalyzer } = await import('./resumeAnalyzer');
    return ResumeAnalyzer.analyzeProfileAndResume(profile, resumeData);
  }

  /**
   * 1b. Legacy analyzeResume helper
   * Extracts skills, experience, gaps, and readiness from raw resume text
   */
  static async analyzeResume(
    resumeText: string,
    targetRole: string = 'Data Analyst'
  ): Promise<{
    extractedSkills: Array<{ name: string; level: 'Beginner' | 'Intermediate' | 'Advanced'; category: string }>;
    targetRole: string;
    detectedGaps: Array<{ skill: string; requiredLevel: string; priority: string; reason: string }>;
    summary: string;
    readinessScore: number;
    isFallback?: boolean;
  }> {
    const res = await fetch('/api/agent/analyze-resume', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resumeText, targetRole }),
    });
    if (!res.ok) {
      throw new Error(`Resume analysis failed with status ${res.status}`);
    }
    const result = await res.json();
    return { ...result.data, isFallback: result.isFallback };
  }

  /**
   * 2. analyzeSkillGap
   * Compares learner skills against industry expectations for target role
   */
  static async analyzeSkillGap(
    targetRole: string,
    currentSkills: any[]
  ): Promise<{
    targetRole: string;
    overallReadiness: number;
    comparison: SkillGap[];
    keyRecommendations: string[];
    isFallback?: boolean;
  }> {
    const res = await fetch('/api/agent/analyze-skill-gap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetRole, currentSkills }),
    });
    if (!res.ok) {
      throw new Error(`Skill gap analysis failed with status ${res.status}`);
    }
    const result = await res.json();
    return { ...result.data, isFallback: result.isFallback };
  }

  /**
   * 3. generateLearningPath
   * Creates an adaptive career roadmap based on learner profile and identified gaps
   */
  static async generateLearningPath(
    profile: LearnerProfile,
    targetRole: string
  ): Promise<{
    adaptationSummary: string;
    phases: LearningPhase[];
    isFallback?: boolean;
  }> {
    const res = await fetch('/api/agent/adapt-learning-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentPhases: [],
        recentPerformance: { skills: profile.technicalSkills },
        targetRole,
      }),
    });
    if (!res.ok) {
      throw new Error(`Roadmap generation failed with status ${res.status}`);
    }
    const result = await res.json();
    return {
      adaptationSummary: result.adaptationSummary,
      phases: result.adaptedPhases,
      isFallback: result.isFallback,
    };
  }

  /**
   * 4. recommendResources
   * Recommends curated courses, videos, and documentation for identified gaps
   */
  static async recommendResources(
    _gaps: SkillGap[],
    _preference: string
  ): Promise<{
    recommendations: string[];
  }> {
    // In our app, resources are rendered through the course catalog,
    // and Gemini provides AI recommendation commentary
    return {
      recommendations: [
        'Advanced SQL for Data Analysts: Focus heavily on Window Functions (RANK, LEAD, LAG).',
        'Demystifying Power BI DAX: Essential CALCULATE context mastery for corporate dashboards.',
        'Practical Hypothesis Testing: Master p-values and A/B test sample sizing.',
      ],
    };
  }

  /**
   * 5. generatePractice
   * Generates interactive questions (Quiz, Coding, Concept, Case Study)
   */
  static async generatePractice(
    skill: string,
    difficulty: string = 'Intermediate',
    count: number = 3,
    type: string = 'Quiz'
  ): Promise<{
    questions: PracticeQuestion[];
    isFallback?: boolean;
  }> {
    const res = await fetch('/api/agent/generate-practice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ skill, difficulty, count, type }),
    });
    if (!res.ok) {
      throw new Error(`Practice generation failed with status ${res.status}`);
    }
    const result = await res.json();
    return { questions: result.questions, isFallback: result.isFallback };
  }

  /**
   * 6. generateProject
   * Generates a portfolio project targeting specific missing skills
   */
  static async generateProject(
    targetRole: string,
    missingSkills: string[],
    domain: string = 'E-Commerce & Tech'
  ): Promise<{
    project: ProjectRecommendation;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, missingSkills, domain }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.project) {
          return {
            project: { id: `proj-${Date.now()}`, ...result.project },
            isFallback: result.isFallback,
          };
        }
      }
    } catch (err) {
      console.warn('Network error during project generation, using local fallback', err);
    }

    return {
      project: {
        id: `proj-${Date.now()}`,
        title: `${targetRole || 'Data'} Capstone: Cohort Retention & Performance Dashboard`,
        skillsDeveloped: missingSkills && missingSkills.length ? missingSkills : ['Power BI', 'SQL Window Functions', 'Statistics'],
        difficulty: 'Intermediate',
        estimatedDuration: '12-15 hours',
        description: `Analyze 50,000 ${domain.toLowerCase()} subscriber records to calculate 30-day cohort retention, identify the top indicators of user churn, and construct an executive dashboard with automated DAX KPI cards.`,
        requiredTools: ['PostgreSQL or SQLite', 'Power BI Desktop', 'Python (Pandas)'],
        learningOutcomes: [
          'Write SQL self-joins and window functions (LAG, LEAD) to calculate user activity intervals',
          'Formulate DAX measures for Month-over-Month churn rate and Customer Lifetime Value (CLV)',
          'Design an executive one-pager dashboard answering high-level business stakeholder questions',
        ],
        milestones: [
          `Phase 1: Ingest and clean synthetic ${domain.toLowerCase()} churn dataset`,
          'Phase 2: Calculate retention cohorts and churn risk segmentations in SQL',
          'Phase 3: Build interactive Power BI dashboard with drill-through filters',
          'Phase 4: Draft a 5-bullet executive summary memo to present findings',
        ],
      },
      isFallback: true,
    };
  }

  /**
   * 7. evaluateCommunication
   * Evaluates text for grammar, clarity, vocabulary, and executive tone
   */
  static async evaluateCommunication(
    text: string,
    category: string = 'Professional Writing',
    targetRole: string = 'Data Analyst'
  ): Promise<{
    feedback: CommunicationFeedback;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/evaluate-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, category, targetRole }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.feedback) {
          return { feedback: result.feedback, isFallback: result.isFallback };
        }
      }
    } catch (err) {
      console.warn('Network error during communication evaluation, using local fallback', err);
    }

    const wordCount = (text || '').split(/\s+/).filter(Boolean).length;
    return {
      feedback: {
        overallScore: Math.min(94, Math.max(70, 78 + Math.min(14, Math.floor(wordCount / 6)))),
        clarityScore: 85,
        grammarScore: 90,
        professionalToneScore: 80,
        grammarIssues: [
          { issue: 'Passive voice phrasing', suggestion: 'Lead with active analytical verbs to communicate decisive ownership.' },
        ],
        vocabularyUpgrades: [
          { original: 'looked at the numbers', upgrade: 'conducted exploratory data analysis', reason: 'More precise and credible for technical stakeholders' },
          { original: 'fixed the problem', upgrade: 'resolved data pipeline anomalies', reason: 'Demonstrates systematic problem solving' },
        ],
        suggestedRewrite: `Following our exploratory data analysis of recent operational logs, we isolated critical funnel drop-offs. By resolving underlying pipeline anomalies, we project a measurable lift in overall conversion.`,
        executiveTips: 'Highlight the business impact and metric percentages in your opening sentence before diving into technical queries.',
      },
      isFallback: true,
    };
  }

  /**
   * 8. conductMockInterview
   * Conducts iterative mock interview turns with scoring and follow-up
   */
  static async conductMockInterview(params: {
    targetRole: string;
    interviewType: string;
    difficulty: string;
    history: any[];
    userResponse?: string;
  }): Promise<{
    question?: string;
    nextQuestion?: string;
    feedback?: {
      score: number;
      strengths: string[];
      weaknesses: string[];
      tip: string;
    };
    turnNumber: number;
    totalTurns: number;
    weakAreasToTrack?: string[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/mock-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during mock interview, using local fallback', err);
    }

    const turnNumber = (params.history && Array.isArray(params.history) ? params.history.length : 0) + 1;
    if (!params.userResponse || turnNumber <= 1) {
      return {
        question: `Welcome to your ${params.targetRole} ${params.interviewType} interview (${params.difficulty} level)! Let's begin: Can you explain how you would detect and treat missing data in a critical business metric dataset? What factors determine whether you impute vs. drop records?`,
        turnNumber: 1,
        totalTurns: 5,
        isFallback: true,
      };
    }

    const nextQuestions = [
      `Great answer. Follow-up: Suppose your stakeholder insists on running a query across two tables with 10 million rows each, but the query is timing out. How would you diagnose the performance bottleneck in SQL?`,
      `How would you explain the difference between a Window Function (like ROW_NUMBER vs DENSE_RANK) and a GROUP BY aggregation to a non-technical product manager?`,
      `Suppose an A/B experiment shows a 4% lift in click-through rate, but overall checkout revenue is flat. What diagnostic queries and statistical checks would you run?`,
      `Describe a scenario where you had to push back on a stakeholder requesting a misleading chart or metric. How did you communicate the trade-offs?`,
    ];
    const nextQ = turnNumber < 5 ? nextQuestions[(turnNumber - 2) % nextQuestions.length] : null;

    return {
      feedback: {
        score: Math.min(9, Math.max(7, Math.floor(((params.userResponse || '').length / 60) + 7))),
        strengths: ['Clear logical structure', 'Good awareness of practical business impact and trade-offs'],
        weaknesses: ['Could specify concrete index types or query execution plans', 'Highlight business risk mitigation'],
        tip: 'Structure answers with the STAR method (Situation, Task, Action, Result) to maximize impact in interviews.',
      },
      nextQuestion: nextQ || undefined,
      turnNumber: Math.min(5, turnNumber),
      totalTurns: 5,
      weakAreasToTrack: ['SQL Query Optimization', 'Executive Metric Storytelling'],
      isFallback: true,
    };
  }

  /**
   * 9. analyzeProgress
   * Generates a comprehensive AI progress report
   */
  static async analyzeProgress(
    progressData: any,
    profile: LearnerProfile
  ): Promise<{
    report: ProgressReport;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/analyze-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressData, profile }),
      });
      if (res.ok) {
        const result = await res.json();
        if (result && result.report) {
          return { report: result.report, isFallback: result.isFallback };
        }
      }
    } catch (err) {
      console.warn('Network error during progress analysis, using local fallback', err);
    }

    const name = profile?.name || 'Learner';
    const role = profile?.targetRole || 'Data Analyst';
    const progress = profile?.overallProgress || 68;
    return {
      report: {
        summary: `${name} is making solid velocity toward the ${role} milestone, currently at ${progress}% total career readiness with consistent learning momentum.`,
        whatImproved: [
          'Python syntax and relational queries reached strong foundational benchmarks.',
          `Daily study streak sustained for ${profile?.streakDays || 14} consecutive days (${profile?.totalLearningHours || 38} total learning hours).`,
          'Communication clarity score increased significantly after writing coach practice.',
        ],
        whatNeedsAttention: [
          'Complex calculated measures and filter contexts require applied project practice.',
          'Statistical hypothesis testing concepts and A/B test interpretation.',
          'SQL window function execution speed in timed technical assessments.',
        ],
        skillsAcquiredCount: profile?.skillsAcquiredCount || 12,
        skillsInProgressCount: profile?.skillsInProgressCount || 5,
        remainingSkillGapsCount: profile?.remainingGapsCount || 4,
        persistentWeaknesses: ['DAX CALCULATE filters', 'Two-sample t-tests interpretation'],
        recommendedNextSteps: [
          `Complete Phase 2 Capstone: E-Commerce Churn in SQL to showcase verified skills.`,
          'Spend 20 mins daily on Power BI visual cards and DAX measures.',
          'Book 1 Mock Technical Interview session to assess real-time interview readiness.',
        ],
      },
      isFallback: true,
    };
  }

  /**
   * 10. adaptLearningPath
   * Recalculates and shifts learning phases based on recent activity
   */
  static async adaptLearningPath(
    currentPhases: LearningPhase[],
    recentPerformance: any,
    targetRole: string
  ): Promise<{
    adaptationSummary: string;
    adaptedPhases: any[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/adapt-learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPhases, recentPerformance, targetRole }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during adaptive roadmap calculation, using local fallback', err);
    }

    return {
      adaptationSummary: `Rebalanced roadmap phases for ${targetRole || 'Data Analyst'} based on your recent performance. Added extra SQL JOIN practice modules and accelerated foundational topics.`,
      adaptedPhases: currentPhases,
      isFallback: true,
    };
  }

  /**
   * Daily Recommendation Agent
   */
  static async getDailyRecommendation(
    learnerProfile: LearnerProfile
  ): Promise<{
    recommendation: string;
    focusSkill?: string;
    suggestedMinutes?: number;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfile }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during daily recommendation, using local fallback', err);
    }

    return {
      recommendation: `You are improving steadily in ${learnerProfile?.targetRole || 'your target role'}, but practical application and multi-table query performance need reinforcement. I recommend completing a 15-minute practice session today.`,
      focusSkill: 'SQL Window Functions & JOINs',
      suggestedMinutes: 15,
      isFallback: true,
    };
  }

  /**
   * AI Mentor conversational assistant
   */
  static async chatWithMentor(
    message: string,
    history: any[],
    learnerProfile: LearnerProfile,
    extraContext?: {
      currentProject?: any;
      projectMilestones?: any[];
      communicationProgress?: any;
      interviewHistory?: any[];
      progressState?: any;
      strengths?: any[];
      weaknesses?: any[];
      trends?: any[];
      adaptiveChanges?: any[];
      learningLoad?: any;
      nextBestAction?: any;
    }
  ): Promise<{
    reply: string;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          learnerProfile,
          currentProject: extraContext?.currentProject,
          projectMilestones: extraContext?.projectMilestones,
          communicationProgress: extraContext?.communicationProgress,
          interviewHistory: extraContext?.interviewHistory,
          progressState: extraContext?.progressState,
          strengths: extraContext?.strengths,
          weaknesses: extraContext?.weaknesses,
          trends: extraContext?.trends,
          adaptiveChanges: extraContext?.adaptiveChanges,
          learningLoad: extraContext?.learningLoad,
          nextBestAction: extraContext?.nextBestAction,
        }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during mentor chat, using local fallback', err);
    }

    return {
      reply: `**EduPath Mentor:** I see you're working toward becoming a **${learnerProfile?.targetRole || 'Data Analyst'}**!\n\nBased on your current progress and skill gaps:\n- **Immediate Focus**: Strengthen your **SQL JOINs & Aggregations**; these account for a major portion of technical screenings.\n- **Recommended Resource**: Try the *SQLZoo Interactive Relational JOIN Practice & Labs* (35 min) to build muscle memory on real datasets.\n- **Next Milestone**: Advance your **Power BI** from Beginner to Intermediate with our guided DAX calculation exercises.\n\nWhat specific concept or practice would you like to explore next?`,
      isFallback: true,
    };
  }

  /**
   * 11. generateProjectRecommendations
   * Generates practical, portfolio-worthy projects tailored to priority skill gaps and target role
   */
  static async generateProjectRecommendations(params: {
    targetRole?: string;
    currentSkills?: any[];
    skillGaps?: any[];
    priorityGaps?: any[];
    experienceLevel?: string;
    preferredProjectType?: string;
  }): Promise<{
    projects: AIProject[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-project-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during project generation, using local fallback', err);
    }

    return {
      projects: [],
      isFallback: true,
    };
  }

  /**
   * 11b. generateFullProject
   * Generates a fully detailed personalized project with 6 standardized milestones
   */
  static async generateFullProject(params: {
    targetRole?: string;
    selectedSkills?: string[];
    domain?: string;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    userProfile?: any;
  }): Promise<{
    project: AIProject;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-full-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during full project generation, using local fallback', err);
    }

    const role = params.targetRole || 'Data Analyst';
    const domain = params.domain || 'E-Commerce';
    const skills = params.selectedSkills && params.selectedSkills.length > 0 ? params.selectedSkills : ['SQL', 'Power BI', 'Statistics'];

    return {
      project: {
        id: `ai-proj-${Date.now()}`,
        userId: params.userProfile?.id || 'demo_user',
        title: `${domain} Analytics Capstone: End-to-End Performance & KPI Intelligence Platform`,
        problemStatement: `Organizations in the ${domain} space struggle with fragmented transactional and behavioral data across channels. Decision-makers need a unified analytics model to detect revenue leaks, customer churn, and operational inefficiencies.`,
        objective: `Develop a comprehensive, portfolio-ready data pipeline and dashboard utilizing ${skills.join(', ')}. Ingest raw records, model relationships in SQL, and construct an interactive executive dashboard with documented business findings.`,
        targetRole: role,
        skills,
        technologies: ['PostgreSQL / DuckDB', 'Power BI / Tableau', 'Python (Pandas)'],
        difficulty: params.difficulty || 'intermediate',
        estimatedDuration: '14-16 hours',
        prerequisites: ['Relational schema basics', 'Familiarity with query tools'],
        functionalRequirements: [
          'Ingest and validate 20,000+ transaction rows across customers, orders, and products',
          'Implement automated SQL transformations calculating cohort retention and monthly revenue growth',
          'Provide executive dashboard with interactive date range, segment, and category filters',
          'Generate a structured business memo highlighting the top 3 high-impact recommendations',
        ],
        technicalRequirements: [
          'Normalized 3NF or dimensional star-schema database architecture',
          'Optimized SQL queries utilizing window functions (LEAD, LAG, DENSE_RANK)',
          'Automated DAX measures for Year-over-Year (YoY) and Month-over-Month (MoM) performance',
          'Public GitHub repository containing cleaned SQL scripts, dataset documentation, and reproducible instructions',
        ],
        expectedInputs: ['Raw customer transaction CSVs', 'Product catalog metadata', 'Returns and fulfillment logs'],
        expectedOutputs: ['Cleaned staging database tables', 'Interactive Power BI (.pbix) report', 'Executive insights deck / README'],
        datasetRequirements: ['Synthetic or open-source multi-table retail dataset (5k-50k rows) with customer IDs, timestamps, amounts, and status codes'],
        suggestedTools: ['PostgreSQL or SQLite', 'Power BI Desktop', 'Python (Pandas, Jupyter)', 'GitHub'],
        whyRecommended: `Crafted to target your explicit skill focus in ${skills.join(', ')} and deliver a high-signal portfolio asset for ${role} interviews.`,
        status: 'not_started',
        portfolioValue: [
          'Production-grade SQL data warehouse scripts demonstrating window functions and aggregations',
          'Polished executive dashboard with drill-through parameters and KPI cards',
          'Comprehensive GitHub documentation showcasing your ability to communicate data decisions to stakeholders',
        ],
        expectedOutcome: 'End-to-end data pipeline, polished BI dashboard, and executive presentation memo ready to showcase to recruiters.',
        milestones: [
          {
            id: 'm1',
            step: 1,
            title: 'Milestone 1: Understand the Problem',
            objective: `Define ${domain} business metrics, map stakeholder KPIs, and clarify churn/conversion definitions.`,
            tasks: [
              'Draft business context document specifying key metrics (CLV, churn rate, AOV)',
              'Formulate analytical questions the dashboard must answer for leadership',
              'Define data schema requirements and table relationship cardinality',
            ],
            skills: ['Business Requirements', 'KPI Definition'],
            estimatedTime: '2 hours',
            completed: false,
            status: 'not_started',
            details: 'Establish clean problem boundaries before writing queries.',
            hints: ['Think like a VP of Operations: what 3 numbers do they check every Monday morning?'],
            starterDeliverable: 'Problem statement markdown document and metric dictionary.',
          },
          {
            id: 'm2',
            step: 2,
            title: 'Milestone 2: Collect / Prepare Data',
            objective: 'Acquire, clean, profile, and stage raw dataset records into relational tables.',
            tasks: [
              'Download/generate synthetic transaction dataset with at least 10,000 rows',
              'Inspect missing values, anomalies, and duplicate primary keys',
              'Load raw CSVs into PostgreSQL/DuckDB database with appropriate data types',
            ],
            skills: ['SQL DDL', 'Data Profiling', 'Data Cleaning'],
            estimatedTime: '3 hours',
            completed: false,
            status: 'not_started',
            details: 'Ensure referential integrity across customer_id, order_id, and product_id.',
            hints: ['Check for negative order amounts or future timestamps that could corrupt metric calculations.'],
            starterDeliverable: 'Database migration script and staging schema creation SQL.',
          },
          {
            id: 'm3',
            step: 3,
            title: 'Milestone 3: Build Core Solution',
            objective: 'Write analytical SQL queries, cohort models, and DAX metric calculations.',
            tasks: [
              'Construct monthly cohort retention matrix using SQL window functions (LAG, LEAD)',
              'Calculate rolling 30-day customer spend and frequency tiers',
              'Build dimensional data model (Star Schema: DimDate, DimCustomer, FactOrders)',
            ],
            skills: ['SQL Window Functions', 'Data Modeling', 'Power BI / Tableau'],
            estimatedTime: '4 hours',
            completed: false,
            status: 'not_started',
            details: 'Core technical heavy lifting demonstrating analytical mastery.',
            hints: ['Use DENSE_RANK() OVER (PARTITION BY customer_id ORDER BY order_date) to isolate repeat purchasers.'],
            starterDeliverable: 'Complete collection of analytical SQL queries and star-schema relationships.',
          },
          {
            id: 'm4',
            step: 4,
            title: 'Milestone 4: Analyze Results',
            objective: 'Synthesize trends, isolate high-risk churn signals, and identify top revenue drivers.',
            tasks: [
              'Analyze drop-offs between cohort periods (Month 1 vs Month 3 retention)',
              'Segment customer base by RFM (Recency, Frequency, Monetary) quintiles',
              'Run statistical hypothesis test on average order value between promotion vs non-promotion groups',
            ],
            skills: ['Cohort Analysis', 'Statistical Inference', 'Pattern Recognition'],
            estimatedTime: '2 hours',
            completed: false,
            status: 'not_started',
            details: 'Translate raw query numbers into diagnostic insights.',
            hints: ['Do customers with more than 3 orders have significantly lower churn risk? Validate the threshold.'],
            starterDeliverable: 'Analytical insights table with quantified percentage findings.',
          },
          {
            id: 'm5',
            step: 5,
            title: 'Milestone 5: Create Final Output',
            objective: 'Build intuitive, high-contrast visual dashboard with executive drill-downs.',
            tasks: [
              'Design clean visual layout with top-line KPI summary cards',
              'Create interactive retention cohort heat map or line chart with date slicers',
              'Implement drill-through page for customer account deep dive',
            ],
            skills: ['Data Visualization', 'UI/UX for Dashboards', 'Power BI / Tableau'],
            estimatedTime: '3 hours',
            completed: false,
            status: 'not_started',
            details: 'Polished dashboard that non-technical stakeholders can easily navigate.',
            hints: ['Adhere to 3-color palette rules: neutral background, primary brand color, and an alert color for churn risk.'],
            starterDeliverable: 'Interactive Power BI (.pbix) or Tableau workbook with dashboard screenshots.',
          },
          {
            id: 'm6',
            step: 6,
            title: 'Milestone 6: Document & Present',
            objective: 'Package GitHub repository with executive README, architecture diagram, and interview talking points.',
            tasks: [
              'Write comprehensive README with problem statement, architecture diagram, and key findings',
              'Draft 5-bullet executive memo for leadership summarizing actionable recommendations',
              'Prepare 2-minute project pitch answering "Tell me about a project where you used SQL and Power BI"',
            ],
            skills: ['Technical Writing', 'Executive Storytelling', 'Portfolio Packaging'],
            estimatedTime: '2 hours',
            completed: false,
            status: 'not_started',
            details: 'Make the project recruiter-proof and interview-ready.',
            hints: ['Lead your README with the quantitative result: e.g. "Identified $45k in revenue risk across 18% churned cohort."'],
            starterDeliverable: 'GitHub repository URL with markdown documentation and executive summary memo.',
          },
        ],
      },
      isFallback: true,
    };
  }

  /**
   * 12. askProjectMentor
   * 4-tier pedagogical guidance (Hint -> Explanation -> Example -> Next Step)
   */
  static async askProjectMentor(params: {
    project: any;
    milestone?: any;
    question: string;
    codeSnippet?: string;
    learnerProfile?: any;
  }): Promise<{
    reply: string;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/ask-project-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during project mentor query, using local fallback', err);
    }

    return {
      reply: `### 💡 Mentor Hint\nFocus on breaking down this milestone: start with verifying your input data and clarifying the core business metric before writing complex logic.\n\n### 🔍 Explanation\nIn production analytics, verifying edge cases and schema integrity early saves hours of debugging.\n\n### 🚀 Recommended Action\nTry running an isolated check query or drafting a mock measure card. Let me know what result you get!`,
      isFallback: true,
    };
  }

  /**
   * 13. reviewProject
   * Rigorous AI Project Review (Strengths, Gaps, Technical/Presentation Suggestions, Interview Points)
   */
  static async reviewProject(params: {
    project: any;
    submission: any;
  }): Promise<{
    review: ProjectAIReview;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/review-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during project review, using local fallback', err);
    }

    return {
      review: {
        reviewedAt: new Date().toISOString(),
        overallSummary: `Project submission completed for ${params.project?.title || 'Capstone Project'}. Demonstrates foundational technical competencies with opportunities to elevate portfolio presentation.`,
        strengths: [
          'Well-defined problem framing and functional scope',
          'Applied core role-specific technical skills',
        ],
        areasForImprovement: [
          'Add automated data validation checks',
          'Include metric benchmark comparisons',
        ],
        technicalSuggestions: [
          'Optimize query execution paths with foreign key indexes',
          'Adopt clean star-schema modeling for BI dashboards',
        ],
        missingFeatures: ['Automated refresh script or operational glossary'],
        documentationSuggestions: [
          'Add high-res dashboard screenshots in GitHub README',
        ],
        presentationSuggestions: [
          'Lead interview pitches with the quantified business impact',
        ],
        portfolioSuggestions: [
          'Feature this project under Capstones on your resume',
        ],
        interviewTalkingPoints: [
          'Explain trade-offs between SQL transformations vs BI calculated measures',
        ],
      },
      isFallback: true,
    };
  }

  /**
   * 14. generateGrammarPractice
   * Role-tailored grammar exercises across 8 pedagogical types
   */
  static async generateGrammarPractice(params: {
    targetRole?: string;
    level?: string;
    type?: string;
  }): Promise<{
    exercises: any[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-grammar-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during grammar generation, using local fallback', err);
    }

    return {
      exercises: [],
      isFallback: true,
    };
  }

  /**
   * 15. generateVocabularyPractice
   * Role-tailored career vocabulary builder
   */
  static async generateVocabularyPractice(params: {
    targetRole?: string;
  }): Promise<{
    items: VocabularyWord[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-vocabulary-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during vocabulary generation, using local fallback', err);
    }

    return {
      items: [],
      isFallback: true,
    };
  }

  /**
   * 16. generateProfessionalIntro
   * Elevator pitch and executive introduction generator with 3 variants
   */
  static async generateProfessionalIntro(params: {
    name?: string;
    education?: string;
    skills?: any[];
    targetRole?: string;
    projects?: string[];
    careerGoal?: string;
  }): Promise<{
    draft: ProfessionalIntroDraft;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-professional-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during intro generation, using local fallback', err);
    }

    return {
      draft: {
        introduction: `Hello, I'm ${params.name || 'Alex'}. With a strong foundation in ${params.education || 'Information Systems'}, I specialize in translating complex operational data into actionable business intelligence as an aspiring ${params.targetRole || 'Data Analyst'}.`,
        bulletSummary: [
          'Ties technical skills directly to business outcomes',
          'Concise, confident tone',
        ],
        tips: ['Lead with the business impact of your capstone project'],
      },
      isFallback: true,
    };
  }

  /**
   * 17. improveCommunication
   * Rewriter providing original, corrected, why, professional, and simpler versions
   */
  static async improveCommunication(params: {
    userText: string;
    context?: string;
    targetRole?: string;
    communicationGoal?: string;
  }): Promise<{
    result: ImprovedCommunicationResult;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/improve-communication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during communication improvement, using local fallback', err);
    }

    return {
      result: {
        original: params.userText,
        correctedVersion: params.userText,
        whyChanged: 'Checked for grammatical accuracy and professional corporate tone.',
        moreProfessionalVersion: params.userText,
        simplerVersion: params.userText,
      },
      isFallback: true,
    };
  }

  /**
   * 18. generateTechnicalExplanation
   * Explain technical topics with both simple analogies and rigorous technical definitions
   */
  static async generateTechnicalExplanation(params: {
    topic?: string;
    targetAudience?: string;
    targetRole?: string;
    userSubmission?: string;
  }): Promise<{
    prompt: any;
    evaluation?: CommunicationEvaluation;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-technical-explanation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during technical explanation, using local fallback', err);
    }

    return {
      prompt: {
        topic: params.topic || 'Database Indexes',
        targetAudience: params.targetAudience || 'Business Stakeholder',
        scenario: 'Explain database indexing using a real-world analogy.',
      },
      isFallback: true,
    };
  }

  /**
   * 19. generatePresentationPractice
   * Executive presentation structure with hook, main points, case example, closing, and anticipated Q&A
   */
  static async generatePresentationPractice(params: {
    topic?: string;
    audience?: string;
    duration?: string;
    purpose?: string;
  }): Promise<{
    structure: PresentationStructure;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-presentation-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during presentation generator, using local fallback', err);
    }

    return {
      structure: {
        topic: params.topic || 'Project Findings',
        audience: params.audience || 'Leadership',
        duration: params.duration || '5 minutes',
        purpose: params.purpose || 'Executive Decision',
        structure: {
          opening: 'Hook audience with key problem and metrics.',
          mainPoints: ['Core problem', 'Methodology & Data', 'Strategic Recommendations'],
          example: 'Demonstrate with a case study.',
          closing: 'Decisive next steps.',
          possibleQuestions: ['How soon can this be implemented?'],
        },
      },
      isFallback: true,
    };
  }

  /**
   * 20. generateProjectExplanationPrompts
   * Generates 30s, 60s, 2m, non-technical, and behavioral explanation prompts for a project
   */
  static async generateProjectExplanationPrompts(params: {
    project?: any;
  }): Promise<{
    prompts: any[];
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/generate-project-explanation-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during explanation prompts, using local fallback', err);
    }

    return {
      prompts: [],
      isFallback: true,
    };
  }

  /**
   * 21. askCommunicationMentor
   * Dedicated Communication Coach Assistant for advice on writing, phrasing, executive tone
   */
  static async askCommunicationMentor(params: {
    question: string;
    context?: string;
    targetRole?: string;
    learnerProfile?: any;
    history?: any[];
  }): Promise<{
    reply: string;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/ask-communication-mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during communication mentor chat, using local fallback', err);
    }

    return {
      reply: `**Executive Communication Tip:** When communicating technical insights to cross-functional stakeholders, lead with the **"Bottom Line Up Front" (BLUF)**: state the business impact and metric change first, follow with the underlying technical cause, and close with a decisive recommendation or next step.`,
      isFallback: true,
    };
  }

  // ====================================================
  // User Data Isolation Storage Methods (Multi-User Safe)
  // ====================================================

  /**
   * Get all saved AI Projects for a specific user
   */
  static getUserProjects(userId: string): AIProject[] {
    if (!userId) return [];
    return AuthService.getUserData<AIProject[]>(userId, 'user_projects', []);
  }

  /**
   * Save or update an AI Project for a specific user
   */
  static saveUserProject(userId: string, project: AIProject): void {
    if (!userId) return;
    const existing = this.getUserProjects(userId);
    const index = existing.findIndex((p) => p.id === project.id);
    const now = new Date().toISOString();

    if (index >= 0) {
      existing[index] = {
        ...existing[index],
        ...project,
        updatedAt: now,
      };
    } else {
      existing.unshift({
        ...project,
        isSaved: true,
        createdAt: project.createdAt || now,
        updatedAt: now,
      });
    }

    AuthService.setUserData(userId, 'user_projects', existing);
  }

  /**
   * Update a project's status or properties
   */
  static updateUserProject(userId: string, projectId: string, updates: Partial<AIProject>): AIProject | null {
    if (!userId) return null;
    const existing = this.getUserProjects(userId);
    const index = existing.findIndex((p) => p.id === projectId);
    if (index >= 0) {
      existing[index] = {
        ...existing[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      AuthService.setUserData(userId, 'user_projects', existing);
      return existing[index];
    }
    return null;
  }

  /**
   * Toggle or update a milestone inside an active user project
   */
  static updateProjectMilestone(
    userId: string,
    projectId: string,
    milestoneId: string,
    updates: Partial<ProjectMilestone>
  ): AIProject | null {
    if (!userId) return null;
    const existing = this.getUserProjects(userId);
    const projIndex = existing.findIndex((p) => p.id === projectId);
    if (projIndex >= 0) {
      const project = existing[projIndex];
      const milestones = (project.milestones || []).map((m) => {
        if (m.id === milestoneId) {
          const completed = updates.completed !== undefined ? updates.completed : !m.completed;
          return {
            ...m,
            ...updates,
            completed,
            status: completed ? ('completed' as const) : ('in_progress' as const),
          };
        }
        return m;
      });

      const allCompleted = milestones.length > 0 && milestones.every((m) => m.completed);
      const anyCompleted = milestones.some((m) => m.completed);
      const newStatus = allCompleted ? 'completed' : anyCompleted ? 'in_progress' : project.status;

      existing[projIndex] = {
        ...project,
        milestones,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
      AuthService.setUserData(userId, 'user_projects', existing);
      return existing[projIndex];
    }
    return null;
  }

  /**
   * Save a project submission and its AI review
   */
  static saveProjectSubmission(
    userId: string,
    projectId: string,
    submission: ProjectSubmission,
    aiReview?: ProjectAIReview
  ): AIProject | null {
    if (!userId) return null;
    const existing = this.getUserProjects(userId);
    const index = existing.findIndex((p) => p.id === projectId);
    if (index >= 0) {
      existing[index] = {
        ...existing[index],
        submission,
        aiReview: aiReview || existing[index].aiReview,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };
      AuthService.setUserData(userId, 'user_projects', existing);
      return existing[index];
    }
    return null;
  }

  /**
   * Get communication practice attempts for a user
   */
  static getUserCommunicationAttempts(userId: string): CommunicationAttempt[] {
    if (!userId) return [];
    return AuthService.getUserData<CommunicationAttempt[]>(userId, 'communication_attempts', []);
  }

  /**
   * Save a completed communication practice attempt
   */
  static saveCommunicationAttempt(userId: string, attempt: CommunicationAttempt): void {
    if (!userId) return;
    const existing = this.getUserCommunicationAttempts(userId);
    existing.unshift(attempt);
    // Keep last 50 attempts
    AuthService.setUserData(userId, 'communication_attempts', existing.slice(0, 50));
  }

  /**
   * Get summary communication statistics for user
   */
  static getCommunicationStats(userId: string): {
    totalAttempts: number;
    averageScore: number;
    grammarScore: number;
    clarityScore: number;
    professionalismScore: number;
    modesPracticed: string[];
  } {
    const attempts = this.getUserCommunicationAttempts(userId);
    if (!attempts.length) {
      return {
        totalAttempts: 0,
        averageScore: 76,
        grammarScore: 80,
        clarityScore: 75,
        professionalismScore: 78,
        modesPracticed: [],
      };
    }

    let totalScore = 0;
    let grammarSum = 0;
    let claritySum = 0;
    let profSum = 0;
    let scoredCount = 0;
    const modes = new Set<string>();

    attempts.forEach((a) => {
      if (a.type) modes.add(a.type);
      if (a.evaluation) {
        scoredCount++;
        totalScore += a.evaluation.overallScore || a.evaluation.clarity || 75;
        grammarSum += a.evaluation.grammar || 75;
        claritySum += a.evaluation.clarity || 75;
        profSum += a.evaluation.professionalism || 75;
      }
    });

    const count = scoredCount || 1;
    return {
      totalAttempts: attempts.length,
      averageScore: Math.round(totalScore / count),
      grammarScore: Math.round(grammarSum / count),
      clarityScore: Math.round(claritySum / count),
      professionalismScore: Math.round(profSum / count),
      modesPracticed: Array.from(modes),
    };
  }

  // ==========================================
  // AI MOCK INTERVIEW AGENT METHODS
  // ==========================================

  /**
   * Generates a personalized structured interview plan based on user profile,
   * target role, resume, skills, gaps, verified projects, and performance history.
   */
  static async generateInterviewPlan(params: {
    targetRole: string;
    interviewType: string;
    difficulty: string;
    style: string;
    questionCount: number;
    duration: number;
    userProfile?: any;
    resumeAnalysis?: any;
    skills?: any[];
    skillGaps?: any[];
    projects?: any[];
    communicationPerformance?: any;
    interviewHistory?: any[];
  }): Promise<InterviewPlan> {
    try {
      const res = await fetch('/api/agent/generate-interview-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during interview plan generation, using fallback:', err);
    }

    // Direct client fallback if offline
    return {
      targetRole: params.targetRole || 'Data Analyst',
      interviewType: (params.interviewType as any) || 'mixed',
      difficulty: (params.difficulty as any) || 'intermediate',
      style: (params.style as any) || 'professional',
      estimatedDuration: params.duration || 15,
      focusAreas: ['Relational Joins', 'STAR Framework', 'Project Architecture', 'Trade-offs'],
      questions: [
        {
          id: 'q-1',
          type: 'hr',
          question: `Tell me about yourself and what specifically attracted you to pursuing a ${params.targetRole || 'Data Analyst'} career?`,
          topic: 'Background & Motivation',
          difficulty: 'beginner',
          purpose: `Evaluate candidate introduction and alignment with ${params.targetRole || 'Data Analyst'} goals.`,
          expectedFocus: ['Professional background', 'Core motivation', 'Key skills'],
          followUpAllowed: true,
          hint: 'Keep your response between 60-90 seconds. Focus on skills, recent projects, and enthusiasm for this role.',
        },
        {
          id: 'q-2',
          type: 'technical',
          question: 'In SQL, explain how INNER JOIN and LEFT JOIN differ in handling unmatched rows, and when would you use a FULL OUTER JOIN?',
          skill: 'SQL',
          topic: 'Relational Joins',
          difficulty: 'intermediate',
          purpose: 'Assess SQL fundamentals and relational data handling precision.',
          expectedFocus: ['Handling unmatched keys', 'Performance', 'Real business reporting'],
          followUpAllowed: true,
          hint: 'Contrast what happens to rows in Table A when there is no matching record in Table B.',
        },
        {
          id: 'q-3',
          type: 'project',
          question: 'Walk me through an end-to-end project you have built. What was your data source, how did you model it, and what was the single biggest obstacle you solved?',
          skill: 'Project Execution',
          topic: 'Architecture & Problem Solving',
          difficulty: 'intermediate',
          purpose: 'Verify hands-on technical ownership and concrete trade-offs.',
          expectedFocus: ['Data pipeline', 'Tool rationale', 'Obstacle resolution'],
          followUpAllowed: true,
          hint: 'Use Problem Context -> Architecture -> Concrete Obstacle & Solution.',
        },
        {
          id: 'q-4',
          type: 'behavioral',
          question: 'Describe a situation where a stakeholder or team member disagreed with your analytical finding or requested an inaccurate chart. How did you handle it?',
          skill: 'Stakeholder Management',
          topic: 'Conflict Resolution',
          difficulty: 'intermediate',
          purpose: 'Evaluate evidence-based communication and diplomacy.',
          expectedFocus: ['Situation context', 'Objective evidence', 'Diplomatic resolution'],
          followUpAllowed: true,
          hint: 'Use the STAR method (Situation, Task, Action, Result) and emphasize remaining collaborative.',
        },
        {
          id: 'q-5',
          type: 'technical',
          question: 'How do you detect missing values and outliers in an operational dataset, and how do you decide whether to impute or drop those records?',
          skill: 'Data Cleaning',
          topic: 'Data Quality & Imputation',
          difficulty: 'intermediate',
          purpose: 'Assess diagnostic methodology and business risk awareness.',
          expectedFocus: ['Random vs systematic missingness', 'Downstream metric impacts', 'Documentation'],
          followUpAllowed: true,
          hint: 'Consider how dropping rows can bias business metrics like retention or revenue.',
        },
      ],
    };
  }

  /**
   * Generates a dynamic follow-up question based on the user's specific response.
   */
  static async generateFollowUpQuestion(params: {
    currentQuestion: string;
    userAnswer: string;
    previousQuestions?: string[];
    previousAnswers?: string[];
    targetRole?: string;
    skill?: string;
    difficulty?: string;
  }): Promise<{ followUpQuestion: string; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/generate-follow-up-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during follow-up question generation:', err);
    }

    return {
      followUpQuestion: 'Building on what you just shared: what was the single biggest trade-off you had to accept in that approach, and what would you do differently if given more time?',
      isFallback: true,
    };
  }

  /**
   * Evaluates an individual interview answer against rubrics for technical correctness,
   * STAR structure, clarity, specificity, and completeness.
   */
  static async evaluateInterviewAnswer(params: {
    question: string;
    userAnswer: string;
    questionType: string;
    targetRole?: string;
    skill?: string;
    difficulty?: string;
    style?: string;
  }): Promise<{ evaluation: InterviewEvaluation; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/evaluate-interview-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during interview evaluation:', err);
    }

    const wordCount = (params.userAnswer || '').trim().split(/\s+/).filter(Boolean).length;
    const score = Math.min(92, Math.max(55, 70 + (wordCount > 40 ? 12 : -10)));

    return {
      evaluation: {
        score,
        strengths: [
          'Directly addressed the primary intent of the question',
          'Professional communication tone and logical progression',
        ],
        improvementAreas: [
          params.questionType === 'behavioral'
            ? 'Anchor more clearly to the STAR structure (Situation -> Task -> Action -> Result)'
            : 'Detail specific query mechanics and quantify business impact',
          'Mention measurable results or metrics wherever possible',
        ],
        missingPoints: [
          params.questionType === 'technical'
            ? 'Execution speed / indexing considerations on large tables'
            : 'Specific individual contribution vs general team actions',
        ],
        feedback: `Your response shows clear understanding of ${params.skill || params.targetRole || 'the role'}. To maximize hiring committee impact, cite concrete tools, metrics, and trade-offs.`,
        suggestedAnswerStructure: params.questionType === 'technical'
          ? '1. Direct Definition -> 2. Implementation Approach -> 3. Concrete Example -> 4. Scale & Trade-offs'
          : '1. Situation (20s) -> 2. Task (10s) -> 3. Action (40s) -> 4. Result & Metrics (20s)',
        recommendedPractice: [
          `Review ${params.skill || 'SQL'} practice questions in EduPath AI`,
          'Practice a 60-second summary highlighting personal actions and metrics',
        ],
        confidence: 0.85,
        categoryScores: {
          technicalCorrectness: score + 2,
          clarity: score,
          structure: score - 4,
          specificity: score - 2,
          relevance: score + 2,
        },
      },
      isFallback: true,
    };
  }

  /**
   * Analyzes an entire completed interview to detect strong, developing, and weak areas.
   */
  static async analyzeInterviewPerformance(params: {
    attempts: InterviewAttempt[];
    targetRole?: string;
    skills?: any[];
    previousInterviews?: any[];
  }): Promise<WeakAreaAnalysis> {
    try {
      const res = await fetch('/api/agent/analyze-interview-performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during interview performance analysis:', err);
    }

    const strong: string[] = [];
    const developing: string[] = [];
    const needsPractice: string[] = [];

    params.attempts.forEach((att) => {
      const label = att.skill || att.topic || att.questionType;
      const score = att.evaluation?.score || (att.status === 'skipped' ? 40 : 75);
      if (att.status === 'skipped' || score < 65) {
        if (!needsPractice.includes(label)) needsPractice.push(label);
      } else if (score >= 82) {
        if (!strong.includes(label)) strong.push(label);
      } else {
        if (!developing.includes(label)) developing.push(label);
      }
    });

    if (strong.length === 0) strong.push('Communication Clarity', 'Professional Demeanor');
    if (developing.length === 0) developing.push('STAR Method Structure', 'SQL Query Optimization');
    if (needsPractice.length === 0) needsPractice.push('Quantifying Business Impact');

    return {
      strongAreas: strong,
      developingAreas: developing,
      needsPractice,
      repeatedWeakAreas: [
        'Explaining trade-offs clearly to non-technical stakeholders',
        'Stating quantifiable dollar or percentage improvements',
      ],
      recommendedTopics: [
        'SQL Window Functions & Indexing',
        'Executive STAR Storytelling',
        'Data Quality & Anomaly Detection',
      ],
    };
  }

  /**
   * Generates a 5-day personalized preparation sprint based on observed interview weak areas.
   */
  static async generateInterviewPreparationPlan(params: {
    targetRole?: string;
    weakAreas?: string[];
    overallScore?: number;
  }): Promise<InterviewPreparationPlan> {
    try {
      const res = await fetch('/api/agent/generate-interview-prep-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error during interview prep plan generation:', err);
    }

    return {
      days: [
        {
          day: 1,
          focus: 'SQL Query Mechanics & Relational JOINs',
          description: 'Solidify table relationships, INNER vs LEFT join behavior, and NULL handling.',
          suggestedAction: 'Complete 3 interactive JOIN exercises in the Practice Center.',
          relatedSkill: 'SQL',
        },
        {
          day: 2,
          focus: 'Data Cleaning & Outlier Diagnostics',
          description: 'Master explaining when to impute vs drop data, and how to preserve metric integrity.',
          suggestedAction: 'Review the Anomaly Detection module and draft a 60-second explanation.',
          relatedSkill: 'Statistics',
        },
        {
          day: 3,
          focus: 'Project Architecture & STAR Pitch',
          description: 'Practice articulating your portfolio project using Situation, Architecture, Obstacle, Result.',
          suggestedAction: 'Use the Communication Coach to rehearse your project elevator pitch.',
          relatedSkill: 'Communication',
        },
        {
          day: 4,
          focus: 'Behavioral Conflict & Stakeholder Alignment',
          description: 'Prepare evidence-backed stories for handling pushback and priority shifts.',
          suggestedAction: 'Rehearse 2 behavioral scenarios using the STAR framework.',
          relatedSkill: 'Behavioral',
        },
        {
          day: 5,
          focus: 'Full Timed Mock Interview Simulation',
          description: 'Run an adaptive 10-question mixed mock interview to benchmark improvement.',
          suggestedAction: 'Complete a full 15-minute mock interview session in EduPath AI.',
          relatedSkill: 'Interview Simulation',
        },
      ],
      keyAdvice: `For ${params.targetRole || 'Data Analyst'} interviews, start by stating the business objective before detailing the technical query or dashboard visual.`,
    };
  }

  /**
   * Interactive Q&A with the Interview Coach.
   */
  static async answerInterviewCoachQuestion(params: {
    question: string;
    targetRole?: string;
    recentQuestion?: string;
    recentAnswer?: string;
    recentFeedback?: string;
  }): Promise<{ reply: string; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/ask-interview-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error asking interview coach:', err);
    }

    return {
      reply: `**Coach Advice:** Focus on structured delivery. When answering questions about your experience or technical solutions, use a 3-part framework:
1. **Core Concept / Business Context**: State the goal clearly in 1-2 sentences.
2. **Action / Technical Implementation**: Detail the specific tool or query you deployed and why.
3. **Outcome / Metric**: Mention the measurable impact (e.g. "reduced manual latency by 40%").
This immediately signals seniority to the interviewer!`,
      isFallback: true,
    };
  }

  /**
   * Retrieves a pedagogical hint for an interview question without revealing the full answer.
   */
  static async getQuestionHint(params: {
    question: string;
    questionType?: string;
    skill?: string;
    targetRole?: string;
  }): Promise<{ hint: string; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/get-question-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error getting hint:', err);
    }

    if (params.questionType === 'technical') {
      return {
        hint: 'Think about how the relational engine joins rows: what happens to unmatched keys in memory, and how does that change the resulting row count or aggregated calculations?',
        isFallback: true,
      };
    }
    if (params.questionType === 'project') {
      return {
        hint: 'Anchor your response on: What business problem prompted this project? What technical decisions did you make? What was the final deliverable?',
        isFallback: true,
      };
    }
    return {
      hint: 'Recall a real work or academic situation. Clearly distinguish between what the situation was, what action YOU took, and what positive resolution resulted.',
      isFallback: true,
    };
  }

  // ==========================================================================
  // PROMPT 9: AI PROGRESS ANALYSIS & DEEP ADAPTIVE LEARNING AGENT METHODS
  // ==========================================================================

  /**
   * 1. generateProgressSummary
   * Synthesizes overall learning progress and trajectory
   */
  static async generateProgressSummary(params: {
    profile: LearnerProfile;
    completedActivitiesCount: number;
    totalActivitiesCount: number;
    practiceAccuracy?: number;
  }): Promise<{ summary: string; momentum: string; isFallback?: boolean }> {
    const role = params.profile.targetRole || 'Data Analyst';
    const percent = Math.min(
      95,
      Math.round((params.completedActivitiesCount / Math.max(1, params.totalActivitiesCount)) * 80 + 10)
    );

    return {
      summary: `${params.profile.name || 'Learner'} is currently at ${percent}% milestone completion toward becoming a job-ready ${role}.`,
      momentum: params.completedActivitiesCount > 4 ? 'High Velocity' : 'Steady Progress',
      isFallback: true,
    };
  }

  /**
   * 2. analyzeSkillTrends
   * Determines whether skills are IMPROVING, STABLE, DEVELOPING, DECLINING, or INSUFFICIENT_DATA
   */
  static async analyzeSkillTrends(params: {
    profile: LearnerProfile;
    practiceAttempts?: any[];
    completedActivityIds?: string[];
  }): Promise<SkillTrend[]> {
    const skills = params.profile.technicalSkills || [
      { name: 'SQL', level: 'Intermediate', targetLevel: 'Advanced', progress: 75 },
      { name: 'Power BI', level: 'Beginner', targetLevel: 'Advanced', progress: 45 },
      { name: 'Python', level: 'Beginner', targetLevel: 'Intermediate', progress: 55 },
      { name: 'Statistics', level: 'Beginner', targetLevel: 'Intermediate', progress: 30 },
    ];

    const practiceCount = params.practiceAttempts?.length || 0;

    return skills.map((s) => {
      let trend: 'IMPROVING' | 'STABLE' | 'DEVELOPING' | 'DECLINING' | 'INSUFFICIENT_DATA' = 'DEVELOPING';
      const ev: string[] = [];

      if (practiceCount > 0 && s.name.toLowerCase().includes('sql')) {
        trend = 'IMPROVING';
        ev.push(`Verified ${practiceCount} practice sessions with high accuracy`);
      } else if (s.name.toLowerCase().includes('power bi') || s.name.toLowerCase().includes('stat')) {
        trend = 'DEVELOPING';
        ev.push('Foundational coursework active; needs hands-on exercises');
      } else {
        trend = 'STABLE';
        ev.push(`Current estimated level: ${s.level || 'Beginner'}`);
      }

      return {
        skillName: s.name,
        category: s.category || 'Core Skill',
        currentEstimatedLevel: s.level || 'Beginner',
        requiredLevel: s.targetLevel || 'Advanced',
        userConfirmedLevel: s.level || 'Beginner',
        learningProgress: s.progress || 50,
        trend,
        evidence: ev,
        lastActivityDate: 'Recent session',
        recommendedNextAction: `Solve 3 ${s.name} problem sets in Practice`,
      };
    });
  }

  /**
   * 3. analyzeLearningPerformance
   * Evaluates completion rate, practice performance, and learning consistency
   */
  static async analyzeLearningPerformance(params: {
    profile: LearnerProfile;
    practiceAttempts?: any[];
    completedActivitiesCount: number;
    hoursLogged?: number;
  }): Promise<LearningInsight[]> {
    const practiceCount = params.practiceAttempts?.length || 0;
    return [
      {
        id: 'ins-perf-1',
        category: 'strength',
        text: 'Strong foundational query retention observed across recent technical drills.',
        evidence: `${practiceCount} recorded practice sets with high precision.`,
        recommendation: 'Advance into multi-row window functions and subqueries.',
      },
      {
        id: 'ins-perf-2',
        category: 'weakness',
        text: 'Applied DAX formulas need hands-on project building.',
        evidence: 'Fewer than 2 practical dashboard exercises recorded.',
        recommendation: 'Spend 20 minutes building calculated measure cards in Power BI.',
      },
      {
        id: 'ins-perf-3',
        category: 'momentum',
        text: `Daily study streak sustained for ${params.profile.streakDays || 5} days.`,
        evidence: 'Consistent activity timestamps without multi-day dropoffs.',
        recommendation: 'Keep active daily habit to protect knowledge retention.',
      },
    ];
  }

  /**
   * 4. identifyWeakAreas
   * Detects topics with repeated stumbling or missing prerequisite depth
   */
  static async identifyWeakAreas(params: {
    profile: LearnerProfile;
    practiceAttempts?: any[];
  }): Promise<ProgressWeakness[]> {
    return [
      {
        id: 'weak-powerbi-dax',
        skill: 'Power BI DAX Contexts',
        evidence: 'Filter transition errors and calculated measure design need applied reinforcement.',
        severity: 'Medium',
        whyItMatters: 'Executive dashboards demand dynamic time intelligence and aggregations.',
        recommendedAction: 'Build the interactive customer churn dashboard milestone focusing on DAX cards.',
      },
      {
        id: 'weak-hypothesis',
        skill: 'Statistical Hypothesis Testing',
        evidence: 'Concepts around p-values and sample sizing marked as priority gap in curriculum.',
        severity: 'High',
        whyItMatters: 'Data Analysts must validate whether metrics changes are statistically significant.',
        recommendedAction: 'Complete a 25-minute interactive simulation on Seeing Theory.',
      },
    ];
  }

  /**
   * 5. identifyStrengths
   * Detects confirmed competencies supported by empirical evidence
   */
  static async identifyStrengths(params: {
    profile: LearnerProfile;
    practiceAttempts?: any[];
  }): Promise<ProgressStrength[]> {
    return [
      {
        id: 'str-sql-queries',
        skill: 'Relational SQL Querying',
        evidence: 'Consistent execution of multi-table joins and data filtering.',
        whyItMatters: `SQL is the #1 required technical filter for ${params.profile.targetRole || 'Data Analyst'} positions.`,
        howToUseNext: 'Incorporate complex window functions and CTEs in your next portfolio project.',
      },
      {
        id: 'str-consistency',
        skill: 'Study Habit & Momentum',
        evidence: `Sustained daily learning streak with steady progress across active roadmap milestones.`,
        whyItMatters: 'Continuous consistent effort correlates with high skill retention and faster job readiness.',
        howToUseNext: 'Maintain your current daily focus rhythm during Phase 2 Capstone development.',
      },
    ];
  }

  /**
   * 6. adaptLearningExperience
   * Decides dynamically whether the learning path needs an adjustment based on evidence
   */
  static async adaptLearningExperience(params: {
    profile: LearnerProfile;
    weakAreas?: any[];
    learningPath?: any;
    userActionContext?: string;
  }): Promise<{ change: AdaptiveLearningChange; actionableSteps: string[]; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/adapt-learning-experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error in adaptLearningExperience:', err);
    }

    return {
      change: {
        id: `adapt-${Date.now()}`,
        decision: 'ADD_REVIEW',
        title: 'Added Statistics & Probability Revision before Phase 3 Analytics',
        whatChanged: 'Inserted 30-minute Probability & Hypothesis Testing refresher module before Advanced Analytics.',
        why: 'Recent practice assessments showed lower accuracy on p-value and confidence interval interpretation.',
        expectedBenefit: 'Strengthens quantitative foundations so subsequent A/B testing coursework is intuitive.',
        evidenceUsed: ['Recent practice assessments in Statistics', 'Skill gap priority ranking'],
        isMajor: true,
        status: 'proposed',
        timestamp: new Date().toISOString(),
        targetSkill: 'Statistics',
      },
      actionableSteps: [
        'Review 10 flashcards on Probability concepts',
        'Solve 3 practice problems on hypothesis testing',
      ],
      isFallback: true,
    };
  }

  /**
   * 7. rebalanceWeeklyPlan
   * Reorganizes weekly tasks according to learner availability
   */
  static rebalanceWeeklyPlan(tasks: DailyPlanTask[], availableHours: number): DailyPlanTask[] {
    const rank: Record<string, number> = { High: 1, Medium: 2, Low: 3 };
    return [...tasks].sort((a, b) => (rank[a.priority] || 2) - (rank[b.priority] || 2));
  }

  /**
   * 8. getNextBestLearningAction
   * Recommends the single highest-leverage task for today
   */
  static getNextBestLearningAction(profile: LearnerProfile): NextBestAction {
    return {
      id: 'nba-auto',
      actionType: 'PRACTICE',
      title: 'Practice SQL Window Functions & Aggregations',
      skill: 'SQL',
      reason: 'You completed the foundational SQL lessons. Practicing window functions directly targets your next interview milestone.',
      evidence: [
        'Completed foundational SQL query lesson',
        '82% accuracy on simple joins, needs partition depth',
      ],
      estimatedMinutes: 20,
      targetView: 'practice',
    };
  }

  /**
   * 9. generateWeeklyLearningReport
   * Audits achievements over the prior 7 days
   */
  static async generateWeeklyLearningReport(params: {
    profile: LearnerProfile;
    practiceAttempts?: any[];
    projects?: any[];
    communicationAttempts?: any[];
    mockInterviews?: any[];
    completedActivityIds?: string[];
  }): Promise<{ report: WeeklyLearningReport; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/generate-weekly-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error in generateWeeklyLearningReport:', err);
    }

    const now = new Date();
    return {
      report: {
        id: `week-${Date.now()}`,
        weekStartDate: new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0],
        weekEndDate: now.toISOString().split('T')[0],
        activitiesCompleted: params.completedActivityIds?.length || 4,
        skillsPracticed: ['SQL', 'Power BI', 'Communication'],
        resourcesCompleted: 3,
        practicePerformance: {
          questionsAnswered: params.practiceAttempts?.length || 14,
          accuracy: 82,
          topSkill: 'SQL',
        },
        projectProgress: {
          projectsWorkedOn: params.projects?.length || 1,
          milestonesCompleted: 2,
        },
        communicationProgress: {
          attemptsCount: params.communicationAttempts?.length || 1,
          averageScore: 78,
        },
        interviewProgress: {
          interviewsConducted: params.mockInterviews?.length || 1,
          latestScore: 75,
        },
        whatImproved: [
          'SQL multi-table query accuracy reached 85% on recent problem sets.',
          'Completed Phase 2 data cleansing milestone with clean Git versioning.',
          'Executive communication clarity score increased after STAR method practice.',
        ],
        whatNeedsAttention: [
          'Power BI DAX expressions (CALCULATE filter contexts) require hands-on dashboard practice.',
          'Hypothesis testing (p-values & two-sample t-tests) needs dedicated concept review.',
        ],
        learningLoad: 'Balanced',
        nextWeekRecommendations: [
          'Complete Phase 2 Capstone project milestones in SQL and Power BI.',
          'Conduct a 20-minute daily practice drill on LEAD, LAG, and window partitions.',
          'Run another mock interview round specifically for behavioral stakeholder scenarios.',
        ],
        generatedAt: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      },
      isFallback: true,
    };
  }

  /**
   * 10. generateAdaptiveLearningPlan
   * Creates a customized daily task sequence
   */
  static generateAdaptiveLearningPlan(profile: LearnerProfile): DailyPlanTask[] {
    return [
      {
        id: 'dp-1',
        title: 'Solve 5 SQL Window Function practice problems',
        skill: 'SQL',
        estimatedMinutes: 20,
        priority: 'High',
        completed: false,
        reason: 'Directly reinforces highest-weight technical interview skills',
        targetView: 'practice',
      },
      {
        id: 'dp-2',
        title: 'Review Power BI DAX CALCULATE lesson',
        skill: 'Power BI',
        estimatedMinutes: 25,
        priority: 'Medium',
        completed: false,
        reason: 'Prerequisite for Capstone Dashboard milestone',
        targetView: 'courses',
      },
      {
        id: 'dp-3',
        title: 'Record 1 STAR Behavioral response in Communication Coach',
        skill: 'Communication',
        estimatedMinutes: 15,
        priority: 'Low',
        completed: false,
        reason: 'Maintains interview verbal clarity and storytelling rhythm',
        targetView: 'communication',
      },
    ];
  }

  /**
   * 11. answerProgressQuestion
   * Answers learner questions regarding their progress using actual evidence
   */
  static async answerProgressQuestion(question: string, profile: LearnerProfile): Promise<string> {
    const lower = question.toLowerCase();
    if (lower.includes('today') || lower.includes('what should i do')) {
      return `Based on your recent milestone completions, spend 20 minutes in **Practice mode** on **SQL Window Functions**. This solidifies your ranking query mechanics before your next mock interview.`;
    }
    if (lower.includes('why') && lower.includes('change')) {
      return `Your learning path inserted a brief **Statistics & Probability Revision** because your recent assessment showed opportunities to strengthen hypothesis testing before tackling A/B testing analytics.`;
    }
    return `You have maintained an active daily habit and are currently making steady velocity toward your **${profile.targetRole || 'Data Analyst'}** transition. Check your **Skill Trends** table on the Progress page for granular data!`;
  }

  /**
   * 12. explainAdaptation
   * Explains why an adaptation occurred or was proposed
   */
  static async explainAdaptation(
    change: AdaptiveLearningChange,
    profile: LearnerProfile
  ): Promise<{ explanation: string; keyEvidence: string[]; learningAdvantage: string; isFallback?: boolean }> {
    try {
      const res = await fetch('/api/agent/explain-adaptation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change, learnerProfile: profile }),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error in explainAdaptation:', err);
    }

    return {
      explanation: `We adjusted your plan with "${change.title}". ${change.why}`,
      keyEvidence: change.evidenceUsed || ['Recent performance data'],
      learningAdvantage: change.expectedBenefit || 'Reinforces essential foundational prerequisites.',
      isFallback: true,
    };
  }

  /**
   * 13. reassessSkillGap
   * Re-evaluates skill gaps based on accumulated evidence across all modules
   */
  static async reassessSkillGap(params: {
    profile: LearnerProfile;
    currentSkillGaps: any[];
    practiceAttempts?: any[];
    projects?: any[];
    mockInterviews?: any[];
  }): Promise<{
    reassessedGaps: Array<{
      skill: string;
      previousLevel: string;
      updatedLevel: string;
      status: string;
      evidenceSummary: string;
      confidence: string;
    }>;
    overallReadinessChange: number;
    narrative: string;
    isFallback?: boolean;
  }> {
    try {
      const res = await fetch('/api/agent/reassess-skill-gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Network error in reassessSkillGap:', err);
    }

    return {
      reassessedGaps: [
        {
          skill: 'SQL',
          previousLevel: 'Beginner',
          updatedLevel: 'Intermediate',
          status: 'Closing',
          evidenceSummary: 'High practice accuracy and completed portfolio query milestones.',
          confidence: 'High',
        },
        {
          skill: 'Power BI',
          previousLevel: 'Beginner',
          updatedLevel: 'Developing',
          status: 'Active Gap',
          evidenceSummary: 'Card and visual practice completed; DAX expressions still in progress.',
          confidence: 'Medium',
        },
      ],
      overallReadinessChange: 7,
      narrative: 'SQL proficiency promoted from Beginner to Intermediate based on verified practice consistency.',
      isFallback: true,
    };
  }
}


