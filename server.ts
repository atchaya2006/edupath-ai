import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { VERIFIED_CATALOG_RESOURCES } from "./src/data/verifiedResources";
import { setupProjectAndCommunicationRoutes } from "./server/projectAndCommunicationRoutes";
import { setupMockInterviewRoutes } from "./server/mockInterviewRoutes";
import { setupProgressAndAdaptiveRoutes } from "./server/progressAndAdaptiveRoutes";

dotenv.config();

const PORT = 3000;

// Lazy/Safe initialization of GoogleGenAI
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

// Resilient helper to call Gemini with automatic retry, exponential backoff, and developer logging
// When Gemini returns 503, UNAVAILABLE, RESOURCE_EXHAUSTED, temporary network failure, or timeout:
// Automatically retries up to 2 times with exponential backoff (Attempt 1 -> wait 1s -> Attempt 2 -> wait 2s -> Attempt 3)
interface GeminiErrorClassification {
  httpStatus: number;
  errorType: string;
  isTransient: boolean;
  message: string;
}

function classifyGeminiError(err: any): GeminiErrorClassification {
  const errStr = String(err?.message || err || "");
  const statusNum = Number(err?.status || err?.statusCode || err?.code || 0);

  let httpStatus = 500;
  let errorType = "UNKNOWN_ERROR";
  let isTransient = false;

  if (
    statusNum === 503 ||
    errStr.includes("503") ||
    errStr.includes("UNAVAILABLE") ||
    errStr.includes("high demand") ||
    errStr.includes("overloaded") ||
    err?.status === "UNAVAILABLE"
  ) {
    httpStatus = 503;
    errorType = "UNAVAILABLE";
    isTransient = true;
  } else if (
    statusNum === 429 ||
    errStr.includes("429") ||
    errStr.includes("RESOURCE_EXHAUSTED") ||
    errStr.includes("quota") ||
    err?.status === "RESOURCE_EXHAUSTED"
  ) {
    httpStatus = 429;
    errorType = "RESOURCE_EXHAUSTED";
    isTransient = true;
  } else if (
    statusNum === 504 ||
    errStr.includes("DEADLINE_EXCEEDED") ||
    errStr.includes("timeout") ||
    errStr.includes("timed out") ||
    errStr.includes("ETIMEDOUT") ||
    err?.status === "DEADLINE_EXCEEDED"
  ) {
    httpStatus = 504;
    errorType = "TIMEOUT";
    isTransient = true;
  } else if (
    errStr.includes("ECONNRESET") ||
    errStr.includes("ENOTFOUND") ||
    errStr.includes("fetch failed") ||
    errStr.includes("network error") ||
    errStr.includes("socket hang up")
  ) {
    httpStatus = 503;
    errorType = "NETWORK_FAILURE";
    isTransient = true;
  } else if (statusNum === 500 || errStr.includes("INTERNAL")) {
    httpStatus = 500;
    errorType = "INTERNAL_SERVER_ERROR";
    isTransient = true;
  } else if (statusNum >= 400 && statusNum < 500) {
    httpStatus = statusNum;
    errorType = "CLIENT_ERROR";
    isTransient = false;
  }

  return {
    httpStatus,
    errorType,
    isTransient,
    message: errStr,
  };
}

async function callGeminiSafe(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  const models = ["gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  const maxRetries = 2; // Up to 2 retries (Total 3 attempts: Attempt 1 -> wait -> Attempt 2 -> wait -> Attempt 3)
  let lastClassification: GeminiErrorClassification = {
    httpStatus: 500,
    errorType: "UNKNOWN",
    isTransient: false,
    message: "",
  };

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const modelIndex = Math.min(attempt - 1, models.length - 1);
    const model = models[modelIndex];

    try {
      return await ai.models.generateContent({
        model,
        ...params,
      });
    } catch (err: any) {
      const classification = classifyGeminiError(err);
      lastClassification = classification;

      // Developer logging per Requirement 9: HTTP status, error type, retry attempt, timestamp
      console.warn(
        `[EduPath AI Agent] [Attempt ${attempt}/${maxRetries + 1}] HTTP Status: ${classification.httpStatus}, Error Type: ${classification.errorType}, Model: ${model}, Timestamp: ${new Date().toISOString()}`
      );

      if (classification.isTransient && attempt <= maxRetries) {
        // Exponential backoff: Attempt 1 wait 1000ms, Attempt 2 wait 2000ms
        const backoffMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }

      // Format clean structured error if retries are exhausted or error is not transient
      const structuredErr: any = new Error(
        classification.isTransient
          ? "AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile."
          : err?.message || "Gemini invocation failed."
      );
      structuredErr.httpStatus = classification.httpStatus;
      structuredErr.errorType = classification.errorType;
      structuredErr.isTransient = classification.isTransient;
      structuredErr.originalError = err;
      throw structuredErr;
    }
  }

  const finalErr: any = new Error(
    "AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile."
  );
  finalErr.httpStatus = lastClassification.httpStatus || 503;
  finalErr.errorType = lastClassification.errorType || "UNAVAILABLE";
  finalErr.isTransient = true;
  throw finalErr;
}

// Grounded fallback builder for career profile analysis when Gemini encounters persistent high-demand spikes
function buildGroundedCareerAnalysis(learnerProfile: any, resumeText: string = "", targetRole: string = "Data Analyst") {
  const text = (resumeText + " " + (learnerProfile?.bio || "") + " " + (learnerProfile?.notes || "")).toLowerCase();
  
  const skillCatalog = [
    { name: "SQL", terms: ["sql", "select", "join", "postgres", "mysql", "queries", "database"] },
    { name: "Python", terms: ["python", "pandas", "numpy", "matplotlib", "scikit", "scripting"] },
    { name: "Excel", terms: ["excel", "vlookup", "xlookup", "pivot", "spreadsheet", "formulas"] },
    { name: "Power BI", terms: ["power bi", "dax", "powerbi", "power query", "bi dashboard"] },
    { name: "Tableau", terms: ["tableau", "viz", "workbooks", "dashboards"] },
    { name: "Statistics", terms: ["statistics", "regression", "hypothesis", "variance", "probability"] },
    { name: "Data Cleaning", terms: ["data cleaning", "etl", "data preparation", "wrangling"] },
    { name: "Git", terms: ["git", "github", "version control"] },
    { name: "Cloud Analytics", terms: ["aws", "azure", "gcp", "bigquery", "snowflake"] },
  ];

  const existingReported: any[] = learnerProfile?.technicalSkills || [];
  const reportedNames = new Set(existingReported.map((s: any) => (s.name || s.skill || "").toLowerCase()));
  const extractedSkills: any[] = [];

  for (const s of existingReported) {
    const sName = s.name || s.skill || "Technical Skill";
    extractedSkills.push({
      skill: sName,
      evidence: s.evidence || `Reported in candidate profile with self-evaluated ${s.level || "Intermediate"} proficiency.`,
      confidence: s.confidence || (s.level === "Advanced" ? 85 : s.level === "Intermediate" ? 75 : 60),
      estimatedLevel: s.level || "Intermediate",
      userConfirmedLevel: s.level,
    });
  }

  for (const sk of skillCatalog) {
    if (!reportedNames.has(sk.name.toLowerCase())) {
      const matchedTerm = sk.terms.find((t) => text.includes(t));
      if (matchedTerm) {
        extractedSkills.push({
          skill: sk.name,
          evidence: `Identified in uploaded candidate documentation matching "${matchedTerm}".`,
          confidence: 78,
          estimatedLevel: "Intermediate",
        });
      }
    }
  }

  if (extractedSkills.length === 0) {
    extractedSkills.push(
      { skill: "SQL", evidence: `Essential prerequisite for ${targetRole}`, confidence: 75, estimatedLevel: "Intermediate" },
      { skill: "Python", evidence: `Scripting and data wrangling foundation for ${targetRole}`, confidence: 65, estimatedLevel: "Beginner" },
      { skill: "Excel", evidence: "Foundational data analysis and reporting tool", confidence: 80, estimatedLevel: "Intermediate" }
    );
  }

  const softSkills = (learnerProfile?.softSkills && learnerProfile.softSkills.length > 0)
    ? learnerProfile.softSkills.map((s: any) => ({
        skill: s.name || s.skill,
        confidence: s.confidence || 80,
        evidence: s.evidence || "Demonstrated across project execution and collaborative tasks.",
      }))
    : [
        { skill: "Stakeholder Communication", confidence: 80, evidence: "Demonstrated through project coordination and team updates." },
        { skill: "Analytical Problem Solving", confidence: 85, evidence: "Applied in diagnosing workflow issues and data validation." },
      ];

  const candidateName = learnerProfile?.name || "Candidate";
  const years = learnerProfile?.yearsExperience || "1-2";
  const currentRole = learnerProfile?.currentRole || "Aspiring Specialist";

  return {
    candidateSummary: `${candidateName} demonstrates established competency as a ${currentRole} targeting the ${targetRole} roadmap. Core strengths center around ${extractedSkills.slice(0, 3).map((s) => s.skill).join(", ")}. Grounded analysis identifies structured opportunities to expand cloud data warehousing and production portfolio artifacts.`,
    education: [
      {
        institution: learnerProfile?.institution || "Accredited University / Technical Institution",
        degree: learnerProfile?.currentEducation || "B.S. in Relevant Discipline",
        field: learnerProfile?.fieldOfStudy || "Information Science / Technology",
        graduationYear: "Completed",
        evidence: "Documented in candidate educational background.",
      }
    ],
    experience: [
      {
        role: currentRole,
        company: learnerProfile?.company || "Career Experience Portfolio",
        duration: `${years} years`,
        description: `Applied technical competencies in ${extractedSkills.slice(0, 3).map((s) => s.skill).join(", ")} to deliver analytical artifacts.`,
        skillsUsed: extractedSkills.slice(0, 4).map((s) => s.skill),
        evidence: "Verified from candidate background entries.",
      }
    ],
    technicalSkills: extractedSkills,
    softSkills,
    certifications: (learnerProfile?.certifications || []).map((c: any) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.issueDate || "Documented",
      relevantSkills: [extractedSkills[0]?.skill || "Analytics"],
      evidence: "Listed on candidate credentials.",
    })),
    projects: (learnerProfile?.projects || []).length > 0
      ? (learnerProfile.projects || []).map((p: any) => ({
          name: p.title || p.name || "Applied Project",
          description: p.description || "Hands-on applied portfolio implementation.",
          technologies: p.tech || p.technologies || extractedSkills.slice(0, 3).map((s) => s.skill),
          skillsDemonstrated: extractedSkills.slice(0, 2).map((s) => s.skill),
          role: "Primary Contributor",
          evidence: "Derived from candidate profile project listings.",
        }))
      : [
          {
            name: `${targetRole} Applied Portfolio Project`,
            description: "End-to-end data ingestion, aggregation queries, and dashboard reporting answering core business questions.",
            technologies: extractedSkills.slice(0, 3).map((s) => s.skill),
            skillsDemonstrated: extractedSkills.slice(0, 2).map((s) => s.skill),
            role: "Primary Contributor",
            evidence: "Documented portfolio work.",
          }
        ],
    careerInterests: [targetRole],
    targetRole,
    strengths: extractedSkills.slice(0, 3).map((s) => `Demonstrated foundation in ${s.skill}`),
    missingInformation: [
      `End-to-end cloud production deployment samples for ${targetRole} will strengthen hiring validation`,
    ],
    evidenceReferences: [
      "Candidate profile specifications",
      "Uploaded documentation text and skill benchmarks",
    ],
    isGroundedFallback: true,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));

  // Mount Modular AI Agent Routes
  setupProjectAndCommunicationRoutes(app);
  setupMockInterviewRoutes(app);
  setupProgressAndAdaptiveRoutes(app);

  // API Health Check
  app.get("/api/health", (_req: Request, res: Response) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: "ok",
      hasGeminiKey: hasKey,
      timestamp: new Date().toISOString(),
    });
  });

  // AI Mentor Chat Endpoint
  app.post("/api/agent/chat", async (req: Request, res: Response) => {
    const {
      message,
      history = [],
      learnerProfile,
      learningPath,
      skillGapAnalysis,
      activeResource,
      currentProject,
      projectMilestones,
      communicationProgress,
      interviewHistory = [],
      progressState,
      strengths = [],
      weaknesses = [],
      adaptiveChanges = [],
      learningLoad,
      nextBestAction,
    } = req.body;
    const lowerMsg = (message || "").toLowerCase();

    // Context-aware deterministic mentor responses for progress and learning path adaptation
    if (lowerMsg.includes("why did my learning path change") || lowerMsg.includes("path change") || lowerMsg.includes("plan change")) {
      const latestChange = Array.isArray(adaptiveChanges) && adaptiveChanges.length > 0 ? adaptiveChanges[0] : null;
      if (latestChange) {
        return res.json({
          reply: `**Why Your Learning Path Adapted:**
- **What Changed**: ${latestChange.whatChanged}
- **Pedagogical Reason**: ${latestChange.why}
- **Evidence Used**: ${Array.isArray(latestChange.evidenceUsed) ? latestChange.evidenceUsed.join(', ') : 'Recent assessment scores and practice telemetry'}
- **Expected Advantage**: ${latestChange.expectedBenefit}

*EduPath AI continuously adapts your sequence so you conquer prerequisites before advancing to high-difficulty topics.*`,
          isFallback: true,
        });
      }
    }

    if (lowerMsg.includes("what should i learn today") || lowerMsg.includes("learn today") || lowerMsg.includes("today's plan")) {
      if (nextBestAction) {
        return res.json({
          reply: `**Your Next Best Learning Action Today:**
- **Action**: **${nextBestAction.title}** (${nextBestAction.actionType})
- **Target Skill**: ${nextBestAction.skill} (~${nextBestAction.estimatedMinutes} mins)
- **Why Today**: ${nextBestAction.reason}
- **Evidence**: ${Array.isArray(nextBestAction.evidence) ? nextBestAction.evidence.join('; ') : 'Based on your latest progress'}

You can launch this directly from the **Progress** or **Practice** tab!`,
          isFallback: true,
        });
      }
    }

    if (lowerMsg.includes("struggling with statistics") || (lowerMsg.includes("statistics") && lowerMsg.includes("struggl"))) {
      return res.json({
        reply: `**Understanding Your Progress in Statistics:**
- **What We Observe**: Your recent practice drills on probability and hypothesis testing show lower accuracy than your SQL work.
- **Why It Happens**: Statistics for ${learnerProfile?.targetRole || 'Data Analysts'} requires intuitive mental models for p-values, sample size, and variance rather than rote arithmetic.
- **Recommended Recovery Step**: Spend 20 minutes with *Seeing Theory* (visual simulation) or Khan Academy's Hypothesis Testing video before doing timed problem sets.`,
        isFallback: true,
      });
    }

    if (lowerMsg.includes("what skill improved the most") || lowerMsg.includes("improved the most")) {
      const topStrength = Array.isArray(strengths) && strengths.length > 0 ? strengths[0] : null;
      return res.json({
        reply: `**Fastest Improving Skill:**
- **Top Skill**: **${topStrength?.skill || 'Relational SQL'}**
- **Evidence**: ${topStrength?.evidence || 'High accuracy across recent practice sets and completed query milestones.'}
- **Why It Matters**: ${topStrength?.whyItMatters || 'SQL forms the core backbone of day-to-day data retrieval and reporting.'}
- **How to Leverage It**: ${topStrength?.howToUseNext || 'Incorporate multi-table SQL queries with window functions into your portfolio projects.'}`,
        isFallback: true,
      });
    }

    // Context-aware deterministic mentor responses for interview questions
    if (lowerMsg.includes("interview") && (lowerMsg.includes("improv") || lowerMsg.includes("score") || lowerMsg.includes("progress") || lowerMsg.includes("how am i doing"))) {
      if (Array.isArray(interviewHistory) && interviewHistory.length > 0) {
        const latest = interviewHistory[interviewHistory.length - 1];
        const scores = interviewHistory.map((h: any) => h.overallScore || 0);
        const avg = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
        const firstScore = scores[0];
        const lastScore = scores[scores.length - 1];
        const improved = lastScore >= firstScore;

        return res.json({
          reply: `**Interview Practice Review:**
You have completed **${interviewHistory.length} mock interview session${interviewHistory.length > 1 ? 's' : ''}** for **${latest.targetRole || learnerProfile?.targetRole || 'Data Analyst'}**.

- **Latest Practice Score**: ${lastScore}% (${improved ? 'trending upward' : 'stable'} from your first session of ${firstScore}%)
- **Technical & Communication Trends**: Your recent interview practice shows steady improvement in ${latest.strengths?.[0] || 'technical fundamentals'}.
- **Growth Opportunity**: Your ${latest.areasToImprove?.[0] || 'project explanation responses'} still have more opportunities for structured practice (especially focusing on the STAR method and naming specific metrics).

*Note: AI scores reflect practice rubric assessments and are intended to guide your preparation, rather than official hiring guarantees.*`,
          isFallback: true,
        });
      } else {
        return res.json({
          reply: `**Interview Practice Review:**
I don't see any recorded mock interviews in your profile yet. Head over to the **Mock Interview** tab to start your first session for **${learnerProfile?.targetRole || 'Data Analyst'}**! Starting with a 5-question session will establish your baseline.`,
          isFallback: true,
        });
      }
    }

    // Context-aware deterministic mentor responses for common queries and fallback
    let fallbackReply = `**EduPath Mentor:** I see you're working toward becoming a **${learnerProfile?.targetRole || "Data Analyst"}**!

Based on your current progress and skill gaps:
- **Immediate Focus**: Strengthen your **SQL JOINs & Aggregations**; these account for a major portion of data analysis technical screenings.
- **Recommended Resource**: Try the *SQLZoo Interactive Relational JOIN Practice & Labs* (35 min) to build muscle memory on real datasets.
- **Next Milestone**: Advance your **Power BI** from Beginner to Intermediate with our guided DAX calculation exercises.
- **Tip**: Spend 20 minutes on the interactive practice quiz today to lock in your daily streak!

What specific concept or resource would you like to explore next?`;

    if (lowerMsg.includes("watch") || (lowerMsg.includes("video") && lowerMsg.includes("prefer"))) {
      fallbackReply = `**Recommended Video Today:**
- **Resource**: *Khan Academy: Statistical Inference & Hypothesis Testing* (45 min, Verified Video)
- **Why**: You have identified Statistics as a key growth area for your ${learnerProfile?.targetRole || 'Data Analyst'} trajectory. Khan Academy's visual explanations make sampling distributions and p-values crystal clear without overwhelming formulas.
- **Alternative (Short)**: *Khan Academy: Intro to Relational Databases & SQL Queries* (25 min) if you want a visual refresh on table relationships.`;
    } else if (lowerMsg.includes("short resource") || lowerMsg.includes("short") || lowerMsg.includes("20 min") || lowerMsg.includes("twenty min")) {
      fallbackReply = `**Targeted 20-Minute Resource:**
- **Resource**: *SQLBI: Calculated Columns vs Measures in DAX* (20 min, Verified Article)
- **Why**: It is one of the single most frequent interview questions for Power BI and fits your 20-minute window perfectly.
- **Alternative**: *Harvard Business Review: How to Present Data to Senior Executives* (15 min) for fast communication mastery.`;
    } else if (lowerMsg.includes("start with") || lowerMsg.includes("which resource")) {
      fallbackReply = `**Where to Start:**
1. Begin with **SQLZoo Interactive Relational JOIN Practice** (35 min). Because SQL is a non-negotiable prerequisite, building 100% confidence in multi-table queries unlocks subsequent data visualization and analysis projects.
2. Follow up with **Microsoft Learn: Introduction to Power BI Desktop** to establish your dashboarding foundation.`;
    } else if (lowerMsg.includes("difficult") || lowerMsg.includes("struggling") || lowerMsg.includes("hard")) {
      fallbackReply = `**Step-Back & Clarify:**
When an advanced resource feels overwhelming, it usually means a small conceptual prerequisite needs reinforcement:
- If struggling with **SQL Window Functions or Complex Joins**: Step back to *Khan Academy Relational Schema Basics* (25 min) or review standard 2-table INNER JOINs first.
- If struggling with **Power BI DAX**: Review the *SQLBI Calculated Columns vs Measures* primer before writing complex iterative SUMX formulas.
- If struggling with **Statistics**: Try *Seeing Theory* (30 min) for interactive visual simulations of probability before diving into textbook hypothesis tests.`;
    }

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          reply: fallbackReply,
          isFallback: true,
        });
      }

      const profileSummary = learnerProfile
        ? `Learner Profile:
- Name: ${learnerProfile.name || "Alex"}
- Target Career: ${learnerProfile.targetRole || "Data Analyst"}
- Current Skills: ${(learnerProfile.technicalSkills || []).map((s: any) => `${s.name} (${s.level})`).join(", ")}
- Remaining Gaps: ${(skillGapAnalysis?.topPriorities || learnerProfile.skillGaps || []).map((g: any) => `${g.skill} (${g.priority || 'High'} priority)`).join(", ")}
- Overall Progress: ${learnerProfile.overallProgress || 68}%`
        : "Learner: Alex, Target: Data Analyst";

      const pathSummary = learningPath
        ? `Learning Path Context:
- Target Role: ${learningPath.targetRole}
- Current Active Phase: ${learningPath.phases?.find((p: any) => p.status === 'in-progress')?.title || 'Core Skills'}
- Weekly Hours: ${learningPath.weeklyHours || 7}h/week
- Current Week Activities: ${(learningPath.weeks?.[0]?.activities || []).map((a: any) => `${a.title} (${a.skill}, ${a.estimatedMinutes}m)`).join(', ')}`
        : "";

      const systemInstruction = `You are EduPath AI's adaptive Mentor and career coach.
You provide supportive, technically accurate, concrete, and concise advice tailored to the learner's specific career goal and skill gaps.
Always reference their actual skills, target career (${learnerProfile?.targetRole || "Data Analyst"}), current focus, and verified learning resources.
If the learner asks for recommendations (e.g. "What should I watch?", "I only have 20 minutes", "I found this resource difficult"), recommend specific, concrete, high-quality learning resources matching their time and format preferences.
DO NOT fabricate external URLs. Refer to reputable providers like PostgreSQL Docs, Microsoft Learn, Khan Academy, Mode Analytics, SQLBI, Harvard Business Review, SQLZoo, and Seeing Theory.
Use clean formatting with bold titles and bullet points. Never be overly verbose.
${profileSummary}
${pathSummary}
${activeResource ? `Active Resource: ${JSON.stringify(activeResource)}` : ''}
${currentProject ? `Current Active Project: ${currentProject.title} (Target: ${currentProject.targetRole}, Difficulty: ${currentProject.difficulty}, Milestones: ${projectMilestones?.length || currentProject.milestones?.length || 0})` : ''}
${communicationProgress ? `Communication Practice Level: ${communicationProgress.level || 'Developing'} (Completed Activities: ${communicationProgress.totalCompletedActivities || 0})` : ''}`;

      // Convert conversation history into prompt context
      const formattedHistory = (history || [])
        .slice(-6)
        .map((h: any) => `${h.role === "user" ? "Learner" : "Mentor"}: ${h.content}`)
        .join("\n");

      const prompt = `${systemInstruction}\n\nConversation History:\n${formattedHistory}\n\nLearner: ${message}\nMentor:`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({
        reply: response.text || "I am here to guide your learning journey. How can I help you today?",
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("Chat agent API error, using rich fallback:", err?.message);
      res.json({
        reply: fallbackReply,
        isFallback: true,
      });
    }
  });

  // Career Profile & Resume Analysis Agent (Gemini Powered)
  app.post("/api/agent/analyze-career-profile", async (req: Request, res: Response) => {
    try {
      const {
        learnerProfile,
        resumeText,
        resumeFileName,
        resumeFileBase64,
        resumeFileMime,
        targetRole,
      } = req.body;

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error:
            "Gemini API key is not configured in the server environment. Please set GEMINI_API_KEY in your settings to analyze your profile.",
        });
      }

      const role = targetRole || learnerProfile?.targetRole || "Data Analyst";

      const systemInstruction = `You are the EduPath Career Profile Analyst.
Your core responsibility is to extract and organize evidence from the learner's supplied documents (resume, portfolio, transcripts) and entered profile.

CRITICAL INTEGRITY & TRUTHFULNESS DIRECTIVES:
1. You must NOT invent, hallucinate, or assume qualifications, skills, certifications, companies, projects, or degrees.
2. If something is unclear or missing, explicitly mark it as "Unknown", "Not found", or "Requires verification".
3. Distinguish clearly between:
   - Explicit evidence: directly stated in the resume or profile.
   - Inferred capability: a reasonable capability suggested by evidence (mark with moderate confidence and state how it was inferred).
   - Missing information: key information required for the target career role ("${role}") that is not documented.
4. Do NOT present inferred information as confirmed fact.
5. You must return pure, valid JSON with no markdown formatting matching the exact schema below.

JSON Schema:
{
  "candidateSummary": "Grounded, concise 2-4 sentence summary of candidate experience and fit for target role",
  "education": [
    {
      "institution": "School or University name",
      "degree": "Degree or credential name",
      "field": "Field of study",
      "graduationYear": "Year or In progress",
      "evidence": "Direct quote or source reference"
    }
  ],
  "experience": [
    {
      "role": "Job title or role",
      "company": "Organization name",
      "duration": "Timeframe",
      "description": "Responsibilities and outcomes",
      "skillsUsed": ["Specific skill"],
      "evidence": "Source reference from documentation"
    }
  ],
  "technicalSkills": [
    {
      "skill": "Standardized skill name (e.g. SQL, Python, Power BI)",
      "evidence": "Concrete proof or project context from document",
      "confidence": 85,
      "estimatedLevel": "Beginner" | "Intermediate" | "Advanced" | "Unknown"
    }
  ],
  "softSkills": [
    {
      "skill": "Soft skill name",
      "evidence": "Context where this was demonstrated",
      "confidence": 80
    }
  ],
  "certifications": [
    {
      "name": "Certification title",
      "issuer": "Issuing body",
      "date": "Date or year",
      "relevantSkills": ["Skill name"],
      "evidence": "Source evidence"
    }
  ],
  "projects": [
    {
      "name": "Project title",
      "description": "Problem addressed and outcome",
      "technologies": ["Technology used"],
      "skillsDemonstrated": ["Skill demonstrated"],
      "role": "Learner role",
      "evidence": "Context from resume/portfolio"
    }
  ],
  "careerInterests": ["Career direction or domain"],
  "targetRole": "${role}",
  "strengths": ["Key competitive advantage identified from evidence"],
  "missingInformation": ["Important skills or credentials for ${role} not found in documentation"],
  "evidenceReferences": ["Direct citation points from the input material"]
}`;

      // Build contents parts (multimodal if PDF fileBase64 provided)
      const parts: any[] = [];

      if (resumeFileBase64 && typeof resumeFileBase64 === "string") {
        const cleanedBase64 = resumeFileBase64.replace(
          /^data:[^;]+;base64,/,
          ""
        );
        parts.push({
          inlineData: {
            mimeType: resumeFileMime || "application/pdf",
            data: cleanedBase64,
          },
        });
      }

      const profileContext = learnerProfile
        ? `\n\nMANUALLY ENTERED PROFILE DETAILS:
- Name: ${learnerProfile.name || "Learner"}
- Current Role: ${learnerProfile.currentRole || "Unspecified"}
- Education: ${learnerProfile.currentEducation || "Unspecified"}
- Experience: ${learnerProfile.yearsExperience || "0"}
- Target Role: ${role}
- Career Goal: ${learnerProfile.careerGoal || "Advance in career"}
- Self-Reported Technical Skills: ${(learnerProfile.technicalSkills || [])
            .map((s: any) => `${s.name || s.skill} (${s.level || "Unknown"})`)
            .join(", ") || "None entered"}
- Self-Reported Soft Skills: ${(learnerProfile.softSkills || [])
            .map((s: any) => `${s.name || s.skill} (${s.level || "Unknown"})`)
            .join(", ") || "None entered"}
- Self-Reported Certifications: ${(learnerProfile.certifications || [])
            .map((c: any) => `${c.name} by ${c.issuer}`)
            .join(", ") || "None entered"}
- Self-Reported Projects: ${(learnerProfile.projects || [])
            .map((p: any) => `${p.name || p.title}: ${p.description}`)
            .join("; ") || "None entered"}`
        : "";

      const resumeContentText = resumeText
        ? `\n\nRESUME / DOCUMENT TEXT CONTENT (Filename: ${resumeFileName || "Uploaded Document"}):\n${resumeText.slice(0, 12000)}`
        : "";

      const promptText = `${systemInstruction}${profileContext}${resumeContentText}\n\nExecute profile analysis now and return the structured JSON result:`;

      parts.push({ text: promptText });

      try {
        const response = await callGeminiSafe(ai, {
          contents: parts,
          config: {
            responseMimeType: "application/json",
          },
        });

        const responseText = response.text || "{}";
        const cleaned = responseText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const parsed = JSON.parse(cleaned);
        return res.json({ result: parsed });
      } catch (geminiError: any) {
        const httpStatus = geminiError?.httpStatus || (geminiError?.isTransient ? 503 : 500);
        const errorType = geminiError?.errorType || "UNAVAILABLE";
        const isTemporary = geminiError?.isTransient !== false;

        console.error(
          `[EduPath AI Agent] Career profile analysis failed. HTTP Status: ${httpStatus}, Error Type: ${errorType}, Timestamp: ${new Date().toISOString()}`
        );

        return res.status(httpStatus).json({
          error: isTemporary
            ? "AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile."
            : geminiError?.message || "Failed to analyze career profile.",
          code: errorType,
          status: httpStatus,
          isTemporary,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: any) {
      console.error("Career profile analysis agent error:", err);
      const httpStatus = err?.httpStatus || 500;
      const errorType = err?.errorType || "INTERNAL_ERROR";
      const isTemporary = err?.isTransient !== false;

      return res.status(httpStatus).json({
        error: isTemporary
          ? "AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile."
          : err.message || "An error occurred while analyzing the career profile.",
        code: errorType,
        status: httpStatus,
        isTemporary,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Resume Analysis Agent
  app.post("/api/agent/analyze-resume", async (req: Request, res: Response) => {
    try {
      const { resumeText, targetRole } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          data: {
            extractedSkills: [
              { name: "SQL", level: "Intermediate", category: "Database & Querying" },
              { name: "Python", level: "Intermediate", category: "Programming" },
              { name: "Excel", level: "Intermediate", category: "Data Wrangling" },
              { name: "Tableau", level: "Beginner", category: "Visualization" },
              { name: "Communication", level: "Intermediate", category: "Soft Skills" },
            ],
            targetRole: targetRole || "Data Analyst",
            detectedGaps: [
              { skill: "Power BI / DAX", requiredLevel: "Intermediate", priority: "High", reason: "Standard requirement for business reporting" },
              { skill: "Statistical Hypothesis Testing", requiredLevel: "Intermediate", priority: "High", reason: "Crucial for A/B testing and experimentation" },
              { skill: "Advanced SQL Window Functions", requiredLevel: "Advanced", priority: "Medium", reason: "Expected in senior analytics rounds" },
            ],
            summary: "Strong analytical foundations with practical Python and SQL experience. Key opportunities lie in production BI dashboards and statistical rigor.",
            readinessScore: 68,
          },
          isFallback: true,
        });
      }

      const prompt = `You are the Resume & Skill Extraction Agent for EduPath AI.
Analyze the following resume/portfolio text for a candidate aspiring to be a "${targetRole || "Data Analyst"}".
Return pure valid JSON with NO markdown wrappers matching this exact structure:
{
  "extractedSkills": [{"name": "string", "level": "Beginner" | "Intermediate" | "Advanced", "category": "string"}],
  "targetRole": "${targetRole || "Data Analyst"}",
  "detectedGaps": [{"skill": "string", "requiredLevel": "string", "priority": "High" | "Medium" | "Low", "reason": "string"}],
  "summary": "2-3 sentence executive assessment of candidate fit and trajectory",
  "readinessScore": number (0-100)
}

Resume Text:
${resumeText.slice(0, 4000)}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ data: JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.error("Resume analysis error:", err);
      const httpStatus = err?.httpStatus || (err?.isTransient ? 503 : 500);
      const isTemporary = err?.isTransient !== false;
      const errorType = err?.errorType || "UNAVAILABLE";
      res.status(httpStatus).json({
        error: isTemporary
          ? "AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile."
          : err.message || "Failed to analyze resume",
        code: errorType,
        status: httpStatus,
        isTemporary,
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ----------------------------------------------------
  // Target Role Requirements Agent (Prompt 3)
  // ----------------------------------------------------
  app.post("/api/agent/generate-role-requirements", async (req: Request, res: Response) => {
    try {
      const { targetRole } = req.body;
      const role = targetRole || "Data Analyst";
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          data: {
            targetRole: role,
            description: `Industry benchmark competencies and expectations for a ${role}.`,
            technicalSkills: [
              { skill: "SQL", importance: "High", expectedLevel: "Advanced", reason: "Querying, data extraction, joins, and window functions", category: "Database & Querying" },
              { skill: "Python", importance: "High", expectedLevel: "Intermediate", reason: "Data manipulation with pandas and exploratory data analysis", category: "Programming" },
              { skill: "Power BI", importance: "High", expectedLevel: "Intermediate", reason: "Business dashboard design, data modeling, and DAX measures", category: "Data Visualization" },
              { skill: "Statistics", importance: "High", expectedLevel: "Intermediate", reason: "Hypothesis testing, probability, and analytical reasoning", category: "Analytics & Math" },
              { skill: "Excel", importance: "Medium", expectedLevel: "Advanced", reason: "Financial modeling, pivot tables, and lookup functions", category: "Data Wrangling" },
              { skill: "Data Modeling", importance: "Medium", expectedLevel: "Intermediate", reason: "Star schema, normalization, and relational structuring", category: "Architecture" },
            ],
            softSkills: [
              { skill: "Stakeholder Communication", importance: "High", reason: "Translating technical data findings into executive recommendations" },
              { skill: "Problem Decomposition", importance: "High", reason: "Breaking ambiguous business questions into measurable metrics" },
              { skill: "Data Storytelling", importance: "Medium", reason: "Crafting narratives around dashboards and charts" },
            ],
            tools: ["SQL", "Python", "Power BI", "Excel", "Tableau", "Git"],
            domainKnowledge: ["A/B Testing", "Business KPIs", "Cohort Analysis", "ETL Fundamentals"],
            recommendedExperience: ["1-3 years in quantitative, analytical, or reporting environments"],
            generatedAt: new Date().toISOString(),
          },
          isFallback: true,
        });
      }

      const prompt = `You are the Target Role Requirements Agent for EduPath AI.
Generate a structured, industry-calibrated skill requirement profile for the career target: "${role}".
Avoid presenting one company's specific job description as universal. Ground your expectations in general industry expectations across technology, enterprise, and startup employers.

Return pure valid JSON with NO markdown wrappers matching this exact structure:
{
  "targetRole": "${role}",
  "description": "2-3 sentence overview of this role's primary function in organizations",
  "technicalSkills": [
    {
      "skill": "Standardized skill name (e.g. SQL, Python, Power BI, Statistics)",
      "importance": "High" | "Medium" | "Low",
      "expectedLevel": "Beginner" | "Intermediate" | "Advanced",
      "reason": "Why this skill is needed for this role",
      "category": "Domain category"
    }
  ],
  "softSkills": [
    {
      "skill": "Soft skill name",
      "importance": "High" | "Medium" | "Low",
      "reason": "Why this skill matters in workplace execution"
    }
  ],
  "tools": ["Primary tool 1", "Primary tool 2", "Primary tool 3"],
  "domainKnowledge": ["Key domain concept 1", "Key domain concept 2"],
  "recommendedExperience": ["General experience guideline"],
  "generatedAt": "${new Date().toISOString()}"
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ data: parsed, isFallback: false });
    } catch (err: any) {
      console.error("Generate role requirements error:", err);
      res.status(500).json({ error: err.message || "Failed to generate role requirements" });
    }
  });

  // ----------------------------------------------------
  // AI Skill Gap Analysis Agent (Prompt 3)
  // ----------------------------------------------------
  app.post("/api/agent/analyze-skill-gaps", async (req: Request, res: Response) => {
    try {
      const {
        targetRole,
        currentSkills,
        learnerProfile,
        careerAnalysis,
        roleRequirements,
      } = req.body;

      const role = targetRole || learnerProfile?.targetRole || "Data Analyst";
      const ai = getGenAI();

      if (!ai) {
        // Fallback for development/offline test
        const comparisons = [
          {
            skill: "SQL",
            currentLevel: "Intermediate",
            requiredLevel: "Advanced",
            status: "Developing",
            priority: "High",
            evidence: ["1-2 years junior operations specialist experience", "Self-reported: Intermediate SQL"],
            explanation: "Current SQL capability handles joins and aggregations, but target Data Analyst roles expect window functions, CTEs, and performance optimization.",
            whatToLearn: ["Window functions (ROW_NUMBER, RANK, DENSE_RANK)", "Common Table Expressions (CTEs)", "Subqueries and indexing fundamentals"],
            category: "Database & Querying",
          },
          {
            skill: "Python",
            currentLevel: "Intermediate",
            requiredLevel: "Intermediate",
            status: "Strong",
            priority: "Low",
            evidence: ["Demonstrated in coursework and portfolio data scripts", "Intermediate proficiency verified"],
            explanation: "Core scripting, pandas manipulation, and exploratory data analysis meet standard requirements for entry to mid Data Analyst roles.",
            whatToLearn: ["Advanced pandas vectorization", "Plotly / Seaborn dashboard prototyping"],
            category: "Programming",
          },
          {
            skill: "Power BI",
            currentLevel: "Beginner",
            requiredLevel: "Intermediate",
            status: "Gap",
            priority: "High",
            evidence: ["Beginner familiarity noted in profile; no production dashboards found in portfolio"],
            explanation: "Power BI appears at beginner level in your profile, while industry Data Analyst expectations require interactive reporting, data modeling, and DAX calculated measures.",
            whatToLearn: ["Data modeling (star schema vs snowflake)", "DAX calculated columns and measures (CALCULATE, RELATED, FILTER)", "Interactive cross-filtering and drill-throughs"],
            category: "Data Visualization",
          },
          {
            skill: "Statistics",
            currentLevel: "Beginner",
            requiredLevel: "Intermediate",
            status: "Gap",
            priority: "High",
            evidence: ["Undergraduate foundational coursework only; no demonstrated inferential statistical tests"],
            explanation: "Needed for interpreting metric changes, hypothesis testing, and determining statistical significance in business experiments.",
            whatToLearn: ["Hypothesis testing (p-values, t-tests, z-tests)", "Confidence intervals and sample sizing", "Correlation vs causation and regression fundamentals"],
            category: "Analytics & Math",
          },
          {
            skill: "Excel",
            currentLevel: "Intermediate",
            requiredLevel: "Advanced",
            status: "Developing",
            priority: "Medium",
            evidence: ["Daily operations spreadsheet management reported in profile"],
            explanation: "Strong spreadsheet familiarity, but advanced lookup logic (XLOOKUP, INDEX/MATCH) and automated pivot summaries are beneficial for cross-functional reporting.",
            whatToLearn: ["Dynamic array formulas", "Power Query data transformation", "Advanced PivotTable modeling"],
            category: "Data Wrangling",
          },
          {
            skill: "Data Modeling",
            currentLevel: "Unknown",
            requiredLevel: "Intermediate",
            status: "Unknown",
            priority: "Medium",
            evidence: ["Not explicitly documented in resume or verified profile items"],
            explanation: "Insufficient portfolio evidence to confirm relational data modeling capability. Not automatically treated as missing, but requires validation.",
            whatToLearn: ["Dimensional modeling concepts", "Facts and dimensions", "Data normalization rules (1NF, 2NF, 3NF)"],
            category: "Architecture",
          },
        ];

        return res.json({
          data: {
            id: `gap-${Date.now()}`,
            targetRole: role,
            roleRequirements: roleRequirements?.technicalSkills || [],
            comparisons,
            alignmentPercentage: 68,
            topPriorities: [comparisons[2], comparisons[3], comparisons[0]],
            summary: `Your profile demonstrates a solid foundation in Python, SQL, and Excel. The primary development areas for your target ${role} role are Power BI dashboarding and applied statistics. Your SQL queries are developing steadily toward the advanced standard expected in technical interviews. We recommend prioritizing Power BI fundamentals, statistical hypothesis testing, and advanced SQL window functions.`,
            dependencies: [
              { prerequisite: "SQL Basics", target: "Advanced SQL", reason: "Foundational SELECT queries and WHERE clauses are required before constructing multi-table window functions", chain: ["SQL Basics", "SQL Joins", "Advanced SQL Window Functions", "Data Analysis"] },
              { prerequisite: "Excel", target: "Power BI", reason: "Understanding tabular data and spreadsheet formulas simplifies learning DAX measures and Power Query M logic", chain: ["Excel Tables", "Data Cleaning", "Data Visualization", "Power BI Dashboards"] },
              { prerequisite: "Math Basics", target: "A/B Testing", reason: "Descriptive statistics and probability are essential prerequisites for statistical experiment interpretation", chain: ["Math Basics", "Descriptive Statistics", "Inferential Statistics", "A/B Testing"] },
            ],
            counts: {
              strong: 1,
              developing: 2,
              gap: 2,
              unknown: 1,
            },
            analyzedAt: new Date().toISOString(),
            isDemoAnalysis: true,
          },
          isFallback: true,
        });
      }

      // Build rich prompt grounding comparison in profile evidence
      const profileInfo = learnerProfile
        ? `LEARNER PROFILE:
- Name: ${learnerProfile.name}
- Target Role: ${role}
- Current Education: ${learnerProfile.currentEducation || "Not specified"}
- Years Experience: ${learnerProfile.yearsExperience || "0"}
- Technical Skills: ${(learnerProfile.technicalSkills || []).map((s: any) => `${s.name} (${s.level || "Unknown"}, progress: ${s.progress || 0}%)`).join(", ")}
- Projects: ${(learnerProfile.projects || []).map((p: any) => `${p.name || p.title}: ${p.description}`).join("; ")}
- Certifications: ${(learnerProfile.certifications || []).map((c: any) => `${c.name} by ${c.issuer}`).join("; ")}`
        : "";

      const careerAnalysisInfo = careerAnalysis
        ? `EVIDENCE FROM RESUME / CAREER ANALYSIS:
- Candidate Summary: ${careerAnalysis.candidateSummary || ""}
- Verified Technical Skills: ${(careerAnalysis.technicalSkills || []).map((s: any) => `${s.skill} (Level: ${s.userConfirmedLevel || s.estimatedLevel}, Confidence: ${s.confidence}%, Evidence: "${s.evidence}")`).join("; ")}
- Soft Skills: ${(careerAnalysis.softSkills || []).map((s: any) => `${s.skill}: "${s.evidence}"`).join("; ")}
- Documented Projects: ${(careerAnalysis.projects || []).map((p: any) => `${p.name} (Tech: ${(p.technologies || []).join(", ")})`).join("; ")}
- Strengths: ${(careerAnalysis.strengths || []).join(", ")}
- Highlighted Missing Signals: ${(careerAnalysis.missingInformation || []).join(", ")}`
        : "";

      const requirementsInfo = roleRequirements
        ? `TARGET ROLE EXPECTATIONS FOR ${role}:
${JSON.stringify(roleRequirements, null, 2)}`
        : `Generate appropriate expectations for role "${role}" directly.`;

      const prompt = `You are EduPath AI's premier AI Skill Gap Analysis Agent.
Compare the learner's verified capabilities against industry benchmarks for the target role: "${role}".

Core Agent Principle:
You must NOT simply output a generic skill list.
Reason through:
[What the learner already knows & verified evidence]
+
[What the target role generally requires]
+
[Available evidence strength]
+
[Current proficiency vs Required proficiency]
+
[Role importance & skill dependencies]
=
[Personalized, explainable skill gaps]

Classification Rules for Status:
- "Strong": Current capability appears sufficient for the target-role requirement.
- "Developing": The learner has the skill but needs improvement to reach the expected standard.
- "Gap": The required capability is not sufficiently demonstrated in portfolio/resume.
- "Unknown": There is not enough evidence to determine the learner's current capability. (CRITICAL: Do NOT automatically treat missing resume information as proof that the learner lacks the skill; mark as "Unknown" if indeterminate).

Priority Rules:
- "Critical" | "High" | "Medium" | "Low" based on role criticality, gap distance, and foundational prerequisites.

Alignment Percentage:
- Calculate an AI-estimated skill alignment percentage (0 to 100). This represents profile alignment against requirements, not an objective employability score.

Return pure valid JSON with NO markdown wrappers matching this exact structure:
{
  "id": "gap-${Date.now()}",
  "targetRole": "${role}",
  "alignmentPercentage": number (e.g. 68),
  "summary": "3-4 sentence comprehensive, personalized summary of standing, core strengths, primary gaps, and next phase focus",
  "comparisons": [
    {
      "skill": "Skill name",
      "currentLevel": "Beginner" | "Intermediate" | "Advanced" | "Unknown" | "None",
      "requiredLevel": "Beginner" | "Intermediate" | "Advanced",
      "status": "Strong" | "Developing" | "Gap" | "Unknown",
      "priority": "Critical" | "High" | "Medium" | "Low",
      "evidence": ["Specific quotes or signals from the learner's profile and resume"],
      "explanation": "Why is this a gap or strong area? Ground in the learner's profile data vs role requirements.",
      "whatToLearn": ["Specific topic 1", "Specific topic 2", "Specific topic 3"],
      "category": "Domain category"
    }
  ],
  "topPriorities": [
    // 3 to 5 highest priority gap items selected from comparisons
  ],
  "dependencies": [
    {
      "prerequisite": "Prerequisite skill",
      "target": "Target advanced skill",
      "reason": "Why prerequisite is required first",
      "chain": ["Step 1", "Step 2", "Step 3", "Step 4"]
    }
  ],
  "counts": {
    "strong": number,
    "developing": number,
    "gap": number,
    "unknown": number
  },
  "analyzedAt": "${new Date().toISOString()}"
}

DATA INPUTS:
${profileInfo}

${careerAnalysisInfo}

${requirementsInfo}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Ensure counts and priorities exist
      if (!parsed.counts && parsed.comparisons) {
        parsed.counts = {
          strong: parsed.comparisons.filter((c: any) => c.status === "Strong").length,
          developing: parsed.comparisons.filter((c: any) => c.status === "Developing").length,
          gap: parsed.comparisons.filter((c: any) => c.status === "Gap").length,
          unknown: parsed.comparisons.filter((c: any) => c.status === "Unknown").length,
        };
      }
      if (!parsed.topPriorities && parsed.comparisons) {
        parsed.topPriorities = parsed.comparisons
          .filter((c: any) => c.status === "Gap" || c.status === "Developing")
          .slice(0, 3);
      }

      res.json({ data: parsed, isFallback: false });
    } catch (err: any) {
      console.error("Skill gap analysis agent error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze skill gaps" });
    }
  });

  // ----------------------------------------------------
  // Natural Language Skill Gap Q&A Agent (Prompt 3)
  // ----------------------------------------------------
  app.post("/api/agent/ask-skill-gap", async (req: Request, res: Response) => {
    try {
      const { question, targetRole, analysisSummary, comparisons, learnerName } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          answer: `Based on your profile for ${targetRole || "Data Analyst"}, Power BI and Statistics represent your most critical skill gaps because they are key to creating production business reporting and interpreting experimental metrics. Your SQL and Python foundations are strong, so prioritizing these two areas will give you the fastest path to career readiness.`,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Skill Gap Mentor and Career Coach.
A learner named "${learnerName || "Learner"}" is asking a question about their skill gap analysis for the target role: "${targetRole || "Data Analyst"}".

Learner's Question: "${question}"

Skill Gap Analysis Context:
- Target Role: ${targetRole}
- Analysis Summary: ${analysisSummary || "Profile analyzed against target role"}
- Skill Comparisons: ${JSON.stringify(comparisons || [], null, 2)}

Instructions:
1. Answer the question directly, concisely, and supportively (2-3 concise paragraphs or clear bullet points).
2. Ground your answer SPECIFICALLY in the learner's current levels, evidence, and identified gaps.
3. Avoid generic career platitudes; refer directly to the actual skills and priorities from their analysis.
4. Maintain an encouraging, analytical, and actionable coaching tone.`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({ answer: response.text || "I was unable to analyze this question right now.", isFallback: false });
    } catch (err: any) {
      console.error("Ask skill gap agent error:", err);
      res.status(500).json({ error: err.message || "Failed to answer skill gap question" });
    }
  });

  // ----------------------------------------------------
  // AI Practice, Quiz & Assessment Agent Endpoints
  // ----------------------------------------------------

  // 1. Practice Generation Agent
  app.post("/api/agent/generate-practice", async (req: Request, res: Response) => {
    try {
      const {
        skill = "SQL",
        difficulty = "Intermediate",
        count = 3,
        type = "multiple_choice",
        topic,
        targetRole = "Data Analyst",
        learnerProfile,
        weakTopics = [],
      } = req.body;
      const ai = getGenAI();

      if (!ai) {
        // High quality deterministic fallback matching skill and type
        const fallbackSet = [
          {
            id: `q-fallback-1`,
            question: `In ${skill}, what is the fundamental difference between an INNER JOIN and a LEFT OUTER JOIN?`,
            type: type === "coding" ? "coding" : type === "short_answer" ? "short_answer" : "multiple_choice",
            subtype: "concept",
            skill: skill,
            topic: topic || "Table Joins & Relationships",
            difficulty: difficulty,
            options: [
              "INNER JOIN returns all rows from both tables; LEFT JOIN returns only matching rows.",
              "INNER JOIN returns only rows with matches in both tables; LEFT JOIN returns all rows from the left table and matched rows from the right (with NULL for non-matches).",
              "There is no difference; LEFT JOIN is an obsolete alias for INNER JOIN.",
              "LEFT JOIN excludes matching rows entirely.",
            ],
            correctAnswer: 1,
            explanation: "INNER JOIN yields the intersection of both tables where the join condition is satisfied. LEFT OUTER JOIN retains all records from the left table, supplementing matching right-table attributes and filling non-matches with NULL values.",
            hints: ["Think about what happens to rows in the left table that have no corresponding match in the right table."],
            starterCode: type === "coding"
              ? `-- Query customers and their corresponding orders (including customers without orders)\nSELECT c.customer_id, c.name, o.order_id, o.amount\nFROM customers c\n-- Write appropriate JOIN here\nORDER BY c.customer_id;`
              : undefined,
            testCases: type === "coding" ? [
              { input: "customers (3 rows), orders (2 matches)", expectedOutput: "3 rows returned with 1 NULL order row", description: "Preserves unmatched customers" }
            ] : undefined,
            expectedPoints: ["Preserves all left table rows", "Fills non-matching right columns with NULL", "INNER JOIN requires match on both sides"],
          },
          {
            id: `q-fallback-2`,
            question: `Which phase or clause is evaluated FIRST by a standard ${skill} query processor during execution?`,
            type: "multiple_choice",
            subtype: "technical",
            skill: skill,
            topic: topic || "Query Processing Pipeline",
            difficulty: difficulty,
            options: ["SELECT", "WHERE", "FROM / JOINs", "HAVING"],
            correctAnswer: 2,
            explanation: "The query processor first loads data sources specified in FROM and evaluates JOINs to construct the base Cartesian product before filtering with WHERE and grouping with GROUP BY.",
            hints: ["The engine cannot filter or select columns until it knows which tables it is reading from."],
          },
          {
            id: `q-fallback-3`,
            question: `When handling severe skew and high-magnitude outliers in ${skill || "Data Analysis"}, why is the Median preferred over the Arithmetic Mean?`,
            type: type === "short_answer" ? "short_answer" : "multiple_choice",
            subtype: "interview",
            skill: skill,
            topic: topic || "Descriptive Statistics & Outlier Treatment",
            difficulty: difficulty,
            options: [
              "The Mean requires sorting whereas the Median does not.",
              "The Median is positional (50th percentile) and unaffected by extreme values, whereas the Mean sums all values and shifts toward the outlier tail.",
              "The Median always has a smaller standard error than the Mean.",
              "The Mean is only defined for categorical variables.",
            ],
            correctAnswer: 1,
            explanation: "Because the arithmetic mean incorporates every data point's magnitude into its sum, extreme outliers heavily inflate or deflate the metric. The median relies purely on the middle rank order.",
            hints: ["Consider what happens if one customer makes a $10,000,000 purchase in a sample of $20 purchases."],
            expectedPoints: ["Positional metric (50th percentile)", "Resistant to extreme tail values", "Arithmetic mean sum is sensitive to magnitude"],
          },
        ];

        return res.json({
          questions: fallbackSet.slice(0, Math.max(1, count)),
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Practice & Assessment Agent.
Your role is to generate rigorous, technically accurate, interview-caliber practice questions for a learner targeting "${targetRole}".

PARAMETERS:
- Skill: "${skill}"
- Specific Topic: "${topic || 'Core concepts and problem solving'}"
- Practice Mode: "${type}" (allowed: "multiple_choice", "short_answer", "coding", "case_study", "quick_quiz")
- Difficulty: "${difficulty}" (Beginner, Intermediate, Advanced, or Adaptive)
- Number of questions: ${count}
- Known Weak Topics: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None specified'}
- Learner Context: ${(learnerProfile?.technicalSkills || []).map((s: any) => `${s.name} (${s.level})`).join(', ') || 'Standard learner profile'}

GENERATION DIRECTIVES:
1. For "multiple_choice": Provide 4 plausible options, exact 0-based correctAnswer, comprehensive explanation of why the correct option is right AND why common traps fail.
2. For "short_answer": Provide expected key conceptual points, rubric criteria, and sample model answer in explanation.
3. For "coding": Provide realistic schema or input definition, problem prompt, constraints, starterCode with helpful comments, test cases (input, expected output, description), and hints.
4. For "case_study": Provide a realistic workplace problem scenario, business stakes, specific analytical challenge, and expected structured recommendations.
5. Ground every question in real job responsibilities for a ${targetRole}. Avoid trivial syntax trivia; emphasize logical reasoning, edge cases, and best practices.

Return pure valid JSON with NO markdown wrappers matching this exact schema:
{
  "questions": [
    {
      "id": "q-1",
      "question": "Clear, complete question or problem statement",
      "type": "${type}",
      "subtype": "concept" | "scenario" | "technical" | "interview",
      "skill": "${skill}",
      "topic": "Specific sub-topic",
      "difficulty": "${difficulty}",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Instructive, pedagogical explanation of the solution and underlying principles",
      "starterCode": "starter code string if coding drill, otherwise omit",
      "testCases": [
        { "input": "...", "expectedOutput": "...", "description": "..." }
      ],
      "hints": ["Hint 1 without giving away the complete answer", "Hint 2"],
      "backgroundScenario": "Optional 2-sentence business or system context for scenario/case questions",
      "expectedPoints": ["Point 1", "Point 2"]
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

      res.json({
        questions: parsed.questions || [],
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Practice generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate practice questions" });
    }
  });

  // 2. Practice Evaluation Agent (Short Answers & AI Code Reviews)
  app.post("/api/agent/evaluate-practice", async (req: Request, res: Response) => {
    try {
      const {
        question,
        userAnswer,
        type = "short_answer",
        skill = "SQL",
        topic,
        targetRole = "Data Analyst",
      } = req.body;

      const ai = getGenAI();

      if (!ai) {
        // High quality fallback evaluation
        const answerText = String(userAnswer || "").trim();
        const wordCount = answerText.split(/\s+/).filter(Boolean).length;
        const isGoodLength = wordCount >= 10;
        const score = isGoodLength ? 85 : 55;

        return res.json({
          questionId: question?.id || "q-evaluated",
          score,
          passed: score >= 70,
          verdict: score >= 80 ? "Correct" : score >= 60 ? "Partially Correct" : "Needs Work",
          whatWentWell: [
            "Addressed the core question regarding " + (skill || "the topic"),
            isGoodLength ? "Provided meaningful detail and terminology" : "Attempted the initial reasoning",
          ],
          whatWasMissing: isGoodLength
            ? ["Could include more specific edge case considerations or implementation nuances"]
            : ["Explanation was brief; expand on the underlying mechanism and why this approach is chosen"],
          correctExplanation: question?.explanation || "A complete answer clearly defines the underlying principle and justifies the trade-offs.",
          suggestedImprovements: [
            "Use concrete technical terminology and relate your answer to business outcomes.",
            "Review related practice drills to reinforce muscle memory.",
          ],
          codeReview: type === "coding" ? {
            syntaxAndLogicScore: 80,
            timeComplexity: "O(N) Expected",
            spaceComplexity: "O(1) Auxiliary",
            potentialBugs: ["Ensure NULL values in columns are handled gracefully"],
            styleAndReadability: "Clean indentation and reasonable naming convention",
            suggestedRefactoring: "Consider adding explicit column aliases for clarity.",
          } : undefined,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Expert Assessment Evaluator.
Evaluate this learner's submitted answer with strict technical rigor and constructive pedagogy.

QUESTION DETAILS:
- Question: "${question?.question}"
- Type: "${type}" (short_answer, coding, or case_study)
- Skill: "${skill}"
- Topic: "${topic || question?.topic || 'Core'}"
- Target Career: "${targetRole}"
- Question Explanation / Solution: "${question?.explanation || 'N/A'}"
- Expected Points / Rubric: ${JSON.stringify(question?.expectedPoints || [])}

LEARNER'S SUBMISSION:
"""
${userAnswer}
"""

EVALUATION DIRECTIVES:
1. Objectively assess technical accuracy, conceptual correctness, logic, and clarity.
2. For coding submissions:
   - Provide an AI CODE REVIEW (clearly labeled as AI reasoning analysis, do not claim runtime execution).
   - Evaluate logic, syntax, time and space complexity, potential bugs/edge cases, readability.
3. Score from 0 to 100:
   - 90-100: Flawless, thorough, professional.
   - 75-89: Solid, correct core, minor nuance or detail missing.
   - 50-74: Partially correct, core concept partially grasped but has flaws or significant omissions.
   - <50: Misconception or largely incorrect.
4. Provide constructive "What went well", "What was missing", and "Suggested improvements".

Return pure valid JSON with NO markdown wrappers matching this exact structure:
{
  "questionId": "${question?.id || 'q-eval'}",
  "score": number (0-100),
  "passed": boolean (true if score >= 70),
  "verdict": "Correct" | "Partially Correct" | "Incorrect" | "Needs Work",
  "whatWentWell": ["string", "string"],
  "whatWasMissing": ["string", "string"],
  "correctExplanation": "Concise model solution and explanation of core concepts",
  "suggestedImprovements": ["actionable improvement 1", "actionable improvement 2"],
  "codeReview": {
    "syntaxAndLogicScore": number (0-100),
    "timeComplexity": "e.g. O(N) or O(N log N)",
    "spaceComplexity": "e.g. O(1) or O(N)",
    "potentialBugs": ["bug or edge case 1", "bug or edge case 2"],
    "styleAndReadability": "Evaluation of code structure, formatting, and naming",
    "suggestedRefactoring": "Clear snippet or explanation of how to make code more idiomatic"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      res.json({
        ...parsed,
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Evaluate practice error:", err);
      res.status(500).json({ error: err.message || "Failed to evaluate practice answer" });
    }
  });

  // 3. Generate Interactive Flashcards Agent
  app.post("/api/agent/generate-flashcards", async (req: Request, res: Response) => {
    try {
      const {
        skill = "SQL",
        topic,
        count = 6,
        category = "all", // "all" | "skill_gaps" | "weak_areas"
        learnerProfile,
        weakAreas = [],
      } = req.body;

      const ai = getGenAI();

      if (!ai) {
        const fallbackCards = [
          {
            id: "fc-1",
            skill: skill,
            topic: "Query Clauses",
            front: "What is the logical execution order of FROM, WHERE, GROUP BY, HAVING, SELECT, and ORDER BY?",
            back: "1. FROM / JOIN\n2. WHERE\n3. GROUP BY\n4. HAVING\n5. SELECT\n6. DISTINCT\n7. ORDER BY\n8. LIMIT / OFFSET",
            hint: "FROM identifies tables first; SELECT happens near the end.",
            status: "new",
          },
          {
            id: "fc-2",
            skill: skill,
            topic: "Aggregations",
            front: "When must you use HAVING instead of WHERE?",
            back: "Use HAVING to filter on aggregated values (e.g. COUNT(*) > 5) calculated after grouping. WHERE filters individual rows before grouping occurs.",
            hint: "WHERE cannot see aggregate function results.",
            status: "new",
          },
          {
            id: "fc-3",
            skill: skill,
            topic: "Joins & Nulls",
            front: "What happens to non-matching rows in a FULL OUTER JOIN?",
            back: "All non-matching rows from both tables are retained in the result set, with NULL values filled in for the non-existing corresponding columns.",
            hint: "Combines the behaviors of LEFT JOIN and RIGHT JOIN.",
            status: "new",
          },
          {
            id: "fc-4",
            skill: skill,
            topic: "Window Functions",
            front: "What is the key difference between ROW_NUMBER(), RANK(), and DENSE_RANK()?",
            back: "- ROW_NUMBER(): Unique sequential integer (1, 2, 3, 4)\n- RANK(): Same rank for ties, skips subsequent ranks (1, 2, 2, 4)\n- DENSE_RANK(): Same rank for ties, no gaps (1, 2, 2, 3)",
            hint: "Think about how ties affect the following integer rank.",
            status: "new",
          },
        ];

        return res.json({
          flashcards: fallbackCards.slice(0, count),
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Memory & Retention Flashcard Agent.
Generate ${count} high-impact, bite-sized study flashcards for skill "${skill}".
Topic Focus: "${topic || 'Essential technical interview concepts and syntax'}".
Weak Areas to Target: ${weakAreas.length > 0 ? weakAreas.join(', ') : 'General core competencies'}.

DIRECTIVES:
1. Front: Clear, thought-provoking question, term, or technical scenario.
2. Back: Crisp, definitive explanation, bulleted breakdown, or minimal illustrative code snippet.
3. Hint: A helpful clue that jogs the memory without revealing the entire answer.
4. Mark status as "new".

Return pure valid JSON with NO markdown wrappers matching:
{
  "flashcards": [
    {
      "id": "fc-1",
      "skill": "${skill}",
      "topic": "Specific concept",
      "front": "Question or prompt on card front",
      "back": "Clear, formatted explanation on card back",
      "hint": "Helpful conceptual nudge",
      "codeSnippet": "optional short code snippet",
      "status": "new"
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

      res.json({
        flashcards: parsed.flashcards || [],
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Flashcards generation error:", err);
      res.status(500).json({ error: err.message || "Failed to generate flashcards" });
    }
  });

  // 4. Analyze Practice Performance & Weak Areas Agent
  app.post("/api/agent/analyze-practice-performance", async (req: Request, res: Response) => {
    try {
      const {
        attempts = [],
        learnerProfile,
        targetRole = "Data Analyst",
      } = req.body;

      const ai = getGenAI();

      // Compute client-side deterministic baseline stats
      const totalAttempts = attempts.length;
      let totalQuestions = 0;
      let totalCorrect = 0;
      const topicMistakeMap: Record<string, { count: number; skill: string }> = {};

      attempts.forEach((att: any) => {
        totalQuestions += att.totalQuestions || 0;
        totalCorrect += att.correctCount || 0;
        (att.weakTopicsIdentified || []).forEach((top: string) => {
          if (!topicMistakeMap[top]) {
            topicMistakeMap[top] = { count: 0, skill: att.skill || 'General' };
          }
          topicMistakeMap[top].count += 1;
        });
      });

      const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 75;

      if (!ai || totalAttempts === 0) {
        return res.json({
          report: {
            overallScore: accuracy,
            totalAttempts,
            streakDays: learnerProfile?.streakDays || 5,
            skillsMastery: [
              { skill: "SQL Queries & Aggregations", accuracyPercentage: 84, status: "Strong", attemptsCount: 6 },
              { skill: "SQL Window Functions", accuracyPercentage: 58, status: "Needs Review", attemptsCount: 4 },
              { skill: "Power BI & DAX", accuracyPercentage: 62, status: "Developing", attemptsCount: 3 },
              { skill: "Hypothesis Testing", accuracyPercentage: 72, status: "Developing", attemptsCount: 4 },
            ],
            weakAreas: [
              {
                topic: "SQL Window Functions (PARTITION BY & ORDER BY)",
                skill: "SQL",
                frequency: 3,
                recommendation: "Review the difference between ranking and aggregation window frames. Practice 3 dedicated ranking drills.",
              },
              {
                topic: "DAX CALCULATE filter context modifications",
                skill: "Power BI",
                frequency: 2,
                recommendation: "Review the SQLBI guide on row context transition before retaking the DAX assessment.",
              },
            ],
            recommendedNextPractice: {
              skill: "SQL",
              topic: "Window Functions & Ranking",
              difficulty: "Intermediate",
              type: "coding",
              reason: "Directly reinforces your most frequent quiz gap to elevate your SQL readiness to Advanced.",
            },
          },
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Performance & Diagnostic Learning Agent.
Analyze this candidate's recent practice sessions and quiz attempts:
Target Role: "${targetRole}"
Learner: "${learnerProfile?.name || 'Candidate'}"
Attempts Data: ${JSON.stringify(attempts.slice(-10))}

DIRECTIVES:
1. Synthesize overall accuracy and mastery across distinct skills (e.g. SQL, Python, Power BI, Statistics).
2. Classify skill status as "Strong" (>=80%), "Developing" (65-79%), or "Needs Review" (<65%).
3. Detect recurring weak topics and repeated mistakes across sessions.
4. Formulate the single highest-leverage "recommendedNextPractice" drill to close their most urgent gap.

Return pure valid JSON with NO markdown wrappers matching:
{
  "report": {
    "overallScore": number (0-100),
    "totalAttempts": ${totalAttempts},
    "streakDays": ${learnerProfile?.streakDays || 5},
    "skillsMastery": [
      {
        "skill": "Skill name",
        "accuracyPercentage": number,
        "status": "Strong" | "Developing" | "Needs Review",
        "attemptsCount": number
      }
    ],
    "weakAreas": [
      {
        "topic": "Specific missed concept or pattern",
        "skill": "Parent skill",
        "frequency": number,
        "recommendation": "1-2 sentence concrete advice and study suggestion"
      }
    ],
    "recommendedNextPractice": {
      "skill": "Skill name",
      "topic": "Sub-topic",
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "type": "multiple_choice" | "short_answer" | "coding" | "case_study" | "quick_quiz",
      "reason": "Clear explanation of why this drill is recommended right now"
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

      res.json({
        report: parsed.report || {},
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Practice performance analysis error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze practice performance" });
    }
  });

  // 5. Natural Language Practice Assistant ("Ask AI About This Practice")
  app.post("/api/agent/ask-practice", async (req: Request, res: Response) => {
    try {
      const {
        question,
        userAnswer,
        queryType = "hint", // "hint" | "explain_concept" | "why_wrong" | "easier_question" | "similar_problem"
        customMessage,
        learnerProfile,
      } = req.body;

      const ai = getGenAI();

      if (!ai) {
        let reply = "";
        switch (queryType) {
          case "hint":
            reply = `**Hint:** ${question?.hints?.[0] || `Focus on how ${question?.skill || 'the engine'} processes records step-by-step. Remember that non-matching records behave differently in inner vs outer operations.`}`;
            break;
          case "explain_concept":
            reply = `**Concept Explanation:** In ${question?.skill || 'this domain'}, **${question?.topic || 'this technique'}** is used to ensure reliable data handling. ${question?.explanation || 'The primary principle is separation of concerns and deterministic ordering.'}`;
            break;
          case "why_wrong":
            reply = `**Why That Answer Was Marked Incorrect:** Your answer overlooked the critical edge case where values evaluate to NULL or fail the join predicate. In ${question?.skill || 'technical interviews'}, interviewers specifically test whether you account for empty or non-matching records.`;
            break;
          case "easier_question":
            reply = `**Warmup Question:** Before tackling this problem, try this simpler drill: *In a standard 2-table query, what keyword combines rows only when keys match in BOTH tables?* (Answer: INNER JOIN). Once confident with this, returning to the current question will be much simpler!`;
            break;
          default:
            reply = `**EduPath Practice Coach:** Remember to break down the problem into individual logical steps: input format, intermediate transformations, and expected output. What part feels most ambiguous?`;
        }
        return res.json({ answer: reply, isFallback: true });
      }

      const prompt = `You are EduPath AI's Practice Coach and Socratic Tutor.
A learner is working on a practice problem and asked for guidance:
Mode: "${queryType}"
Custom message if any: "${customMessage || ''}"

PROBLEM CONTEXT:
- Skill: "${question?.skill}"
- Topic: "${question?.topic}"
- Question: "${question?.question}"
- Type: "${question?.type}"
- Correct Explanation: "${question?.explanation}"
- Options: ${JSON.stringify(question?.options || [])}
- Learner's current / submitted answer: "${userAnswer || 'Not yet answered'}"
- Learner Target: "${learnerProfile?.targetRole || 'Data Analyst'}"

INSTRUCTIONS BY MODE:
1. "hint": Give a thought-provoking, Socratic hint that nudges them toward the solution WITHOUT spoiling the direct answer.
2. "explain_concept": Provide a lucid, 2-3 paragraph explanation of the underlying theory with a mini illustration.
3. "why_wrong": Analyze their submitted answer, pinpoint the exact misconception, and explain why that trap is common.
4. "easier_question": Present a simpler warmup problem on the same foundation to build confidence.
5. "similar_problem": Present a sibling interview problem using the same pattern with different numbers/context.

Use clean bold formatting and bullet points. Be motivating, precise, and educational.`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({
        answer: response.text || "I am here to guide your practice. Keep going!",
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Ask practice assistant error:", err);
      res.status(500).json({ error: err.message || "Failed to answer practice question" });
    }
  });

  // Project Generation Agent
  app.post("/api/agent/generate-project", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", missingSkills, domain = "E-Commerce & Tech" } = req.body;
    const fallbackProject = {
      title: `${targetRole || "Data"} Portfolio Capstone: Cohort Retention & Performance Dashboard`,
      skillsDeveloped: (missingSkills && missingSkills.length) ? missingSkills : ["Power BI", "SQL Window Functions", "Statistics", "Executive Storytelling"],
      difficulty: "Intermediate",
      estimatedDuration: "12-15 hours",
      description: `Analyze 50,000 ${domain.toLowerCase()} subscriber records to calculate 30-day cohort retention, identify the top three leading indicators of customer churn, and construct an executive Power BI dashboard with automated DAX KPI cards.`,
      requiredTools: ["PostgreSQL or SQLite", "Power BI Desktop", "Python (Pandas)"],
      learningOutcomes: [
        "Write SQL self-joins and window functions (LAG, LEAD) to calculate user activity intervals",
        "Formulate DAX measures for Month-over-Month churn rate and Customer Lifetime Value (CLV)",
        "Design an executive one-pager dashboard answering high-level business stakeholder questions",
      ],
      milestones: [
        `Phase 1: Ingest and clean synthetic ${domain.toLowerCase()} churn dataset`,
        "Phase 2: Calculate retention cohorts and churn risk segmentations in SQL",
        "Phase 3: Build interactive Power BI dashboard with drill-through filters",
        "Phase 4: Draft a 5-bullet executive summary memo to present findings",
      ],
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          project: fallbackProject,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Project Generation Agent.
Generate a portfolio-worthy, realistic project tailored to a candidate targeting "${targetRole || "Data Analyst"}" who needs to develop missing skills: ${(missingSkills || ["Power BI", "Statistics"]).join(", ")}.
Domain: ${domain}.

Return pure valid JSON with NO markdown wrappers matching this structure:
{
  "project": {
    "title": "string",
    "skillsDeveloped": ["string", "string"],
    "difficulty": "Beginner" | "Intermediate" | "Advanced",
    "estimatedDuration": "e.g. 10-14 hours",
    "description": "rich paragraph describing the business scenario and problem",
    "requiredTools": ["string", "string"],
    "learningOutcomes": ["outcome 1", "outcome 2", "outcome 3"],
    "milestones": ["milestone 1", "milestone 2", "milestone 3", "milestone 4"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Project generation API error, using fallback:", err?.message);
      res.json({ project: fallbackProject, isFallback: true });
    }
  });

  // Recommend Projects Agent (Part 1 - Recommendation Engine)
  app.post(["/api/agent/recommend-projects", "/api/agent/generate-project-recommendations"], async (req: Request, res: Response) => {
    const {
      targetRole = "Data Analyst",
      currentSkills = [],
      skillGaps = [],
      difficulty = "intermediate",
      userProfile,
      learningPath,
    } = req.body;

    const roleName = targetRole || userProfile?.targetRole || "Data Analyst";
    const gapsList = skillGaps.length > 0
      ? skillGaps.map((g: any) => typeof g === "string" ? g : g.skill)
      : ["Power BI", "SQL Window Functions", "Statistics"];

    const fallbackRecommendations = [
      {
        id: `rec-proj-1-${Date.now()}`,
        userId: userProfile?.id || "demo_user",
        title: "E-Commerce Customer Retention & Cohort Analytics Dashboard",
        problemStatement: "Online retail businesses experience sharp drop-offs between the first and second purchase. Leadership lacks automated cohort visibility to determine customer lifetime value (LTV) and 30-day retention drivers.",
        objective: "Analyze 50,000+ transaction records using advanced SQL window functions, formulate automated DAX measures in Power BI, and deliver an interactive retention dashboard with drill-through cohorts.",
        targetRole: roleName,
        skills: ["SQL Window Functions", "Power BI", "DAX", "Cohort Analysis", "Data Storytelling"],
        technologies: ["PostgreSQL", "Power BI Desktop", "Python (Pandas)"],
        difficulty: "intermediate" as const,
        estimatedDuration: "12-14 hours",
        prerequisites: ["Basic SQL SELECT & JOINs", "Understanding of tabular datasets"],
        whyRecommended: `Directly bridges your priority skill gap in ${gapsList.slice(0, 2).join(" & ")}. Demonstrates end-to-end analytical rigor for ${roleName} portfolio review.`,
        status: "not_started" as const,
        portfolioValue: [
          "Recruiter-ready GitHub documentation with schema diagrams and SQL scripts",
          "Interactive dashboard demonstrating cohort analysis and executive KPI cards",
          "Concrete talking points for technical interviews on query optimization and DAX",
        ],
        expectedOutcome: "Production-quality Power BI report with GitHub documentation and executive summary memo.",
        milestones: [
          {
            id: "m1",
            step: 1,
            title: "Milestone 1: Understand the Problem",
            objective: "Define retention KPIs, formulate hypothesis questions, and document the analytical scope.",
            tasks: ["Review transaction data dictionary", "Formulate churn definitions (30d vs 60d)", "Define key stakeholder questions"],
            skills: ["Business Acumen", "KPI Definition"],
            estimatedTime: "1.5 hours",
            completed: false,
            status: "not_started" as const,
          },
          {
            id: "m2",
            step: 2,
            title: "Milestone 2: Collect / Prepare Data",
            objective: "Clean transaction anomalies, treat null customer IDs, and structure tables for relational modeling.",
            tasks: ["Handle timestamp formats and null customer IDs in SQL", "Remove duplicate transaction lines", "Build date dimension table"],
            skills: ["Data Cleaning", "Relational Modeling"],
            estimatedTime: "2.5 hours",
            completed: false,
            status: "not_started" as const,
          },
          {
            id: "m3",
            step: 3,
            title: "Milestone 3: Build Core Solution",
            objective: "Compute cohort purchase dates and intervals using SQL Window functions (ROW_NUMBER, LAG, DATEDIFF).",
            tasks: ["Write cohort acquisition query using FIRST_VALUE or MIN(order_date)", "Calculate month-index intervals", "Aggregate retention matrix into staging views"],
            skills: ["SQL Window Functions", "Advanced Joins"],
            estimatedTime: "3.5 hours",
            completed: false,
            status: "not_started" as const,
          },
          {
            id: "m4",
            step: 4,
            title: "Milestone 4: Analyze Results",
            objective: "Identify behavioral patterns differentiating retained vs. churned cohorts.",
            tasks: ["Segment customers by first product category purchased", "Quantify revenue contribution per cohort", "Statistical verification of repeat purchase timing"],
            skills: ["Statistics", "Cohort Analysis"],
            estimatedTime: "2 hours",
            completed: false,
            status: "not_started" as const,
          },
          {
            id: "m5",
            step: 5,
            title: "Milestone 5: Create Final Output",
            objective: "Design interactive Power BI dashboard with dynamic cohort heatmap, DAX MoM measures, and slicers.",
            tasks: ["Import staged queries into Power BI", "Write DAX measures for Active Cohort Retention % and Average Basket Value", "Design visual layout with high executive contrast"],
            skills: ["Power BI", "DAX", "UI/UX Design"],
            estimatedTime: "3 hours",
            completed: false,
            status: "not_started" as const,
          },
          {
            id: "m6",
            step: 6,
            title: "Milestone 6: Document & Present",
            objective: "Draft GitHub README, write executive summary bullets, and prepare 90-second portfolio walkthrough.",
            tasks: ["Draft comprehensive README with architecture diagram", "Record 90-second project demo video / GIF", "Prepare interview talking points on query trade-offs"],
            skills: ["Technical Writing", "Stakeholder Communication"],
            estimatedTime: "1.5 hours",
            completed: false,
            status: "not_started" as const,
          },
        ],
      },
      {
        id: `rec-proj-2-${Date.now()}`,
        userId: userProfile?.id || "demo_user",
        title: "SaaS Subscription Churn Prediction & Early-Warning Pipeline",
        problemStatement: "Subscription cancellations cost recurring revenue businesses millions annually. Support ticket spikes and inactivity signals often precede churn by 14 days, but are rarely correlated in time.",
        objective: "Build an automated analytical pipeline extracting usage telemetry, computing rolling engagement scores, and generating actionable churn-risk segmentations.",
        targetRole: roleName,
        skills: ["Python", "SQL", "Statistics", "Predictive Analytics"],
        technologies: ["Python (Pandas, Scikit-learn)", "PostgreSQL", "Jupyter"],
        difficulty: "intermediate" as const,
        estimatedDuration: "14-16 hours",
        prerequisites: ["Python fundamentals", "Basic regression/classification concepts"],
        whyRecommended: "Ideal for demonstrating quantitative modeling and Python proficiency alongside data warehousing skills.",
        status: "not_started" as const,
        portfolioValue: [
          "Complete Jupyter notebook with hypothesis testing and feature correlation matrix",
          "SQL pipeline scripts creating operational warning views",
          "Executive recommendation deck on targeted retention campaigns",
        ],
        expectedOutcome: "End-to-end Python analytics notebook and SQL pipeline with model performance evaluation.",
        milestones: [
          { id: "m1", step: 1, title: "Milestone 1: Understand the Problem", objective: "Map SaaS funnel events to subscription churn risk.", tasks: ["Define telemetry events", "Establish 14-day churn lookback window"], skills: ["Domain Knowledge"], estimatedTime: "2 hours", completed: false },
          { id: "m2", step: 2, title: "Milestone 2: Collect / Prepare Data", objective: "Merge telemetry logs with subscription billing history.", tasks: ["Extract time-series event logs", "Aggregate weekly active usage"], skills: ["Data Pipeline", "Python"], estimatedTime: "3 hours", completed: false },
          { id: "m3", step: 3, title: "Milestone 3: Build Core Solution", objective: "Train logistic regression and random forest classification baseline.", tasks: ["Feature engineering for login decay", "Train-test split with cross-validation"], skills: ["Scikit-learn", "Modeling"], estimatedTime: "4 hours", completed: false },
          { id: "m4", step: 4, title: "Milestone 4: Analyze Results", objective: "Evaluate model precision, recall, and top predictive coefficients.", tasks: ["Generate ROC-AUC curves", "Extract feature importance scores"], skills: ["Model Evaluation"], estimatedTime: "2 hours", completed: false },
          { id: "m5", step: 5, title: "Milestone 5: Create Final Output", objective: "Export prioritized high-risk customer account tier list.", tasks: ["Build risk scoring threshold logic", "Export CSV feed for customer success team"], skills: ["Data Delivery"], estimatedTime: "2 hours", completed: false },
          { id: "m6", step: 6, title: "Milestone 6: Document & Present", objective: "Package GitHub repository with instructions and business insights memo.", tasks: ["Write README documentation", "Draft executive takeaways"], skills: ["Documentation"], estimatedTime: "1.5 hours", completed: false },
        ],
      },
      {
        id: `rec-proj-3-${Date.now()}`,
        userId: userProfile?.id || "demo_user",
        title: "Supply Chain & Logistics Operational Efficiency Monitor",
        problemStatement: "Fulfillment centers face delivery bottlenecks caused by carrier variance, warehouse picking delays, and weather disruptions, driving up return rates and support costs.",
        objective: "Synthesize shipping timestamps, route metadata, and supplier delivery logs into an automated KPI monitor tracking On-Time-In-Full (OTIF) delivery metrics.",
        targetRole: roleName,
        skills: ["SQL Window Functions", "Power BI", "Excel", "Data Transformation"],
        technologies: ["Power BI", "Excel / CSV", "PostgreSQL"],
        difficulty: "beginner" as const,
        estimatedDuration: "10-12 hours",
        prerequisites: ["Basic data modeling and spreadsheet analysis"],
        whyRecommended: "Demonstrates practical operational problem solving, rapid KPI dashboard delivery, and supply chain domain credibility.",
        status: "not_started" as const,
        portfolioValue: [
          "Operational dispatch dashboard with automated outlier flags",
          "Route delay attribution breakdown",
          "Ready-to-use template for logistics and retail analysis interviews",
        ],
        expectedOutcome: "Interactive operations dashboard and process improvement memo.",
        milestones: [
          { id: "m1", step: 1, title: "Milestone 1: Understand the Problem", objective: "Formulate delivery delay metrics and SLA violation rules.", tasks: ["Review carrier SLAs", "Map standard delivery milestones"], skills: ["Business Requirements"], estimatedTime: "1.5 hours", completed: false },
          { id: "m2", step: 2, title: "Milestone 2: Collect / Prepare Data", objective: "Ingest dispatch logs and sanitize geo-coordinates.", tasks: ["Join shipping orders to fulfillment hubs", "Calculate actual vs promised transit days"], skills: ["Data Preparation"], estimatedTime: "2.5 hours", completed: false },
          { id: "m3", step: 3, title: "Milestone 3: Build Core Solution", objective: "Aggregate SLA failure rates across shipping lanes.", tasks: ["Calculate OTIF percentage", "Rank underperforming shipping corridors"], skills: ["Aggregation", "SQL"], estimatedTime: "2.5 hours", completed: false },
          { id: "m4", step: 4, title: "Milestone 4: Analyze Results", objective: "Pinpoint top 3 root causes of transit delay.", tasks: ["Correlate delays with warehouse departure hour", "Evaluate weather anomaly impacts"], skills: ["Root Cause Analysis"], estimatedTime: "2 hours", completed: false },
          { id: "m5", step: 5, title: "Milestone 5: Create Final Output", objective: "Construct multi-tab Power BI operations monitor.", tasks: ["Build carrier comparison cards", "Add interactive lane filters"], skills: ["Dashboarding"], estimatedTime: "2.5 hours", completed: false },
          { id: "m6", step: 6, title: "Milestone 6: Document & Present", objective: "Document findings in executive briefing presentation.", tasks: ["Summarize cost savings opportunities", "Finalize repository"], skills: ["Presentation"], estimatedTime: "1 hour", completed: false },
        ],
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ recommendations: fallbackRecommendations, isFallback: true });
      }

      const prompt = `You are EduPath AI's Project Recommendation Agent.
Recommend 3 distinct, high-impact portfolio projects tailored to this learner:
- Target Role: ${roleName}
- Current Skills: ${Array.isArray(currentSkills) ? currentSkills.map((s: any) => typeof s === "string" ? s : s.name).join(", ") : "SQL, Python, Excel"}
- Priority Skill Gaps: ${gapsList.join(", ")}
- Difficulty Preference: ${difficulty}

Rules:
1. Every project must be realistic, production-relevant, and recruiter-impressive.
2. Projects must address specific skill gaps (e.g., Power BI, SQL Window Functions, Statistics).
3. Break each project into 6 standard milestones:
   Milestone 1: Understand the Problem
   Milestone 2: Collect / Prepare Data
   Milestone 3: Build Core Solution
   Milestone 4: Analyze Results
   Milestone 5: Create Final Output
   Milestone 6: Document & Present

Return valid JSON with NO markdown formatting:
{
  "recommendations": [
    {
      "id": "string",
      "title": "string",
      "problemStatement": "string",
      "objective": "string",
      "targetRole": "${roleName}",
      "skills": ["string"],
      "technologies": ["string"],
      "difficulty": "beginner" | "intermediate" | "advanced",
      "estimatedDuration": "e.g. 12-14 hours",
      "prerequisites": ["string"],
      "whyRecommended": "string explaining how this solves their skill gap",
      "status": "not_started",
      "portfolioValue": ["bullet 1", "bullet 2", "bullet 3"],
      "expectedOutcome": "string",
      "milestones": [
        {
          "id": "m1",
          "step": 1,
          "title": "Milestone 1: Understand the Problem",
          "objective": "string",
          "tasks": ["task 1", "task 2"],
          "skills": ["string"],
          "estimatedTime": "e.g. 2 hours",
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

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const recommendations = parsed.recommendations || fallbackRecommendations;
      res.json({ recommendations, projects: recommendations, isFallback: false });
    } catch (err: any) {
      console.warn("Project recommendations error, using fallback:", err?.message);
      res.json({ recommendations: fallbackRecommendations, projects: fallbackRecommendations, isFallback: true });
    }
  });

  // Generate Full Personalized Project Agent
  app.post("/api/agent/generate-full-project", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", selectedSkills = [], domain = "E-Commerce", difficulty = "intermediate", userProfile } = req.body;
    const role = targetRole || "Data Analyst";
    const skillsList = selectedSkills.length > 0 ? selectedSkills : ["SQL", "Power BI", "Statistics"];

    const fallbackFullProject = {
      id: `ai-proj-${Date.now()}`,
      userId: userProfile?.id || "demo_user",
      title: `${domain} Analytics Capstone: End-to-End Performance & KPI Intelligence Platform`,
      problemStatement: `Organizations in the ${domain} space struggle with fragmented transactional and behavioral data across channels. Decision-makers need a unified analytics model to detect revenue leaks, customer churn, and operational inefficiencies.`,
      objective: `Develop a comprehensive, portfolio-ready data pipeline and dashboard utilizing ${skillsList.join(", ")}. Ingest raw records, model relationships in SQL, and construct an interactive executive dashboard with documented business findings.`,
      targetRole: role,
      skills: skillsList,
      technologies: ["PostgreSQL / DuckDB", "Power BI / Tableau", "Python (Pandas)"],
      difficulty: difficulty as "beginner" | "intermediate" | "advanced",
      estimatedDuration: "14-16 hours",
      prerequisites: ["Relational schema basics", "Familiarity with query tools"],
      functionalRequirements: [
        "Ingest and validate 20,000+ transaction rows across customers, orders, and products",
        "Implement automated SQL transformations calculating cohort retention and monthly revenue growth",
        "Provide executive dashboard with interactive date range, segment, and category filters",
        "Generate a structured business memo highlighting the top 3 high-impact recommendations",
      ],
      technicalRequirements: [
        "Normalized 3NF or dimensional star-schema database architecture",
        "Optimized SQL queries utilizing window functions (LEAD, LAG, DENSE_RANK)",
        "Automated DAX measures for Year-over-Year (YoY) and Month-over-Month (MoM) performance",
        "Public GitHub repository containing cleaned SQL scripts, dataset documentation, and reproducible instructions",
      ],
      expectedInputs: ["Raw customer transaction CSVs", "Product catalog metadata", "Returns and fulfillment logs"],
      expectedOutputs: ["Cleaned staging database tables", "Interactive Power BI (.pbix) report", "Executive insights deck / README"],
      datasetRequirements: ["Synthetic or open-source multi-table retail dataset (5k-50k rows) with customer IDs, timestamps, amounts, and status codes"],
      suggestedTools: ["PostgreSQL or SQLite", "Power BI Desktop", "Python (Pandas, Jupyter)", "GitHub"],
      whyRecommended: `Crafted to target your explicit skill focus in ${skillsList.join(", ")} and deliver a high-signal portfolio asset for ${role} interviews.`,
      status: "not_started" as const,
      portfolioValue: [
        "High-signal demonstration of end-to-end analytical capability",
        "Documented code repository showing clean formatting, comments, and query optimization",
        "Ready-made talking points for technical case study interviews",
      ],
      expectedOutcome: "A recruiter-ready portfolio project featuring a published dashboard, GitHub repository, and video/deck walkthrough.",
      milestones: [
        {
          id: "m1",
          step: 1,
          title: "Milestone 1: Understand the Problem",
          objective: "Define business objectives, KPI definitions, and stakeholder user stories.",
          tasks: ["Formulate business hypothesis", "Map KPIs (LTV, CAC, Churn, AOV)", "Draft analytical plan"],
          skills: ["Requirements Gathering", "Domain Analysis"],
          estimatedTime: "2 hours",
          completed: false,
          status: "not_started" as const,
        },
        {
          id: "m2",
          step: 2,
          title: "Milestone 2: Collect / Prepare Data",
          objective: "Inspect data quality, resolve missing values, and structure dimension tables.",
          tasks: ["Ingest raw CSV files into SQL", "Identify nulls, outliers, and duplicates", "Construct relational star schema"],
          skills: ["Data Modeling", "ETL & Data Cleaning"],
          estimatedTime: "3 hours",
          completed: false,
          status: "not_started" as const,
        },
        {
          id: "m3",
          step: 3,
          title: "Milestone 3: Build Core Solution",
          objective: "Write analytical SQL transformations and calculate core operational metrics.",
          tasks: ["Write window functions for customer purchase intervals", "Calculate rolling 30-day revenue", "Create reusable SQL views for reporting"],
          skills: ["Advanced SQL", "Window Functions"],
          estimatedTime: "3.5 hours",
          completed: false,
          status: "not_started" as const,
        },
        {
          id: "m4",
          step: 4,
          title: "Milestone 4: Analyze Results",
          objective: "Perform exploratory analysis to extract key business insights.",
          tasks: ["Compare retention across customer segments", "Quantify top drivers of churn", "Validate findings with summary statistics"],
          skills: ["Statistical Analysis", "Data Storytelling"],
          estimatedTime: "2 hours",
          completed: false,
          status: "not_started" as const,
        },
        {
          id: "m5",
          step: 5,
          title: "Milestone 5: Create Final Output",
          objective: "Build interactive visual dashboard with responsive navigation and drill-throughs.",
          tasks: ["Connect Power BI to database views", "Implement DAX calculated metrics", "Design intuitive executive dashboard UI"],
          skills: ["Dashboard Design", "DAX"],
          estimatedTime: "3.5 hours",
          completed: false,
          status: "not_started" as const,
        },
        {
          id: "m6",
          step: 6,
          title: "Milestone 6: Document & Present",
          objective: "Publish GitHub repository, create project walkthrough demo, and draft resume bullet points.",
          tasks: ["Write structured GitHub README with architecture diagram", "Record 2-minute walkthrough demo", "Draft STAR-format resume bullet points"],
          skills: ["Documentation", "Communication"],
          estimatedTime: "2 hours",
          completed: false,
          status: "not_started" as const,
        },
      ],
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ project: fallbackFullProject, isFallback: true });
      }

      const prompt = `You are EduPath AI's Master Project Architect.
Generate a complete, personalized, end-to-end portfolio project specification.
- Target Role: ${role}
- Focused Skills: ${skillsList.join(", ")}
- Domain: ${domain}
- Difficulty: ${difficulty}

Ensure the generated project includes:
1. Problem Statement & Objective
2. Functional & Technical Requirements
3. Expected Inputs & Outputs
4. Dataset Requirements & Suggested Tools
5. All 6 Standardized Milestones (Understand Problem, Collect Data, Build Core Solution, Analyze Results, Create Output, Document & Present) with concrete tasks and time estimates.

Return pure valid JSON with NO markdown wrappers:
{
  "project": {
    "title": "string",
    "problemStatement": "string",
    "objective": "string",
    "targetRole": "${role}",
    "skills": ["string"],
    "technologies": ["string"],
    "difficulty": "${difficulty}",
    "estimatedDuration": "string",
    "prerequisites": ["string"],
    "functionalRequirements": ["string"],
    "technicalRequirements": ["string"],
    "expectedInputs": ["string"],
    "expectedOutputs": ["string"],
    "datasetRequirements": ["string"],
    "suggestedTools": ["string"],
    "whyRecommended": "string",
    "status": "not_started",
    "portfolioValue": ["string"],
    "expectedOutcome": "string",
    "milestones": [
      {
        "id": "m1",
        "step": 1,
        "title": "Milestone 1: Understand the Problem",
        "objective": "string",
        "tasks": ["string", "string"],
        "skills": ["string"],
        "estimatedTime": "string",
        "completed": false,
        "status": "not_started"
      }
    ]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const project = parsed.project
        ? { id: `ai-proj-${Date.now()}`, userId: userProfile?.id || "demo_user", ...parsed.project }
        : fallbackFullProject;
      res.json({ project, isFallback: false });
    } catch (err: any) {
      console.warn("Generate full project error, using fallback:", err?.message);
      res.json({ project: fallbackFullProject, isFallback: true });
    }
  });

  // Ask Project Mentor Agent (Q&A with Hint -> Explanation -> Example -> Deeper Guidance)
  app.post("/api/agent/ask-project-mentor", async (req: Request, res: Response) => {
    const { project, currentMilestone, question, history = [] } = req.body;
    const projectTitle = project?.title || "Portfolio Project";
    const milestoneTitle = currentMilestone?.title || "Current Milestone";

    let fallbackReply = `**Project Mentor Guidance for ${milestoneTitle}**:

💡 **Hint**: First isolate what inputs you have and verify the data types before running complex operations.

📖 **Explanation**: When executing this phase, your primary objective is to maintain reproducibility. Make sure all scripts or queries can run sequentially without manual intervention.

💻 **Concrete Example**:
\`\`\`sql
-- Sample modular query pattern
WITH ranked_activity AS (
  SELECT 
    customer_id,
    order_date,
    ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY order_date ASC) as purchase_seq
  FROM transactions
)
SELECT * FROM ranked_activity WHERE purchase_seq = 1;
\`\`\`

🚀 **Deeper Guidance & Best Practice**:
Document edge cases (like null customer identifiers or refunded orders) in a comment block. Interviewers love seeing defensive coding in portfolio projects!`;

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ reply: fallbackReply, isFallback: true });
      }

      const prompt = `You are EduPath AI's Senior Project Mentor.
You are helping a learner work on their portfolio project:
Project: "${projectTitle}"
Active Milestone: "${milestoneTitle}"
Milestone Objective: "${currentMilestone?.objective || "Execute milestone tasks"}"
Technologies: ${(project?.technologies || ["SQL", "Power BI"]).join(", ")}

Learner's Question: "${question}"

Provide a structured, supportive, and highly technical response following this pattern:
1. 💡 Hint: Brief conceptual nudge.
2. 📖 Explanation: Clear breakdown of the approach.
3. 💻 Example: Concrete code snippet, SQL query, formula, or design structure.
4. 🚀 Deeper Guidance: Industry best practice or how to talk about this in an interview.

Keep formatting clean with bold headings and markdown.`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({ reply: response.text || fallbackReply, isFallback: false });
    } catch (err: any) {
      console.warn("Ask project mentor error, using fallback:", err?.message);
      res.json({ reply: fallbackReply, isFallback: true });
    }
  });

  // Review Project Agent (AI Project Review)
  app.post("/api/agent/review-project", async (req: Request, res: Response) => {
    const { project, submission } = req.body;
    const projectTitle = project?.title || "Data Analytics Capstone";

    const fallbackReview = {
      reviewedAt: new Date().toISOString(),
      overallScore: 88,
      strengths: [
        "Thorough problem statement addressing real-world cohort retention metrics",
        "Clear documentation of data transformations and relational assumptions",
        "Effective utilization of window functions and automated KPI measures",
      ],
      areasForImprovement: [
        "Include automated validation queries to flag edge cases (e.g. negative basket amounts)",
        "Add an interactive date slicer with standard fiscal quarters in the dashboard view",
        "Document performance tuning notes regarding query execution times on large datasets",
      ],
      technicalSuggestions: [
        "Replace scalar subqueries with Common Table Expressions (CTEs) for enhanced readability",
        "Use explicit DAX DIVIDE() function with alternate result to avoid division by zero errors",
      ],
      missingFeatures: [
        "Add an executive summary callout box directly on the primary dashboard page",
        "Include a data dictionary markdown file in the GitHub repository root",
      ],
      documentationSuggestions: [
        "Add a visual architecture flowchart illustrating data flow from CSV to SQL to Dashboard",
        "Include a 'How to Run Locally' section with required software versions in README",
      ],
      presentationSuggestions: [
        "Start your portfolio walkthrough with the business revenue outcome before showing queries",
        "Prepare a 60-second summary answering: 'What would you do next if given another sprint?'",
      ],
      portfolioSuggestions: [
        "Feature high-resolution screenshots of your top two dashboard views in the repository README",
        "Link directly to an interactive public dashboard demo if possible",
      ],
      interviewTalkingPoints: [
        `"When building the ${projectTitle}, I discovered that cohort retention dropped by 28% after day 14..."`,
        `"To optimize query performance, I replaced recursive self-joins with analytical window functions..."`,
        `"I designed the dashboard specifically for executive stakeholders who needed actionable weekly metrics..."`,
      ],
      overallSummary: `Impressive submission for "${projectTitle}". You have demonstrated strong competency in data modeling, transformation logic, and stakeholder reporting. With minor documentation polishing, this will serve as a standout portfolio centerpiece.`,
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ review: fallbackReview, isFallback: true });
      }

      const prompt = `You are EduPath AI's Senior Technical Reviewer.
Perform a comprehensive, constructive AI Project Review of this student's project submission.
Project: "${projectTitle}"
Target Role: "${project?.targetRole || "Data Analyst"}"
Objective: "${project?.objective || ""}"
Submission Details:
- Description: ${submission?.projectDescription || "User completed all milestone tasks"}
- GitHub URL: ${submission?.githubUrl || "Provided"}
- Live Demo: ${submission?.demoUrl || "Provided"}
- Technologies Used: ${(submission?.technologies || project?.technologies || []).join(", ")}
- Challenges Faced: ${submission?.challengesFaced || "Optimizing data transformations"}
- Learning Outcomes: ${(submission?.learningOutcomes || []).join(", ")}

Evaluate against industry standards for a hiring portfolio.
Return pure valid JSON with NO markdown formatting:
{
  "review": {
    "reviewedAt": "${new Date().toISOString()}",
    "overallScore": number (0-100),
    "strengths": ["bullet 1", "bullet 2", "bullet 3"],
    "areasForImprovement": ["bullet 1", "bullet 2", "bullet 3"],
    "technicalSuggestions": ["bullet 1", "bullet 2"],
    "missingFeatures": ["bullet 1", "bullet 2"],
    "documentationSuggestions": ["bullet 1", "bullet 2"],
    "presentationSuggestions": ["bullet 1", "bullet 2"],
    "portfolioSuggestions": ["bullet 1", "bullet 2"],
    "interviewTalkingPoints": ["talking point 1", "talking point 2", "talking point 3"],
    "overallSummary": "comprehensive paragraph summarizing assessment and encouraging next steps"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ review: parsed.review || fallbackReview, isFallback: false });
    } catch (err: any) {
      console.warn("Project review error, using fallback:", err?.message);
      res.json({ review: fallbackReview, isFallback: true });
    }
  });

  // Part 2: Generate Grammar Practice Agent
  app.post("/api/agent/generate-grammar-practice", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", level = "Intermediate", topic = "Tenses and Subject-Verb Agreement" } = req.body;

    const fallbackExercises = [
      {
        id: "g1",
        type: "subject_verb" as const,
        question: "The data analyst along with the team lead _______ responsible for validating the revenue metrics before presentation.",
        options: ["is", "are", "were", "being"],
        correctAnswer: "is",
        explanation: "Parenthetical phrases such as 'along with', 'as well as', and 'together with' do not change the number of the subject. 'The data analyst' is singular, so it takes the singular verb 'is'.",
        commonMistake: "Choosing 'are' because the phrase mentions 'the team lead', mistakenly treating it as a plural compound subject.",
        improvedSentence: "The data analyst, along with the team lead, is responsible for validating the revenue metrics before presentation.",
        targetSkill: "Subject-Verb Agreement in Technical Reporting",
      },
      {
        id: "g2",
        type: "tenses" as const,
        question: "Last month our engineering team _______ the pipeline latency by 45 percent through query optimization.",
        options: ["decreased", "has decreased", "decreases", "had been decreasing"],
        correctAnswer: "decreased",
        explanation: "When referring to a specific completed time period in the past ('Last month'), use the simple past tense ('decreased') rather than the present perfect.",
        commonMistake: "Using 'has decreased' with a specific past time anchor like 'Last month'.",
        improvedSentence: "Last month, our engineering team decreased the pipeline latency by 45 percent through query optimization.",
        targetSkill: "Past Tense in Project Metric Bullet Points",
      },
      {
        id: "g3",
        type: "prepositions" as const,
        question: "The recent drop in customer churn correlated strongly _______ our automated onboarding emails.",
        options: ["with", "to", "on", "against"],
        correctAnswer: "with",
        explanation: "The standard preposition paired with 'correlated' in technical and statistical writing is 'with' ('correlated with').",
        commonMistake: "Saying 'correlated to' or 'correlated on'.",
        improvedSentence: "The recent drop in customer churn correlated strongly with our automated onboarding emails.",
        targetSkill: "Statistical Prepositions & Technical Collocations",
      },
      {
        id: "g4",
        type: "sentence_correction" as const,
        question: "Identify the most professional and grammatically sound sentence for an executive report:",
        options: [
          "Basically we looked at user data and it shows everyone likes feature X.",
          "Exploratory data analysis indicates significant user engagement with Feature X.",
          "Our team was looking at numbers and Feature X is having a big hit with users.",
          "Data was gathered by us and Feature X is popular stuff.",
        ],
        correctAnswer: "Exploratory data analysis indicates significant user engagement with Feature X.",
        explanation: "Clear, concise, and active vocabulary establishes technical authority and executive presence without colloquial fillers ('basically', 'stuff', 'big hit').",
        commonMistake: "Using spoken conversational fillers in formal technical presentations and emails.",
        improvedSentence: "Exploratory data analysis indicates significant user engagement with Feature X.",
        targetSkill: "Professional Register & Tone",
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ exercises: fallbackExercises, isFallback: true });
      }

      const prompt = `You are EduPath AI's Grammar Coach for tech professionals (${targetRole}).
Generate 4 practical grammar exercises tailored to workplace communication, technical reporting, and interview scenarios.
Level: ${level}
Topic: ${topic}

Exercise types: fill_blank, sentence_correction, tenses, articles, prepositions, subject_verb.

Return pure valid JSON with NO markdown wrappers:
{
  "exercises": [
    {
      "id": "string",
      "type": "fill_blank" | "sentence_correction" | "tenses" | "articles" | "prepositions" | "subject_verb",
      "question": "string",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": "exact match of correct option string",
      "explanation": "string explaining the grammatical rule clearly",
      "commonMistake": "string explaining why candidates often make this error",
      "improvedSentence": "complete polished sentence",
      "targetSkill": "string"
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ exercises: parsed.exercises || fallbackExercises, isFallback: false });
    } catch (err: any) {
      console.warn("Generate grammar practice error, using fallback:", err?.message);
      res.json({ exercises: fallbackExercises, isFallback: true });
    }
  });

  // Part 2: Generate Career-Relevant Vocabulary Agent
  app.post("/api/agent/generate-vocabulary-practice", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", category = "Analytical & Stakeholder Vocabulary" } = req.body;

    const fallbackWords = [
      {
        id: "v1",
        word: "Extrapolate",
        meaning: "To estimate or project an unknown value or future trend by extending existing known data points.",
        example: "Based on Q3 user acquisition rates, we can extrapolate our year-end revenue with an 85% confidence interval.",
        careerContext: "Crucial during business forecasting, presentation decks, and executive decision-making discussions.",
        practiceQuestion: "Draft a sentence using 'extrapolate' to explain how past conversion rates predict next quarter's sales.",
        targetRole,
        synonyms: ["Project", "Estimate", "Infer", "Deduce"],
      },
      {
        id: "v2",
        word: "Discrepancy",
        meaning: "A lack of compatibility or similarity between two or more facts, datasets, or metric calculations.",
        example: "Our reconciliation query identified a $12,400 discrepancy between Stripe transaction logs and the general ledger.",
        careerContext: "Used in data validation, accounting audits, and debugging telemetry discrepancies.",
        practiceQuestion: "How would you explain a metric discrepancy between Google Analytics and your internal SQL database to your manager?",
        targetRole,
        synonyms: ["Inconsistency", "Divergence", "Variance", "Mismatch"],
      },
      {
        id: "v3",
        word: "Synthesize",
        meaning: "To combine a number of distinct ideas, data sources, or findings into a coherent and actionable whole.",
        example: "The business analyst synthesized user interview recordings and SQL funnel telemetry into three product recommendations.",
        careerContext: "Highly prized leadership skill for senior analysts presenting to executive leadership.",
        practiceQuestion: "Use 'synthesize' to describe how you combined customer survey feedback with database churn numbers.",
        targetRole,
        synonyms: ["Integrate", "Harmonize", "Consolidate", "Amalgamate"],
      },
      {
        id: "v4",
        word: "Actionable",
        meaning: "Giving sufficient information or insights that can be acted upon directly to improve an outcome.",
        example: "Rather than presenting 50 charts, the dashboard provides three actionable insights for marketing budget reallocation.",
        careerContext: "Differentiates junior reporting analysts from strategic senior business partners.",
        practiceQuestion: "Rewrite 'We made a chart that tells people what to do' into an executive sentence using 'actionable'.",
        targetRole,
        synonyms: ["Practical", "Applicable", "Executable", "Impactful"],
      },
      {
        id: "v5",
        word: "Mitigate",
        meaning: "To make something bad or dangerous less severe, serious, or painful; to lessen risk.",
        example: "Implementing database constraint checks will mitigate the risk of corrupted customer identifiers.",
        careerContext: "Essential for risk management, postmortems, architecture reviews, and engineering planning.",
        practiceQuestion: "Explain how automated testing or database backup schedules mitigate production risk.",
        targetRole,
        synonyms: ["Alleviate", "Attenuate", "Diminish", "Lessen"],
      },
    ];

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ words: fallbackWords, isFallback: true });
      }

      const prompt = `You are EduPath AI's Professional Vocabulary Coach for ${targetRole} candidates.
Generate 5 high-impact, career-advancing vocabulary words commonly expected in senior technical roles and stakeholder meetings.
Category: ${category}

Return pure valid JSON with NO markdown wrappers:
{
  "words": [
    {
      "id": "string",
      "word": "string",
      "meaning": "string concise definition",
      "example": "string realistic technical workplace sentence",
      "careerContext": "string explaining when and why to use this term in meetings/interviews",
      "practiceQuestion": "string interactive practice prompt for the learner",
      "targetRole": "${targetRole}",
      "synonyms": ["string", "string"]
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ words: parsed.words || fallbackWords, isFallback: false });
    } catch (err: any) {
      console.warn("Vocabulary practice error, using fallback:", err?.message);
      res.json({ words: fallbackWords, isFallback: true });
    }
  });

  // Part 2: Generate Professional Introduction Agent
  app.post("/api/agent/generate-professional-intro", async (req: Request, res: Response) => {
    const { learnerProfile, mode = "draft", customInstructions } = req.body;
    const name = learnerProfile?.name || "Alex";
    const targetRole = learnerProfile?.targetRole || "Data Analyst";
    const education = learnerProfile?.education?.[0]?.degree || "Bachelor's in Information Systems";
    const experience = learnerProfile?.experience?.[0]?.role || "Business Systems Coordinator";
    const skills = (learnerProfile?.technicalSkills || []).slice(0, 4).map((s: any) => s.name).join(", ") || "SQL, Power BI, Python, Excel";

    const fallbackIntro = {
      introduction: `Hello! I'm ${name}, a ${targetRole} with a background as a ${experience}. I specialize in transforming raw operational datasets into clear, actionable business intelligence using ${skills}. Recently, I built an end-to-end customer cohort analytics platform that identified key churn indicators and automated executive reporting. I'm passionate about bridging the gap between technical data engineering and strategic business decision-making.`,
      bulletSummary: [
        `Background: ${experience} with strong foundations in ${education}`,
        `Core Technical Stack: ${skills}`,
        `Recent Impact: Built end-to-end cohort analytics dashboard with automated KPI tracking`,
        `Value Proposition: Translating complex query logic into clear executive business recommendations`,
      ],
      tips: [
        "Deliver with an energetic, conversational cadence in 45-60 seconds",
        "Emphasize the business outcome of your projects rather than just listing technologies",
        "Close with enthusiasm for the specific team's mission or analytical challenges",
      ],
      elevatorPitch30s: `Hi, I'm ${name}, a ${targetRole} skilled in ${skills}. I help teams turn messy operational data into automated dashboards and revenue-driving insights. In my recent capstone, I uncovered key retention trends using SQL window functions and Power BI, and I'm excited to bring that analytical rigor to your team.`,
      fullBio: `${name} is an aspiring ${targetRole} with hands-on experience in relational database architecture, exploratory data analysis, and executive dashboard design. Proficient in ${skills}, ${name} combines structured analytical thinking with strong stakeholder communication to deliver measurable business impact.`,
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ draft: fallbackIntro, isFallback: true });
      }

      const prompt = `You are EduPath AI's Executive Career Coach.
Generate a tailored professional introduction ("Tell me about yourself") for this candidate:
- Name: ${name}
- Target Role: ${targetRole}
- Education: ${education}
- Experience: ${experience}
- Skills: ${skills}
- Mode: ${mode} (draft | improve | shorten | make_professional)
${customInstructions ? `Custom Guidance: ${customInstructions}` : ""}

Return pure valid JSON with NO markdown wrappers:
{
  "draft": {
    "introduction": "string (60-90 words, high impact)",
    "bulletSummary": ["string", "string", "string", "string"],
    "tips": ["tip 1", "tip 2", "tip 3"],
    "elevatorPitch30s": "string (30-second version)",
    "fullBio": "string (professional summary for LinkedIn/Portfolio)"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ draft: parsed.draft || fallbackIntro, isFallback: false });
    } catch (err: any) {
      console.warn("Professional intro error, using fallback:", err?.message);
      res.json({ draft: fallbackIntro, isFallback: true });
    }
  });

  // Part 2: Generate Presentation Practice Agent
  app.post("/api/agent/generate-presentation-practice", async (req: Request, res: Response) => {
    const { topic = "Cohort Retention Analysis Findings", audience = "Executive Leadership", duration = "5 minutes", purpose = "Recommend product onboarding changes", targetRole = "Data Analyst" } = req.body;

    const fallbackPresentation = {
      topic,
      audience,
      duration,
      purpose,
      structure: {
        opening: `Good morning everyone. Over the last month, we investigated our 30-day user retention metrics. Today, I'll share three critical insights from our cohort analysis and propose two immediate onboarding improvements that can prevent an estimated $40,000 in monthly churn.`,
        mainPoints: [
          "Finding 1: 68% of user drop-offs occur between Day 3 and Day 7, concentrated in accounts that did not complete initial workspace setup.",
          "Finding 2: Users who utilized our automated data import feature retained at 3.2x higher rates over 90 days.",
          "Recommendation: Redesign the Day 1 onboarding checklist to prioritize automated data import as the default step.",
        ],
        example: `For example, Cohort B (which received guided import tooltips) achieved a 42% 30-day retention rate compared to only 18% in Cohort A.`,
        closing: `By deploying this targeted onboarding sequence next sprint, we project a 15% recovery in 30-day active retention. I welcome your questions and look forward to partnering with Product on rollout.`,
        possibleQuestions: [
          "How confident are we that data import is causative rather than just correlative with power users?",
          "What is the engineering effort required to make automated import the default onboarding flow?",
          "Did we observe any variation across different industry customer segments?",
        ],
      },
      speakerNotes: [
        "Maintain steady pacing: pause for 2 seconds after stating the $40,000 churn figure",
        "Keep visuals uncluttered: display the cohort heatmap on slide 2 with high contrast highlighting the Day 3-7 drop-off",
        "When handling questions, acknowledge the questioner and reference specific data evidence",
      ],
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ presentation: fallbackPresentation, isFallback: true });
      }

      const prompt = `You are EduPath AI's Executive Presentation Coach for ${targetRole}s.
Design a structured, high-stakes presentation script and roadmap for:
Topic: "${topic}"
Audience: "${audience}"
Duration: "${duration}"
Purpose: "${purpose}"

Return pure valid JSON with NO markdown wrappers:
{
  "presentation": {
    "topic": "${topic}",
    "audience": "${audience}",
    "duration": "${duration}",
    "purpose": "${purpose}",
    "structure": {
      "opening": "string hook and executive summary statement",
      "mainPoints": ["point 1", "point 2", "point 3"],
      "example": "string concrete metric or scenario illustration",
      "closing": "string call to action and Q&A transition",
      "possibleQuestions": ["question 1", "question 2", "question 3"]
    },
    "speakerNotes": ["note 1", "note 2", "note 3"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ presentation: parsed.presentation || fallbackPresentation, isFallback: false });
    } catch (err: any) {
      console.warn("Presentation practice error, using fallback:", err?.message);
      res.json({ presentation: fallbackPresentation, isFallback: true });
    }
  });

  // Part 2: Generate Technical Explanation Practice Agent
  app.post("/api/agent/generate-technical-explanation", async (req: Request, res: Response) => {
    const { topic = "SQL Window Functions vs GROUP BY", audienceLevel = "Non-Technical Business Manager", targetRole = "Data Analyst" } = req.body;

    const fallbackScenario = {
      scenario: {
        topic,
        audience: audienceLevel,
        context: "Your marketing VP asks: 'Why do we need a complex Window query when our weekly report already has a GROUP BY summary? Can you explain the difference in plain English?'",
        prompt: `Explain ${topic} to a ${audienceLevel}. Avoid jargon, use an everyday analogy, and explain what business capability it unlocks that standard reporting cannot do.`,
        keyTechnicalConcepts: [
          "GROUP BY collapses individual rows into a single summary line per group",
          "Window functions preserve individual row granularity while overlaying group calculations",
          "Enables running totals, ranking, and comparisons to previous time periods",
        ],
        suggestedAnalogy: "Think of a school classroom: GROUP BY gives you just the class average on a report card, whereas a Window Function leaves every student's test score intact while printing the class rank and average right next to their name.",
        recommendedStructure: [
          "1. Start with the relatable analogy (e.g. Individual receipts vs daily cash register total)",
          "2. Highlight the practical business outcome (e.g. Seeing how a customer's spending changes over time without losing purchase details)",
          "3. Give a clear 1-sentence bottom line",
        ],
      },
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ scenario: fallbackScenario.scenario, isFallback: true });
      }

      const prompt = `You are EduPath AI's Technical Communication Mentor.
Create a technical explanation challenge for a ${targetRole}:
Topic: "${topic}"
Audience: "${audienceLevel}"

Return pure valid JSON with NO markdown wrappers:
{
  "scenario": {
    "topic": "${topic}",
    "audience": "${audienceLevel}",
    "context": "string setting up realistic workplace situation",
    "prompt": "string exact question or task for learner",
    "keyTechnicalConcepts": ["concept 1", "concept 2", "concept 3"],
    "suggestedAnalogy": "string vivid everyday analogy",
    "recommendedStructure": ["step 1", "step 2", "step 3"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ scenario: parsed.scenario || fallbackScenario.scenario, isFallback: false });
    } catch (err: any) {
      console.warn("Technical explanation scenario error, using fallback:", err?.message);
      res.json({ scenario: fallbackScenario.scenario, isFallback: true });
    }
  });

  // Part 2: Improve Communication Agent (Multi-Tier Refinement)
  app.post("/api/agent/improve-communication", async (req: Request, res: Response) => {
    const { text = "", context = "Executive Update", targetRole = "Data Analyst", communicationGoal = "Clarity & Executive Presence" } = req.body;

    const fallbackImproved = {
      original: text,
      correctedVersion: text.trim()
        ? `We analyzed the recent dataset anomalies and confirmed that query performance issues were driven by missing indexes. After implementing the fix, response times improved by 40%.`
        : `Please provide a communication sample to receive multi-tier improvements.`,
      whyChanged: "Replaced conversational fillers ('basically', 'that stuff') with precise technical terminology; shifted passive statements to active leadership voice; structured the sentence to highlight quantifiable impact upfront.",
      moreProfessionalVersion: `Following exploratory data analysis of our operational queries, we identified index deficiencies on the primary user key. Implementing optimized indexing reduced page load latency by 40%, delivering a measurable improvement in system responsiveness.`,
      simplerVersion: `We found why our database was running slowly: it was missing a key index. We fixed it, and the system is now 40% faster.`,
      executiveBulletSummary: [
        "Root Cause: Missing index on user_id key",
        "Remediation: Implemented optimized index structure",
        "Business Impact: 40% reduction in query latency",
      ],
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ result: fallbackImproved, isFallback: true });
      }

      const prompt = `You are EduPath AI's Communication Refinement Agent.
Analyze and elevate this text written by a ${targetRole}:
"${text}"
Context: ${context}
Goal: ${communicationGoal}

Produce:
1. correctedVersion: grammatically clean and natural
2. whyChanged: clear explanation of stylistic & grammatical fixes
3. moreProfessionalVersion: executive, polished, board-ready
4. simplerVersion: plain English, accessible to any stakeholder
5. executiveBulletSummary: 3 crisp bullet points

Return pure valid JSON with NO markdown wrappers:
{
  "result": {
    "original": "${text.replace(/"/g, '\\"')}",
    "correctedVersion": "string",
    "whyChanged": "string",
    "moreProfessionalVersion": "string",
    "simplerVersion": "string",
    "executiveBulletSummary": ["bullet 1", "bullet 2", "bullet 3"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ result: parsed.result || fallbackImproved, isFallback: false });
    } catch (err: any) {
      console.warn("Improve communication error, using fallback:", err?.message);
      res.json({ result: fallbackImproved, isFallback: true });
    }
  });

  // Part 2: Ask Communication Mentor Agent
  app.post("/api/agent/ask-communication-mentor", async (req: Request, res: Response) => {
    const { question, history = [], targetRole = "Data Analyst", currentMode = "General" } = req.body;

    let fallbackReply = `**Communication Mentor**:
When communicating technical concepts as a **${targetRole}**, always anchor your thoughts in the **Rule of Three**:
1. **Headline First**: State the business conclusion or metric before detailing the methodology.
2. **Quantify Results**: Replace adjectives ("much faster", "very good") with measurable numbers ("32% reduction in latency", "$18,000 saved").
3. **Actionable Next Step**: Conclude with the decision or approval needed from your stakeholder.

Would you like to practice rewording a specific email, interview answer, or presentation slide?`;

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ reply: fallbackReply, isFallback: true });
      }

      const systemPrompt = `You are EduPath AI's Senior Communication Coach.
You advise learners targeting ${targetRole} on soft skills, executive presence, concise writing, technical storytelling, and interview communication.
Mode: ${currentMode}
Always give actionable, concrete tips with a short example. Be encouraging and direct.`;

      const prompt = `${systemPrompt}\n\nUser Question: ${question}\n\nMentor Advice:`;
      const response = await callGeminiSafe(ai, { contents: prompt });
      res.json({ reply: response.text || fallbackReply, isFallback: false });
    } catch (err: any) {
      console.warn("Communication mentor error, using fallback:", err?.message);
      res.json({ reply: fallbackReply, isFallback: true });
    }
  });

  // Communication Coach Agent (Evaluate Communication)
  app.post("/api/agent/evaluate-communication", async (req: Request, res: Response) => {
    const { text = "", category = "Professional Writing", targetRole = "Data Analyst", mode = "evaluate" } = req.body;
    const wordCount = (text || "").split(/\s+/).filter(Boolean).length;
    const baseScore = Math.min(94, Math.max(68, 76 + Math.min(14, Math.floor(wordCount / 6))));

    const fallbackFeedback = {
      overallScore: baseScore,
      clarityScore: 86,
      grammarScore: 89,
      professionalToneScore: 82,
      vocabularyScore: 84,
      structureScore: 85,
      technicalAccuracyScore: 88,
      strengths: [
        "Direct and relevant discussion of the core technical topic",
        "Demonstrates familiarity with domain workflows and standard deliverables",
        "Logical sequencing of problem, solution, and outcome",
      ],
      improvements: [
        "Incorporate specific quantitative metrics (percentages, dollar amounts, time saved) to validate business impact",
        "Transition passive phrasing ('it was shown') into assertive technical leadership ('we discovered')",
        "Lead with the primary business finding before explaining underlying analytical operations",
      ],
      correctedVersion: text.trim().length > 0
        ? `In our exploratory analysis, we identified key operational drop-offs and implemented targeted query optimizations, resulting in a measurable 40% performance gain.`
        : "Please provide a submission to evaluate.",
      grammarIssues: [
        { issue: "Passive voice constructions", suggestion: "Consider active voice to demonstrate leadership in data insights (e.g. 'We evaluated' instead of 'Data was looked at')." },
      ],
      vocabularyUpgrades: [
        { original: "looked at the numbers", upgrade: "conducted exploratory data analysis", reason: "More precise and credible for technical stakeholders" },
        { original: "fixed the problem", upgrade: "resolved data pipeline anomalies", reason: "Demonstrates systematic problem solving" },
      ],
      suggestedRewrite: `Following our exploratory data analysis of recent operational logs, we identified critical funnel drop-offs. By resolving underlying pipeline anomalies, we project a measurable lift in overall conversion.`,
      executiveTips: "Highlight the business impact and metric percentages in your opening sentence before diving into technical queries.",
      practiceRecommendation: "Practice answering stakeholder follow-up questions using the Rule of Three: Headline, Data Proof, and Next Step.",
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          feedback: fallbackFeedback,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Communication Coach Agent for technical career candidates (${targetRole}).
Analyze this student submission in category/mode "${category}" (${mode}):
"${text}"

Provide observable, encouraging, and constructive feedback across clarity, grammar, tone, and vocabulary.
Return pure valid JSON with NO markdown wrappers:
{
  "feedback": {
    "overallScore": number (0-100),
    "clarityScore": number (0-100),
    "grammarScore": number (0-100),
    "professionalToneScore": number (0-100),
    "vocabularyScore": number (0-100),
    "structureScore": number (0-100),
    "technicalAccuracyScore": number (0-100),
    "strengths": ["string", "string"],
    "improvements": ["string", "string"],
    "correctedVersion": "string showing polished version",
    "grammarIssues": [{"issue": "string", "suggestion": "string"}],
    "vocabularyUpgrades": [{"original": "string", "upgrade": "string", "reason": "string"}],
    "suggestedRewrite": "string showing polished version",
    "executiveTips": "1-2 actionable tips for communicating with stakeholders",
    "practiceRecommendation": "string specific next practice exercise"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Communication coach API error, using fallback:", err?.message);
      res.json({ feedback: fallbackFeedback, isFallback: true });
    }
  });

  // Mock Interview Agent
  app.post("/api/agent/mock-interview", async (req: Request, res: Response) => {
    const { targetRole = "Data Analyst", interviewType = "Technical", difficulty = "Intermediate", history = [], userResponse } = req.body;
    const turnNumber = (history && Array.isArray(history) ? history.length : 0) + 1;

    const getFallbackInterview = () => {
      if (!userResponse || turnNumber <= 1) {
        return {
          question: `Welcome to your ${targetRole} ${interviewType} interview (${difficulty} level)! Let's begin: Can you explain how you would detect and treat missing data in a critical business metric dataset? What factors determine whether you impute vs. drop records?`,
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
          score: Math.min(9, Math.max(7, Math.floor(((userResponse || "").length / 60) + 7))),
          strengths: ["Clear logical structure", "Good awareness of practical business impact and trade-offs"],
          weaknesses: ["Could specify concrete index types or query execution plans", "Highlight business risk mitigation"],
          tip: "Structure answers with the STAR method (Situation, Task, Action, Result) to maximize impact in behavioral and technical interviews.",
        },
        nextQuestion: nextQ,
        turnNumber: Math.min(5, turnNumber),
        totalTurns: 5,
        weakAreasToTrack: ["SQL Query Optimization", "Executive Metric Storytelling"],
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json(getFallbackInterview());
      }

      const prompt = `You are EduPath AI's Mock Interview Agent.
Role: "${targetRole}", Type: "${interviewType}", Difficulty: "${difficulty}".
History: ${JSON.stringify(history)}
User's Latest Response: "${userResponse || "Starting interview"}"

If userResponse is empty, ask the initial opening question.
If userResponse is provided, evaluate it and provide constructive feedback (score 1-10, strengths, weaknesses, tip) and ask the next logical follow-up question.

Return pure valid JSON with NO markdown wrappers matching:
{
  "question": "string (the question asked, or nextQuestion)",
  "feedback": {
    "score": number (1-10),
    "strengths": ["string"],
    "weaknesses": ["string"],
    "tip": "string"
  } (or null if initial question),
  "nextQuestion": "string (or null if interview complete)",
  "turnNumber": number,
  "totalTurns": 5,
  "weakAreasToTrack": ["string"]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Mock interview API error, using fallback:", err?.message);
      res.json(getFallbackInterview());
    }
  });

  // Daily AI Recommendation & Progress Report
  app.post("/api/agent/recommendation", async (req: Request, res: Response) => {
    const { learnerProfile } = req.body;
    const fallbackRecommendation = {
      recommendation: `You are improving steadily in ${learnerProfile?.targetRole || "your target role"}, but practical application and multi-table query performance need reinforcement. I recommend completing a 15-minute practice session today.`,
      focusSkill: "SQL Window Functions & JOINs",
      suggestedMinutes: 15,
      isFallback: true,
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json(fallbackRecommendation);
      }

      const prompt = `You are EduPath AI's Adaptive Learning Agent.
Generate a concise, encouraging 2-sentence daily recommendation for learner ${learnerProfile?.name || "Alex"}, targeting ${learnerProfile?.targetRole || "Data Analyst"}.
Recent stats: Overall Progress ${learnerProfile?.overallProgress || 68}%, lowest skill: Power BI / SQL JOINs.
Return pure valid JSON:
{
  "recommendation": "string",
  "focusSkill": "string",
  "suggestedMinutes": number
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Daily recommendation API error, using fallback:", err?.message);
      res.json(fallbackRecommendation);
    }
  });

  // Progress Analysis & AI Report
  app.post("/api/agent/analyze-progress", async (req: Request, res: Response) => {
    const { progressData, profile } = req.body;
    const name = profile?.name || "Learner";
    const role = profile?.targetRole || "Data Analyst";
    const progress = profile?.overallProgress || 68;
    const fallbackReport = {
      summary: `${name} is making solid velocity toward the ${role} milestone, currently at ${progress}% total career readiness with consistent learning momentum.`,
      whatImproved: [
        "Python syntax and data frame manipulation reached strong foundational benchmarks.",
        `Daily study streak sustained for ${profile?.streakDays || 14} consecutive days (${profile?.totalLearningHours || 38} total learning hours).`,
        "Communication clarity score increased significantly after structured practice sessions.",
      ],
      whatNeedsAttention: [
        "Complex calculated measures and filter contexts require applied project practice.",
        "Statistical hypothesis testing concepts and A/B test interpretation.",
        "SQL window function execution speed in timed technical assessments.",
      ],
      skillsAcquiredCount: profile?.skillsAcquiredCount || 12,
      skillsInProgressCount: profile?.skillsInProgressCount || 5,
      remainingSkillGapsCount: profile?.remainingGapsCount || 4,
      persistentWeaknesses: ["DAX CALCULATE filters", "Two-sample t-tests interpretation"],
      recommendedNextSteps: [
        `Complete Phase 2 Capstone: E-Commerce Churn in SQL to showcase verified skills.`,
        "Spend 20 mins daily on Power BI visual cards and DAX measures.",
        "Book 1 Mock Technical Interview session to assess real-time interview readiness.",
      ],
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          report: fallbackReport,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Progress Analysis Agent.
Analyze this learner's trajectory:
Learner: ${profile?.name || "Alex"}, Target: ${profile?.targetRole || "Data Analyst"}
Progress Data: ${JSON.stringify(progressData || {})}

Generate a comprehensive AI Progress Report.
Return pure valid JSON with NO markdown wrappers matching:
{
  "report": {
    "summary": "2-sentence overall status summary",
    "whatImproved": ["improvement 1", "improvement 2", "improvement 3"],
    "whatNeedsAttention": ["attention 1", "attention 2", "attention 3"],
    "skillsAcquiredCount": number,
    "skillsInProgressCount": number,
    "remainingSkillGapsCount": number,
    "persistentWeaknesses": ["string", "string"],
    "recommendedNextSteps": ["step 1", "step 2", "step 3"]
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Progress analysis API error, using fallback:", err?.message);
      res.json({ report: fallbackReport, isFallback: true });
    }
  });

  // Adapt Learning Path Agent (Legacy / Simple)
  app.post("/api/agent/adapt-learning-path", async (req: Request, res: Response) => {
    const { currentPhases, recentPerformance, targetRole } = req.body;
    const fallbackAdapted = {
      adaptationSummary: `Rebalanced roadmap phases for ${targetRole || "Data Analyst"} based on your recent performance. Added extra SQL JOIN practice modules and accelerated foundational topics.`,
      adaptedPhases: [
        { id: 1, title: "Foundations & Analytical Thinking", completion: 100, status: "completed", estimatedTime: "10 hrs", skills: ["Excel", "Data Cleaning"], current: false },
        { id: 2, title: "SQL Mastery & Window Functions", completion: 75, status: "in-progress", estimatedTime: "18 hrs (Adapted +3h practice)", skills: ["PostgreSQL", "JOINs", "Window Functions"], current: true },
        { id: 3, title: "Data Visualization & Dashboards", completion: 35, status: "in-progress", estimatedTime: "16 hrs", skills: ["Power BI", "DAX", "Data Storytelling"], current: false },
        { id: 4, title: "Practical Statistics & A/B Testing", completion: 20, status: "upcoming", estimatedTime: "14 hrs", skills: ["Hypothesis Testing", "Probability", "p-values"], current: false },
        { id: 5, title: "Business Analytics & KPI Modeling", completion: 0, status: "upcoming", estimatedTime: "12 hrs", skills: ["Cohort Retention", "LTV/CAC Modeling"], current: false },
        { id: 6, title: "Portfolio Capstone Projects", completion: 0, status: "upcoming", estimatedTime: "25 hrs", skills: ["End-to-End Analytics", "GitHub Portfolio"], current: false },
        { id: 7, title: "Interview Preparation & Recruiter Pitch", completion: 0, status: "upcoming", estimatedTime: "10 hrs", skills: ["Technical Screening", "Behavioral STAR"], current: false },
      ],
      isFallback: true,
    };

    try {
      const ai = getGenAI();

      if (!ai) {
        return res.json(fallbackAdapted);
      }

      const prompt = `You are EduPath AI's Adaptive Learning Agent.
Learner is targeting "${targetRole || "Data Analyst"}".
Current phases: ${JSON.stringify(currentPhases || [])}
Recent performance: ${JSON.stringify(recentPerformance || {})}

Adapt and optimize the learning roadmap phases.
Return pure valid JSON with NO markdown wrappers matching:
{
  "adaptationSummary": "string explaining what changes were made and why based on learner data",
  "adaptedPhases": [
    {
      "id": number,
      "title": "string",
      "completion": number (0-100),
      "status": "completed" | "in-progress" | "upcoming",
      "estimatedTime": "string",
      "skills": ["string"],
      "current": boolean
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Adapt roadmap API error, using fallback:", err?.message);
      res.json(fallbackAdapted);
    }
  });

  // ----------------------------------------------------
  // Prompt 4: Personalized Adaptive Learning Path Agent Endpoints
  // ----------------------------------------------------

  // 1. Generate Full Personalized Adaptive Learning Path
  app.post("/api/agent/generate-learning-path", async (req: Request, res: Response) => {
    try {
      const {
        learnerProfile,
        targetRole,
        skillGapAnalysis,
        weeklyHours = 7,
        learningPreferences = {
          learningFormat: 'Mixed',
          difficulty: 'Balanced',
          sessionStyle: 'Deep-focus sessions',
        },
      } = req.body;

      const ai = getGenAI();
      const role = targetRole || learnerProfile?.targetRole || 'Data Analyst';
      const hours = Number(weeklyHours) || 7;

      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured. Please set GEMINI_API_KEY in settings.",
          isFallback: true,
        });
      }

      const verifiedSkills = (learnerProfile?.technicalSkills || [])
        .map((s: any) => `${s.name || s.skill} (${s.level || 'Unknown'})`)
        .join(', ');

      const gapsSummary = (skillGapAnalysis?.topPriorities || [])
        .map((g: any) => `${g.skill} (Priority: ${g.priority}, Reason: ${g.gapReason || ''})`)
        .join('; ');

      const dependenciesSummary = (skillGapAnalysis?.dependencies || [])
        .map((d: any) => `${d.skill} requires [${(d.prerequisites || []).join(', ')}]`)
        .join('; ');

      const prompt = `You are EduPath AI's Personalized Adaptive Learning Path Agent.
Your goal is to answer: "Based on what I already know, what I need to learn, my target career, and the time I have available, what exactly should I do each week?"

CRITICAL LEARNING PATH REQUIREMENTS:
1. Target Role: "${role}"
2. Available Weekly Hours: ${hours} hours/week. Total duration should be realistic for this commitment (typically 8 to 14 weeks, depending on gaps).
3. Learner's Verified Skills: ${verifiedSkills || 'Basic technical literacy'}
4. Priority Skill Gaps to Close: ${gapsSummary || 'SQL, Power BI, Statistics'}
5. Prerequisite Architecture: ${dependenciesSummary || 'SQL Basics -> SQL JOINs -> Window Functions; Statistics -> A/B Testing'}
   - STRICT PREREQUISITE RULE: Never schedule an advanced skill before its prerequisites!
6. Learning Preferences:
   - Format: ${learningPreferences.learningFormat}
   - Difficulty: ${learningPreferences.difficulty}
   - Session Style: ${learningPreferences.sessionStyle}
7. Project Integration: Include realistic mini-project and portfolio milestones.
8. Communication Skills: If communication/presentation is relevant or needed for ${role}, include targeted practice.
9. Each activity must include:
   - "whyThisTask": 1-2 sentences explaining which gap it closes, why it appears now, and what outcome it supports.
   - "resourceSlot": Object with placeholder { "resourceType": "...", "note": "Resources will be personalized by the AI Resource Recommendation Agent." }
   - "dayOfWeek": Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, or Sunday.
   - Activity types allowed: lesson, video, reading, practice, quiz, project, communication.

Return PURE JSON adhering to this exact schema (NO markdown formatting):
{
  "targetRole": "${role}",
  "durationWeeks": number,
  "weeklyHours": ${hours},
  "overallObjective": "Concise 2-sentence overarching career objective",
  "aiReasoning": "Concise 3-4 sentence explanation of why this specific plan and sequence was constructed for this learner",
  "phases": [
    {
      "phaseId": "phase-1",
      "title": "Phase name",
      "description": "Short description",
      "weeks": [1, 2],
      "skills": ["Skill 1", "Skill 2"],
      "status": "In Progress" | "Not Started" | "Completed",
      "estimatedHours": number,
      "current": boolean
    }
  ],
  "weeks": [
    {
      "weekNumber": 1,
      "title": "Week theme/topic",
      "objective": "High-level goal for this week",
      "detailedObjectives": [
        "By end of week, able to do X",
        "By end of week, able to do Y"
      ],
      "skills": ["Skill 1"],
      "estimatedHours": ${hours},
      "activities": [
        {
          "id": "w1-act-1",
          "title": "Clear activity title",
          "description": "What learner will study or build",
          "skill": "Specific skill",
          "type": "lesson" | "video" | "reading" | "practice" | "quiz" | "project" | "communication",
          "difficulty": "Beginner" | "Intermediate" | "Advanced",
          "estimatedMinutes": 30,
          "priority": "High" | "Medium" | "Low",
          "dayOfWeek": "Monday",
          "whyThisTask": "Addresses X gap at this sequence because...",
          "resourceSlot": {
            "resourceType": "Interactive Practice",
            "note": "Resources will be personalized by the AI Resource Recommendation Agent."
          },
          "projectMilestones": ["Step 1", "Step 2"]
        }
      ],
      "assessment": "Weekly quiz / milestone test description",
      "expectedOutcome": "Tangible milestone achieved",
      "isCurrent": true
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Validate core structure
      if (!parsed.phases || !Array.isArray(parsed.phases) || !parsed.weeks || !Array.isArray(parsed.weeks)) {
        throw new Error("Generated roadmap missing valid phases or weeks array");
      }

      res.json({ learningPath: parsed, isFallback: false });
    } catch (err: any) {
      console.error("Generate learning path error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate personalized learning path with Gemini",
      });
    }
  });

  // 2. Adapt Learning Path (Dynamic Replanning Agent)
  app.post("/api/agent/adapt-learning-path-agent", async (req: Request, res: Response) => {
    try {
      const {
        currentLearningPath,
        completedActivityIds = [],
        quizScore,
        strugglesFeedback,
        weeklyCheckIn,
        weeklyHours,
        learnerProfile,
      } = req.body;

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured for adaptive replanning.",
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Adaptive Learning Replanning Agent.
A learner is progressing through their personalized learning path.
Current Learning Path:
- Target Role: ${currentLearningPath?.targetRole || "Data Analyst"}
- Current Duration: ${currentLearningPath?.durationWeeks || 12} weeks
- Target Weekly Hours: ${weeklyHours || currentLearningPath?.weeklyHours || 7} hrs/week
- Completed Activities Count: ${completedActivityIds.length}
- Quiz Performance / Score: ${quizScore !== undefined ? quizScore + '%' : 'Recent quiz completed'}
- Self-Reported Struggles / Weaknesses: "${strugglesFeedback || weeklyCheckIn?.difficultyFeedback || 'Struggling with complex multi-table SQL JOINs'}"
- Weekly Check-in Status: "${weeklyCheckIn?.completedStatus || 'Partially'}", Confidence: ${weeklyCheckIn?.confidenceScore || 3}/5
- Help Requested: "${weeklyCheckIn?.helpNeeded || 'More hands-on exercises'}"

ADAPTATION DIRECTIVES:
1. When the learner struggles or scores low:
   - Add targeted revision sessions and simpler explanations.
   - Add extra practice exercises before moving on to higher-tier skills.
   - Shift or slightly expand the timeline if needed to prevent cognitive overload.
2. When the learner performs well or finishes early:
   - Increase difficulty or advance to next prerequisite.
   - Introduce advanced practice or kick off the portfolio project earlier.
3. When weekly available hours change:
   - Scale the weekly activity load to fit the new hours.
4. If sessions were missed:
   - Rebalance the upcoming week and reschedule unfinished items smoothly.

Analyze the learner's situation and generate an UPDATED learning path alongside a crystal clear "What Changed?" explanation.

Return PURE JSON matching:
{
  "adaptationChange": {
    "summary": "2-3 sentence executive explanation of what changed and why",
    "reasons": [
      "Reason 1 based on learner performance/feedback",
      "Reason 2 based on prerequisite or pacing need"
    ],
    "adjustments": [
      "Added 2 targeted JOIN practice exercises to Week 3",
      "Moved advanced Window Functions to follow reinforced JOIN mastery",
      "Rebalanced weekly commitment to match 7 hours"
    ],
    "trigger": "struggle" | "excelled" | "check_in" | "hours_change" | "user_request"
  },
  "updatedLearningPath": {
    ... same structure as learning path with updated phases, weeks, activities, and weeklyHours
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      res.json({
        adaptationChange: parsed.adaptationChange,
        updatedLearningPath: parsed.updatedLearningPath || currentLearningPath,
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Adaptive replanning error:", err);
      res.status(500).json({
        error: err.message || "Failed to adapt learning path with Gemini",
      });
    }
  });

  // 3. AI Weekly Summary Generator ("Your Week in Review")
  app.post("/api/agent/generate-weekly-summary", async (req: Request, res: Response) => {
    try {
      const {
        weekNumber,
        learningPath,
        completedActivities = [],
        weeklyCheckIn,
        learnerProfile,
      } = req.body;

      const ai = getGenAI();
      if (!ai) {
        return res.status(503).json({
          error: "Gemini API key is not configured.",
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Weekly Review Agent.
Generate "Your Week in Review" for Week ${weekNumber}.
Target Role: ${learningPath?.targetRole || 'Data Analyst'}
Completed Activities this week: ${JSON.stringify(completedActivities)}
Check-in Feedback: ${JSON.stringify(weeklyCheckIn || {})}
Learner: ${learnerProfile?.name || 'Alex'}

Return PURE JSON matching:
{
  "summaryText": "Empowering 2-3 sentence review highlighting accomplishments and next steps",
  "skillsPracticed": ["SQL JOINs", "Data Aggregation"],
  "activitiesCompleted": number,
  "totalActivities": number,
  "timeSpentMinutes": number,
  "quizPerformance": "e.g. 85% Accuracy (Strong on INNER JOIN, developing on FULL OUTER JOIN)",
  "difficultAreas": ["Complex outer joins with null filtering"],
  "improvements": ["Faster query execution syntax", "Good intuition for group by filters"],
  "recommendedNextSteps": ["Spend 20 mins on CTE practice", "Start Week 4 milestone project"]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      res.json({ weeklySummary: parsed, isFallback: false });
    } catch (err: any) {
      console.error("Weekly summary error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate weekly summary",
      });
    }
  });

  // 4. Natural Language Assistant: "Ask About My Learning Path"
  app.post("/api/agent/ask-learning-path", async (req: Request, res: Response) => {
    try {
      const { question, learningPath, learnerProfile } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          answer: `**EduPath Learning Assistant:** Based on your current roadmap toward **${learningPath?.targetRole || 'Data Analyst'}**:
- You are currently focusing on core analytical skills scheduled for **${learningPath?.weeklyHours || 7} hours/week**.
- Each activity is sequenced based on industry prerequisite standards so you never hit a wall with advanced topics.
- Feel free to adjust your weekly hours or ask to rebalance your plan anytime!`,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Learning Path Advisor.
A learner is asking a specific question about their personalized roadmap:
Question: "${question}"

Context:
Learner Name: ${learnerProfile?.name || 'Alex'}
Target Career: ${learningPath?.targetRole || 'Data Analyst'}
Weekly Available Hours: ${learningPath?.weeklyHours || 7} hrs/week
Duration: ${learningPath?.durationWeeks || 12} weeks
Current Roadmap Phases: ${(learningPath?.phases || []).map((p: any) => `${p.title} (${p.status})`).join(', ')}
Current / Next Skills: ${(learningPath?.weeks?.[0]?.skills || []).join(', ')}
Overall Objective: ${learningPath?.overallObjective || ''}
AI Reasoning behind plan: ${learningPath?.aiReasoning || ''}

Provide a concise, motivating, actionable, and truthful answer directly referencing their actual schedule, activities, and skills. Use bold text and bullet points for scannability.`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({
        answer: response.text || "I'm here to help you navigate your learning roadmap.",
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Ask learning path error:", err);
      res.status(500).json({
        error: err.message || "Failed to answer learning path query",
      });
    }
  });

  // ----------------------------------------------------
  // Prompt 5: AI Learning Resource Recommendation Agent
  // ----------------------------------------------------

  // 1. Recommend Learning Resources for Skill Gaps & Activities
  app.post("/api/agent/recommend-resources", async (req: Request, res: Response) => {
    try {
      const {
        learnerProfile,
        targetRole,
        skillGaps = [],
        skillPriorities = [],
        currentLearningPhase,
        currentWeek,
        learningObjectives,
        currentSkillLevel,
        learningPreferences,
        weeklyAvailableHours = 7,
        previouslyCompletedResources = [],
        specificSkill,
        specificObjective,
        resourceFeedbackHistory = [],
      } = req.body;

      const ai = getGenAI();
      const role = targetRole || learnerProfile?.targetRole || "Data Analyst";
      
      // Determine focus skill: specific request > top priority gap > first gap > SQL
      const focusSkill = 
        specificSkill || 
        skillPriorities?.[0]?.skill || 
        skillGaps?.[0]?.skill || 
        "SQL";

      const focusObjective = 
        specificObjective || 
        learningObjectives || 
        `Master essential ${focusSkill} concepts and practical application required for ${role}`;

      // Filter catalog for matching verified resources
      const catalogMatches = VERIFIED_CATALOG_RESOURCES.filter(
        (r) => r.skill.toLowerCase() === focusSkill.toLowerCase()
      );

      // Check feedback history to adapt preferences (e.g. learner preferred videos or hands-on)
      const highRatedTypes = (resourceFeedbackHistory || [])
        .filter((f: any) => f.usefulnessScore >= 4)
        .map((f: any) => f.type)
        .filter(Boolean);

      if (!ai) {
        // High quality fallback using verified catalog
        const focusReason = `These resources were selected because ${focusSkill} is currently one of your highest-priority skill gaps on your path to becoming a ${role}.`;
        
        const recs = catalogMatches.length > 0
          ? catalogMatches.map((r, idx) => ({
              ...r,
              relevanceScore: Math.max(85, 96 - idx * 3),
              reason: r.reason || `Directly targets your ${focusSkill} competency requirement for ${role}.`,
            }))
          : [
              {
                id: `rec-ai-${Date.now()}-1`,
                title: `${focusSkill} Core Concepts & Implementation Practice`,
                type: 'Practice' as const,
                provider: 'EduPath Practice Lab',
                url: undefined,
                skill: focusSkill,
                difficulty: 'Intermediate' as const,
                duration: '30 min',
                durationMinutes: 30,
                description: `Guided practice session focusing on essential ${focusSkill} techniques frequently required in technical interviews.`,
                learningObjective: focusObjective,
                verified: false,
                relevanceScore: 92,
                reason: `Tailored to your current ${focusSkill} skill level with instant feedback exercises.`,
                searchKeywords: [`${focusSkill.toLowerCase()} tutorial practice exercises interview questions`],
                prerequisites: ['Basic computational familiarity'],
                expectedOutcome: `Solve standard ${focusSkill} tasks under 15 minutes.`,
                status: 'Not Started' as const,
              },
            ];

        return res.json({
          skill: focusSkill,
          learningObjective: focusObjective,
          currentFocusReason: focusReason,
          recommendations: recs,
          isAiGenerated: false,
        });
      }

      const prompt = `You are EduPath AI's Learning Resource Recommendation Agent.
Your goal is to answer: "What is the most useful resource for me to learn this specific skill right now?"

LEARNER CONTEXT:
- Learner Name: ${learnerProfile?.name || 'Alex'}
- Target Career: ${role}
- Focus Skill: "${focusSkill}"
- Specific Objective: "${focusObjective}"
- Current Skill Level: "${currentSkillLevel || 'Intermediate'}"
- Weekly Available Time: ${weeklyAvailableHours} hours
- Learning Preferences: ${JSON.stringify(learningPreferences || { format: 'Mixed', style: 'Hands-on practice' })}
- Preferred Formats from Feedback: ${highRatedTypes.length > 0 ? highRatedTypes.join(', ') : 'Balanced mix'}
- Previously Completed: ${(previouslyCompletedResources || []).map((r: any) => r.title || r).join(', ')}

REQUIREMENTS:
1. Recommend 3 to 4 personalized, complementary learning resources covering this focus skill.
2. Provide a diverse mix (e.g. Video / Demonstration, Interactive Practice / Lab, Official Documentation / Deep Dive, or Portfolio Project).
3. CRITICAL URL SAFETY DIRECTIVE:
   - Gemini must NOT fabricate URLs!
   - If you do not have an authenticated, permanent official documentation URL (like docs.python.org, postgresql.org, or learn.microsoft.com), leave "url" as an empty string and set "verified" to false.
   - For all non-verified suggestions, provide realistic "searchKeywords" (e.g. ["sql joins tutorial intermediate inner left outer join practice"]) so the learner can search on Google or YouTube.
   - For verified official docs you are certain of, set "verified" to true and provide the exact canonical URL.

Return pure valid JSON matching this exact structure:
{
  "skill": "${focusSkill}",
  "learningObjective": "${focusObjective}",
  "currentFocusReason": "2 sentence clear explanation of why these resources were selected for the learner's actual gap",
  "recommendations": [
    {
      "id": "rec-1",
      "title": "Resource title",
      "type": "Course" | "Video" | "Article" | "Documentation" | "Practice" | "Project",
      "provider": "e.g. Mode Analytics, Khan Academy, SQLZoo, Microsoft Learn, or EduPath Project Lab",
      "url": "canonical URL or empty string",
      "verified": boolean (true ONLY if verified canonical URL; false if AI suggestion),
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "duration": "e.g. 25 min, 45 min, 1h 15m",
      "durationMinutes": number,
      "description": "2 sentence summary of content",
      "learningObjective": "concrete skill or concept learned",
      "reason": "Personalized 'Why this resource?' sentence linking to learner's level and gap",
      "relevanceScore": number between 82 and 98,
      "searchKeywords": ["keyword 1", "keyword 2"],
      "prerequisites": ["prerequisite 1", "prerequisite 2"],
      "expectedOutcome": "Tangible ability acquired"
    }
  ]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      // Merge verified catalog resources to guarantee verified options are always available
      const mergedRecs = [...(parsed.recommendations || [])];

      // If catalog has verified items for this skill, ensure at least 1 or 2 are prominently included
      catalogMatches.forEach((catItem) => {
        const alreadyIncluded = mergedRecs.some(
          (r: any) => r.title?.toLowerCase() === catItem.title.toLowerCase() || (catItem.url && r.url === catItem.url)
        );
        if (!alreadyIncluded && mergedRecs.length < 5) {
          mergedRecs.push(catItem);
        }
      });

      // Sort by relevanceScore descending
      mergedRecs.sort((a: any, b: any) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

      res.json({
        skill: parsed.skill || focusSkill,
        learningObjective: parsed.learningObjective || focusObjective,
        currentFocusReason: parsed.currentFocusReason || `These resources were selected because ${focusSkill} is currently one of your highest-priority skill gaps.`,
        recommendations: mergedRecs,
        isAiGenerated: true,
      });
    } catch (err: any) {
      console.error("Recommend resources error:", err);
      res.status(500).json({
        error: err.message || "Failed to generate resource recommendations",
      });
    }
  });

  // 2. Natural Language Resource Search & Discovery
  app.post("/api/agent/search-resources", async (req: Request, res: Response) => {
    try {
      const { query, learnerProfile, learningPath, skillGapAnalysis } = req.body;
      const ai = getGenAI();
      const q = (query || "").trim().toLowerCase();

      // Check catalog for keyword matches
      const catalogMatches = VERIFIED_CATALOG_RESOURCES.filter((r) => {
        const text = `${r.title} ${r.skill} ${r.type} ${r.description} ${r.difficulty} ${(r.searchKeywords || []).join(' ')}`.toLowerCase();
        return text.includes(q) || q.split(' ').some((word: string) => word.length > 2 && text.includes(word));
      });

      if (!ai) {
        return res.json({
          query,
          results: catalogMatches.slice(0, 6),
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Smart Resource Search Agent.
The learner is querying learning resources with: "${query}".

Learner Context:
- Target Role: ${learnerProfile?.targetRole || 'Data Analyst'}
- Known Skills: ${(learnerProfile?.technicalSkills || []).map((s: any) => s.name).join(', ')}
- Skill Gaps: ${(skillGapAnalysis?.topPriorities || []).map((g: any) => g.skill).join(', ')}

Available Verified Resources in Catalog:
${JSON.stringify(catalogMatches.slice(0, 5).map((r) => ({ title: r.title, type: r.type, skill: r.skill, url: r.url })))}

Instructions:
1. Interpret the learner's intent (e.g. short 20 min video, hands-on lab, official documentation, beginner vs intermediate).
2. Rank or include appropriate matching resources.
3. If creating additional recommendations, NEVER fabricate fake URLs. If not verified, leave url empty string, set verified: false, and provide searchKeywords.
4. Return pure valid JSON:
{
  "query": "${query}",
  "searchSummary": "1 sentence explanation of results matching the query",
  "results": [
    {
      "id": "search-1",
      "title": "Resource title",
      "type": "Course" | "Video" | "Article" | "Documentation" | "Practice" | "Project",
      "provider": "Provider name",
      "url": "canonical URL or empty string",
      "verified": boolean,
      "difficulty": "Beginner" | "Intermediate" | "Advanced",
      "duration": "e.g. 20 min",
      "durationMinutes": number,
      "description": "summary",
      "learningObjective": "objective",
      "reason": "Why this matches your search query and current learning path",
      "relevanceScore": number,
      "searchKeywords": ["string", "string"],
      "expectedOutcome": "outcome"
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

      // Ensure verified matches from catalog are present
      const results = [...(parsed.results || [])];
      catalogMatches.forEach((catItem) => {
        if (!results.some((r: any) => r.title?.toLowerCase() === catItem.title.toLowerCase())) {
          results.push(catItem);
        }
      });

      res.json({
        query,
        searchSummary: parsed.searchSummary || `Found learning resources matching "${query}"`,
        results,
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Search resources error:", err);
      res.status(500).json({ error: err.message || "Failed to search resources" });
    }
  });

  // 3. Resource Q&A Agent ("Ask About This Resource")
  app.post("/api/agent/ask-resource", async (req: Request, res: Response) => {
    try {
      const { question, resource, learnerProfile } = req.body;
      const ai = getGenAI();

      if (!ai) {
        return res.json({
          answer: `This resource, **${resource?.title || 'Selected Resource'}**, is tailored for **${resource?.difficulty || 'Intermediate'}** learners. It develops **${resource?.skill}** with a focus on ${resource?.learningObjective || 'key competencies'} to help you prepare for your target role as a ${learnerProfile?.targetRole || 'Data Analyst'}.`,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Resource Advisor.
The learner is asking a question about a specific learning resource:
Question: "${question}"

Resource Details:
- Title: ${resource?.title}
- Type: ${resource?.type}
- Skill: ${resource?.skill}
- Difficulty: ${resource?.difficulty}
- Duration: ${resource?.duration}
- Provider: ${resource?.provider}
- Learning Objective: ${resource?.learningObjective}
- Prerequisites: ${(resource?.prerequisites || []).join(', ')}
- Expected Outcome: ${resource?.expectedOutcome}

Learner:
- Name: ${learnerProfile?.name || 'Alex'}
- Target Role: ${learnerProfile?.targetRole || 'Data Analyst'}

Provide a concise, direct, helpful answer (2-3 short paragraphs or bullet points).`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({
        answer: response.text || "I can help clarify how this resource fits your learning path.",
        isFallback: false,
      });
    } catch (err: any) {
      console.error("Ask resource error:", err);
      res.status(500).json({ error: err.message || "Failed to answer resource question" });
    }
  });

  // ----------------------------------------------------
  // Prompt 9: Deep Adaptive Learning & Progress Analysis Endpoints
  // ----------------------------------------------------

  // 1. Adapt Learning Experience
  app.post("/api/agent/adapt-learning-experience", async (req: Request, res: Response) => {
    const { learnerProfile, weaknesses, triggerReason, recentTelemetry } = req.body;
    const targetRole = learnerProfile?.targetRole || "Data Analyst";
    const fallbackChange = {
      change: {
        id: `adapt-${Date.now()}`,
        decision: "ADD_PRACTICE",
        title: `Inject Targeted ${weaknesses?.[0]?.skill || "SQL JOIN"} Reinforcement Session`,
        whatChanged: `Added a focused 25-minute practice session on ${weaknesses?.[0]?.skill || "SQL JOINs"} before starting next project milestone.`,
        why: `Learner activity indicates that ${weaknesses?.[0]?.skill || "SQL JOINs"} are high-impact for ${targetRole} interviews and require reinforced practice.`,
        expectedBenefit: `Prevents downstream blockage when querying complex datasets in subsequent capstone projects.`,
        evidenceUsed: [
          `Target role requirements prioritize ${weaknesses?.[0]?.skill || "SQL JOINs"}`,
          triggerReason || "Periodic skill trend evaluation",
        ],
        isMajor: false,
        status: "applied",
        timestamp: new Date().toISOString(),
        targetSkill: weaknesses?.[0]?.skill || "SQL JOINs",
      },
      isFallback: true,
    };

    try {
      const ai = getGenAI();
      if (!ai) return res.json(fallbackChange);

      const prompt = `You are EduPath AI's Deep Adaptive Learning Agent.
Learner Target Role: ${targetRole}
Current Weaknesses Detected: ${JSON.stringify(weaknesses || [])}
Trigger Reason: ${triggerReason || "Progress telemetry review"}
Recent Telemetry: ${JSON.stringify(recentTelemetry || {})}

Analyze the learner's situation and determine the single most pedagogically sound adaptation.
Adaptive decisions include:
- 'CONTINUE' (if progress is steady and no changes needed)
- 'ADD_PRACTICE' (if skill accuracy is shaky)
- 'ADD_REVIEW' (if conceptual foundation needs reinforcement)
- 'INCREASE_DIFFICULTY' (if learner has excelled with >90% accuracy)
- 'REBALANCE_WEEK' (if learner is overloaded or falling behind schedule)

Return PURE JSON with NO markdown wrappers matching this exact structure:
{
  "change": {
    "id": "adapt-${Date.now()}",
    "decision": "ADD_PRACTICE" | "ADD_REVIEW" | "INCREASE_DIFFICULTY" | "DECREASE_DIFFICULTY" | "REBALANCE_WEEK",
    "title": "Short descriptive title of the curriculum adjustment",
    "whatChanged": "Clear 1-sentence description of the exact change made to the schedule or roadmap",
    "why": "Pedagogical explanation referencing the learner's specific performance data",
    "expectedBenefit": "Concrete positive outcome for the learner's target role preparation",
    "evidenceUsed": ["Specific data point 1", "Specific data point 2"],
    "isMajor": boolean (true if it removes/adds large projects or changes deadlines, false if small practice injection),
    "status": "applied",
    "timestamp": "${new Date().toISOString()}",
    "targetSkill": "Skill name"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ ...parsed, isFallback: false });
    } catch (err: any) {
      console.warn("Adapt learning experience error, using fallback:", err?.message);
      res.json(fallbackChange);
    }
  });

  // 2. Generate Weekly Learning Report
  app.post("/api/agent/generate-weekly-report", async (req: Request, res: Response) => {
    const { learnerProfile, telemetry } = req.body;
    const targetRole = learnerProfile?.targetRole || "Data Analyst";
    const fallbackReport = {
      report: {
        id: `wrep-${Date.now()}`,
        weekStartDate: "Mon",
        weekEndDate: "Sun",
        activitiesCompleted: 6,
        skillsPracticed: ["SQL", "Data Cleaning", "Python"],
        resourcesCompleted: 3,
        practicePerformance: {
          questionsAnswered: 24,
          accuracy: 82,
          topSkill: "SQL Joins",
        },
        projectProgress: {
          projectsWorkedOn: 1,
          milestonesCompleted: 3,
        },
        communicationProgress: {
          attemptsCount: 2,
          averageScore: 78,
        },
        interviewProgress: {
          interviewsConducted: 1,
          latestScore: 74,
        },
        whatImproved: [
          "Multi-table SQL JOIN queries resolved with higher accuracy",
          "Project documentation clarity improved in README portfolio",
          "Increased consistency in daily practice sessions",
        ],
        whatNeedsAttention: [
          "Window Functions (LEAD/LAG) syntax speed",
          "Power BI DAX filter context transitions",
          "Statistical hypothesis testing concepts",
        ],
        learningLoad: "Balanced",
        nextWeekRecommendations: [
          "Complete 15-minute daily SQL Window Function exercises",
          "Begin Phase 3 Power BI Dashboard project",
          "Conduct a 15-minute mock interview on behavioral STAR questions",
        ],
        generatedAt: new Date().toLocaleDateString(),
      },
      isFallback: true,
    };

    try {
      const ai = getGenAI();
      if (!ai) return res.json(fallbackReport);

      const prompt = `You are EduPath AI's Progress Analysis Agent.
Generate an objective, evidence-based Weekly Learning Report for a learner targeting "${targetRole}".
Learner Profile: ${JSON.stringify(learnerProfile || {})}
Activity Telemetry: ${JSON.stringify(telemetry || {})}

Return PURE JSON with NO markdown wrappers matching this exact structure:
{
  "report": {
    "id": "wrep-${Date.now()}",
    "weekStartDate": "Mon",
    "weekEndDate": "Sun",
    "activitiesCompleted": number,
    "skillsPracticed": ["Skill1", "Skill2"],
    "resourcesCompleted": number,
    "practicePerformance": {
      "questionsAnswered": number,
      "accuracy": number (0-100),
      "topSkill": "string"
    },
    "projectProgress": {
      "projectsWorkedOn": number,
      "milestonesCompleted": number
    },
    "communicationProgress": {
      "attemptsCount": number,
      "averageScore": number
    },
    "interviewProgress": {
      "interviewsConducted": number,
      "latestScore": number
    },
    "whatImproved": ["Improvement 1", "Improvement 2"],
    "whatNeedsAttention": ["Weakness 1", "Weakness 2"],
    "learningLoad": "Light" | "Balanced" | "Heavy" | "Overloaded",
    "nextWeekRecommendations": ["Action 1", "Action 2", "Action 3"],
    "generatedAt": "Today"
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Generate weekly report error, using fallback:", err?.message);
      res.json(fallbackReport);
    }
  });

  // 3. Explain Adaptation
  app.post("/api/agent/explain-adaptation", async (req: Request, res: Response) => {
    const { change, learnerProfile } = req.body;
    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({
          explanation: `This adaptation was made to ensure your foundation in ${change?.targetSkill || "key skills"} is rock-solid for your ${learnerProfile?.targetRole || "target role"} interviews.`,
          isFallback: true,
        });
      }

      const prompt = `You are EduPath AI's Adaptive Learning Mentor.
Explain clearly to the learner why this adaptation was made to their learning curriculum:
Change: ${JSON.stringify(change || {})}
Learner Target Role: ${learnerProfile?.targetRole || "Data Analyst"}

Provide a warm, reassuring, and educationally sound explanation (2 short paragraphs).`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      res.json({
        explanation: response.text || "This adaptation aligns your study schedule with real interview expectations.",
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("Explain adaptation error:", err?.message);
      res.json({
        explanation: `This adjustment prioritizes ${change?.targetSkill || "key skills"} so you gain confidence before technical evaluations.`,
        isFallback: true,
      });
    }
  });

  // 4. Reassess Skill Gap
  app.post("/api/agent/reassess-skill-gap", async (req: Request, res: Response) => {
    const { learnerProfile, currentGaps, telemetry } = req.body;
    const targetRole = learnerProfile?.targetRole || "Data Analyst";

    const fallbackReassessment = {
      reassessedGaps: (currentGaps || []).map((g: any, i: number) => ({
        skill: g.skill || `Skill ${i + 1}`,
        previousLevel: g.currentLevel || "Beginner",
        updatedLevel: "Intermediate",
        status: i === 0 ? "Strong" : "Developing",
        evidence: `Verified through recent assessment telemetry`,
      })),
      overallReadinessChange: 4,
      narrative: `Based on your recent activity, your practical application of ${currentGaps?.[0]?.skill || "core skills"} has noticeably strengthened. We have upgraded your readiness score by +4%.`,
      isFallback: true,
    };

    try {
      const ai = getGenAI();
      if (!ai) return res.json(fallbackReassessment);

      const prompt = `You are EduPath AI's Skill Gap Re-Assessment Agent.
Target Role: ${targetRole}
Current Gaps: ${JSON.stringify(currentGaps || [])}
Activity Telemetry: ${JSON.stringify(telemetry || {})}

Re-evaluate whether any skill gap statuses should be upgraded based on evidence.
Return PURE JSON matching:
{
  "reassessedGaps": [
    {
      "skill": "string",
      "previousLevel": "string",
      "updatedLevel": "string",
      "status": "Strong" | "Developing" | "Gap",
      "evidence": "string"
    }
  ],
  "overallReadinessChange": number (percentage points e.g. 3 to 8),
  "narrative": "Empathetic, clear explanation of how recent evidence updated the assessment."
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      res.json({ ...JSON.parse(cleaned), isFallback: false });
    } catch (err: any) {
      console.warn("Reassess skill gap error:", err?.message);
      res.json(fallbackReassessment);
    }
  });

  // ----------------------------------------------------
  // Prompt 10: Multi-Agent AI Orchestrator Endpoint
  // ----------------------------------------------------
  app.post("/api/agent/orchestrate", async (req: Request, res: Response) => {
    const { message, intent, primaryAgent, agentsConsulted, context, history } = req.body;
    const targetRole = context?.targetRole || "Data Analyst";
    const learnerName = context?.learnerName || "Learner";

    const fallbackMentorResponse = {
      answer: `Based on your goal to become a ${targetRole}, I recommend focusing on your high-priority skill gaps while keeping up your consistent daily habit.`,
      why: `Targeted daily micro-learning reinforces core technical capabilities without causing study fatigue.`,
      evidence: [
        `Target Role: ${targetRole}`,
        `Streak: ${context?.learningStreak || 5} days`,
        `Current Load: ${context?.learningLoad || "Balanced"}`,
      ],
      nextStep: `Open the recommended practice or roadmap activity to continue progressing.`,
      actionButton: {
        label: "Start Practice",
        targetView: "practice",
      },
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json({ mentorResponse: fallbackMentorResponse, isFallback: true });
      }

      const prompt = `You are EduPath AI's Central AI Career Mentor and Orchestrator.
You represent a unified, multi-agent career learning system consisting of 12 specialized agents:
- Profile, Resume, Skill Gap, Learning Path, Resource, Practice, Project, Communication, Mock Interview, Progress, Deep Adaptive, and Mentor.

A learner is asking a question or seeking guidance.
Learner Name: ${learnerName}
Target Role: ${targetRole}
Detected Intent: ${intent || "GENERAL_CAREER"}
Primary Agent Responsible: ${primaryAgent || "agent_mentor"}
Specialized Agents Consulted: ${JSON.stringify(agentsConsulted || [])}

Learner Context (GROUND TRUTH):
- Current Week: ${context?.currentWeek || 1}
- Learning Streak: ${context?.learningStreak || 0} days
- Strengths: ${JSON.stringify(context?.strengths || [])}
- Weaknesses / Skill Gaps: ${JSON.stringify(context?.weaknesses || [])}
- Trajectory Trends: ${JSON.stringify(context?.trends || [])}
- Latest Mock Interview: ${context?.interviewScore || "Not taken yet"}
- Current Learning Load: ${context?.learningLoad || "Balanced"}
- Insufficient Data Flag: ${context?.hasInsufficientData ? "YES (do NOT invent stats, state clearly that more practice data is needed)" : "NO"}

Recent Conversation:
${JSON.stringify(history || [])}

User's Latest Query:
"${message}"

INSTRUCTIONS:
1. Provide a direct, highly personalized answer based SOLELY on the real learner context provided above.
2. Structure your response into 4 distinct fields:
   - "answer": Clear, conversational, encouraging, and accurate answer to the user's specific query.
   - "why": The pedagogical or career rationale behind this recommendation.
   - "evidence": Array of 1-3 specific evidence references from their context (e.g. "Streak: 5 days", "Recent score: 78%", "Weak area: SQL Window Functions").
   - "nextStep": Concrete next action they should take right now.
   - "actionButton": An object with "label" (e.g. "Start Practice", "View Roadmap", "Take Mock Interview") and "targetView" ("practice" | "learning-path" | "projects" | "mock-interview" | "skill-gap" | "progress" | "communication" | "courses-videos" | "profile").
3. DO NOT hallucinate fake job guarantees, salaries, or unverified achievements.
4. Output PURE JSON with NO markdown wrappers matching:
{
  "mentorResponse": {
    "answer": "string",
    "why": "string",
    "evidence": ["string"],
    "nextStep": "string",
    "actionButton": {
      "label": "string",
      "targetView": "string"
    }
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const resText = response.text || "{}";
      const cleaned = resText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      res.json({ ...parsed, isFallback: false });
    } catch (err: any) {
      console.warn("Orchestrator endpoint error, returning fallback:", err?.message);
      res.json({ mentorResponse: fallbackMentorResponse, isFallback: true });
    }
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EduPath AI Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start EduPath AI server:", err);
});
