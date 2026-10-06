import express, { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";

function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function callGeminiSafe(
  ai: GoogleGenAI,
  params: { contents: any; config?: any }
) {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await ai.models.generateContent({
        model,
        ...params,
      });
    } catch (err: any) {
      lastError = err;
      const errStr = String(err?.message || err || "");
      const isTransient =
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("overloaded") ||
        errStr.includes("429") ||
        errStr.includes("quota") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("500") ||
        errStr.includes("DEADLINE_EXCEEDED") ||
        err?.status === "UNAVAILABLE" ||
        err?.status === "RESOURCE_EXHAUSTED";

      if (isTransient && i < models.length - 1) {
        console.warn(`[Project/Comm Resiliency] Model ${model} encountered transient issue (${errStr.slice(0, 90)}...), falling back to ${models[i + 1]}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function setupProjectAndCommunicationRoutes(app: express.Express) {
  // 1. Generate Structured Project Recommendations tailored to Learner Profile & Skill Gaps
  app.post("/api/agent/generate-project-recommendations", async (req: Request, res: Response) => {
    const {
      targetRole = "Data Analyst",
      currentSkills = [],
      skillGaps = [],
      priorityGaps = [],
      experienceLevel = "Intermediate",
      preferredProjectType = "Portfolio Capstone",
    } = req.body;

    const roleName = targetRole || "Data Analyst";
    const gapsList = (priorityGaps.length ? priorityGaps : skillGaps).map((g: any) =>
      typeof g === "string" ? g : g.skill || g.name
    );
    const keyMissing = gapsList.length > 0 ? gapsList.slice(0, 3) : ["Power BI", "SQL Window Functions", "Statistics"];

    const fallbackProjects = [
      {
        id: `proj-${roleName.toLowerCase().replace(/\s+/g, '-')}-1`,
        title: `${roleName} Portfolio Capstone: Customer Retention & Cohort Analytics`,
        problemStatement:
          "Subscription businesses experience hidden customer churn when behavioral drop-offs are not caught early. The company needs an automated cohort retention model and interactive stakeholder dashboard to identify high-risk accounts before renewal cycles.",
        objective:
          "Build an end-to-end analytics workflow that ingests transactional logs, calculates retention cohorts, and surfaces business insights through interactive visualization.",
        targetRole: roleName,
        skills: [...keyMissing, "Data Storytelling", "Executive Reporting"],
        skillsDeveloped: [...keyMissing, "Data Storytelling", "Executive Reporting"],
        technologies: ["SQL", "Power BI / Tableau", "Python (Pandas)", "Excel"],
        difficulty: "Intermediate",
        estimatedDuration: "12-15 hours",
        prerequisites: ["Basic SQL queries", "Spreadsheet fundamentals", "Introductory data modeling"],
        whyRecommended: `Directly targets your priority skill gap in ${keyMissing.join(" and ")}. Highly valued by hiring managers for ${roleName} roles because it demonstrates end-to-end analytical problem solving.`,
        portfolioValue:
          "Demonstrates multi-table data modeling, business metric definition (CLV, Churn Rate), and presentation-ready executive visual dashboards.",
        portfolioSkillsDemonstrated: ["SQL CTEs & Aggregations", "Business KPI Design", "Interactive Dashboarding"],
        requirements: {
          functional: [
            "Compute 30, 60, and 90-day repeat purchase retention curves",
            "Calculate Month-over-Month churn risk index across customer tiers",
            "Produce an interactive dashboard filterable by acquisition channel and customer tenure",
          ],
          technical: [
            "Write modular, indexed SQL queries utilizing Common Table Expressions (CTEs)",
            "Construct automated DAX / Calculated measures for dynamic metric cards",
            "Export structured summary tables for executive presentations",
          ],
          expectedInputs: ["50,000+ synthetic transactional order records (CSV or SQL database)"],
          expectedOutputs: ["Cleaned SQL schema", "Interactive Power BI / Tableau dashboard (.pbix / web link)", "1-page executive memo"],
          datasetRequirements: ["Customer IDs, Transaction Dates, Order Amounts, Product Categories, Status Codes"],
          suggestedTools: ["PostgreSQL / SQLite", "Power BI Desktop", "VS Code / DBeaver"],
        },
        milestones: [
          {
            id: "m-1",
            step: 1,
            title: "Understand Problem & Frame Business Questions",
            objective: "Define core KPIs (Churn Rate, Retention Rate, AOV) and formulate the analytical schema.",
            tasks: [
              "Review stakeholder brief and business objectives",
              "Define mathematical formulas for cohort retention and repeat purchase rate",
              "Document metric catalog with operational definitions",
            ],
            skills: ["Business Acumen", "KPI Definition"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-2",
            step: 2,
            title: "Data Ingestion & Quality Audit",
            objective: "Load dataset into SQL/database and run exploratory data checks for nulls, anomalies, and duplicates.",
            tasks: [
              "Create database schema and import raw transaction logs",
              "Identify missing values, timestamp irregularities, and negative prices",
              "Document data cleaning decisions in a reproducible script",
            ],
            skills: ["SQL", "Data Cleaning", "Data Auditing"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-3",
            step: 3,
            title: "Build Analytical SQL Queries & Cohorts",
            objective: "Write CTEs and Window Functions to segment customers into monthly cohorts and compute retention curves.",
            tasks: [
              "Calculate first purchase month for each user using MIN(order_date)",
              "Compute activity intervals using LAG/LEAD or date difference queries",
              "Aggregate retention matrix showing percentage active across months 1 through 12",
            ],
            skills: ["SQL Window Functions", "Cohort Analysis"],
            estimatedTime: "3.5 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-4",
            step: 4,
            title: "Design Interactive Stakeholder Dashboard",
            objective: "Connect database/clean tables to Power BI or Tableau to build executive visual reports.",
            tasks: [
              "Establish star schema data model with fact and dimension relationships",
              "Create calculated measures (Churn %, Revenue at Risk, MoM Growth)",
              "Build intuitive layout with high-level KPI cards and cohort heatmap visual",
            ],
            skills: ["Power BI", "DAX", "Data Visualization"],
            estimatedTime: "3.5 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-5",
            step: 5,
            title: "Analyze Findings & Draft Executive Memo",
            objective: "Synthesize findings into 3 concrete, data-backed business recommendations.",
            tasks: [
              "Identify the top 2 drop-off inflection points in customer lifecycle",
              "Draft concise 1-page executive summary memo with actionable strategies",
              "Quantify estimated revenue recovery from targeted re-engagement",
            ],
            skills: ["Executive Communication", "Data Storytelling"],
            estimatedTime: "1.5 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-6",
            step: 6,
            title: "Portfolio Packaging & GitHub Documentation",
            objective: "Package clean code, dashboard screenshots, and README for interview demonstrations.",
            tasks: [
              "Write professional GitHub README with problem statement, architecture, and results",
              "Capture high-resolution screenshots and create interactive demo link or PDF preview",
              "Draft 60-second interview project pitch summarizing business impact",
            ],
            skills: ["Technical Documentation", "Portfolio Presentation"],
            estimatedTime: "1.5 hours",
            completed: false,
            status: "not_started",
          },
        ],
      },
      {
        id: `proj-${roleName.toLowerCase().replace(/\s+/g, '-')}-2`,
        title: `${roleName} Exploratory Risk & Anomaly Detection Pipeline`,
        problemStatement:
          "Operations teams require rapid detection of financial or operational anomalies across high-volume transactions to prevent revenue leakage and mitigate compliance risks.",
        objective:
          "Develop statistical anomaly detection queries and automated alert scripts to classify risk tiers.",
        targetRole: roleName,
        skills: ["Python (Pandas)", "Statistics", "Exploratory Data Analysis"],
        skillsDeveloped: ["Python (Pandas)", "Statistics", "Exploratory Data Analysis"],
        technologies: ["Python", "Jupyter", "Seaborn / Matplotlib", "Scikit-Learn"],
        difficulty: "Intermediate",
        estimatedDuration: "10-12 hours",
        prerequisites: ["Introductory Python", "Descriptive statistics"],
        whyRecommended: "Bridges Python programming with statistical rigor, validating skills that differentiate candidates in technical interviews.",
        portfolioValue: "Proves competency in automated statistical detection, hypothesis testing, and exploratory analytics.",
        portfolioSkillsDemonstrated: ["Outlier Detection", "Hypothesis Testing", "Data Wrangling in Pandas"],
        requirements: {
          functional: ["Detect statistical outliers using Z-score and IQR methods", "Segment records into Low, Medium, and High risk tiers"],
          technical: ["Python script utilizing vectorized Pandas operations", "Visual distribution charts illustrating anomaly thresholds"],
          expectedInputs: ["Transaction logs with timestamps, amounts, and category codes"],
          expectedOutputs: ["Cleaned Jupyter notebook", "Risk segmentation summary table", "Executive slide deck"],
          datasetRequirements: ["Numerical fields with skewed distributions and outliers"],
          suggestedTools: ["VS Code / Jupyter Notebook", "GitHub"],
        },
        milestones: [
          {
            id: "m-2-1",
            step: 1,
            title: "Problem Scoping & Statistical Hypothesis",
            objective: "Define statistical definition of anomalous behavior for business context.",
            tasks: ["Formulate hypotheses on transaction irregularities", "Define risk threshold criteria"],
            skills: ["Statistical Modeling", "Problem Formulation"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-2-2",
            step: 2,
            title: "Data Ingestion & Exploratory Analysis",
            objective: "Analyze distributions, skewness, and variance across transaction features.",
            tasks: ["Load data in Pandas", "Generate distribution histograms and boxplots"],
            skills: ["Python", "Pandas", "Matplotlib"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-2-3",
            step: 3,
            title: "Anomaly Detection Algorithm Implementation",
            objective: "Apply statistical and machine learning algorithms (Z-score, Isolation Forest).",
            tasks: ["Implement outlier filters", "Benchmark false positive rates"],
            skills: ["Statistics", "Algorithms"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-2-4",
            step: 4,
            title: "Synthesis & Presentation Deck",
            objective: "Present detection results and operational action items for stakeholders.",
            tasks: ["Create executive slides", "Write comprehensive project README"],
            skills: ["Presentation", "Documentation"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started",
          },
        ],
      },
      {
        id: `proj-${roleName.toLowerCase().replace(/\s+/g, '-')}-3`,
        title: `${roleName} Operational Efficiency & Metric Optimization Suite`,
        problemStatement:
          "Internal workflow bottlenecks and delayed operational turnaround times drive up operational costs. Management needs clear data-backed recommendations on resource reallocation.",
        objective:
          "Synthesize disparate operational logs into unified performance scorecards and SLA tracking dashboards.",
        targetRole: roleName,
        skills: ["SQL", "Data Modeling", "Business Intelligence", "Excel"],
        skillsDeveloped: ["SQL", "Data Modeling", "Business Intelligence", "Excel"],
        technologies: ["SQL", "Power BI / Tableau", "Advanced Excel"],
        difficulty: "Beginner",
        estimatedDuration: "8-10 hours",
        prerequisites: ["Basic spreadsheets", "Basic query writing"],
        whyRecommended: "A friendly, high-leverage project that produces concrete business deliverables quickly, boosting confidence.",
        portfolioValue: "Highlights strong foundational data wrangling, SLA modeling, and dashboard design skills.",
        portfolioSkillsDemonstrated: ["SLA Metrics", "Relational Modeling", "Executive Scorecards"],
        requirements: {
          functional: ["Calculate cycle time and bottleneck durations", "Display SLA violation rates across departments"],
          technical: ["Normalized relational tables", "Conditional formatting and interactive parameters in BI tool"],
          expectedInputs: ["Support ticket logs or order fulfillment logs"],
          expectedOutputs: ["Executive scorecard dashboard", "Process efficiency audit report"],
          datasetRequirements: ["Timestamps: Created, Assigned, Resolved, Status, Department"],
          suggestedTools: ["PostgreSQL / SQLite", "Power BI Desktop"],
        },
        milestones: [
          {
            id: "m-3-1",
            step: 1,
            title: "Define Operational Metrics & Cycle Times",
            objective: "Map out workflow stages and establish baseline SLA thresholds.",
            tasks: ["Identify process bottlenecks", "Calculate average turnaround time"],
            skills: ["Business Metrics", "Requirements Gathering"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-3-2",
            step: 2,
            title: "SQL Data Modeling & Stage Duration Queries",
            objective: "Write SQL queries to compute duration between consecutive status updates.",
            tasks: ["Calculate time-in-state intervals", "Identify top 5 slow stages"],
            skills: ["SQL", "Data Wrangling"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-3-3",
            step: 3,
            title: "Interactive Scorecard Construction",
            objective: "Build operational dashboard showing department performance vs target SLAs.",
            tasks: ["Build scorecard layout", "Implement slicers for department and time window"],
            skills: ["Power BI", "Data Visualization"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started",
          },
          {
            id: "m-3-4",
            step: 4,
            title: "Documentation & Portfolio Packaging",
            objective: "Document findings, methodology, and upload repository with clean screenshots.",
            tasks: ["Document insights", "Publish repository and project walkthrough"],
            skills: ["Documentation", "Presentation"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started",
          },
        ],
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ projects: fallbackProjects, isFallback: true });
      }

      const prompt = `You are EduPath AI's Intelligent Project Generator.
Generate 3 realistic, portfolio-worthy projects specifically designed for a learner targeting the role "${roleName}".
Learner Current Skills: ${(currentSkills || []).map((s: any) => typeof s === 'string' ? s : s.name).join(", ") || "SQL, Python basics, Excel"}.
Priority Skill Gaps to Close: ${keyMissing.join(", ")}.
Experience Level: ${experienceLevel}.

Each project must be deeply practical, grounded in real industry business scenarios (e.g. E-Commerce, Fintech, Healthcare, SaaS, Supply Chain), and provide 5-6 progressive milestones (Understand Problem, Ingest & Audit Data, Build Core Solution/Queries, Visualization/Dashboard, Analyze Findings & Executive Memo, Portfolio Documentation).

Return pure valid JSON with NO markdown formatting matching this structure:
{
  "projects": [
    {
      "id": "string",
      "title": "string",
      "problemStatement": "string",
      "objective": "string",
      "targetRole": "${roleName}",
      "skills": ["string"],
      "skillsDeveloped": ["string"],
      "technologies": ["string"],
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "estimatedDuration": "e.g. 12-14 hours",
      "prerequisites": ["string"],
      "whyRecommended": "string explaining how it targets their priority skill gaps",
      "portfolioValue": "string describing hiring manager impact",
      "portfolioSkillsDemonstrated": ["string"],
      "requirements": {
        "functional": ["string"],
        "technical": ["string"],
        "expectedInputs": ["string"],
        "expectedOutputs": ["string"],
        "datasetRequirements": ["string"],
        "suggestedTools": ["string"]
      },
      "milestones": [
        {
          "id": "string",
          "step": number,
          "title": "string",
          "objective": "string",
          "tasks": ["string"],
          "skills": ["string"],
          "estimatedTime": "string",
          "completed": false,
          "status": "not_started"
        }
      ]
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.projects && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        return res.json({ projects: parsed.projects, isFallback: false });
      }
      return res.json({ projects: fallbackProjects, isFallback: true });
    } catch (err: any) {
      console.warn("Project recommendations error, using role-specific fallbacks:", err?.message);
      return res.json({ projects: fallbackProjects, isFallback: true });
    }
  });

  // 2. Ask AI Project Mentor (Pedagogical Guidance: Hint -> Explanation -> Example -> Deeper Guidance)
  app.post("/api/agent/ask-project-mentor", async (req: Request, res: Response) => {
    const { project, milestone, question, codeSnippet, learnerProfile } = req.body;
    const lowerQ = (question || "").toLowerCase();

    const getFallbackMentorResponse = () => {
      if (lowerQ.includes("how should i start") || lowerQ.includes("where do i start") || lowerQ.includes("start")) {
        return {
          reply: `### 💡 Step 1: Clarify the Core Question
Before opening your tools or writing code, write down the 1-2 primary business questions your project must answer. For example:
- *"Which customer acquisition channel produces the highest 90-day repeat rate?"*

### 🔍 Explanation: Why This Matters
Hiring managers evaluate whether you understand **why** you're analyzing data, not just that you can execute commands.

### 📝 Concrete Action
1. Create a project folder with two subdirectories: \`/data\` and \`/queries\` (or \`/notebooks\`).
2. Load the sample CSV or SQLite database and inspect the first 10 rows.
3. Verify that every column has the expected data type (e.g., date formats, numeric prices).

### 🚀 Next Step
Once your schema is verified, check in with me on Milestone 2 to structure your exploratory queries!`,
        };
      }

      if (lowerQ.includes("stuck") || lowerQ.includes("hint") || lowerQ.includes("error")) {
        return {
          reply: `### 💡 Pedagogical Hint
When stuck on this milestone, isolate the issue into the smallest testable piece:
- If this is a **query issue**: Run your inner subquery independently before joining it.
- If this is a **DAX / metric issue**: Create a single summary card with a simple count or sum before adding complex filters.

### 🔍 Explanation
Most errors occur because multiple transformations are attempted simultaneously. By decoupling filtering from aggregation, you can quickly locate where null values or discrepancies are introduced.

### 📝 Example
For cohort calculation, start with:
\`\`\`sql
SELECT user_id, MIN(order_date) AS cohort_month
FROM transactions
GROUP BY user_id;
\`\`\`
Verify this produces one row per user before joining it back to transactions!

### 🎯 Deeper Guidance
Try running the isolated query above. If you share the exact output or error message, we can refine the join together!`,
        };
      }

      if (lowerQ.includes("interview") || lowerQ.includes("present")) {
        return {
          reply: `### 🎙️ How to Pitch This in an Interview (STAR Method)

**Situation**: *"In this project, I investigated customer retention patterns across 50,000 transaction records where business stakeholders lacked visibility into 90-day churn drivers."*

**Task**: *"My goal was to construct a reproducible cohort model and an interactive Power BI dashboard to give leadership actionable retention metrics."*

**Action**: *"I wrote modular SQL queries utilizing CTEs and window functions to segment customer cohorts, established a star-schema data model, and built DAX measures for MoM churn and revenue at risk."*

**Result**: *"The analysis pinpointed that 65% of customer drop-offs occurred between weeks 3 and 6, and I outlined 3 data-backed retention initiatives to recover lost revenue."*

### 💡 Pro Tip
Always lead with the business impact number before showing your query code!`,
        };
      }

      return {
        reply: `### 💡 Mentor Guidance: ${milestone?.title || project?.title || "Active Milestone"}

**Hint**: Focus on solving the immediate objective: *${milestone?.objective || "Verify data inputs and establish clear metrics."}*

**Explanation**: In production workflows for ${project?.targetRole || "Data Analysts"}, breaking down requirements into documented milestones prevents scope creep and ensures reproducibility.

**Recommended Next Step**:
1. Check off tasks in order: *${(milestone?.tasks || ["Verify data schema", "Write test query"])[0]}*
2. Save your progress to your local project directory or repository.

Would you like a code snippet, architectural hint, or interview talking point for this step?`,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ ...getFallbackMentorResponse(), isFallback: true });
      }

      const prompt = `You are EduPath AI's Project Mentor.
You are mentoring a learner on:
Project: "${project?.title || 'Data Analytics Project'}"
Target Role: "${project?.targetRole || 'Data Analyst'}"
Active Milestone: "${milestone?.title || 'Milestone'}" (Objective: "${milestone?.objective || 'Complete milestone tasks'}")
Learner Question: "${question}"
${codeSnippet ? `Code / Query Provided by Learner:\n${codeSnippet}\n` : ""}

PEDAGOGICAL DIRECTIVE:
Follow this exact 4-tier coaching structure:
1. 💡 Hint (Guide their thinking without immediately dumping a finished answer)
2. 🔍 Explanation (Explain the underlying concept or architectural reason)
3. 📝 Example or Scaffold (Provide a clear, educational illustration or code snippet)
4. 🚀 Deeper Guidance / Next Step (Empower them to take the immediate next action)

Keep the response supportive, technically rigorous, concise, and formatted with clean markdown headings and bullet points.`;

      const response = await callGeminiSafe(ai, { contents: prompt });
      return res.json({
        reply: response.text || getFallbackMentorResponse().reply,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("Project mentor error, using pedagogical fallback:", err?.message);
      return res.json({ ...getFallbackMentorResponse(), isFallback: true });
    }
  });

  // 3. AI Project Review Agent (Strict Evaluation, Strengths, Gaps, Interview Talking Points)
  app.post("/api/agent/review-project", async (req: Request, res: Response) => {
    const { project, submission } = req.body;

    const descLength = (submission?.description || "").length;
    const hasGithub = Boolean(submission?.githubUrl && submission?.githubUrl.includes("github.com"));
    const hasDemo = Boolean(submission?.demoUrl && submission?.demoUrl.length > 5);

    const fallbackReview = {
      reviewedAt: new Date().toISOString(),
      overallSummary: `Solid project submission for "${project?.title || 'Portfolio Project'}". The work demonstrates clear progress in data wrangling and metric calculation, with tangible portfolio assets for ${project?.targetRole || 'Data Analyst'} candidate evaluation.`,
      strengths: [
        "Clearly articulated business problem statement and objective in submission documentation",
        `Practiced core technical competencies in ${(project?.skills || ["SQL", "Power BI", "Data Modeling"]).join(", ")}`,
        submission?.keyFeatures && submission?.keyFeatures.length > 0
          ? `Defined ${submission.keyFeatures.length} concrete functional features`
          : "Structured multi-phase milestones and analytical queries",
        hasGithub
          ? "Provided GitHub repository link for code transparency"
          : "Documented reproducible query and analysis workflows",
      ],
      areasForImprovement: [
        "Include unit testing or edge-case validation checks (e.g. how nulls or currency conversions are handled)",
        "Provide explicit percentage benchmark comparisons against baseline industry metrics",
        "Add visual dashboard annotations explaining sudden metric anomalies or outliers",
      ],
      technicalSuggestions: [
        "Optimize SQL execution plans by ensuring indexes exist on frequently joined foreign keys (e.g. user_id, order_date)",
        "In Power BI / Tableau, separate fact tables from dimension tables using a clean star-schema model to improve filter performance",
        "Ensure all DAX / calculated columns avoid unnecessary table iteration (use measures instead of calculated columns where possible)",
      ],
      missingFeatures: [
        "Automated data refresh schedule or pipeline documentation",
        "Stakeholder FAQ or metric glossary document explaining calculated ratios",
      ],
      documentationSuggestions: [
        "In your GitHub README, include a high-resolution dashboard screenshot above the fold",
        "Add a 3-bullet 'Key Business Takeaways' section at the very top of your README for hiring managers who only have 30 seconds",
      ],
      presentationSuggestions: [
        "Lead your demo with the business impact: 'This dashboard enabled leadership to identify a 14% drop in week-4 retention'",
        "Avoid narrating standard setup steps; focus on the analytical decisions and trade-offs you made",
      ],
      portfolioSuggestions: [
        "Feature this project prominently on your resume under 'Technical Capstone Projects'",
        "Include 2 bullet points emphasizing metric quantified outcomes (e.g. 'Analyzed 50k+ records to pinpoint churn drivers')",
      ],
      interviewTalkingPoints: [
        "Be prepared to explain why you chose your specific cohort definitions and how you validated transaction integrity",
        "Explain the trade-offs between calculating retention in SQL vs. dynamically in Power BI DAX",
      ],
      portfolioSkillsDemonstrated: (project?.skills || ["SQL", "Data Visualization", "Data Modeling"]).slice(0, 4),
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ review: fallbackReview, isFallback: true });
      }

      const prompt = `You are EduPath AI's Senior Technical Project Reviewer.
Review the following student project submission for the role "${project?.targetRole || 'Data Analyst'}":

Project Title: "${project?.title}"
Objective: "${project?.objective}"
Required Skills: ${(project?.skills || []).join(", ")}

Student Submission Details:
- Description: "${submission?.description || 'Completed project implementation'}"
- Technologies Used: ${(submission?.technologies || []).join(", ") || 'SQL, BI'}
- Key Features: ${(submission?.keyFeatures || []).join("; ") || 'Cohort analysis and dashboard'}
- Challenges Faced: "${submission?.challengesFaced || 'Handling missing values and complex date joins'}"
- Learning Outcomes: "${submission?.learningOutcomes || 'Learned how to use window functions for retention curves'}"
- Repository URL: ${submission?.githubUrl || 'None provided'}
- Demo URL: ${submission?.demoUrl || 'None provided'}

RULES:
1. Label all feedback clearly as "AI Project Review".
2. Never claim code has been executed on a remote server if you are evaluating text descriptions.
3. Evaluate observable features, technical depth, and presentation rigor.

Return pure valid JSON with NO markdown wrappers matching this exact structure:
{
  "review": {
    "reviewedAt": "${new Date().toISOString()}",
    "overallSummary": "string",
    "strengths": ["string", "string", "string"],
    "areasForImprovement": ["string", "string", "string"],
    "technicalSuggestions": ["string", "string"],
    "missingFeatures": ["string"],
    "documentationSuggestions": ["string", "string"],
    "presentationSuggestions": ["string", "string"],
    "portfolioSuggestions": ["string", "string"],
    "interviewTalkingPoints": ["string", "string"],
    "portfolioSkillsDemonstrated": ["string", "string"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.review) {
        return res.json({ review: parsed.review, isFallback: false });
      }
      return res.json({ review: fallbackReview, isFallback: true });
    } catch (err: any) {
      console.warn("Project review error, using detailed fallback:", err?.message);
      return res.json({ review: fallbackReview, isFallback: true });
    }
  });

  // 4. Communication Coach: Grammar Practice Generator (8 specific modes)
  app.post("/api/agent/generate-grammar-practice", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", level = "intermediate", type = "sentence_correction" } = req.body;

    const fallbackExercises = [
      {
        id: "gram-1",
        type: "sentence_correction",
        prompt: "Identify the grammatical error in this stakeholder update: 'The team have identified that the database queries was running slow due to missing indexes.'",
        options: [
          "'queries was' should be 'queries were'",
          "'have identified' should be 'has identify'",
          "'due to' should be 'because for'",
          "There is no grammatical error",
        ],
        correctAnswer: "'queries was' should be 'queries were'",
        explanation: "'Queries' is a plural noun and requires the plural verb 'were', not 'was'.",
        commonMistake: "Mixing singular and plural subject-verb agreement when modifying phrases intervene.",
        improvedSentence: "The team has identified that database queries were executing slowly due to missing indexes.",
        level: "intermediate",
      },
      {
        id: "gram-2",
        type: "tenses",
        prompt: "Choose the correct verb tense for past project accomplishments: 'Last quarter, our analytics team _____ a predictive churn model that reduced churn by 8%.'",
        options: ["developed", "has developed", "develops", "was developed"],
        correctAnswer: "developed",
        explanation: "When referencing a completed time frame in the past ('Last quarter'), use the simple past tense ('developed').",
        commonMistake: "Overusing the present perfect ('has developed') when a specific past time anchor is provided.",
        improvedSentence: "Last quarter, our analytics team developed a predictive churn model that reduced customer churn by 8%.",
        level: "beginner",
      },
      {
        id: "gram-3",
        type: "subject_verb",
        prompt: "Select the sentence with correct subject-verb agreement for technical reports:",
        options: [
          "Neither the database administrators nor the software engineer was notified of the server migration.",
          "Neither the database administrators nor the software engineer were notified of the server migration.",
          "Both the database administrator nor the engineer is notified.",
          "Neither of the reports show significant variation.",
        ],
        correctAnswer: "Neither the database administrators nor the software engineer was notified of the server migration.",
        explanation: "When subjects are joined by 'neither... nor', the verb agrees with the subject closer to it ('the software engineer' is singular, so use 'was').",
        commonMistake: "Assuming compound subjects joined by 'nor' always take a plural verb.",
        improvedSentence: "Neither the database administrators nor the lead software engineer was notified of the server migration.",
        level: "advanced",
      },
      {
        id: "gram-4",
        type: "prepositions",
        prompt: "Choose the correct preposition: 'The analytical findings are consistent _____ our initial hypothesis.'",
        options: ["with", "to", "at", "for"],
        correctAnswer: "with",
        explanation: "The adjective 'consistent' idiomatically takes the preposition 'with' when denoting compatibility or agreement.",
        commonMistake: "Using 'consistent to' or 'consistent of'.",
        improvedSentence: "The analytical findings are consistent with our initial hypothesis regarding user retention drop-offs.",
        level: "intermediate",
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ exercises: fallbackExercises, isFallback: true });
      }

      const prompt = `You are EduPath AI's Communication & Grammar Practice Agent.
Generate 4 interactive grammar exercises designed for technical and corporate career candidates (${targetRole}).
Level: ${level}. Preferred Type: ${type}.
Types include: fill_in_the_blank, sentence_correction, tenses, articles, prepositions, subject_verb, restructuring.

Return pure valid JSON with NO markdown formatting:
{
  "exercises": [
    {
      "id": "string",
      "type": "fill_in_the_blank" | "sentence_correction" | "tenses" | "articles" | "prepositions" | "subject_verb" | "restructuring",
      "prompt": "string",
      "options": ["string", "string", "string", "string"],
      "correctAnswer": "string exactly matching one of options",
      "explanation": "string explaining the grammar rule",
      "commonMistake": "string highlighting why people get this wrong",
      "improvedSentence": "string showing pristine executive sentence",
      "level": "${level}"
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.exercises && Array.isArray(parsed.exercises) && parsed.exercises.length > 0) {
        return res.json({ exercises: parsed.exercises, isFallback: false });
      }
      return res.json({ exercises: fallbackExercises, isFallback: true });
    } catch (err: any) {
      console.warn("Grammar practice error, using fallback:", err?.message);
      return res.json({ exercises: fallbackExercises, isFallback: true });
    }
  });

  // 5. Communication Coach: Vocabulary Builder for Career Roles
  app.post("/api/agent/generate-vocabulary-practice", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst" } = req.body;

    const fallbackVocab = [
      {
        id: "voc-1",
        word: "Synthesize",
        meaning: "To combine distinct elements, data sources, or findings into a coherent, structured whole.",
        example: "The analyst synthesized feedback from 20 user interviews with database engagement logs to pinpoint churn drivers.",
        careerContext: "Crucial for resumes and interview answers when explaining how you turn raw data into executive conclusions.",
        practiceQuestion: "Which sentence best demonstrates the word 'synthesize' in a technical interview?",
        options: [
          "I synthesized transaction metrics across three regional databases into a single predictive dashboard for executive leadership.",
          "I synthesized my computer when it was running out of RAM.",
          "The database synthesized an error message during deployment.",
          "We synthesized all emails by deleting them immediately.",
        ],
        targetRole,
      },
      {
        id: "voc-2",
        word: "Anomalous",
        meaning: "Deviating from what is standard, normal, or expected; irregular.",
        example: "The automated alert flagged anomalous traffic spikes originating from unverified IP ranges.",
        careerContext: "Demonstrates data precision when discussing data cleaning, outliers, fraud detection, or latency issues.",
        practiceQuestion: "How should an analyst describe an outlier to non-technical leadership?",
        options: [
          "We detected an anomalous surge in checkout drop-offs and isolated the root cause to payment gateway timeouts.",
          "The data was weird and bad so we deleted it.",
          "Everything in the dataset was completely anomalous and perfect.",
          "Anomalous tables are when SQL has too many columns.",
        ],
        targetRole,
      },
      {
        id: "voc-3",
        word: "Extrapolate",
        meaning: "To estimate or conclude the value of an unknown variable by extending known data or trends.",
        example: "Based on Q1 customer acquisition trends, we extrapolated full-year subscription revenue with a 95% confidence interval.",
        careerContext: "Demonstrates forward-looking business acumen and predictive modeling awareness.",
        practiceQuestion: "Which context represents correct usage of 'extrapolate'?",
        options: [
          "Using 6 months of pilot data, we extrapolated projected operational cost savings across all global fulfillment centers.",
          "We extrapolated the CSV file into a folder on my desktop.",
          "The server extrapolated when too many users logged in.",
          "I extrapolated my password because I forgot it.",
        ],
        targetRole,
      },
      {
        id: "voc-4",
        word: "Mitigate",
        meaning: "To make less severe, serious, or painful; to reduce risk or damage.",
        example: "To mitigate revenue leakage, we introduced automated validation checks at the point of checkout.",
        careerContext: "High-value executive term used in postmortems, risk assessments, and project summaries.",
        practiceQuestion: "Select the sentence using 'mitigate' appropriately in a performance review:",
        options: [
          "We implemented query caching to mitigate latency bottlenecks during peak traffic hours.",
          "I mitigated my report by printing ten copies.",
          "The SQL query mitigated all rows from the database.",
          "We mitigated our manager into giving us extra days.",
        ],
        targetRole,
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ items: fallbackVocab, isFallback: true });
      }

      const prompt = `You are EduPath AI's Career Vocabulary Coach.
Generate 4 high-impact career vocabulary items tailored for candidates pursuing "${targetRole}".
Words should elevate communication from informal/generic to precise, credible, and executive-ready.

Return pure valid JSON with NO markdown formatting:
{
  "items": [
    {
      "id": "string",
      "word": "string",
      "meaning": "string",
      "example": "string",
      "careerContext": "string",
      "practiceQuestion": "string",
      "options": ["string", "string", "string", "string"],
      "targetRole": "${targetRole}"
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
        return res.json({ items: parsed.items, isFallback: false });
      }
      return res.json({ items: fallbackVocab, isFallback: true });
    } catch (err: any) {
      console.warn("Vocabulary practice error, using fallback:", err?.message);
      return res.json({ items: fallbackVocab, isFallback: true });
    }
  });

  // 6. Communication Coach: Professional Introduction Generator
  app.post("/api/agent/generate-professional-intro", async (req: Request, res: Response) => {
    const { name = "Alex", education = "Information Systems", skills = ["SQL", "Python", "Power BI"], targetRole = "Data Analyst", projects = ["E-Commerce Cohort Dashboard"], careerGoal = "Drive business growth through actionable data insights" } = req.body;

    const skillsStr = (skills || []).map((s: any) => typeof s === 'string' ? s : s.name).join(", ");
    const fallbackDraft = {
      introduction: `Hello, I'm ${name}. I hold a background in ${education} and specialize in turning complex transactional data into actionable business intelligence. My core technical strengths include ${skillsStr}. Recently, I designed and delivered an end-to-end ${projects[0] || 'Analytics Dashboard'}, which enabled stakeholders to analyze 90-day retention curves and identify high-value customer segments. I'm passionate about joining a high-impact team as a ${targetRole}, where I can combine analytical rigor with clear stakeholder communication to solve critical business challenges.`,
      strengths: [
        "Clearly connects technical competencies with business outcomes",
        "Includes a concrete portfolio project highlight",
        "Establishes enthusiasm and alignment with the target role",
      ],
      tone: "Professional, Confident, & Articulate",
      wordCount: 82,
      variants: {
        improved: `Hi, I'm ${name}. With a solid foundation in ${education}, I specialize in bridging technical data infrastructure and business decision-making. Leveraging ${skillsStr}, I recently built a ${projects[0] || 'Cohort Analytics Dashboard'} to diagnose customer drop-offs and forecast retention trends. As a prospective ${targetRole}, my objective is to translate operational metrics into strategic growth levers for leadership.`,
        concise: `Hello, I'm ${name}, a ${targetRole} specializing in ${skillsStr}. In my recent ${projects[0] || 'Capstone Project'}, I modeled customer retention cohorts to give leadership clear visibility into churn drivers. I'm excited to bring my analytical rigor and data storytelling to your team.`,
        executive: `Good morning. My name is ${name}. As an aspiring ${targetRole}, I focus on driving bottom-line efficiency through quantitative analysis. My recent work on the ${projects[0] || 'Cohort Retention Suite'} modeled 50,000+ customer records to pinpoint retention inflection points. I look forward to discussing how my skills in ${skillsStr} can accelerate your analytical initiatives.`,
      },
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ draft: fallbackDraft, isFallback: true });
      }

      const prompt = `You are EduPath AI's Professional Introduction Coach.
Craft a compelling professional introduction for:
Name: ${name}
Education: ${education}
Target Role: ${targetRole}
Key Skills: ${skillsStr}
Notable Projects: ${(projects || []).join(", ")}
Career Goal: ${careerGoal}

Generate 1 primary draft and 3 distinct variants:
1. Improved (polite, narrative-driven)
2. Concise (60-second elevator pitch)
3. Executive (focused on business ROI and leadership)

Return pure valid JSON with NO markdown formatting:
{
  "draft": {
    "introduction": "string",
    "strengths": ["string", "string", "string"],
    "tone": "string",
    "wordCount": number,
    "variants": {
      "improved": "string",
      "concise": "string",
      "executive": "string"
    }
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.draft) {
        return res.json({ draft: parsed.draft, isFallback: false });
      }
      return res.json({ draft: fallbackDraft, isFallback: true });
    } catch (err: any) {
      console.warn("Professional intro error, using fallback:", err?.message);
      return res.json({ draft: fallbackDraft, isFallback: true });
    }
  });

  // 7. Communication Coach: Improve Communication (Original, Corrected, Why, Professional, Simpler)
  app.post("/api/agent/improve-communication", async (req: Request, res: Response) => {
    const { userText, context = "Stakeholder Email", targetRole = "Data Analyst", communicationGoal = "Executive Clarity" } = req.body;

    const fallbackResult = {
      original: userText || "Hi team, basically what happened was the SQL queries was running very slow because of lack of indexes on user_id. We noticed a 40 percent drop in page loading times after we fixed that stuff. Please let me know if anyone have questions.",
      correctedVersion:
        "Hi team, our investigation revealed that database queries were running slowly due to missing indexes on user_id. Following index optimization, page load latency improved by 40%. Please let me know if anyone has questions.",
      whyItWasChanged: [
        "Corrected plural subject-verb agreement: 'queries was' -> 'queries were'.",
        "Corrected singular verb agreement: 'anyone have' -> 'anyone has'.",
        "Replaced informal filler words ('basically what happened was', 'that stuff') with direct, credible phrasing.",
      ],
      moreProfessionalVersion:
        "Good morning team, our technical postmortem revealed that elevated query latency was caused by missing indexes on user_id. After applying composite index optimization, we achieved a 40% reduction in page load latency. Please reach out if you require additional metric breakdown or documentation.",
      simplerVersion:
        "Hi team, the website was loading slowly because a key database lookup was unindexed. We added the missing index and load times improved by 40%. Let us know if you have any questions!",
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ result: fallbackResult, isFallback: true });
      }

      const prompt = `You are EduPath AI's Communication Improvement Specialist.
Analyze and elevate the following text written by a ${targetRole} for context "${context}" with goal "${communicationGoal}":
"${userText}"

RULES:
1. Preserve the learner's original meaning and technical intent.
2. Provide a grammatically corrected version.
3. List 3 specific bullet points explaining "Why It Was Changed".
4. Provide a "More Professional Version" suited for executives and senior stakeholders.
5. Provide a "Simpler Version" suited for fast, jargon-free comprehension.

Return pure valid JSON with NO markdown formatting:
{
  "result": {
    "original": "${userText.replace(/"/g, '\\"')}",
    "correctedVersion": "string",
    "whyItWasChanged": ["string", "string", "string"],
    "moreProfessionalVersion": "string",
    "simplerVersion": "string"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.result) {
        return res.json({ result: parsed.result, isFallback: false });
      }
      return res.json({ result: fallbackResult, isFallback: true });
    } catch (err: any) {
      console.warn("Improve communication error, using fallback:", err?.message);
      return res.json({ result: fallbackResult, isFallback: true });
    }
  });

  // 8. Communication Coach: Technical Explanation Coach (Simpler vs Technical Versions)
  app.post("/api/agent/generate-technical-explanation", async (req: Request, res: Response) => {
    const { topic = "Database Indexes", targetAudience = "Non-Technical Business Manager", targetRole = "Data Analyst", userSubmission } = req.body;

    const fallbackExplanation = {
      prompt: {
        id: "te-1",
        topic: topic || "Database Indexes",
        targetAudience: targetAudience || "Non-Technical Business Manager",
        scenario: "Your product manager asks why adding an index speeds up search queries but might slightly slow down frequent row inserts. Explain the concept using an intuitive real-world analogy.",
        suggestedPoints: [
          "Use the analogy of a book's index at the very back",
          "Explain why reading is faster (jumping directly to the page)",
          "Explain the trade-off with writing (when a new page is added, the index must also be updated)",
        ],
        technicalVersion:
          "In relational databases, a B-Tree index maintains an ordered pointer structure alongside table data. While search operations achieve O(log N) lookup latency rather than O(N) full-table scans, write operations incur overhead because the index structure must be rebalanced upon each INSERT or UPDATE.",
        simplerVersion:
          "Think of a database index like the index at the back of a 500-page textbook. If you want to find 'Machine Learning', you check the index and jump straight to page 142 instead of reading every page from start to finish. Finding things is instant, but whenever we write a new chapter, we also have to spend extra seconds updating that index.",
      },
    };

    if (!userSubmission) {
      return res.json({ ...fallbackExplanation, isFallback: false });
    }

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({
          ...fallbackExplanation,
          evaluation: {
            clarity: 84,
            grammar: 92,
            structure: 86,
            vocabulary: 80,
            professionalism: 88,
            technicalAccuracy: 88,
            strengths: ["Clear use of conceptual analogies", "Avoided overwhelming mathematical jargon"],
            improvements: ["Explicitly address the trade-off regarding write operations"],
            practiceRecommendation: "Practice explaining data caching to a marketing lead next.",
          },
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Technical Explanation Coach.
Evaluate this learner's explanation of "${topic}" to a "${targetAudience}":
"${userSubmission}"

Return pure valid JSON with NO markdown formatting:
{
  "evaluation": {
    "clarity": number (0-100),
    "grammar": number (0-100),
    "structure": number (0-100),
    "vocabulary": number (0-100),
    "professionalism": number (0-100),
    "technicalAccuracy": number (0-100),
    "strengths": ["string", "string"],
    "improvements": ["string", "string"],
    "correctedVersion": "string",
    "practiceRecommendation": "string"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return res.json({
        ...fallbackExplanation,
        evaluation: parsed.evaluation,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("Technical explanation error, using fallback:", err?.message);
      return res.json({
        ...fallbackExplanation,
        evaluation: {
          clarity: 82,
          grammar: 90,
          structure: 80,
          vocabulary: 84,
          professionalism: 85,
          strengths: ["Good accessible framing", "Polite tone"],
          improvements: ["Structure points with bulleted headings"],
          practiceRecommendation: "Practice explaining relational joins using Venn diagrams.",
        },
        isFallback: true,
      });
    }
  });

  // 9. Communication Coach: Presentation Coach (Structure, Opening, Main Points, QA)
  app.post("/api/agent/generate-presentation-practice", async (req: Request, res: Response) => {
    const {
      topic = "Q4 Customer Churn & Retention Findings",
      audience = "Executive Leadership (VP Product & CMO)",
      duration = "5 minutes",
      purpose = "Secure approval for automated customer re-engagement campaign",
    } = req.body;

    const fallbackPresentation = {
      structure: {
        topic,
        audience,
        duration,
        purpose,
        opening:
          "Good morning, leadership team. Today I'm presenting our Q4 customer retention analysis. Over the past 90 days, we analyzed 50,000 subscriber transactions to answer one central question: Why are 14% of newly onboarded users disengaging before week 6, and what concrete actions will recover that revenue?",
        mainPoints: [
          {
            title: "1. The Retention Inflection Point",
            explanation: "68% of total quarterly churn occurs between weeks 3 and 5, concentrated among users who completed fewer than two dashboard actions.",
            example: "Users who set up automated report alerts exhibited a 4.2x higher 90-day retention curve.",
          },
          {
            title: "2. Revenue at Risk",
            explanation: "Unmitigated week-4 churn represents an estimated $180,000 in lost Annual Recurring Revenue (ARR) across our core tier.",
            example: "Even a modest 2% reduction in month-1 churn generates $45,000 in net retained margin.",
          },
          {
            title: "3. Recommended Interventions",
            explanation: "Deploy automated in-app guidance workflows at day 14 and trigger milestone check-in emails for inactive accounts.",
            example: "A small pilot in regional segment B lifted day-30 re-engagement by 11%.",
          },
        ],
        example: "Case Study: In cohort October-24, early automated email triggers reduced week-4 drop-offs from 16% to 11%.",
        closing:
          "In summary: Customer drop-offs are concentrated in a predictable 2-week window. By implementing automated trigger emails and onboarding checklists starting next month, we can protect $180,000 in ARR. I'd love to open the floor for your thoughts and questions.",
        possibleQuestions: [
          "What is the engineering overhead required to trigger automated day-14 notifications?",
          "How confident are we that early disengagement isn't driven by product pricing rather than onboarding?",
          "Can this cohort tracking dashboard be integrated into our weekly executive Slack digest?",
        ],
      },
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ ...fallbackPresentation, isFallback: true });
      }

      const prompt = `You are EduPath AI's Presentation Coach.
Generate a structured, executive-ready presentation plan for:
Topic: "${topic}"
Audience: "${audience}"
Duration: "${duration}"
Purpose: "${purpose}"

Return pure valid JSON with NO markdown formatting matching this exact structure:
{
  "structure": {
    "topic": "${topic}",
    "audience": "${audience}",
    "duration": "${duration}",
    "purpose": "${purpose}",
    "opening": "string hook and framing",
    "mainPoints": [
      {
        "title": "string",
        "explanation": "string",
        "example": "string"
      }
    ],
    "example": "string concrete case or data illustration",
    "closing": "string decisive call to action",
    "possibleQuestions": ["string", "string", "string"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.structure) {
        return res.json({ structure: parsed.structure, isFallback: false });
      }
      return res.json({ ...fallbackPresentation, isFallback: true });
    } catch (err: any) {
      console.warn("Presentation practice error, using fallback:", err?.message);
      return res.json({ ...fallbackPresentation, isFallback: true });
    }
  });

  // 10. Communication Coach: Project Explanation Prompts (30s, 60s, 2m, Non-tech, Behavioral)
  app.post("/api/agent/generate-project-explanation-prompts", async (req: Request, res: Response) => {
    const { project } = req.body;
    const projectTitle = project?.title || "Cohort Retention Analytics Dashboard";

    const prompts = [
      {
        mode: "30_second_elevator",
        title: "30-Second Elevator Pitch",
        timeLimit: "30 seconds (approx. 50-70 words)",
        instructions: `Briefly summarize what problem you solved in "${projectTitle}", what core tools you used, and what key result you achieved.`,
        rubric: [
          "Did you state the business problem within the first 5 seconds?",
          "Did you mention 1-2 core technologies without listing every tool?",
          "Did you end with a tangible business outcome or metric?",
        ],
      },
      {
        mode: "60_second_standard",
        title: "60-Second Interview Walkthrough",
        timeLimit: "60 seconds (approx. 120-140 words)",
        instructions: `Follow the STAR framework: Situation, Task, Action, and Result for "${projectTitle}". Focus on your personal contributions.`,
        rubric: [
          "Clear structure following Situation -> Task -> Action -> Result",
          "Balanced time allocation between technical work and business impact",
          "Clean cadence and natural professional vocabulary",
        ],
      },
      {
        mode: "2_minute_technical",
        title: "2-Minute Technical Deep Dive",
        timeLimit: "2 minutes (approx. 250-300 words)",
        instructions: `Walk an engineering manager through your schema design, query optimization, metrics calculation, and how you handled edge cases in "${projectTitle}".`,
        rubric: [
          "Mentioned specific analytical functions (e.g. CTEs, Window Functions, DAX)",
          "Explained handling of dirty data, null values, or performance bottlenecks",
          "Addressed trade-offs made during development",
        ],
      },
      {
        mode: "non_technical_stakeholder",
        title: "Explain to a Non-Technical Stakeholder",
        timeLimit: "60 seconds (approx. 100-130 words)",
        instructions: `Explain how "${projectTitle}" helps a Marketing or Sales Director make better decisions, completely eliminating technical jargon like CTEs or indexes.`,
        rubric: [
          "Zero unexplained jargon",
          "Uses relatable analogies or intuitive visual descriptions",
          "Focuses 100% on decision-making and revenue outcomes",
        ],
      },
    ];

    return res.json({ prompts, isFallback: false });
  });
}
