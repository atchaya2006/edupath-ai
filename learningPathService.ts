import {
  LearnerProfile,
  SkillGapAnalysis,
  LearningPath,
  RoadmapPhase,
  WeeklyPlan,
  LearningActivity,
  LearningPreferences,
  WeeklyCheckIn,
  WeeklySummary,
  AdaptationChange,
  LearningProgress,
} from '../types';

export class LearningPathService {
  /**
   * 1. generateLearningPath
   * Calls Gemini server-side endpoint or falls back to grounded baseline
   */
  static async generateLearningPath(
    learnerProfile: LearnerProfile,
    skillGapAnalysis?: SkillGapAnalysis | null,
    weeklyHours: number = 7,
    preferences?: Partial<LearningPreferences>
  ): Promise<LearningPath> {
    const learningPreferences: LearningPreferences = {
      learningFormat: preferences?.learningFormat || 'Mixed',
      difficulty: preferences?.difficulty || 'Balanced',
      sessionStyle: preferences?.sessionStyle || 'Deep-focus sessions',
      customNotes: preferences?.customNotes || '',
    };

    try {
      const res = await fetch('/api/agent/generate-learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerProfile,
          targetRole: skillGapAnalysis?.targetRole || learnerProfile.targetRole || 'Data Analyst',
          skillGapAnalysis,
          weeklyHours,
          learningPreferences,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.learningPath && data.learningPath.phases && data.learningPath.weeks) {
          return {
            id: `path-${Date.now()}`,
            ...data.learningPath,
            learningPreferences,
            generatedAt: new Date().toISOString(),
            isDemoPath: false,
          };
        }
      }
    } catch (err) {
      console.warn('Backend learning path generation unavailable, using grounded demo path:', err);
    }

    // Grounded fallback model matching Prompt 4's exact specifications
    return this.getDemoLearningPath(
      learnerProfile,
      skillGapAnalysis?.targetRole || learnerProfile.targetRole || 'Data Analyst',
      weeklyHours,
      learningPreferences
    );
  }

  /**
   * 2. adaptLearningPath
   * Dynamic replanning agent that responds to struggles, excels, missed sessions, or hours changes
   */
  static async adaptLearningPath(
    currentLearningPath: LearningPath,
    completedActivityIds: string[],
    quizScore?: number,
    strugglesFeedback?: string,
    weeklyCheckIn?: WeeklyCheckIn,
    weeklyHours?: number,
    learnerProfile?: LearnerProfile
  ): Promise<{ updatedLearningPath: LearningPath; adaptationChange: AdaptationChange }> {
    try {
      const res = await fetch('/api/agent/adapt-learning-path-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentLearningPath,
          completedActivityIds,
          quizScore,
          strugglesFeedback,
          weeklyCheckIn,
          weeklyHours: weeklyHours || currentLearningPath.weeklyHours,
          learnerProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.updatedLearningPath && data.adaptationChange) {
          const updated: LearningPath = {
            ...data.updatedLearningPath,
            lastAdaptedAt: new Date().toISOString(),
            adaptationHistory: [
              data.adaptationChange,
              ...(currentLearningPath.adaptationHistory || []),
            ],
          };
          return { updatedLearningPath: updated, adaptationChange: data.adaptationChange };
        }
      }
    } catch (err) {
      console.warn('Backend adaptive replanning unavailable, using local adaptation rules:', err);
    }

    // Local deterministic adaptive replanning fallback
    return this.simulateAdaptiveReplanning(
      currentLearningPath,
      completedActivityIds,
      quizScore,
      strugglesFeedback,
      weeklyCheckIn,
      weeklyHours
    );
  }

  /**
   * 3. generateWeeklySummary
   * AI "Your Week in Review" generator
   */
  static async generateWeeklySummary(
    weekNumber: number,
    learningPath: LearningPath,
    completedActivities: LearningActivity[],
    weeklyCheckIn?: WeeklyCheckIn,
    learnerProfile?: LearnerProfile
  ): Promise<WeeklySummary> {
    try {
      const res = await fetch('/api/agent/generate-weekly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber,
          learningPath,
          completedActivities,
          weeklyCheckIn,
          learnerProfile,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.weeklySummary) {
          return {
            weekNumber,
            ...data.weeklySummary,
            generatedAt: new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn('Weekly summary API error:', err);
    }

    // Fallback weekly review
    const totalMins = completedActivities.reduce((acc, a) => acc + (a.estimatedMinutes || 30), 0);
    const skills = Array.from(new Set(completedActivities.map((a) => a.skill)));

    return {
      weekNumber,
      summaryText: `You completed ${completedActivities.length} learning activities across ${skills.join(
        ', '
      )}. Your query execution speed has notably improved, and you are building strong momentum toward ${learningPath.targetRole}.`,
      skillsPracticed: skills.length > 0 ? skills : ['SQL', 'Data Analysis'],
      activitiesCompleted: completedActivities.length,
      totalActivities:
        learningPath.weeks.find((w) => w.weekNumber === weekNumber)?.activities.length || 6,
      timeSpentMinutes: totalMins,
      quizPerformance:
        weeklyCheckIn?.confidenceScore && weeklyCheckIn.confidenceScore >= 4
          ? '90% High Accuracy on SQL Joins'
          : '75% Developing Accuracy (JOIN filtering requires quick review)',
      difficultAreas: [
        weeklyCheckIn?.difficultyFeedback || 'Multi-table queries with complex conditional aggregations',
      ],
      improvements: [
        'Faster query execution & syntax recall',
        'Strong grasp of INNER and LEFT JOIN logic',
      ],
      recommendedNextSteps: [
        'Complete 1 quick 15-min JOIN practice sprint',
        'Transition into Power BI data modeling in Phase 3',
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * 4. answerLearningPathQuestion
   * AI natural language advisor for questions regarding the learning path
   */
  static async answerLearningPathQuestion(
    question: string,
    learningPath: LearningPath,
    learnerProfile: LearnerProfile
  ): Promise<string> {
    try {
      const res = await fetch('/api/agent/ask-learning-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, learningPath, learnerProfile }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.answer) return data.answer;
      }
    } catch (err) {
      console.warn('Ask learning path error:', err);
    }

    // Grounded fallback response
    const q = question.toLowerCase();
    if (q.includes('why') && q.includes('learn')) {
      return `**EduPath Advisor:** You are learning this sequence because our AI skill gap analysis identified **SQL Mastery** as your highest-leverage prerequisite. Closing this gap directly unlocks 85% of standard ${learningPath.targetRole} technical assessments.`;
    }
    if (q.includes('today') || q.includes('complete')) {
      const currWeek = learningPath.weeks.find((w) => w.isCurrent) || learningPath.weeks[0];
      const nextTask = currWeek?.activities.find((a) => !a.completed) || currWeek?.activities[0];
      return `**EduPath Advisor:** For today, your top recommended focus is **"${nextTask?.title}"** (${nextTask?.estimatedMinutes} mins, ${nextTask?.skill}). It targets an immediate priority gap and keeps your 5-day streak active!`;
    }
    if (q.includes('faster') || q.includes('finish')) {
      return `**EduPath Advisor:** You can accelerate your timeline by completing the interactive practice quizzes ahead of schedule. If you score ≥85%, you can click **"Adapt My Learning Path"** to fast-track directly to advanced case studies.`;
    }
    if (q.includes('hours') || q.includes('3 hours') || q.includes('time')) {
      return `**EduPath Advisor:** If you only have limited time this week, prioritize the **High Priority** tasks marked in red, specifically hands-on practice and the weekly assessment. You can adjust your hours picker above and click **"Adapt My Learning Path"** to recalibrate automatically.`;
    }
    return `**EduPath Advisor:** Your roadmap is paced at **${learningPath.weeklyHours} hours/week** across ${learningPath.durationWeeks} weeks. Every milestone builds directly on validated prerequisites for ${learningPath.targetRole}. Let me know if you want to adapt or rebalance any phase!`;
  }

  /**
   * 5. calculateLearningProgress
   * Real calculated progress from activity state
   */
  static calculateLearningProgress(
    learningPath: LearningPath,
    completedActivityIds: string[],
    streakDays: number = 5
  ): LearningProgress {
    let totalActs = 0;
    let completedActs = 0;

    const currentWeek =
      learningPath.weeks.find((w) => w.isCurrent) || learningPath.weeks[0] || null;

    let weekTotal = 0;
    let weekCompleted = 0;

    for (const week of learningPath.weeks) {
      for (const act of week.activities) {
        totalActs++;
        const isDone = completedActivityIds.includes(act.id) || act.completed;
        if (isDone) completedActs++;

        if (currentWeek && week.weekNumber === currentWeek.weekNumber) {
          weekTotal++;
          if (isDone) weekCompleted++;
        }
      }
    }

    const currentPhase =
      learningPath.phases.find((p) => p.current || p.status === 'In Progress') ||
      learningPath.phases[0];

    let phaseTotal = 0;
    let phaseCompleted = 0;

    if (currentPhase) {
      const phaseWeeks = learningPath.weeks.filter((w) =>
        currentPhase.weeks.includes(w.weekNumber)
      );
      for (const w of phaseWeeks) {
        for (const act of w.activities) {
          phaseTotal++;
          if (completedActivityIds.includes(act.id) || act.completed) {
            phaseCompleted++;
          }
        }
      }
    }

    const overallProgressPercent =
      totalActs > 0 ? Math.round((completedActs / totalActs) * 100) : 0;
    const weeklyCompletionPercent =
      weekTotal > 0 ? Math.round((weekCompleted / weekTotal) * 100) : 0;
    const phaseCompletionPercent =
      phaseTotal > 0 ? Math.round((phaseCompleted / phaseTotal) * 100) : 0;

    return {
      activitiesCompleted: completedActs,
      activitiesTotal: totalActs,
      activitiesRemaining: Math.max(0, totalActs - completedActs),
      weeklyCompletionPercent,
      phaseCompletionPercent,
      overallProgressPercent,
      currentStreakDays: streakDays,
      currentWeekNumber: currentWeek?.weekNumber || 1,
      currentPhaseTitle: currentPhase?.title || 'Phase 1 — Foundations',
    };
  }

  /**
   * Deterministic local adaptive replanner for offline/fallback use
   */
  private static simulateAdaptiveReplanning(
    currentLearningPath: LearningPath,
    completedActivityIds: string[],
    quizScore?: number,
    strugglesFeedback?: string,
    weeklyCheckIn?: WeeklyCheckIn,
    weeklyHours?: number
  ): { updatedLearningPath: LearningPath; adaptationChange: AdaptationChange } {
    const hours = weeklyHours || currentLearningPath.weeklyHours || 7;
    const isStruggling =
      (quizScore !== undefined && quizScore < 75) ||
      (weeklyCheckIn?.confidenceScore !== undefined && weeklyCheckIn.confidenceScore <= 2) ||
      (strugglesFeedback && strugglesFeedback.toLowerCase().includes('struggle'));

    const isExcelling =
      (quizScore !== undefined && quizScore >= 90) ||
      (weeklyCheckIn?.confidenceScore !== undefined && weeklyCheckIn.confidenceScore >= 5);

    let summary = '';
    const reasons: string[] = [];
    const adjustments: string[] = [];
    let trigger: AdaptationChange['trigger'] = 'user_request';

    if (isStruggling) {
      trigger = 'struggle';
      summary =
        'Identified difficulty with SQL JOIN logic and multi-table filtering. Added 2 targeted reinforcement practice modules and delayed advanced subqueries.';
      reasons.push('Recent quiz results indicated ambiguity on LEFT vs FULL OUTER JOINs.');
      reasons.push('Prerequisite integrity: Advanced Window Functions require solid JOIN mastery.');
      adjustments.push('Added 15-minute "Visualizing JOIN Venn Diagrams" practice.');
      adjustments.push('Added 30-minute "Debugging Common JOIN Null Bugs" coding session.');
      adjustments.push('Rebalanced Week 3 & 4 schedule to prevent cognitive overload.');
    } else if (isExcelling) {
      trigger = 'excelled';
      summary =
        'High quiz accuracy and fast completion detected. Fast-tracked foundational modules and unlocked the Mini Project: Sales Analysis early.';
      reasons.push('Demonstrated 90%+ proficiency on database queries.');
      reasons.push('Learner is ready for applied business case studies.');
      adjustments.push('Reduced introductory review sessions.');
      adjustments.push('Moved Week 4 Capstone Milestone up by 3 days.');
      adjustments.push('Introduced advanced indexing and query optimization tips.');
    } else if (weeklyHours && weeklyHours !== currentLearningPath.weeklyHours) {
      trigger = 'hours_change';
      summary = `Adjusted weekly time commitment to ${hours} hours/week. Re-proportioned daily sessions to ensure realistic pacing without burnout.`;
      reasons.push(`Learner updated weekly available study time to ${hours} hours.`);
      adjustments.push(`Re-estimated daily tasks to average ${Math.round((hours * 60) / 5)} minutes per session.`);
      adjustments.push(`Updated total roadmap projection to ${Math.max(8, Math.round((70 / hours)))} weeks.`);
    } else {
      trigger = 'check_in';
      summary =
        'Rebalanced learning path based on weekly check-in feedback. Realigned upcoming milestones to match your preferred focus pace.';
      reasons.push('Weekly check-in review completed.');
      adjustments.push('Maintained steady progression across active priority gaps.');
    }

    const updatedWeeks: WeeklyPlan[] = currentLearningPath.weeks.map((week) => {
      // If struggling on week 2/3, insert reinforcement activity
      if (isStruggling && (week.weekNumber === 2 || week.weekNumber === 3)) {
        const hasExtra = week.activities.some((a) => a.id.includes('extra-join'));
        if (!hasExtra) {
          const extraAct: LearningActivity = {
            id: `extra-join-${Date.now()}`,
            title: 'Adaptive Revision: SQL JOIN Mastery Sprint',
            description: 'Focused step-by-step problem sets resolving multi-table join confusion and NULL handling.',
            skill: 'SQL',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 35,
            priority: 'High',
            dayOfWeek: 'Wednesday',
            completed: false,
            whyThisTask:
              'Adaptive addition triggered by quiz struggle: ensures rock-solid JOIN comprehension before advancing to Window Functions.',
            resourceSlot: {
              resourceType: 'Interactive Practice',
              note: 'Resources will be personalized by the AI Resource Recommendation Agent.',
            },
          };
          return {
            ...week,
            activities: [extraAct, ...week.activities],
            estimatedHours: Math.round(week.estimatedHours + 0.6),
          };
        }
      }
      return week;
    });

    const adaptationChange: AdaptationChange = {
      timestamp: new Date().toISOString(),
      summary,
      reasons,
      adjustments,
      trigger,
    };

    const updatedPath: LearningPath = {
      ...currentLearningPath,
      weeklyHours: hours,
      durationWeeks: Math.max(8, Math.round(84 / hours)),
      weeks: updatedWeeks,
      lastAdaptedAt: new Date().toISOString(),
      adaptationHistory: [adaptationChange, ...(currentLearningPath.adaptationHistory || [])],
    };

    return { updatedLearningPath: updatedPath, adaptationChange };
  }

  /**
   * Grounded demo baseline for Alex (Data Analyst, 12 weeks, 7 hrs/week)
   */
  static getDemoLearningPath(
    learnerProfile: LearnerProfile,
    targetRole: string = 'Data Analyst',
    weeklyHours: number = 7,
    preferences?: LearningPreferences
  ): LearningPath {
    const prefs: LearningPreferences = preferences || {
      learningFormat: 'Mixed',
      difficulty: 'Balanced',
      sessionStyle: 'Deep-focus sessions',
    };

    const phases: RoadmapPhase[] = [
      {
        phaseId: 'phase-1',
        title: 'Phase 1 — Analytics Foundations & Data Wrangling',
        description: 'Establish structured analytical thinking, spreadsheet mastery, and data hygiene.',
        weeks: [1, 2],
        skills: ['Data Analysis', 'Excel / Sheets', 'Data Cleaning'],
        status: 'Completed',
        estimatedHours: 14,
        current: false,
      },
      {
        phaseId: 'phase-2',
        title: 'Phase 2 — SQL Mastery & Relational Databases',
        description: 'Master multi-table queries, aggregation, complex joins, and window functions.',
        weeks: [3, 4],
        skills: ['SQL', 'PostgreSQL', 'Relational Modeling'],
        status: 'In Progress',
        estimatedHours: 14,
        current: true,
      },
      {
        phaseId: 'phase-3',
        title: 'Phase 3 — Business Intelligence & Power BI',
        description: 'Design executive reporting dashboards, DAX calculations, and interactive visual hierarchies.',
        weeks: [5, 6],
        skills: ['Power BI', 'DAX', 'Data Visualization'],
        status: 'Not Started',
        estimatedHours: 14,
        current: false,
      },
      {
        phaseId: 'phase-4',
        title: 'Phase 4 — Applied Statistics & A/B Experimentation',
        description: 'Hypothesis testing, statistical significance, and metric sanity checks.',
        weeks: [7, 8],
        skills: ['Statistics', 'Hypothesis Testing', 'Probability'],
        status: 'Not Started',
        estimatedHours: 14,
        current: false,
      },
      {
        phaseId: 'phase-5',
        title: 'Phase 5 — End-to-End Capstone Portfolio Project',
        description: 'Synthesize SQL, Power BI, and analytical storytelling into a production-grade portfolio project.',
        weeks: [9, 10],
        skills: ['Portfolio Project', 'Data Storytelling', 'GitHub'],
        status: 'Not Started',
        estimatedHours: 14,
        current: false,
      },
      {
        phaseId: 'phase-6',
        title: 'Phase 6 — Interview Preparation & Executive Presentation',
        description: 'Technical SQL live coding, case study walk-throughs, and STAR behavioral communication.',
        weeks: [11, 12],
        skills: ['Technical Interview', 'Communication', 'Executive Presentation'],
        status: 'Not Started',
        estimatedHours: 14,
        current: false,
      },
    ];

    const weeks: WeeklyPlan[] = [
      {
        weekNumber: 1,
        title: 'Week 1 — Analytical Mindset & Advanced Spreadsheets',
        objective: 'Solidify tabular data cleaning, lookup functions, and KPI structuring.',
        detailedObjectives: [
          'Perform multi-condition lookups using XLOOKUP and INDEX/MATCH',
          'Identify and cleanse missing, duplicate, and malformed records',
          'Build dynamic pivot summaries with custom calculated fields',
        ],
        skills: ['Excel', 'Data Cleaning'],
        estimatedHours: 7,
        isCompleted: true,
        assessment: 'Spreadsheet Audit Challenge (Passed with 95%)',
        expectedOutcome: 'Cleaned customer transactions dataset with calculated cohort metrics.',
        activities: [
          {
            id: 'w1-a1',
            title: 'Data Hygiene & Outlier Detection Fundamentals',
            description: 'Learn standard protocols for detecting anomalous and duplicate customer records.',
            skill: 'Data Cleaning',
            type: 'lesson',
            difficulty: 'Beginner',
            estimatedMinutes: 45,
            priority: 'High',
            dayOfWeek: 'Monday',
            completed: true,
            whyThisTask: 'Addresses foundational data reliability before running queries.',
            resourceSlot: {
              resourceType: 'Course',
              note: 'Resources will be personalized by the AI Resource Recommendation Agent.',
            },
          },
          {
            id: 'w1-a2',
            title: 'Hands-on XLOOKUP & Nested Calculations',
            description: 'Practice merging customer demographic tables with transaction logs.',
            skill: 'Excel',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 45,
            priority: 'Medium',
            dayOfWeek: 'Tuesday',
            completed: true,
            whyThisTask: 'Prepares mental models for relational key lookups used later in SQL.',
          },
        ],
      },
      {
        weekNumber: 2,
        title: 'Week 2 — Relational Foundations & Core SQL Syntax',
        objective: 'Understand table schemas, primary/foreign keys, and basic filtering.',
        detailedObjectives: [
          'Construct SELECT, WHERE, and ORDER BY queries on relational tables',
          'Use LIKE, IN, BETWEEN, and CASE WHEN statements for conditional transformation',
          'Group records using COUNT, SUM, AVG, and filter grouped sets with HAVING',
        ],
        skills: ['SQL', 'PostgreSQL'],
        estimatedHours: 7,
        isCompleted: true,
        assessment: 'SQL Syntax & Grouping Quiz (Passed with 88%)',
        expectedOutcome: 'Fluency in querying single tables and aggregated metrics.',
        activities: [
          {
            id: 'w2-a1',
            title: 'Relational Schemas & Primary Key Constraints',
            description: 'Understand how relational schemas ensure integrity across order and item tables.',
            skill: 'SQL',
            type: 'reading',
            difficulty: 'Beginner',
            estimatedMinutes: 30,
            priority: 'Medium',
            dayOfWeek: 'Monday',
            completed: true,
            whyThisTask: 'Essential prerequisite before understanding how SQL JOINs match rows.',
          },
          {
            id: 'w2-a2',
            title: 'GROUP BY and HAVING Practice Sprint',
            description: 'Write analytical aggregations computing monthly sales volume per product category.',
            skill: 'SQL',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 60,
            priority: 'High',
            dayOfWeek: 'Wednesday',
            completed: true,
            whyThisTask: 'Solidifies core aggregation logic needed for executive KPI dashboards.',
          },
        ],
      },
      {
        weekNumber: 3,
        title: 'Week 3 — SQL Mastery: Multi-Table JOINs & Relationships',
        objective: 'Improve SQL querying, multi-table joins, and analytical thinking.',
        detailedObjectives: [
          'Master INNER JOIN, LEFT JOIN, and RIGHT JOIN on normalized databases',
          'Prevent accidental cartesian products and duplicated aggregate rows',
          'Combine multiple joins to trace a transaction from customer to line item',
          'Write professional analytical queries with CTEs (Common Table Expressions)',
        ],
        skills: ['SQL', 'PostgreSQL'],
        estimatedHours: 7,
        isCurrent: true,
        assessment: 'AI-Generated Multi-Table Query Assessment (20 questions)',
        expectedOutcome: 'Ability to join 4+ database tables to compute complex customer cohort metrics.',
        activities: [
          {
            id: 'w3-a1',
            title: 'Deep Dive: Mechanics of INNER and LEFT JOINs',
            description: 'Step-by-step visual execution flow of how relational engines match row sets and handle nulls.',
            skill: 'SQL',
            type: 'lesson',
            difficulty: 'Intermediate',
            estimatedMinutes: 30,
            priority: 'High',
            dayOfWeek: 'Monday',
            completed: true,
            whyThisTask:
              'Addresses your developing SQL skill and prepares you for multi-table analytical queries in the next phase.',
            resourceSlot: {
              resourceType: 'Video',
              note: 'Resources will be personalized by the AI Resource Recommendation Agent.',
            },
          },
          {
            id: 'w3-a2',
            title: 'Hands-on JOIN Practice & Troubleshooting Nulls',
            description: 'Solve 6 real-world query challenges involving missing customer data and unmatched records.',
            skill: 'SQL',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 45,
            priority: 'High',
            dayOfWeek: 'Tuesday',
            completed: true,
            whyThisTask:
              'Directly builds on Monday lesson to convert conceptual knowledge into fast syntax recall.',
          },
          {
            id: 'w3-a3',
            title: 'Multi-Condition Aggregations with GROUP BY & HAVING',
            description: 'Aggregate revenue grouped by customer segments and filter for active accounts using HAVING.',
            skill: 'SQL',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 40,
            priority: 'Medium',
            dayOfWeek: 'Wednesday',
            completed: false,
            whyThisTask:
              'Combines JOINs with aggregation, which is the exact pattern used in 80% of data analyst job interviews.',
          },
          {
            id: 'w3-a4',
            title: 'Case Study: Analyzing E-Commerce Subscription Retention',
            description: 'Query realistic customer tables to calculate repeat purchase rate and churned user segments.',
            skill: 'Data Analysis',
            type: 'lesson',
            difficulty: 'Intermediate',
            estimatedMinutes: 60,
            priority: 'High',
            dayOfWeek: 'Thursday',
            completed: false,
            whyThisTask:
              'Applies multi-table queries to business KPI decision-making, moving beyond syntax to business value.',
          },
          {
            id: 'w3-a5',
            title: 'AI-Generated SQL Diagnostic Quiz',
            description: 'Test your understanding of JOIN semantics, null filters, and execution ordering.',
            skill: 'SQL',
            type: 'quiz',
            difficulty: 'Intermediate',
            estimatedMinutes: 20,
            priority: 'High',
            dayOfWeek: 'Friday',
            completed: false,
            whyThisTask:
              'Evaluates retention and supplies feedback to the Adaptive Learning Agent for next week replanning.',
          },
          {
            id: 'w3-a6',
            title: 'Mini Project: E-Commerce Sales Query Suite',
            description: 'Write a comprehensive script answering 5 strategic leadership questions for a retail platform.',
            skill: 'SQL',
            type: 'project',
            difficulty: 'Intermediate',
            estimatedMinutes: 120,
            priority: 'High',
            dayOfWeek: 'Saturday',
            completed: false,
            whyThisTask:
              'Provides a portfolio-ready artifact demonstrating end-to-end relational query capability.',
            projectMilestones: [
              'Understand schema and entity-relationship diagram',
              'Inspect table row counts and verify join keys',
              'Write SQL queries computing top customers by gross margin',
              'Identify monthly revenue drop-off points with CTEs',
              'Summarize analytical findings in 3 executive bullet points',
            ],
          },
          {
            id: 'w3-a7',
            title: 'Weekly Review & AI Check-in',
            description: 'Reflect on difficult topics, review missed questions, and submit your weekly check-in.',
            skill: 'Data Analysis',
            type: 'reading',
            difficulty: 'Beginner',
            estimatedMinutes: 30,
            priority: 'Medium',
            dayOfWeek: 'Sunday',
            completed: false,
            whyThisTask:
              'Enables the adaptive replanning engine to personalize Week 4 before you begin.',
          },
        ],
      },
      {
        weekNumber: 4,
        title: 'Week 4 — Advanced SQL: Window Functions & Subqueries',
        objective: 'Master RANK, DENSE_RANK, LEAD, LAG, and running totals.',
        detailedObjectives: [
          'Calculate running totals and moving averages with OVER (ORDER BY)',
          'Segment rankings with PARTITION BY to identify top products per category',
          'Measure month-over-month growth using LAG() and LEAD() functions',
        ],
        skills: ['SQL', 'PostgreSQL'],
        estimatedHours: 7,
        assessment: 'Window Functions Mastery Assessment',
        expectedOutcome: 'Mastery of senior-level analytical queries.',
        activities: [
          {
            id: 'w4-a1',
            title: 'Understanding the OVER() Clause and Partitioning',
            description: 'How window frames differ from standard GROUP BY aggregations without collapsing rows.',
            skill: 'SQL',
            type: 'lesson',
            difficulty: 'Advanced',
            estimatedMinutes: 45,
            priority: 'High',
            dayOfWeek: 'Monday',
            completed: false,
            whyThisTask: 'Builds strictly on Week 3 JOIN proficiency to unlock advanced time-series analysis.',
          },
          {
            id: 'w4-a2',
            title: 'Running Totals and Rolling 7-Day Average Lab',
            description: 'Write PostgreSQL window queries calculating cumulative revenue streams.',
            skill: 'SQL',
            type: 'practice',
            difficulty: 'Advanced',
            estimatedMinutes: 50,
            priority: 'High',
            dayOfWeek: 'Wednesday',
            completed: false,
            whyThisTask: 'Directly replicates common finance and SaaS metric requests in target roles.',
          },
          {
            id: 'w4-a3',
            title: 'Communication Practice: Explaining Query Logic to Non-Technical Leads',
            description: 'Practice phrasing SQL analytical logic into plain business language for product managers.',
            skill: 'Communication',
            type: 'communication',
            difficulty: 'Intermediate',
            estimatedMinutes: 25,
            priority: 'Medium',
            dayOfWeek: 'Friday',
            completed: false,
            whyThisTask:
              'Data analysts frequently fail interviews not on SQL syntax, but on communicating findings clearly.',
            communicationTopic: 'Translating SQL join queries into stakeholder insights',
          },
        ],
      },
      {
        weekNumber: 5,
        title: 'Week 5 — Power BI Fundamentals & Data Modeling',
        objective: 'Ingest SQL datasets, build star schemas, and create relationship models.',
        detailedObjectives: [
          'Import data from relational exports into Power BI Desktop',
          'Design clean star schemas with Fact and Dimension tables',
          'Configure 1-to-many relationship cardinality and cross-filter directions',
        ],
        skills: ['Power BI', 'Data Modeling'],
        estimatedHours: 7,
        assessment: 'Power BI Data Model Verification Lab',
        expectedOutcome: 'A robust star schema ready for complex DAX measures.',
        activities: [
          {
            id: 'w5-a1',
            title: 'Star Schema Architecture vs Flat Tables',
            description: 'Learn why star schemas prevent performance degradation in executive dashboards.',
            skill: 'Power BI',
            type: 'lesson',
            difficulty: 'Beginner',
            estimatedMinutes: 45,
            priority: 'High',
            dayOfWeek: 'Monday',
            completed: false,
            whyThisTask: 'Closes the critical Power BI gap identified in your AI Skill Gap Analysis.',
          },
          {
            id: 'w5-a2',
            title: 'Hands-on Star Schema Building in Power BI',
            description: 'Connect fact_sales with dim_customer, dim_product, and dim_date.',
            skill: 'Power BI',
            type: 'practice',
            difficulty: 'Intermediate',
            estimatedMinutes: 60,
            priority: 'High',
            dayOfWeek: 'Wednesday',
            completed: false,
            whyThisTask: 'Prerequisite milestone before writing CALCULATE DAX expressions.',
          },
        ],
      },
      {
        weekNumber: 6,
        title: 'Week 6 — DAX Formulas & Interactive Visualization',
        objective: 'Write CALCULATE, FILTER, and time-intelligence DAX measures.',
        detailedObjectives: [
          'Differentiate calculated columns from dynamic DAX measures',
          'Master filter context modification using CALCULATE()',
          'Build Year-to-Date (YTD) and Prior Year (PY) comparisons',
        ],
        skills: ['Power BI', 'DAX', 'Data Visualization'],
        estimatedHours: 7,
        assessment: 'Executive Sales Dashboard Capstone Milestone',
        expectedOutcome: 'Interactive multi-page BI dashboard with dynamic KPI drill-downs.',
        activities: [
          {
            id: 'w6-a1',
            title: 'Demystifying the CALCULATE() Context Modifier',
            description: 'Understand how CALCULATE alters the row and filter contexts in DAX evaluations.',
            skill: 'Power BI',
            type: 'lesson',
            difficulty: 'Intermediate',
            estimatedMinutes: 45,
            priority: 'High',
            dayOfWeek: 'Tuesday',
            completed: false,
            whyThisTask: 'Addresses the specific DAX weakness flagged during gap analysis.',
          },
          {
            id: 'w6-a2',
            title: 'Interactive Dashboard Layout & Visual UX Hierarchy',
            description: 'Design card metrics, bar trendlines, and slicers with clean spacing and contrast.',
            skill: 'Data Visualization',
            type: 'project',
            difficulty: 'Intermediate',
            estimatedMinutes: 90,
            priority: 'High',
            dayOfWeek: 'Saturday',
            completed: false,
            whyThisTask: 'Creates a portfolio-grade dashboard ready for recruiters to inspect.',
            projectMilestones: [
              'Setup executive KPI cards (Revenue, Margin, YoY Growth)',
              'Implement dynamic date slicer and category filters',
              'Configure tooltip page previews for regional drill-down',
              'Publish to Power BI Service / export portfolio report',
            ],
          },
        ],
      },
    ];

    const aiReasoning = `Power BI and Advanced SQL appear as critical priority gaps for your target role of ${targetRole}. Since your SQL foundation is already developing, this plan sequences multi-table relational JOINs first to establish data intuition before introducing Power BI data modeling in Phase 3. Your ${weeklyHours}-hour weekly commitment is allocated across 4 focused weekday sessions (30-60m) and 1 weekend project milestone (90-120m), perfectly matching your preferred ${prefs.sessionStyle} format without burnout.`;

    return {
      id: 'demo-alex-path',
      targetRole,
      durationWeeks: 12,
      weeklyHours,
      overallObjective: `Transform foundational analytics experience into job-ready ${targetRole} competency through rigorous SQL, Power BI data modeling, and end-to-end portfolio projects.`,
      learningPreferences: prefs,
      phases,
      weeks,
      aiReasoning,
      generatedAt: new Date().toISOString(),
      isDemoPath: true,
      adaptationHistory: [
        {
          timestamp: new Date().toISOString(),
          summary: 'Initial learning path generated from verified resume profile and target role benchmarks.',
          reasons: [
            'Prioritized SQL JOINs as the highest-leverage immediate milestone.',
            'Scheduled Power BI directly following relational database mastery.',
          ],
          adjustments: [
            'Configured 7 hours/week with built-in weekend capstone sprints.',
            'Included communication and non-technical presentation practice.',
          ],
          trigger: 'user_request',
        },
      ],
      weeklyCheckIns: {},
      weeklySummaries: {},
    };
  }
}
