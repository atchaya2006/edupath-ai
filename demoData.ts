import {
  LearnerProfile,
  TodayPlanItem,
  LearningPhase,
  ResourceItem,
  LearningResource,
  PracticeQuestion,
  ProjectRecommendation,
  SkillGap,
} from '../types';

export const INITIAL_DEMO_PROFILE: LearnerProfile = {
  id: 'alex-demo-01',
  name: 'Alex',
  isDemoProfile: true,
  currentEducation: "Bachelor's in Information Systems",
  currentRole: 'Junior Business Operations Specialist',
  yearsExperience: '1-2 years',
  targetRole: 'Data Analyst',
  careerGoal: 'Transition into a high-impact Data Analyst role at a tech or fintech company within 6 months.',
  learningPreference: 'Hands-on Projects',
  weeklyHours: 12,
  overallProgress: 68,
  skillsAcquiredCount: 12,
  skillsInProgressCount: 5,
  remainingGapsCount: 4,
  totalLearningHours: 38,
  streakDays: 14,
  resumeFileName: 'Alex_Resume_2026.pdf',
  resumeText: `ALEX R.
Email: alex.analyst@example.com | LinkedIn: linkedin.com/in/alex-data-journey

SUMMARY
Motivated Junior Business Specialist with 1.5 years experience querying databases, automating reporting spreadsheets, and assisting senior leads with quarterly KPI analysis. Seeking to transition into a full-time Data Analyst role.

EDUCATION
B.S. in Information Systems, State University (2024)

TECHNICAL & ANALYTICAL SKILLS
- SQL: Intermediate (SELECT, JOINs, Subqueries, GROUP BY, aggregations)
- Python: Intermediate (Pandas data manipulation, NumPy arrays, Jupyter notebooks)
- Excel: Advanced (VLOOKUP/XLOOKUP, Pivot Tables, Power Query)
- Power BI: Beginner (Basic bar charts, introductory DAX syntax)
- Statistics: Beginner (Mean, Median, Standard Deviation, introductory normal distributions)
- Soft Skills: Active listening, stakeholder communication, cross-functional project coordination

WORK EXPERIENCE
Junior Business Operations Specialist | Apex Solutions (2024 - Present)
- Extracted and reconciled customer transactional logs using SQL queries across 3 relational tables.
- Built automated monthly Excel reports saving the team 6 hours of manual spreadsheet reconciliation per week.
- Assisted product leads by graphing user retention trends in Python Matplotlib.`,
  technicalSkills: [
    { id: 'ts-1', name: 'SQL', level: 'Intermediate', category: 'Database', progress: 65, targetLevel: 'Advanced', status: 'In Progress' },
    { id: 'ts-2', name: 'Python', level: 'Intermediate', category: 'Programming', progress: 70, targetLevel: 'Intermediate', status: 'Acquired' },
    { id: 'ts-3', name: 'Excel', level: 'Intermediate', category: 'Data Wrangling', progress: 75, targetLevel: 'Advanced', status: 'Acquired' },
    { id: 'ts-4', name: 'Power BI', level: 'Beginner', category: 'Visualization', progress: 35, targetLevel: 'Intermediate', status: 'Skill Gap' },
    { id: 'ts-5', name: 'Statistics', level: 'Beginner', category: 'Analytics', progress: 40, targetLevel: 'Intermediate', status: 'Skill Gap' },
  ],
  softSkills: [
    { id: 'ss-1', name: 'Communication', level: 'Intermediate', category: 'Soft Skills', progress: 60, targetLevel: 'Advanced', status: 'In Progress' },
    { id: 'ss-2', name: 'Stakeholder Management', level: 'Intermediate', category: 'Soft Skills', progress: 55, targetLevel: 'Advanced', status: 'In Progress' },
    { id: 'ss-3', name: 'Problem Solving', level: 'Advanced', category: 'Soft Skills', progress: 80, targetLevel: 'Advanced', status: 'Acquired' },
  ],
  certifications: [
    { id: 'cert-1', name: 'Google Data Analytics Professional Certificate', issuer: 'Coursera / Google', year: '2025', verified: true },
    { id: 'cert-2', name: 'SQL for Data Science', issuer: 'UC Davis Online', year: '2025', verified: true },
  ],
  projects: [
    {
      id: 'proj-1',
      title: 'E-Commerce Churn Exploration',
      tech: ['Python', 'Pandas', 'Matplotlib'],
      description: 'Cleaned and investigated 15,000 customer orders to discover correlation between shipping delays and return rates.',
      stars: 14,
    },
    {
      id: 'proj-2',
      title: 'Retail Store Inventory Tracker',
      tech: ['SQL', 'Excel Power Query'],
      description: 'Built automated inventory replenishment calculations for regional warehouse supply chains.',
      stars: 9,
    },
  ],
};

export const INITIAL_TODAY_PLAN: TodayPlanItem[] = [
  { id: 'plan-1', title: 'SQL JOINs Mastery', duration: '30 min', completed: false, skill: 'SQL', type: 'practice' },
  { id: 'plan-2', title: 'Data Visualization Best Practices', duration: '45 min', completed: false, skill: 'Power BI', type: 'video' },
  { id: 'plan-3', title: 'Executive Communication Practice', duration: '20 min', completed: false, skill: 'Communication', type: 'reading' },
  { id: 'plan-4', title: 'SQL Multi-Table Query Quiz', duration: '15 min', completed: true, skill: 'SQL', type: 'quiz' },
];

export const INITIAL_SKILL_GAPS: SkillGap[] = [
  { skill: 'SQL', current: 'Intermediate', required: 'Advanced', gap: 'Needs improvement', progress: 65, priority: 'High', reason: 'Critical for complex multi-table joins, CTEs, and window functions in analytics tests.' },
  { skill: 'Python', current: 'Intermediate', required: 'Intermediate', gap: 'Ready', progress: 85, priority: 'Low', reason: 'Proficient in Pandas data cleaning and basic exploratory analysis.' },
  { skill: 'Power BI', current: 'Beginner', required: 'Intermediate', gap: 'Needs improvement', progress: 35, priority: 'High', reason: 'Target companies require interactive dashboard publishing and DAX measure formulation.' },
  { skill: 'Statistics', current: 'Beginner', required: 'Intermediate', gap: 'Needs improvement', progress: 40, priority: 'High', reason: 'Need to master hypothesis testing, p-values, and A/B test sample sizing.' },
  { skill: 'Excel', current: 'Intermediate', required: 'Advanced', gap: 'Moderate', progress: 75, priority: 'Medium', reason: 'Solid foundation, can strengthen automation via advanced Power Query formulas.' },
  { skill: 'Communication', current: 'Intermediate', required: 'Advanced', gap: 'Needs improvement', progress: 60, priority: 'Medium', reason: 'Must translate technical data findings into executive business recommendations.' },
];

export const INITIAL_LEARNING_PHASES: LearningPhase[] = [
  {
    id: 1,
    title: 'Phase 1 — Foundations & Data Literacy',
    description: 'Establish core relational thinking, spreadsheet data hygiene, and exploratory workflow fundamentals.',
    skills: ['Excel Advanced', 'Relational Models', 'Data Cleaning'],
    objectives: ['Master nested XLOOKUP & INDEX/MATCH', 'Normalize tabular schemas', 'Clean missing and duplicate records'],
    estimatedTime: '12 hours',
    completion: 100,
    status: 'completed',
    current: false,
    practiceTasks: [
      { id: 't1-1', title: 'Spreadsheet Hygiene Audit', duration: '45m', completed: true },
      { id: 't1-2', title: 'Data Types & Schema Integrity', duration: '30m', completed: true },
    ],
    project: {
      title: 'Customer Data Cleansing Pipeline',
      summary: 'Processed 10,000 messy CRM contacts into normalized SQL-ready staging tables.',
    },
  },
  {
    id: 2,
    title: 'Phase 2 — SQL Mastery',
    description: 'Advance from basic SELECT queries into complex multi-table JOINs, subqueries, CTEs, and Window Functions.',
    skills: ['PostgreSQL', 'Window Functions', 'CTEs', 'Query Optimization'],
    objectives: ['Write multi-table self joins and outer joins', 'Implement ROW_NUMBER, RANK, and DENSE_RANK', 'Construct recursive CTEs'],
    estimatedTime: '20 hours',
    completion: 75,
    status: 'in-progress',
    current: true,
    practiceTasks: [
      { id: 't2-1', title: 'Window Functions (LEAD/LAG)', duration: '60m', completed: true },
      { id: 't2-2', title: 'Multi-condition JOINs Lab', duration: '45m', completed: false },
      { id: 't2-3', title: 'Query Indexing & Performance', duration: '30m', completed: false },
    ],
    project: {
      title: 'SaaS Subscription Churn Engine',
      summary: 'Calculate rolling 30-day active users and subscriber churn using SQL window functions.',
    },
  },
  {
    id: 3,
    title: 'Phase 3 — Data Visualization & Power BI',
    description: 'Transform raw datasets into actionable executive visual reports and interactive dashboards.',
    skills: ['Power BI', 'DAX Measures', 'Dashboard Design', 'Color & Visual Hierarchy'],
    objectives: ['Design human-centered KPI summary cards', 'Formulate CALCULATE, FILTER, and RELATED DAX functions', 'Implement drill-through cross-filtering'],
    estimatedTime: '18 hours',
    completion: 35,
    status: 'in-progress',
    current: false,
    practiceTasks: [
      { id: 't3-1', title: 'DAX Basics: Time Intelligence', duration: '45m', completed: true },
      { id: 't3-2', title: 'Interactive Power BI Layouts', duration: '60m', completed: false },
    ],
    project: {
      title: 'Executive Sales Performance Cockpit',
      summary: 'Build a multi-page interactive dashboard with regional sales breakdown and margin targets.',
    },
  },
  {
    id: 4,
    title: 'Phase 4 — Statistics & Hypothesis Testing',
    description: 'Ground all quantitative findings in mathematical rigor, probability distributions, and A/B test mechanics.',
    skills: ['Probability', 'Confidence Intervals', 'A/B Testing', 'Hypothesis Testing'],
    objectives: ['Formulate Null and Alternative Hypotheses', 'Calculate Z-score, t-tests, and p-values', 'Avoid statistical bias and p-hacking'],
    estimatedTime: '15 hours',
    completion: 20,
    status: 'upcoming',
    current: false,
    practiceTasks: [
      { id: 't4-1', title: 'Two-Sample t-Test in Python', duration: '50m', completed: false },
      { id: 't4-2', title: 'Sample Size Determination Calculator', duration: '35m', completed: false },
    ],
    project: {
      title: 'E-Commerce Landing Page A/B Experiment Analysis',
      summary: 'Analyze variant conversion rates with 95% confidence and recommend whether to ship the feature.',
    },
  },
  {
    id: 5,
    title: 'Phase 5 — Business Analytics & Domain KPIs',
    description: 'Connect analytical queries directly to enterprise revenue drivers, unit economics, and executive decisions.',
    skills: ['Unit Economics', 'Cohort Analysis', 'LTV & CAC', 'Executive Decks'],
    objectives: ['Compute cohort retention curves', 'Model customer lifetime value against acquisition cost', 'Translate data insights into slide decks'],
    estimatedTime: '14 hours',
    completion: 0,
    status: 'upcoming',
    current: false,
    practiceTasks: [
      { id: 't5-1', title: 'Cohort Retention Triangle Analysis', duration: '60m', completed: false },
      { id: 't5-2', title: 'SaaS Metric Glossary Drill', duration: '30m', completed: false },
    ],
    project: {
      title: 'Quarterly Business Review (QBR) Deck',
      summary: 'Synthesize product telemetry into an 8-slide executive pitch for VP of Product.',
    },
  },
  {
    id: 6,
    title: 'Phase 6 — Portfolio Projects & Capstone',
    description: 'Construct 2 end-to-end, recruiter-ready case studies hosted with documented code and clear takeaways.',
    skills: ['GitHub Documentation', 'Data Storytelling', 'End-to-End Analytics'],
    objectives: ['Publish documented repositories with README and data dictionaries', 'Record 3-minute video walk-through', 'Include business impact statements'],
    estimatedTime: '25 hours',
    completion: 0,
    status: 'upcoming',
    current: false,
    practiceTasks: [
      { id: 't6-1', title: 'GitHub Data Portfolio README Setup', duration: '40m', completed: false },
    ],
    project: {
      title: 'Global Supply Chain Disruption Predictor',
      summary: 'Integrated SQL database, Python analytics pipeline, and Power BI visualization published on GitHub.',
    },
  },
  {
    id: 7,
    title: 'Phase 7 — Interview Preparation & Recruiter Pitch',
    description: 'Master live SQL technical screenings, take-home data challenges, and the behavioral STAR method.',
    skills: ['Technical SQL Screening', 'Case Study Defense', 'STAR Method', 'Salary Negotiation'],
    objectives: ['Solve timed SQL problems under 20 minutes', 'Explain trade-offs clearly to interviewers', 'Articulate past project successes with impact numbers'],
    estimatedTime: '15 hours',
    completion: 0,
    status: 'upcoming',
    current: false,
    practiceTasks: [
      { id: 't7-1', title: 'Timed Live SQL Screening (3 Questions)', duration: '45m', completed: false },
      { id: 't7-2', title: 'STAR Behavioral Scenario Walkthrough', duration: '30m', completed: false },
    ],
    project: {
      title: 'Full Mock Interview Simulation',
      summary: 'Complete a 5-question comprehensive AI mock interview with instant recruiter scoring.',
    },
  },
];

export const INITIAL_RESOURCES: LearningResource[] = [
  {
    id: 'res-1',
    title: 'Advanced SQL for Data Analysts: Window Functions & CTEs',
    skill: 'SQL',
    type: 'Course',
    category: 'Courses',
    difficulty: 'Intermediate',
    duration: '3h 45m',
    durationMinutes: 225,
    description: 'Comprehensive guided course on window functions, CTEs, and recursive queries designed for data analysts.',
    learningObjective: 'Master RANK, DENSE_RANK, LEAD, LAG, and rolling windows for analytics tests.',
    verified: false,
    relevanceScore: 95,
    status: 'In Progress',
    provider: 'EduPath Academy',
    rating: 4.9,
    searchKeywords: ['sql window functions tutorial intermediate', 'common table expressions cte analytics'],
    reason: 'Addresses your identified SQL requirement for Data Analyst technical assessments.',
  },
  {
    id: 'res-2',
    title: 'Demystifying Power BI DAX: CALCULATE & Filter Context',
    skill: 'Power BI',
    type: 'Video',
    category: 'Videos',
    difficulty: 'Beginner',
    duration: '42m',
    durationMinutes: 42,
    description: 'Clear visual demonstration of row context vs filter context in Power BI Desktop.',
    learningObjective: 'Understand row vs filter context and write robust time-intelligence formulas.',
    verified: false,
    relevanceScore: 94,
    status: 'Not Started',
    provider: 'Visual Analytics Lab',
    rating: 4.8,
    searchKeywords: ['power bi dax calculate filter context tutorial beginner'],
    reason: 'Directly helps bridge your Power BI skill gap for dashboard reporting.',
  },
  {
    id: 'res-3',
    title: 'Practical Hypothesis Testing & p-Values for Business Decisions',
    skill: 'Statistics',
    type: 'Article',
    category: 'Articles',
    difficulty: 'Intermediate',
    duration: '25m',
    durationMinutes: 25,
    description: 'Analytical guide on avoiding statistical fallacies and interpreting A/B test experiments.',
    learningObjective: 'Avoid common statistical fallacies and correctly interpret A/B test results.',
    verified: false,
    relevanceScore: 91,
    status: 'Not Started',
    provider: 'Data Science Digest',
    rating: 4.7,
    searchKeywords: ['hypothesis testing p values business analytics ab test guide'],
    reason: 'Statistics is a major priority gap in your career comparison.',
  },
  {
    id: 'res-4',
    title: 'PostgreSQL Official Documentation: Queries & Table Expressions',
    skill: 'SQL',
    type: 'Documentation',
    category: 'Documentation',
    difficulty: 'Advanced',
    duration: '1h 15m',
    durationMinutes: 75,
    description: 'The authoritative reference for query evaluation, WITH clauses, and planner execution plans.',
    learningObjective: 'Deep-dive into query optimizer behavior, planner cost estimates, and EXPLAIN ANALYZE.',
    verified: true,
    url: 'https://www.postgresql.org/docs/current/queries.html',
    relevanceScore: 93,
    status: 'Not Started',
    provider: 'PostgreSQL Global Development Group',
    rating: 4.9,
    reason: 'Verified official documentation for robust query optimization skills.',
  },
  {
    id: 'res-5',
    title: 'Exploratory Data Analysis in Python Pandas',
    skill: 'Python',
    type: 'Practice',
    category: 'Practice',
    difficulty: 'Intermediate',
    duration: '1h 30m',
    durationMinutes: 90,
    description: 'Hands-on dataset cleaning, handling null values, and feature aggregations.',
    learningObjective: 'Hands-on dataset cleaning, handling null values, and feature aggregations.',
    verified: false,
    relevanceScore: 89,
    status: 'Completed',
    provider: 'Interactive Labs',
    rating: 4.9,
    searchKeywords: ['python pandas eda exploratory data analysis practice tutorial'],
    reason: 'Reinforces your existing Python foundation with analytics-focused exercises.',
  },
  {
    id: 'res-6',
    title: 'Executive Communication for Analytical Teams',
    skill: 'Communication',
    type: 'Video',
    category: 'Videos',
    difficulty: 'Intermediate',
    duration: '35m',
    durationMinutes: 35,
    description: 'How to present complex data insights to non-technical C-suite stakeholders without losing them in the weeds.',
    learningObjective: 'Deliver executive summaries that connect data findings directly to business ROI.',
    verified: false,
    relevanceScore: 90,
    status: 'In Progress',
    provider: 'Leadership Tech',
    rating: 4.8,
    searchKeywords: ['executive communication data analyst presentation to stakeholders'],
    reason: 'Soft skill alignment is essential for senior analytical roles.',
  },
];

export const INITIAL_PRACTICE_QUESTIONS: Record<string, PracticeQuestion[]> = {
  Quiz: [
    {
      id: 'q-sql-1',
      question: 'Which SQL statement correctly returns customers who placed orders in 2025 using a CTE?',
      type: 'multiple_choice',
      skill: 'SQL',
      difficulty: 'Intermediate',
      topic: 'Common Table Expressions',
      options: [
        'WITH Orders2025 AS (SELECT customer_id FROM orders WHERE YEAR(order_date) = 2025) SELECT * FROM customers WHERE id IN (SELECT customer_id FROM Orders2025);',
        'SELECT * FROM customers WHERE order_date = WITH (2025);',
        'CREATE CTE Orders2025 AS SELECT * FROM orders; SELECT customer_id;',
        'Orders2025: SELECT customer_id FROM orders WHERE date = 2025;',
      ],
      correctAnswer: 0,
      explanation: 'Common Table Expressions (CTEs) are defined using the WITH clause before the primary SELECT statement, creating a clean readable temporary result set.',
    },
    {
      id: 'q-sql-2',
      question: 'What is the key difference between RANK() and DENSE_RANK() in SQL Window Functions?',
      type: 'multiple_choice',
      skill: 'SQL',
      difficulty: 'Intermediate',
      topic: 'Window Functions',
      options: [
        'RANK() skips rank numbers after ties (e.g. 1, 2, 2, 4), while DENSE_RANK() does not skip (e.g. 1, 2, 2, 3).',
        'DENSE_RANK() skips numbers, whereas RANK() repeats values infinitely.',
        'RANK() only works on integer columns.',
        'There is no difference; they are vendor-specific synonyms.',
      ],
      correctAnswer: 0,
      explanation: 'RANK() leaves gaps when there are ties (e.g., two items tied for #2 means the next item is #4). DENSE_RANK() produces consecutive rankings with no gaps (1, 2, 2, 3).',
    },
    {
      id: 'q-bi-1',
      question: 'In Power BI DAX, what does the CALCULATE function fundamentally do?',
      type: 'multiple_choice',
      skill: 'Power BI',
      difficulty: 'Intermediate',
      topic: 'DAX Filter Context',
      options: [
        'It computes basic mathematical addition only.',
        'It evaluates an expression within an altered or replaced filter context.',
        'It converts column data types from text to decimal.',
        'It refreshes the external SQL server connection.',
      ],
      correctAnswer: 1,
      explanation: 'CALCULATE is the single most powerful DAX function because it allows you to modify or overwrite the filter context under which an expression is evaluated.',
    },
  ],
  'Coding Practice': [
    {
      id: 'code-1',
      question: 'Write a SQL query using a Window Function to calculate each employee\'s salary rank within their department, ordered by salary descending.',
      type: 'coding',
      skill: 'SQL',
      difficulty: 'Intermediate',
      topic: 'Window Functions',
      starterCode: `-- Given table: employees (id, name, department_id, salary)
SELECT
  id,
  name,
  department_id,
  salary,
  DENSE_RANK() OVER (
    PARTITION BY department_id
    ORDER BY salary DESC
  ) AS dept_salary_rank
FROM employees;`,
      explanation: 'The PARTITION BY department_id resets the ranking per department, while ORDER BY salary DESC ensures the highest earner gets rank 1.',
    },
    {
      id: 'code-2',
      question: 'Write a SQL query to find all customers who have placed at least 3 orders using GROUP BY and HAVING.',
      type: 'coding',
      skill: 'SQL',
      difficulty: 'Intermediate',
      topic: 'Aggregation & Filtering',
      starterCode: `SELECT
  customer_id,
  COUNT(order_id) AS total_orders
FROM orders
GROUP BY customer_id
HAVING COUNT(order_id) >= 3;`,
      explanation: 'WHERE filters rows before grouping, whereas HAVING filters aggregated groups after the GROUP BY execution.',
    },
  ],
  'Concept Questions': [
    {
      id: 'concept-1',
      question: 'Why should a Data Analyst prefer Median over Mean when analyzing salary distributions across an organization?',
      type: 'short_answer',
      skill: 'Statistics & Math',
      difficulty: 'Intermediate',
      topic: 'Descriptive Statistics',
      explanation: 'Salary distributions are typically heavily right-skewed by a small number of executive salaries. The Mean is pulled upwards by these extreme outliers, giving a distorted picture of what a typical employee earns. The Median represents the true 50th percentile and is robust to extreme outliers.',
    },
    {
      id: 'concept-2',
      question: 'What is Type I error versus Type II error in A/B testing?',
      type: 'short_answer',
      skill: 'Statistics & Math',
      difficulty: 'Intermediate',
      topic: 'Hypothesis Testing',
      explanation: 'A Type I error (false positive) occurs when you reject the null hypothesis when it is actually true (e.g. concluding a button color changed conversions when it did not). A Type II error (false negative) occurs when you fail to reject a false null hypothesis (missing a genuine improvement).',
    },
  ],
  'Case Studies': [
    {
      id: 'case-1',
      question: 'Case Study: The VP of Marketing notices website traffic increased by 25% last month, but total revenue remained flat. What data questions and queries would you investigate first?',
      type: 'case_study',
      skill: 'Data Analysis',
      difficulty: 'Intermediate',
      topic: 'Business Analytics & Root Cause',
      explanation: '1. Segment traffic by acquisition source (paid ads vs organic) — did low-intent ad traffic surge?\n2. Analyze conversion funnel drop-off rates at checkout.\n3. Examine Average Order Value (AOV) and product mix.\n4. Check technical telemetry (e.g., checkout page latency or payment gateway error rates).',
    },
  ],
};

export const INITIAL_PROJECTS: ProjectRecommendation[] = [
  {
    id: 'proj-rec-1',
    title: 'E-Commerce Customer Lifetime Value & Churn Dashboard',
    skillsDeveloped: ['SQL Window Functions', 'Power BI', 'DAX Measures', 'Cohort Analysis'],
    difficulty: 'Intermediate',
    estimatedDuration: '12-14 hours',
    description: 'Work with 100,000 real-world e-commerce transactional records. Build SQL CTE queries to calculate 30-day and 90-day repeat customer rates, then design a Power BI dashboard with interactive slicers for executive leadership.',
    requiredTools: ['PostgreSQL / DuckDB', 'Power BI Desktop', 'Figma (Dashboard Wireframing)'],
    learningOutcomes: [
      'Write multi-table SQL queries using LAG/LEAD for cohort retention curves',
      'Create 8 custom DAX measures including MoM Growth and Churn Risk Index',
      'Deliver an executive summary deck with 3 actionable recommendations',
    ],
    milestones: [
      'Ingest and audit dataset in SQL',
      'Calculate user retention matrices and churn thresholds',
      'Build responsive Power BI visual dashboard',
      'Document findings in a GitHub portfolio repository',
    ],
  },
  {
    id: 'proj-rec-2',
    title: 'FinTech Loan Default Prediction & Risk Segmentation',
    skillsDeveloped: ['Python (Pandas)', 'Statistics & Hypothesis Testing', 'Data Storytelling'],
    difficulty: 'Intermediate',
    estimatedDuration: '10-12 hours',
    description: 'Investigate risk factors associated with personal loan defaults. Formulate hypotheses on debt-to-income ratios and credit history, calculate confidence intervals, and present findings.',
    requiredTools: ['Python', 'Jupyter Notebook', 'Seaborn / Matplotlib', 'Statsmodels'],
    learningOutcomes: [
      'Perform exploratory data analysis and outlier detection',
      'Conduct two-sample t-tests and Chi-Square tests of independence',
      'Quantify the dollar impact of risk-weighted thresholds for underwriting',
    ],
    milestones: [
      'Clean 25,000 borrower profiles',
      'Formulate statistical hypotheses and verify normality assumptions',
      'Generate publication-quality correlation heatmaps and charts',
      'Write an executive risk management memo',
    ],
  },
  {
    id: 'proj-rec-3',
    title: 'Hospital Patient Readmission Analytics Pipeline',
    skillsDeveloped: ['SQL Query Optimization', 'Tableau / Power BI', 'Healthcare Domain Metrics'],
    difficulty: 'Advanced',
    estimatedDuration: '16-18 hours',
    description: 'Analyze clinical encounter data to identify patients at highest risk of 30-day readmissions. Optimize query performance using database indexes and construct patient flow dashboards.',
    requiredTools: ['PostgreSQL', 'Power BI', 'SQL Query Profiler'],
    learningOutcomes: [
      'Optimize query execution plans across large healthcare logs',
      'Calculate Length-of-Stay (LOS) variations across specialized departments',
      'Create HIPAA-compliant aggregated analytical reports',
    ],
    milestones: [
      'Schema design and data normalization',
      'Query optimization and indexing benchmark',
      'Interactive executive dashboard creation',
      'Portfolio presentation recording',
    ],
  },
];

// Ergonomic aliases for cross-view imports
export const DEMO_ALEX_PROFILE = INITIAL_DEMO_PROFILE;
export const SAMPLE_TODAY_PLAN = INITIAL_TODAY_PLAN;
export const SAMPLE_RESOURCES = INITIAL_RESOURCES;
export const SAMPLE_PROJECTS = INITIAL_PROJECTS;
export const SAMPLE_PRACTICE_QUESTIONS = INITIAL_PRACTICE_QUESTIONS;

