import {
  LearnerProfile,
  CareerProfileAnalysisResult,
  SkillGapAnalysis,
  TargetRoleProfile,
  SkillComparison,
  SkillComparisonStatus,
  SkillGapAnswerPayload,
} from '../types';
import { GeminiService } from './geminiService';

export class SkillGapAnalyzer {
  /**
   * Generates a lightweight fingerprint of the learner's profile
   * to detect when the learner edits their skills, role, projects, or certifications.
   */
  static generateProfileFingerprint(profile: LearnerProfile): string {
    const skillsKey = (profile.technicalSkills || [])
      .map((s) => `${s.name}:${s.level}`)
      .sort()
      .join('|');
    const projectsKey = (profile.projects || [])
      .map((p) => p.name || p.title)
      .sort()
      .join('|');
    const certsKey = (profile.certifications || [])
      .map((c) => c.name)
      .sort()
      .join('|');
    return `${profile.targetRole || ''}__${skillsKey}__${profile.yearsExperience || ''}__${projectsKey}__${certsKey}`;
  }

  /**
   * Generates industry role requirements using Gemini
   */
  static async generateRoleRequirements(targetRole: string): Promise<TargetRoleProfile> {
    return await GeminiService.generateRoleRequirements(targetRole);
  }

  /**
   * Executes the full Gemini Skill Gap Analysis Agent
   */
  static async analyzeSkillGaps(
    learnerProfile: LearnerProfile,
    careerAnalysis?: CareerProfileAnalysisResult | null,
    targetRoleOverride?: string,
    roleRequirements?: TargetRoleProfile | null
  ): Promise<SkillGapAnalysis> {
    const role = targetRoleOverride || learnerProfile.targetRole || 'Data Analyst';
    const fingerprint = this.generateProfileFingerprint(learnerProfile);

    const payload = {
      targetRole: role,
      currentSkills: learnerProfile.technicalSkills || [],
      learnerProfile: {
        name: learnerProfile.name,
        currentRole: learnerProfile.currentRole,
        currentEducation: learnerProfile.currentEducation,
        yearsExperience: learnerProfile.yearsExperience,
        targetRole: role,
        careerGoal: learnerProfile.careerGoal,
        technicalSkills: learnerProfile.technicalSkills,
        softSkills: learnerProfile.softSkills,
        projects: learnerProfile.projects,
        certifications: learnerProfile.certifications,
      },
      careerAnalysis: careerAnalysis || undefined,
      roleRequirements: roleRequirements || undefined,
    };

    const analysis = await GeminiService.analyzeSkillGaps(payload);
    analysis.learnerProfileFingerprint = fingerprint;
    return analysis;
  }

  /**
   * Answers a natural language question about skill gaps using Gemini
   */
  static async askQuestion(
    question: string,
    analysis: SkillGapAnalysis,
    learnerProfile: LearnerProfile
  ): Promise<string> {
    const payload: SkillGapAnswerPayload = {
      question,
      targetRole: analysis.targetRole,
      analysisSummary: analysis.summary,
      comparisons: analysis.comparisons,
      learnerName: learnerProfile.name,
    };

    return await GeminiService.answerSkillGapQuestion(payload);
  }

  /**
   * Provides the calibrated demo skill-gap analysis for Alex (Prompt 3 baseline)
   */
  static getDemoSkillGapAnalysis(
    profile: LearnerProfile,
    roleOverride?: string
  ): SkillGapAnalysis {
    const role = roleOverride || profile.targetRole || 'Data Analyst';
    const fingerprint = this.generateProfileFingerprint(profile);

    const comparisons: SkillComparison[] = [
      {
        skill: 'Power BI',
        currentLevel: 'Beginner',
        requiredLevel: 'Intermediate',
        status: 'Gap',
        priority: 'High',
        evidence: [
          'Resume: Junior Operations Specialist managing operational spreadsheets',
          'Self-reported: Beginner level in Power BI',
          'No production dashboards or DAX calculations found in portfolio',
        ],
        explanation:
          'Power BI appears at beginner level in your profile, while the AI-generated Data Analyst role profile identifies interactive dashboarding, data modeling, and business reporting as essential capabilities.',
        whatToLearn: [
          'Data modeling (star schema vs snowflake architecture)',
          'DAX fundamentals (CALCULATE, RELATED, FILTER, SUMX)',
          'Interactive dashboard design with drill-throughs and slicers',
        ],
        category: 'Data Visualization',
      },
      {
        skill: 'Statistics',
        currentLevel: 'Beginner',
        requiredLevel: 'Intermediate',
        status: 'Gap',
        priority: 'High',
        evidence: [
          'Coursework includes introductory algebra and statistics',
          'No practical A/B test analysis or hypothesis testing documented in projects',
        ],
        explanation:
          'Statistical inference is required for interpreting analytical variance, calculating confidence intervals, and evaluating business experiments.',
        whatToLearn: [
          'Hypothesis testing (p-values, null hypothesis, two-sample t-tests)',
          'Probability distributions and sampling theory',
          'A/B testing methodology and sample size determination',
        ],
        category: 'Analytics & Math',
      },
      {
        skill: 'SQL',
        currentLevel: 'Intermediate',
        requiredLevel: 'Advanced',
        status: 'Developing',
        priority: 'High',
        evidence: [
          'Proficient with multi-table JOINs, GROUP BY aggregations, and subqueries',
          '1-2 years extracting production operational data at previous role',
        ],
        explanation:
          'Your SQL foundation is strong for data extraction, but industry benchmarks for Data Analysts expect proficiency in complex window functions, common table expressions (CTEs), and query plan optimization.',
        whatToLearn: [
          'Window functions (ROW_NUMBER, RANK, DENSE_RANK, LEAD, LAG)',
          'Recursive Common Table Expressions (WITH RECURSIVE)',
          'Query optimization, partitioning, and indexing strategies',
        ],
        category: 'Database & Querying',
      },
      {
        skill: 'Python',
        currentLevel: 'Intermediate',
        requiredLevel: 'Intermediate',
        status: 'Strong',
        priority: 'Low',
        evidence: [
          'Verified coursework and portfolio exploratory data analysis scripts',
          'Experience with pandas, numpy, and Jupyter notebooks',
        ],
        explanation:
          'Your current Python capability in data wrangling and exploratory analysis meets industry expectations for entry to mid-level Data Analysts.',
        whatToLearn: [
          'Advanced pandas vectorization for large datasets',
          'Interactive charting with Plotly and Seaborn',
        ],
        category: 'Programming',
      },
      {
        skill: 'Excel',
        currentLevel: 'Intermediate',
        requiredLevel: 'Advanced',
        status: 'Developing',
        priority: 'Medium',
        evidence: [
          'Daily operational tracking in Excel with VLOOKUP and pivot tables',
        ],
        explanation:
          'Solid day-to-day spreadsheet competency. Mastering dynamic arrays and Power Query transformations will accelerate ad-hoc business reporting.',
        whatToLearn: [
          'Modern dynamic array formulas (XLOOKUP, FILTER, UNIQUE)',
          'Power Query ETL transformations inside Excel',
        ],
        category: 'Data Wrangling',
      },
      {
        skill: 'Data Modeling',
        currentLevel: 'Unknown',
        requiredLevel: 'Intermediate',
        status: 'Unknown',
        priority: 'Medium',
        evidence: [
          'No explicit evidence of dimensional modeling, ER diagrams, or schema design in profile',
        ],
        explanation:
          'There is insufficient evidence in your resume and portfolio to evaluate relational data modeling. This is treated as unverified rather than an outright absence.',
        whatToLearn: [
          'Dimensional modeling (Fact and Dimension tables)',
          'Database normalization principles (1NF, 2NF, 3NF)',
        ],
        category: 'Architecture',
      },
    ];

    return {
      id: 'demo-alex-gap-01',
      targetRole: role,
      roleRequirements: [
        {
          skill: 'SQL',
          importance: 'High',
          expectedLevel: 'Advanced',
          reason: 'Used for querying, joining, and aggregating structured databases',
        },
        {
          skill: 'Python',
          importance: 'High',
          expectedLevel: 'Intermediate',
          reason: 'Used for automated data manipulation, cleaning, and analysis',
        },
        {
          skill: 'Power BI',
          importance: 'High',
          expectedLevel: 'Intermediate',
          reason: 'Used for business dashboarding and executive stakeholder reporting',
        },
        {
          skill: 'Statistics',
          importance: 'High',
          expectedLevel: 'Intermediate',
          reason: 'Used for hypothesis testing, experimentation, and quantitative reasoning',
        },
        {
          skill: 'Excel',
          importance: 'Medium',
          expectedLevel: 'Advanced',
          reason: 'Used for rapid financial modeling and operational analysis',
        },
      ],
      comparisons,
      alignmentPercentage: 68,
      topPriorities: [comparisons[0], comparisons[1], comparisons[2]],
      summary:
        'Your profile shows a solid foundation in Python, SQL, and Excel. The largest development areas for your selected Data Analyst role are Power BI and statistics. Your SQL skills appear to be developing toward the expected level. The next learning phase should prioritize Power BI fundamentals, statistics, and advanced SQL practice.',
      dependencies: [
        {
          prerequisite: 'SQL Basics',
          target: 'Advanced SQL',
          reason:
            'Foundational querying and joins are required before mastering multi-table window functions and complex CTEs.',
          chain: [
            'SQL Basics',
            'SQL Joins',
            'Advanced SQL (Window Functions)',
            'Data Analysis',
          ],
        },
        {
          prerequisite: 'Excel',
          target: 'Power BI',
          reason:
            'Understanding tabular data and spreadsheet formulas simplifies learning DAX measures and Power Query M logic.',
          chain: [
            'Excel Tables',
            'Data Cleaning',
            'Data Visualization',
            'Power BI Dashboards',
          ],
        },
        {
          prerequisite: 'Math Basics',
          target: 'A/B Testing',
          reason:
            'Descriptive statistics and probability are essential prerequisites for statistical experiment interpretation.',
          chain: [
            'Math Basics',
            'Descriptive Statistics',
            'Inferential Statistics',
            'A/B Testing',
          ],
        },
      ],
      counts: {
        strong: 1,
        developing: 2,
        gap: 2,
        unknown: 1,
      },
      analyzedAt: new Date().toISOString(),
      isDemoAnalysis: true,
      learnerProfileFingerprint: fingerprint,
    };
  }
}
