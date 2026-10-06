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
        console.warn(`[MockInterview Resiliency] Model ${model} encountered transient issue (${errStr.slice(0, 90)}...), falling back to ${models[i + 1]}...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export function setupMockInterviewRoutes(app: express.Express) {
  /**
   * 1. generateInterviewPlan
   * Generates a personalized structured interview plan tailored to target role,
   * experience, skills, skill gaps, user projects, resume, and communication performance.
   */
  app.post("/api/agent/generate-interview-plan", async (req: Request, res: Response) => {
    const {
      targetRole = "Data Analyst",
      interviewType = "mixed",
      difficulty = "intermediate",
      style = "professional",
      questionCount = 5,
      duration = 15,
      userProfile = {},
      resumeAnalysis = null,
      skills = [],
      skillGaps = [],
      projects = [],
      communicationPerformance = null,
      interviewHistory = [],
    } = req.body;

    const count = Math.min(15, Math.max(3, Number(questionCount) || 5));

    // Helper for generating deterministic, highly tailored fallback questions
    const generateFallbackPlan = () => {
      const questions: any[] = [];
      const userProjectTitles = Array.isArray(projects) && projects.length > 0
        ? projects.map((p: any) => typeof p === 'string' ? p : p.title).filter(Boolean)
        : [];
      const primaryProject = userProjectTitles[0] || null;

      // Question pool based on interviewType
      if (interviewType === "hr" || interviewType === "mixed") {
        questions.push({
          id: `q-hr-1`,
          type: "hr",
          question: `Tell me about yourself and what specifically attracted you to pursuing a ${targetRole} career?`,
          topic: "Background & Career Motivation",
          difficulty: "beginner",
          purpose: `Evaluate candidate introduction, career clarity, and alignment with the ${targetRole} path.`,
          expectedFocus: ["Professional background", "Core motivation for role", "Relevant skills alignment"],
          followUpAllowed: true,
          hint: "Keep your response between 60-90 seconds. Focus on your relevant skills, recent projects, and enthusiasm for this role.",
        });
      }

      if (interviewType === "technical" || interviewType === "mixed") {
        questions.push({
          id: `q-tech-1`,
          type: "technical",
          question: `In SQL, how does an INNER JOIN differ from a LEFT JOIN in handling unmatched rows, and when would you use a FULL OUTER JOIN in business reporting?`,
          skill: "SQL",
          topic: "Relational Joins & Data Modeling",
          difficulty: difficulty === "advanced" ? "advanced" : "intermediate",
          purpose: "Assess fundamental data querying precision and table relationship handling.",
          expectedFocus: ["Handling of NULL / unmatched keys", "Performance considerations", "Real business reporting use case"],
          followUpAllowed: true,
          hint: "Contrast what happens to rows in Table A when there is no matching record in Table B.",
        });

        if (count >= 4) {
          questions.push({
            id: `q-tech-2`,
            type: "technical",
            question: `Explain how you evaluate whether a dataset has missing values or outliers, and what criteria you use to decide between imputation, capping, or exclusion?`,
            skill: "Data Cleaning & Statistics",
            topic: "Data Quality & Anomaly Detection",
            difficulty: difficulty === "beginner" ? "beginner" : "intermediate",
            purpose: "Evaluate data pipeline integrity and diagnostic reasoning.",
            expectedFocus: ["Random vs systematic missingness", "Impact on downstream metrics", "Documenting data cleaning choices"],
            followUpAllowed: true,
            hint: "Consider how dropping rows can bias business metrics like retention or average order value.",
          });
        }
      }

      if (interviewType === "project" || interviewType === "mixed") {
        if (primaryProject) {
          questions.push({
            id: `q-proj-1`,
            type: "project",
            question: `In your project "${primaryProject}", can you walk me through your technical workflow, why you chose your specific toolset, and the single biggest challenge you overcame?`,
            skill: "Project Execution",
            topic: "Architecture & Problem Solving",
            difficulty: "intermediate",
            purpose: `Verify direct hands-on ownership and decision trade-offs on "${primaryProject}".`,
            expectedFocus: ["End-to-end technical steps", "Tool selection rationale", "Overcoming a concrete bottleneck"],
            followUpAllowed: true,
            hint: "Structure your response with: Problem Context -> Your Architecture -> Concrete Obstacle & Solution.",
          });
        } else {
          questions.push({
            id: `q-proj-fallback`,
            type: "project",
            question: `Walk me through an end-to-end technical project you have developed. What were the initial raw data inputs, how did you model the relationships, and what actionable output did you deliver?`,
            skill: "Project Execution",
            topic: "End-to-End Project Delivery",
            difficulty: "intermediate",
            purpose: "Assess candidate's ability to articulate project architecture and business deliverables.",
            expectedFocus: ["Data pipeline", "Modeling decisions", "Deliverable clarity"],
            followUpAllowed: true,
            hint: "Walk through the lifecycle from raw data ingestion to stakeholder dashboard or report.",
          });
        }
      }

      if (interviewType === "behavioral" || interviewType === "mixed") {
        questions.push({
          id: `q-beh-1`,
          type: "behavioral",
          question: `Describe a situation where a stakeholder or team member disagreed with your analytical conclusion or requested a change you felt was technically inaccurate. How did you handle it?`,
          skill: "Stakeholder Management",
          topic: "Conflict Resolution & Data Integrity",
          difficulty: "intermediate",
          purpose: "Evaluate professional diplomacy, evidence-based communication, and integrity.",
          expectedFocus: ["Situation context", "Objective evidence presented", "Diplomatic resolution"],
          followUpAllowed: true,
          hint: "Use the STAR method (Situation, Task, Action, Result) and emphasize remaining collaborative.",
        });

        if (count >= 5 && questions.length < count) {
          questions.push({
            id: `q-beh-2`,
            type: "behavioral",
            question: `Tell me about a time you had to learn a completely new technical tool or library under a tight deadline to complete an assignment. What was your strategy?`,
            skill: "Adaptability",
            topic: "Continuous Learning & Agility",
            difficulty: "beginner",
            purpose: "Evaluate self-directed learning speed and resourcefulness.",
            expectedFocus: ["Specific new technology", "Structured learning approach", "Successful outcome"],
            followUpAllowed: true,
            hint: "Mention specific learning steps: documentation, isolated sandbox experiments, or seeking targeted peer feedback.",
          });
        }
      }

      // Fill remaining if needed
      while (questions.length < count) {
        const idx = questions.length + 1;
        questions.push({
          id: `q-extra-${idx}`,
          type: interviewType === "technical" ? "technical" : "behavioral",
          question: `How do you ensure reproducibility, documentation, and quality control before presenting technical deliverables to senior leadership?`,
          skill: "Best Practices",
          topic: "Quality Assurance & Executive Delivery",
          difficulty: "intermediate",
          purpose: "Assess rigor and enterprise-readiness.",
          expectedFocus: ["Validation checks", "Clear documentation", "Executive presentation format"],
          followUpAllowed: true,
          hint: "Mention version control, schema checks, and previewing with peer reviewers.",
        });
      }

      return {
        targetRole,
        interviewType,
        difficulty,
        style,
        questions: questions.slice(0, count),
        focusAreas: ["Relational SQL Joins", "Project Architecture", "Executive Delivery", "STAR Method"],
        estimatedDuration: duration,
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json(generateFallbackPlan());
      }

      const verifiedProjects = Array.isArray(projects)
        ? projects.map((p: any) => typeof p === 'string' ? p : p.title).filter(Boolean)
        : [];

      const prompt = `You are EduPath AI's Principal Interview Architect and Executive Career Coach.
Generate a tailored, realistic ${count}-question mock interview plan.

Context:
- Target Career Role: "${targetRole}"
- Interview Mode: "${interviewType}" (Options: hr, technical, project, behavioral, mixed)
- Difficulty Level: "${difficulty}" (beginner, intermediate, advanced, adaptive)
- Interview Tone/Style: "${style}" (friendly, professional, challenging)
- Candidate Experience: "${userProfile?.yearsExperience || 'Early career / fresher'}"
- Education: "${userProfile?.currentEducation || userProfile?.education || "Bachelor's degree"}"
- Known Candidate Skills: ${JSON.stringify(skills.slice(0, 8))}
- Known Skill Gaps: ${JSON.stringify(skillGaps.slice(0, 6))}
- Actual Candidate Projects: ${JSON.stringify(verifiedProjects)}
- Resume Highlights: ${resumeAnalysis ? JSON.stringify(resumeAnalysis) : 'No external resume file uploaded'}

CRITICAL INTERVIEW POLICIES:
1. NEVER INVENT USER EXPERIENCE OR PROJECTS. If the user has verified projects (${JSON.stringify(verifiedProjects)}), only reference those titles. If none exist, ask about general project methodology without inventing fictitious companies.
2. For "hr" mode: Ask behavioral / HR motivation questions tailored to transitioning into ${targetRole}.
3. For "technical" mode: Focus on ${targetRole} technical competencies (e.g. SQL, data modeling, analytical metrics). Match the "${difficulty}" level.
4. For "project" mode: Dig deep into their actual projects (${verifiedProjects.join(', ') || 'personal portfolio projects'}).
5. For "behavioral" mode: Use classic STAR-eliciting questions (teamwork, conflict, deadlines, learning).
6. For "mixed" mode: Balanced mix of HR, Technical, Project, and Behavioral questions.
7. Return exactly ${count} questions.

Return JSON in this EXACT schema:
{
  "targetRole": "${targetRole}",
  "interviewType": "${interviewType}",
  "difficulty": "${difficulty}",
  "style": "${style}",
  "estimatedDuration": ${duration},
  "focusAreas": ["string", "string", "string"],
  "questions": [
    {
      "id": "q-1",
      "type": "hr" | "technical" | "project" | "behavioral",
      "question": "Clear, realistic interview question",
      "skill": "Specific skill evaluated (e.g. SQL, Stakeholder Management)",
      "topic": "Topic category",
      "difficulty": "beginner" | "intermediate" | "advanced",
      "purpose": "Why the hiring committee asks this question",
      "expectedFocus": ["point 1", "point 2"],
      "followUpAllowed": true,
      "hint": "Pedagogical clue that helps the candidate structure thoughts without giving away the direct answer"
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

      if (parsed.questions && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return res.json({
          ...parsed,
          isFallback: false,
        });
      }

      return res.json(generateFallbackPlan());
    } catch (err: any) {
      console.warn("generateInterviewPlan error, using fallback:", err?.message);
      return res.json(generateFallbackPlan());
    }
  });

  /**
   * 2. generateFollowUpQuestion
   * Generates a conversational follow-up question based on the user's specific answer,
   * digging into technical trade-offs, architecture choices, or STAR specifics.
   */
  app.post("/api/agent/generate-follow-up-question", async (req: Request, res: Response) => {
    const {
      currentQuestion,
      userAnswer,
      previousQuestions = [],
      previousAnswers = [],
      targetRole = "Data Analyst",
      skill = "General",
      difficulty = "intermediate",
    } = req.body;

    const generateFallbackFollowUp = () => {
      const lower = (userAnswer || "").toLowerCase();
      if (lower.includes("sql") || lower.includes("query") || lower.includes("database")) {
        return {
          followUpQuestion: `You mentioned using SQL in your approach. How did you ensure query performance on larger tables, and what indexing or partitioning strategy did you consider?`,
          isFallback: true,
        };
      }
      if (lower.includes("dashboard") || lower.includes("power bi") || lower.includes("tableau")) {
        return {
          followUpQuestion: `When you built the visual deliverable, how did you decide which KPIs deserved top-level placement, and how did non-technical stakeholders react?`,
          isFallback: true,
        };
      }
      return {
        followUpQuestion: `Building on what you just shared: what was the single biggest trade-off you had to accept with that approach, and what would you do differently with more time?`,
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai || !userAnswer || userAnswer.trim().length < 15) {
        return res.json(generateFallbackFollowUp());
      }

      const prompt = `You are an expert ${targetRole} hiring manager conducting an interactive mock interview.
The candidate just provided this response:

Original Question: "${currentQuestion}"
Candidate Answer: "${userAnswer}"
Target Role: "${targetRole}"
Core Skill: "${skill}"
Difficulty: "${difficulty}"

Generate ONE targeted, natural follow-up question that builds directly on a specific statement or technology they mentioned.
If they were vague on metrics or implementation, press gently for specifics.
Keep the tone professional and conversational.

Return JSON in this format:
{
  "followUpQuestion": "Direct follow-up question"
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.followUpQuestion) {
        return res.json({
          followUpQuestion: parsed.followUpQuestion,
          isFallback: false,
        });
      }

      return res.json(generateFallbackFollowUp());
    } catch (err: any) {
      console.warn("generateFollowUpQuestion error, using fallback:", err?.message);
      return res.json(generateFallbackFollowUp());
    }
  });

  /**
   * 3. evaluateInterviewAnswer
   * Evaluates user's answer against observable criteria for technical, HR, project, or behavioral questions.
   * Labeled strictly as AI-estimated interview practice feedback.
   */
  app.post("/api/agent/evaluate-interview-answer", async (req: Request, res: Response) => {
    const {
      question,
      userAnswer,
      questionType = "technical",
      targetRole = "Data Analyst",
      skill = "General",
      difficulty = "intermediate",
      style = "professional",
    } = req.body;

    const generateFallbackEvaluation = () => {
      const length = (userAnswer || "").trim().length;
      const wordCount = (userAnswer || "").trim().split(/\s+/).filter(Boolean).length;

      let score = 75;
      if (wordCount > 60) score += 10;
      if (wordCount < 20) score -= 15;
      score = Math.min(92, Math.max(50, score));

      const strengths = [
        "Directly addressed the core theme of the question",
        "Clear professional tone and logical sentence flow",
      ];
      if (wordCount > 50) strengths.push("Included specific technical context and methodology");

      const improvements = [
        questionType === "behavioral" || questionType === "hr"
          ? "Structure your answer explicitly using Situation -> Task -> Action -> Result (STAR)"
          : "Cite concrete technical trade-offs and performance impacts",
        "Quantify outcomes with measurable metrics or time saved wherever applicable",
      ];

      const missing = [
        questionType === "technical"
          ? "Edge cases, scale considerations (e.g. table size > 10M rows), or indexing"
          : "Specific personal contributions vs team contributions",
      ];

      return {
        evaluation: {
          score,
          strengths,
          improvementAreas: improvements,
          missingPoints: missing,
          feedback: `Your response shows solid familiarity with ${skill || targetRole}. To stand out in hiring committee evaluations, push beyond high-level descriptions: name specific functions, tools, or quantifiable results.`,
          suggestedAnswerStructure: questionType === "technical"
            ? "1. Direct Definition & Core Principle -> 2. Implementation Approach & Functions -> 3. Concrete Example -> 4. Scale & Trade-offs"
            : "1. Situation & Context (20s) -> 2. Task & Objective (10s) -> 3. Concrete Action Taken (40s) -> 4. Quantifiable Result & Lesson (20s)",
          recommendedPractice: [
            `Review ${skill || "SQL"} interview questions in the Practice section`,
            "Practice delivering your answer in 60-90 seconds using structured bullet points",
          ],
          confidence: 0.85,
          categoryScores: {
            technicalCorrectness: score + 2,
            clarity: score,
            structure: score - 4,
            specificity: score - 2,
            relevance: score + 3,
          },
        },
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai || !userAnswer || userAnswer.trim().length < 5) {
        return res.json(generateFallbackEvaluation());
      }

      const prompt = `You are an expert interview coach evaluating a candidate's mock interview response for a "${targetRole}" role.

Question: "${question}"
Question Type: "${questionType}" (technical | hr | project | behavioral)
Skill/Topic: "${skill}"
Candidate Answer: "${userAnswer}"
Target Role: "${targetRole}"
Difficulty: "${difficulty}"

CRITICAL EVALUATION GUIDELINES:
- Clearly label this as AI-estimated practice feedback, not official hiring decisions.
- Evaluate ONLY what the user actually stated in their response. Do not invent achievements.
- For technical questions: assess correctness, completeness, reasoning, clarity.
- For HR/behavioral questions: assess relevance, structure (STAR), clarity, specificity.
- For project questions: assess technical understanding, problem clarity, decision trade-offs, personal contribution.
- Provide a score from 0 to 100 based on standard industry candidate rubrics.
- Provide 2-3 specific strengths.
- Provide 2-3 specific improvement areas.
- Provide 1-2 missing points that would elevate the answer.
- Provide a clear, actionable suggested answer structure.

Return JSON in this EXACT schema:
{
  "score": 82,
  "strengths": ["string", "string"],
  "improvementAreas": ["string", "string"],
  "missingPoints": ["string"],
  "feedback": "Concise paragraph of constructive, empathetic feedback",
  "suggestedAnswerStructure": "Step-by-step recommended structure",
  "recommendedPractice": ["string", "string"],
  "confidence": 0.9,
  "categoryScores": {
    "technicalCorrectness": 84,
    "clarity": 80,
    "structure": 78,
    "specificity": 82,
    "relevance": 88
  }
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.score !== undefined) {
        return res.json({
          evaluation: {
            score: Math.min(100, Math.max(0, Number(parsed.score))),
            strengths: parsed.strengths || ["Direct response to question"],
            improvementAreas: parsed.improvementAreas || ["Include more concrete metrics"],
            missingPoints: parsed.missingPoints || [],
            feedback: parsed.feedback || "Good response. Continue practicing concise delivery.",
            suggestedAnswerStructure: parsed.suggestedAnswerStructure || "Situation -> Action -> Result",
            recommendedPractice: parsed.recommendedPractice || [],
            confidence: parsed.confidence || 0.88,
            categoryScores: parsed.categoryScores,
          },
          isFallback: false,
        });
      }

      return res.json(generateFallbackEvaluation());
    } catch (err: any) {
      console.warn("evaluateInterviewAnswer error, using fallback:", err?.message);
      return res.json(generateFallbackEvaluation());
    }
  });

  /**
   * 4. analyzeInterviewPerformance
   * Evaluates aggregate interview results to identify strong areas, developing areas,
   * needs practice, and recurring gaps across interview attempts.
   */
  app.post("/api/agent/analyze-interview-performance", async (req: Request, res: Response) => {
    const {
      attempts = [],
      targetRole = "Data Analyst",
      skills = [],
      previousInterviews = [],
    } = req.body;

    const computeDeterministicAnalysis = () => {
      const strong: string[] = [];
      const developing: string[] = [];
      const needsPractice: string[] = [];

      attempts.forEach((att: any) => {
        const topic = att.topic || att.skill || att.questionType;
        const score = att.evaluation?.score || (att.status === 'skipped' ? 40 : 75);

        if (att.status === 'skipped' || score < 65) {
          if (!needsPractice.includes(topic)) needsPractice.push(topic);
        } else if (score >= 82) {
          if (!strong.includes(topic)) strong.push(topic);
        } else {
          if (!developing.includes(topic)) developing.push(topic);
        }
      });

      // Defaults if small sample
      if (strong.length === 0) strong.push("Communication Clarity", "Professional Demeanor");
      if (developing.length === 0) developing.push("STAR Method Structure", "SQL Query Optimization");
      if (needsPractice.length === 0) needsPractice.push("Quantifying Project Business Impact");

      return {
        strongAreas: strong,
        developingAreas: developing,
        needsPractice: needsPractice,
        repeatedWeakAreas: [
          "Explaining database trade-offs to non-technical stakeholders",
          "Explicitly stating quantifiable dollar/percentage results",
        ],
        recommendedTopics: [
          "SQL Window Functions & Indexing",
          "Executive STAR Storytelling",
          "Cohort Retention Metrics",
        ],
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai || attempts.length === 0) {
        return res.json(computeDeterministicAnalysis());
      }

      const summaryData = attempts.map((a: any) => ({
        question: a.question,
        type: a.questionType,
        skill: a.skill || a.topic,
        status: a.status,
        score: a.evaluation?.score || 0,
        weaknesses: a.evaluation?.improvementAreas || [],
      }));

      const prompt = `You are an executive talent coach reviewing a candidate's complete mock interview session for "${targetRole}".

Attempts summary:
${JSON.stringify(summaryData, null, 2)}

Identify:
1. Strong Areas: skills or question types where the candidate scored well and gave complete responses.
2. Developing Areas: competencies where the candidate has the basics but lacks depth or metrics.
3. Needs Practice: topics where the candidate skipped, struggled, or showed major gaps.
4. Repeated Weak Areas: common threads across multiple questions (e.g. lacking STAR structure, missing scale considerations).
5. Recommended Topics: 3 prioritized learning topics to review next.

Return JSON in this schema:
{
  "strongAreas": ["string", "string"],
  "developingAreas": ["string", "string"],
  "needsPractice": ["string", "string"],
  "repeatedWeakAreas": ["string", "string"],
  "recommendedTopics": ["string", "string"]
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.strongAreas && parsed.needsPractice) {
        return res.json({
          ...parsed,
          isFallback: false,
        });
      }

      return res.json(computeDeterministicAnalysis());
    } catch (err: any) {
      console.warn("analyzeInterviewPerformance error, using fallback:", err?.message);
      return res.json(computeDeterministicAnalysis());
    }
  });

  /**
   * 5. generateInterviewPrepPlan
   * Creates a 5-day personalized preparation plan based on observed weak areas.
   */
  app.post("/api/agent/generate-interview-prep-plan", async (req: Request, res: Response) => {
    const {
      targetRole = "Data Analyst",
      weakAreas = [],
      overallScore = 75,
    } = req.body;

    const fallbackPlan = {
      days: [
        {
          day: 1,
          focus: "SQL & Query Optimization Fundamentals",
          description: "Review multi-table JOINs, indexing strategies (B-tree vs clustered), and execution plans.",
          suggestedAction: "Complete 3 interactive SQL exercises in the Practice Center focusing on INNER vs LEFT joins.",
          relatedSkill: "SQL",
        },
        {
          day: 2,
          focus: "Technical Anomaly Detection & Imputation",
          description: "Practice explaining missing data treatments, handling outliers, and statistical distributions.",
          suggestedAction: "Review the Data Cleaning & Imputation guide and write a 60-second explanation script.",
          relatedSkill: "Statistics",
        },
        {
          day: 3,
          focus: "Portfolio Project Walkthrough Mastery",
          description: "Refine your 90-second project pitch highlighting architectural decisions, tools, and results.",
          suggestedAction: "Use the Communication Coach to record and polish your project STAR summary.",
          relatedSkill: "Communication",
        },
        {
          day: 4,
          focus: "Stakeholder Management & Behavioral Scenarios",
          description: "Prepare structured STAR stories for conflict resolution, priority shifts, and pushing back with data.",
          suggestedAction: "Practice 2 behavioral questions using the Situation -> Task -> Action -> Result format.",
          relatedSkill: "Behavioral",
        },
        {
          day: 5,
          focus: "Full Adaptive Mock Interview Simulation",
          description: "Run a 10-question Mixed Mock Interview under timed conditions to measure score progression.",
          suggestedAction: "Complete a full 15-minute mock interview session in EduPath AI.",
          relatedSkill: "Interview Simulation",
        },
      ],
      keyAdvice: `For ${targetRole} interviews, lead every response with the business outcome before detailing the underlying query or chart.`,
      isFallback: true,
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json(fallbackPlan);
      }

      const prompt = `You are EduPath AI's Personalized Interview Coach.
Create a structured 5-day preparation sprint for a candidate preparing for "${targetRole}" roles.
Observed Weak Areas: ${JSON.stringify(weakAreas)}
Current Interview Score: ${overallScore}%

Return JSON with this schema:
{
  "days": [
    {
      "day": 1,
      "focus": "Topic focus",
      "description": "Clear explanation of what to master",
      "suggestedAction": "Concrete action to take in EduPath AI practice / learning path",
      "relatedSkill": "Skill"
    }
  ],
  "keyAdvice": "One golden rule for interviewing in this role"
}`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.days && Array.isArray(parsed.days) && parsed.days.length > 0) {
        return res.json({
          ...parsed,
          isFallback: false,
        });
      }

      return res.json(fallbackPlan);
    } catch (err: any) {
      console.warn("generateInterviewPrepPlan error, using fallback:", err?.message);
      return res.json(fallbackPlan);
    }
  });

  /**
   * 6. askInterviewCoach
   * Interactive Q&A with the Interview Coach after an interview or during review.
   */
  app.post("/api/agent/ask-interview-coach", async (req: Request, res: Response) => {
    const {
      question,
      interviewContext = {},
      targetRole = "Data Analyst",
      recentQuestion = "",
      recentAnswer = "",
      recentFeedback = "",
    } = req.body;

    const generateFallbackCoachReply = () => {
      const qLower = (question || "").toLowerCase();
      if (qLower.includes("why was my answer weak") || qLower.includes("weak")) {
        return {
          reply: `**Coach Analysis:** Your answer was a great start, but interviewers look for two main things:
1. **Concrete Specifics**: Instead of saying "I cleaned the data," specify *how* (e.g. "I wrote SQL CTEs using COALESCE to handle null customer IDs").
2. **Quantifiable Result**: Mention the business outcome (e.g. "which reduced dashboard query load times by 35%").
Adding these makes you sound like an experienced practitioner rather than a student reciting definitions!`,
          isFallback: true,
        };
      }
      if (qLower.includes("tell me about yourself") || qLower.includes("intro")) {
        return {
          reply: `**How to Ace "Tell Me About Yourself":**
Use the **Present -> Past -> Future** framework (60-90 seconds max):
- **Present (30s)**: "I am a data analyst skilled in SQL, Python, and Power BI, currently building data models and dashboards."
- **Past (30s)**: "Recently, I built a customer cohort retention platform analyzing 50k records where I resolved churn bottlenecks."
- **Future (20s)**: "I'm excited about this ${targetRole} opportunity because your team is tackling large-scale operational analytics."`,
          isFallback: true,
        };
      }
      return {
        reply: `**Interview Coach Advice:** Focus on **structured delivery**. Whenever you're asked about a challenge or project, pause for 2 seconds, outline 3 distinct points (Situation, Action, Outcome), and close by asking: *"Does that provide the level of technical detail you're looking for?"* This demonstrates executive composure!`,
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai) {
        return res.json(generateFallbackCoachReply());
      }

      const prompt = `You are EduPath AI's dedicated Interview Coach.
The learner is asking for coaching advice regarding their mock interview preparation:

Learner Question: "${question}"
Target Role: "${targetRole}"
Recent Interview Question: "${recentQuestion}"
Candidate's Response: "${recentAnswer}"
Feedback Given: "${recentFeedback}"

Provide an encouraging, expert, highly actionable response in 2-3 concise paragraphs or structured bullet points.
Include a concrete script example or technique whenever relevant.`;

      const response = await callGeminiSafe(ai, {
        contents: prompt,
      });

      return res.json({
        reply: response.text || generateFallbackCoachReply().reply,
        isFallback: false,
      });
    } catch (err: any) {
      console.warn("askInterviewCoach error, using fallback:", err?.message);
      return res.json(generateFallbackCoachReply());
    }
  });

  /**
   * 7. getQuestionHint
   * Generates a pedagogical clue that guides structure without giving away the direct answer.
   */
  app.post("/api/agent/get-question-hint", async (req: Request, res: Response) => {
    const { question, questionType = "technical", skill = "General", targetRole = "Data Analyst" } = req.body;

    const generateFallbackHint = () => {
      if (questionType === "technical") {
        return {
          hint: `Think about the core mechanics: what happens to unmatched rows in memory, and how does that affect the final table size or calculation?`,
          isFallback: true,
        };
      }
      if (questionType === "project") {
        return {
          hint: `Anchor your response around the STAR method: What was the business goal, what tools did you choose, and what measurable impact did you deliver?`,
          isFallback: true,
        };
      }
      return {
        hint: `Recall a real situation where you had to balance technical accuracy with collaborative diplomacy. State the challenge and the constructive resolution.`,
        isFallback: true,
      };
    };

    try {
      const ai = getGenAI();
      if (!ai) return res.json(generateFallbackHint());

      const prompt = `You are an empathetic interview coach.
Provide a 1-2 sentence pedagogical hint for the candidate on this interview question:
Question: "${question}"
Type: "${questionType}"
Target Role: "${targetRole}"

RULE: DO NOT provide the full answer. Provide a thinking prompt or structural clue to help them formulate their own answer.`;

      const response = await callGeminiSafe(ai, { contents: prompt });
      return res.json({
        hint: response.text?.trim() || generateFallbackHint().hint,
        isFallback: false,
      });
    } catch (err: any) {
      return res.json(generateFallbackHint());
    }
  });
}
