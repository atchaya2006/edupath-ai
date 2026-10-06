import {
  ProfileAnalysisPayload,
  CareerProfileAnalysisResult,
  TargetRoleProfile,
  SkillGapAnalysis,
  SkillGapAnswerPayload,
} from '../types';

export class GeminiService {
  /**
   * Check if server has an active Gemini API key configured
   */
  static async checkApiStatus(): Promise<{ status: string; hasGeminiKey: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (err: any) {
      console.warn('Backend health check error:', err);
      return { status: 'offline', hasGeminiKey: false };
    }
  }

  /**
   * Calls the server-side Gemini Career Profile & Resume Analysis Agent
   * Implements retry with exponential backoff on transient failure and developer logging
   */
  static async analyzeCareerProfile(
    payload: ProfileAnalysisPayload
  ): Promise<CareerProfileAnalysisResult> {
    const maxRetries = 2; // Up to 2 retries (Total 3 attempts)
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        const res = await fetch('/api/agent/analyze-career-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const status = res.status;
          let errorData: any = null;
          try {
            errorData = await res.json();
          } catch {
            // ignore
          }

          const isTransient =
            status === 503 ||
            status === 429 ||
            status === 504 ||
            errorData?.isTemporary === true ||
            errorData?.code === 'UNAVAILABLE' ||
            errorData?.code === 'RESOURCE_EXHAUSTED';

          const errorType =
            errorData?.code ||
            (status === 503 ? 'UNAVAILABLE' : status === 429 ? 'RESOURCE_EXHAUSTED' : 'SERVER_ERROR');

          // Developer logging per Requirement 9
          console.warn(
            `[EduPath AI Client] [Attempt ${attempt}/${maxRetries + 1}] HTTP Status: ${status}, Error Type: ${errorType}, Timestamp: ${new Date().toISOString()}`
          );

          if (isTransient && attempt <= maxRetries) {
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
            continue;
          }

          const userMessage =
            errorData?.error ||
            (isTransient
              ? 'AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile.'
              : 'Failed to analyze career profile.');

          const customErr: any = new Error(userMessage);
          customErr.status = status;
          customErr.isTemporary = isTransient;
          customErr.errorType = errorType;
          throw customErr;
        }

        const data = await res.json();
        if (!data || !data.result) {
          throw new Error('Invalid analysis response format received from AI server');
        }

        return data.result;
      } catch (err: any) {
        if (err.status) {
          throw err;
        }

        // Network or fetch failure
        console.warn(
          `[EduPath AI Client] [Attempt ${attempt}/${maxRetries + 1}] HTTP Status: 0, Error Type: NETWORK_FAILURE, Timestamp: ${new Date().toISOString()}`
        );

        if (attempt <= maxRetries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }

        const networkErr: any = new Error(
          'AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile.'
        );
        networkErr.status = 503;
        networkErr.isTemporary = true;
        networkErr.errorType = 'NETWORK_FAILURE';
        throw networkErr;
      }
    }

    throw new Error(
      'AI analysis is temporarily unavailable because the AI service is busy. Your resume and profile information are safe. You can retry now or continue with your manually entered profile.'
    );
  }

  /**
   * Generates industry-calibrated skill requirements for a target role using Gemini
   */
  static async generateRoleRequirements(targetRole: string): Promise<TargetRoleProfile> {
    const res = await fetch('/api/agent/generate-role-requirements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetRole }),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to generate target role requirements';
      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    const json = await res.json();
    return json.data as TargetRoleProfile;
  }

  /**
   * Calls Gemini to perform an explainable, evidence-grounded skill gap analysis
   */
  static async analyzeSkillGaps(payload: {
    targetRole: string;
    currentSkills?: any[];
    learnerProfile?: any;
    careerAnalysis?: any;
    roleRequirements?: any;
  }): Promise<SkillGapAnalysis> {
    const res = await fetch('/api/agent/analyze-skill-gaps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to analyze skill gaps with Gemini';
      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    const json = await res.json();
    return json.data as SkillGapAnalysis;
  }

  /**
   * Natural language Q&A about skill gaps and learning priorities
   */
  static async answerSkillGapQuestion(payload: SkillGapAnswerPayload): Promise<string> {
    const res = await fetch('/api/agent/ask-skill-gap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      let errorMessage = 'Failed to answer skill gap question';
      try {
        const errorData = await res.json();
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // use default
      }
      throw new Error(errorMessage);
    }

    const json = await res.json();
    return json.answer || 'No answer received from AI mentor.';
  }
}
