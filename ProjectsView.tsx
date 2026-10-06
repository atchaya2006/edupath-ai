import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Sparkles,
  Clock,
  ArrowRight,
  CheckCircle2,
  Layers,
  Wrench,
  FileCheck,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Play,
  RotateCw,
  Send,
  HelpCircle,
  Lightbulb,
  CheckSquare,
  Square,
  Github,
  Award,
  AlertTriangle,
  Code2,
  FileText,
  Presentation,
  Compass,
  Briefcase,
  Share2,
} from 'lucide-react';
import { LearnerProfile, SkillGapAnalysis, LearningPath } from '../types';
import { AIProject, ProjectMilestone, ProjectSubmission, ProjectAIReview, ProjectMentorMessage } from '../types/project';
import { AgentService } from '../services/agentService';
import { useAuth } from '../contexts/AuthContext';
import { AuthService } from '../services/authService';

interface ProjectsViewProps {
  onNavigate: (view: string) => void;
  learnerProfile?: LearnerProfile;
  skillGapAnalysis?: SkillGapAnalysis | null;
  learningPath?: LearningPath | null;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onNavigate,
  learnerProfile,
  skillGapAnalysis,
  learningPath,
}) => {
  const { user } = useAuth();
  const userId = user?.id || 'user_alex_demo';
  const roleName = learnerProfile?.targetRole || user?.targetRole || 'Data Analyst';

  // State
  const [projects, setProjects] = useState<AIProject[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeMilestoneId, setActiveMilestoneId] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Filter & Generation Modal
  const [showGenerateModal, setShowGenerateModal] = useState<boolean>(false);
  const [domainInput, setDomainInput] = useState<string>('E-Commerce & Subscription SaaS');
  const [difficultyInput, setDifficultyInput] = useState<'beginner' | 'intermediate' | 'advanced'>('intermediate');
  const [targetFocusGap, setTargetFocusGap] = useState<string>('Power BI & SQL Window Functions');

  // AI Project Mentor Drawer / State
  const [isMentorOpen, setIsMentorOpen] = useState<boolean>(false);
  const [mentorQuestion, setMentorQuestion] = useState<string>('');
  const [mentorCodeSnippet, setMentorCodeSnippet] = useState<string>('');
  const [mentorMessages, setMentorMessages] = useState<ProjectMentorMessage[]>([]);
  const [isAskingMentor, setIsAskingMentor] = useState<boolean>(false);

  // Project Submission & Review State
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [submissionGithub, setSubmissionGithub] = useState<string>('https://github.com/alex-rivera/customer-retention-cohort-analytics');
  const [submissionDemo, setSubmissionDemo] = useState<string>('https://app.powerbi.com/view?r=demo-cohort-analytics');
  const [submissionDesc, setSubmissionDesc] = useState<string>(
    'Constructed an end-to-end customer cohort analytics pipeline using SQL CTEs and Window Functions on 50k+ transactions. Connected model to an interactive Power BI dashboard tracking MoM churn and revenue at risk.'
  );
  const [submissionChallenges, setSubmissionChallenges] = useState<string>(
    'Reconciling date timestamp boundaries for month-1 repeat purchases and ensuring DAX filter context did not double-count multi-item checkouts.'
  );
  const [submissionOutcomes, setSubmissionOutcomes] = useState<string>(
    'Mastered SQL LAG/LEAD functions, star-schema modeling in Power BI, and executive metric presentation.'
  );
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Priority Gaps
  const priorityGaps = (skillGapAnalysis?.topPriorities || learnerProfile?.skillGaps || [])
    .map((g: any) => (typeof g === 'string' ? g : g.skill || g.name))
    .slice(0, 3);

  // Load user-isolated projects
  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      const savedProjects = AuthService.getUserData<AIProject[]>(userId, 'ai_projects', []);
      const savedActiveId = AuthService.getUserData<string>(userId, 'active_project_id', '');

      if (savedProjects && savedProjects.length > 0) {
        setProjects(savedProjects);
        const selectedId = savedActiveId && savedProjects.some((p) => p.id === savedActiveId)
          ? savedActiveId
          : savedProjects[0].id;
        setActiveProjectId(selectedId);
        const activeProj = savedProjects.find((p) => p.id === selectedId);
        if (activeProj && activeProj.milestones && activeProj.milestones.length > 0) {
          setActiveMilestoneId(activeProj.currentMilestoneId || activeProj.milestones[0].id || 'm-1');
        }
        setIsLoading(false);
      } else {
        // Generate initial recommendations tailored to learner
        try {
          const res = await AgentService.generateProjectRecommendations({
            targetRole: roleName,
            currentSkills: learnerProfile?.technicalSkills || [],
            skillGaps: learnerProfile?.skillGaps || [],
            priorityGaps,
            experienceLevel: 'Intermediate',
          });

          if (res.projects && res.projects.length > 0) {
            setProjects(res.projects);
            setActiveProjectId(res.projects[0].id);
            if (res.projects[0].milestones && res.projects[0].milestones.length > 0) {
              setActiveMilestoneId(res.projects[0].milestones[0].id || 'm-1');
            }
            AuthService.setUserData(userId, 'ai_projects', res.projects);
            AuthService.setUserData(userId, 'active_project_id', res.projects[0].id);
          }
        } catch (e) {
          console.error('Error fetching initial projects:', e);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadProjects();
  }, [userId, roleName]);

  // Sync projects to user-isolated storage whenever projects change
  const saveProjectsToStorage = (updated: AIProject[], newActiveId?: string) => {
    setProjects(updated);
    AuthService.setUserData(userId, 'ai_projects', updated);
    if (newActiveId) {
      setActiveProjectId(newActiveId);
      AuthService.setUserData(userId, 'active_project_id', newActiveId);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || projects[0];

  // Milestone Task Checkbox toggle
  const handleToggleTask = (milestoneId: string, taskIndex: number) => {
    if (!activeProject) return;

    const updatedMilestones = (activeProject.milestones || []).map((m) => {
      if (m.id !== milestoneId) return m;
      const tasks = m.tasks || [];
      // Note: we track completed tasks using milestone state
      return m;
    });

    // Toggle milestone status
    const targetMilestone = (activeProject.milestones || []).find((m) => m.id === milestoneId);
    if (!targetMilestone) return;

    const newStatus: 'not_started' | 'in_progress' | 'completed' =
      targetMilestone.status === 'completed'
        ? 'in_progress'
        : targetMilestone.status === 'in_progress'
        ? 'completed'
        : 'in_progress';

    const newMilestones = (activeProject.milestones || []).map((m) =>
      m.id === milestoneId ? { ...m, status: newStatus, completed: newStatus === 'completed' } : m
    );

    const updatedProjects = projects.map((p) =>
      p.id === activeProject.id
        ? {
            ...p,
            milestones: newMilestones,
            status: newMilestones.every((m) => m.completed) ? ('completed' as const) : ('in_progress' as const),
          }
        : p
    );

    saveProjectsToStorage(updatedProjects);
  };

  // Generate New Projects Handler
  const handleGenerateCustomProjects = async () => {
    setIsGenerating(true);
    try {
      const res = await AgentService.generateProjectRecommendations({
        targetRole: roleName,
        currentSkills: learnerProfile?.technicalSkills || [],
        skillGaps: targetFocusGap ? [{ skill: targetFocusGap }] : priorityGaps,
        priorityGaps: targetFocusGap ? [targetFocusGap] : priorityGaps,
        experienceLevel: difficultyInput,
        preferredProjectType: domainInput,
      });

      if (res.projects && res.projects.length > 0) {
        const combined = [...res.projects, ...projects];
        saveProjectsToStorage(combined, res.projects[0].id);
        setActiveMilestoneId(res.projects[0].milestones?.[0]?.id || 'm-1');
        setShowGenerateModal(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Ask Mentor Handler
  const handleAskMentor = async (quickPrompt?: string) => {
    const questionToAsk = quickPrompt || mentorQuestion;
    if (!questionToAsk.trim() || !activeProject) return;

    const currentMilestone = (activeProject.milestones || []).find((m) => m.id === activeMilestoneId);

    const userMsg: ProjectMentorMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: questionToAsk + (mentorCodeSnippet ? `\n\n\`\`\`\n${mentorCodeSnippet}\n\`\`\`` : ''),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMentorMessages((prev) => [...prev, userMsg]);
    setMentorQuestion('');
    setMentorCodeSnippet('');
    setIsAskingMentor(true);

    try {
      const res = await AgentService.askProjectMentor({
        project: activeProject,
        milestone: currentMilestone,
        question: questionToAsk,
        codeSnippet: mentorCodeSnippet,
        learnerProfile,
      });

      const aiMsg: ProjectMentorMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'mentor',
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMentorMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAskingMentor(false);
    }
  };

  // Submit Project Review Handler
  const handleSubmitReview = async () => {
    if (!activeProject) return;
    setIsSubmittingReview(true);

    const submission: ProjectSubmission = {
      githubUrl: submissionGithub,
      demoUrl: submissionDemo,
      projectDescription: submissionDesc,
      challengesFaced: submissionChallenges,
      learningOutcomes: submissionOutcomes.split(',').map((s) => s.trim()).filter(Boolean),
      submittedAt: new Date().toISOString(),
    };

    try {
      const res = await AgentService.reviewProject({
        project: activeProject,
        submission,
      });

      const updatedProject: AIProject = {
        ...activeProject,
        status: 'completed',
        submission,
        aiReview: res.review,
      };

      const updatedProjects = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
      saveProjectsToStorage(updatedProjects);
      setShowSubmitModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 p-12">
        <RotateCw className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
        <h3 className="text-base font-semibold text-slate-900">Loading Portfolio Projects</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Retrieving your isolated project portfolio and milestone progress for {roleName}...
        </p>
      </div>
    );
  }

  const completedMilestonesCount = (activeProject?.milestones || []).filter((m) => m.completed).length;
  const totalMilestonesCount = activeProject?.milestones?.length || 1;
  const progressPercent = Math.round((completedMilestonesCount / totalMilestonesCount) * 100);

  return (
    <div className="space-y-6">
      {/* Top Banner / Portfolio Engine */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full">
              Phase 3: BUILD
            </span>
            <span className="text-xs text-slate-500">• Recruiter-Ready Portfolio</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">AI Project Generator & Mentor</h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Bridge theoretical study into tangible portfolio assets. Build progressive milestones targeting your verified skill gaps, backed by 24/7 AI mentor guidance and code review.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Custom Project
          </button>
          <button
            onClick={() => setIsMentorOpen(!isMentorOpen)}
            className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              isMentorOpen
                ? 'bg-amber-50 text-amber-700 border-amber-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            {isMentorOpen ? 'Hide Project Mentor' : 'Ask Project Mentor'}
          </button>
        </div>
      </div>

      {/* Project Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {projects.map((proj) => {
          const isSelected = proj.id === activeProject?.id;
          const completedCount = (proj.milestones || []).filter((m) => m.completed).length;
          const totalCount = proj.milestones?.length || 6;
          const pct = Math.round((completedCount / totalCount) * 100);

          return (
            <button
              key={proj.id}
              onClick={() => {
                setActiveProjectId(proj.id);
                AuthService.setUserData(userId, 'active_project_id', proj.id);
                if (proj.milestones && proj.milestones.length > 0) {
                  setActiveMilestoneId(proj.milestones[0].id || 'm-1');
                }
              }}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-white border-indigo-600 shadow-xs ring-2 ring-indigo-600/10'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs ${
                  isSelected ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <FolderGit2 className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs font-bold line-clamp-1 max-w-[200px] ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                    {proj.title}
                  </span>
                  {proj.aiReview && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.2 rounded">
                      Reviewed
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                  <span>{pct}% complete</span>
                  <span>•</span>
                  <span>{proj.difficulty}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {activeProject && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main 2-Column: Project Specs, Progressive Milestones, and Review */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Project Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      activeProject.difficulty === 'advanced'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : activeProject.difficulty === 'intermediate'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {activeProject.difficulty}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {activeProject.estimatedDuration}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {activeProject.targetRole}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {activeProject.aiReview ? 'Update Submission & Review' : 'Submit for AI Review'}
                  </button>
                  <button
                    onClick={() => onNavigate('communication')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                    title="Practice explaining this project in an interview"
                  >
                    <Presentation className="w-3.5 h-3.5 text-indigo-600" />
                    Practice Pitch
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">{activeProject.title}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{activeProject.problemStatement}</p>
              </div>

              {/* Why Recommended: explicit connection to gaps */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
                  <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
                  Why Recommended for Your Roadmap
                </div>
                <p className="text-indigo-800 leading-relaxed">{activeProject.whyRecommended}</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700">Portfolio Milestone Progress</span>
                  <span className="text-slate-500 font-medium">
                    {completedMilestonesCount} of {totalMilestonesCount} milestones completed ({progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Skills and Tools Chips */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-400 mr-1">Target Skills:</span>
                {(activeProject.skills || []).map((sk) => (
                  <span
                    key={sk}
                    className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200/60"
                  >
                    {sk}
                  </span>
                ))}
                <span className="text-[11px] font-semibold text-slate-400 ml-2 mr-1">Tools:</span>
                {(activeProject.technologies || []).map((tech) => (
                  <span
                    key={tech}
                    className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Complete Functional & Technical Requirements Accordion */}
            {(activeProject.requirements || activeProject.functionalRequirements) && (
              <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-slate-700" />
                  <h3 className="text-sm font-bold text-slate-900">Project Requirements & Industry Architecture</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Functional Deliverables
                    </span>
                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                      {(activeProject.requirements?.functional || activeProject.functionalRequirements || []).map((req: string, idx: number) => (
                        <li key={idx} className="leading-snug">{req}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 space-y-2">
                    <span className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-indigo-600" />
                      Technical Standards
                    </span>
                    <ul className="space-y-1.5 text-slate-600 list-disc list-inside">
                      {(activeProject.requirements?.technical || activeProject.technicalRequirements || []).map((req: string, idx: number) => (
                        <li key={idx} className="leading-snug">{req}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Expected Inputs</span>
                    <p className="text-slate-700 font-medium">{(activeProject.requirements?.inputs || activeProject.expectedInputs || []).join(', ')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Expected Outputs</span>
                    <p className="text-slate-700 font-medium">{(activeProject.requirements?.outputs || activeProject.expectedOutputs || []).join(', ')}</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Suggested Tools</span>
                    <p className="text-slate-700 font-medium">{(activeProject.suggestedTools || []).join(', ')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Guided Progressive Milestones Section */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Progressive Milestone Execution Plan</h3>
                  <p className="text-xs text-slate-500">
                    Complete each step sequentially to simulate enterprise data analytics sprints.
                  </p>
                </div>
                <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2.5 py-1 rounded-lg">
                  {completedMilestonesCount}/{totalMilestonesCount} Completed
                </span>
              </div>

              <div className="space-y-3">
                {(activeProject.milestones || []).map((m, idx) => {
                  const isCompleted = m.completed || m.status === 'completed';
                  const isInProgress = m.status === 'in_progress';
                  const isCurrent = m.id === activeMilestoneId;

                  return (
                    <div
                      key={m.id || idx}
                      onClick={() => setActiveMilestoneId(m.id || `m-${idx + 1}`)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        isCurrent
                          ? 'border-indigo-600 bg-indigo-50/20 shadow-xs'
                          : isCompleted
                          ? 'border-emerald-200 bg-emerald-50/10'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleTask(m.id || `m-${idx + 1}`, 0);
                            }}
                            className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-50" />
                            ) : isInProgress ? (
                              <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full border border-slate-300 hover:border-slate-400" />
                            )}
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-slate-400">Step {m.step || idx + 1}</span>
                              <h4 className="text-xs font-bold text-slate-900">{m.title}</h4>
                              {isCompleted && (
                                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded">
                                  Done
                                </span>
                              )}
                              {isInProgress && (
                                <span className="text-[10px] font-semibold bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded">
                                  In Progress
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{m.objective}</p>

                            {/* Checkable Tasks */}
                            {m.tasks && m.tasks.length > 0 && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100/80 space-y-1.5">
                                {m.tasks.map((task, tIdx) => (
                                  <div key={tIdx} className="flex items-center gap-2 text-xs text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                    <span>{task}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                              <span>Estimated: {m.estimatedTime || '2-3 hours'}</span>
                              <span>•</span>
                              <span>Skills: {(m.skills || []).join(', ')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMilestoneId(m.id || `m-${idx + 1}`);
                              setIsMentorOpen(true);
                              handleAskMentor(`How should I start Milestone ${m.step || idx + 1}: ${m.title}?`);
                            }}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors flex items-center gap-1"
                          >
                            <Sparkles className="w-3 h-3 text-indigo-500" />
                            Ask Mentor
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Project Review Section (If Submitted) */}
            {activeProject.aiReview && (
              <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      AI Project Review
                    </span>
                    <span className="text-xs text-slate-400">• Verified Evaluation</span>
                  </div>
                  <span className="text-xs text-slate-400">
                    Reviewed: {new Date(activeProject.aiReview.reviewedAt).toLocaleDateString()}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">Comprehensive Technical Review</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {activeProject.aiReview.overallSummary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 space-y-2">
                    <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Demonstrated Strengths
                    </span>
                    <ul className="space-y-1.5 text-emerald-950 list-disc list-inside">
                      {activeProject.aiReview.strengths.map((s, idx) => (
                        <li key={idx} className="leading-snug">{s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 space-y-2">
                    <span className="font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      Areas for Improvement
                    </span>
                    <ul className="space-y-1.5 text-amber-950 list-disc list-inside">
                      {activeProject.aiReview.areasForImprovement.map((a, idx) => (
                        <li key={idx} className="leading-snug">{a}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Technical Suggestions & Interview Talking Points */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo-600" />
                      Technical & Architecture Optimizations
                    </span>
                    <ul className="space-y-1 text-slate-600 list-disc list-inside">
                      {activeProject.aiReview.technicalSuggestions.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 space-y-2">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Presentation className="w-4 h-4 text-indigo-600" />
                      Interview Talking Points (STAR)
                    </span>
                    <ul className="space-y-1 text-indigo-900 list-disc list-inside">
                      {activeProject.aiReview.interviewTalkingPoints.map((p, idx) => (
                        <li key={idx}>{p}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Project Mentor & Interactive Guidance */}
          <div className="space-y-6">
            {/* AI Project Mentor Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">AI Project Mentor</h3>
                    <p className="text-[10px] text-slate-500">4-Tier Pedagogical Coaching</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Online
                </span>
              </div>

              {/* Quick Action Buttons */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Quick Guidance
                </span>
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => handleAskMentor('How should I start this project and frame the core questions?')}
                    className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>How should I start?</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleAskMentor('Explain this active milestone and what edge cases I should watch out for.')}
                    className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>Explain this milestone</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleAskMentor("I'm stuck on query joins and cohort retention logic, give me a pedagogical hint.")}
                    className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>I'm stuck, give me a hint</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                  <button
                    onClick={() => handleAskMentor('How do I pitch this project in a data analyst technical interview?')}
                    className="text-left text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 text-slate-700 transition-colors flex items-center justify-between"
                  >
                    <span>How to present in interview?</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Chat Thread */}
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {mentorMessages.length === 0 ? (
                  <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100 text-xs text-slate-500 text-center">
                    Ask me anything about milestones, SQL queries, Power BI DAX formulas, or interview presentation.
                  </div>
                ) : (
                  mentorMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3.5 rounded-xl text-xs space-y-1 ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white ml-4'
                          : 'bg-slate-50 text-slate-800 border border-slate-200/80 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] opacity-75 font-semibold mb-1">
                        <span>{msg.role === 'user' ? 'You' : 'Project Mentor'}</span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed font-sans prose-xs">
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isAskingMentor && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-500 flex items-center gap-2">
                    <RotateCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Analyzing project context and drafting pedagogical hint...</span>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <textarea
                  value={mentorQuestion}
                  onChange={(e) => setMentorQuestion(e.target.value)}
                  placeholder="Ask project mentor (e.g. How do I construct the retention cohort CTE?)..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                />

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      const snippet = prompt('Paste your SQL or code snippet to review:');
                      if (snippet) setMentorCodeSnippet(snippet);
                    }}
                    className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1"
                  >
                    <Code2 className="w-3 h-3" />
                    {mentorCodeSnippet ? 'Snippet Attached' : 'Attach Code Snippet'}
                  </button>

                  <button
                    onClick={() => handleAskMentor()}
                    disabled={!mentorQuestion.trim() || isAskingMentor}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    <Send className="w-3 h-3" />
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Resume & Portfolio Packaging Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900">Portfolio Value for {roleName}</h3>
              </div>
              <p className="text-slate-600 leading-relaxed">
                {activeProject.portfolioValue ||
                  'Demonstrates full-stack analytics acumen from dirty data wrangling to executive DAX dashboards and business metric interpretation.'}
              </p>

              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <span className="font-bold text-slate-800 block text-[11px]">Key Skills Demonstrated</span>
                <div className="flex flex-wrap gap-1">
                  {(activeProject.portfolioSkillsDemonstrated || activeProject.skills || []).map((s: string) => (
                    <span
                      key={s}
                      className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Custom Project Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Generate Portfolio Project</h3>
              </div>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              The AI Project Generator tailors realistic business briefs targeting your specific career gaps.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Industry Domain / Business Model</label>
                <input
                  type="text"
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  placeholder="e.g. E-Commerce, Fintech, Healthcare, SaaS, Supply Chain"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Priority Skills to Bridge</label>
                <input
                  type="text"
                  value={targetFocusGap}
                  onChange={(e) => setTargetFocusGap(e.target.value)}
                  placeholder="e.g. SQL Window Functions, Power BI DAX, Cohort Analytics"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Difficulty Level</label>
                <select
                  value={difficultyInput}
                  onChange={(e) => setDifficultyInput(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 bg-white"
                >
                  <option value="beginner">Beginner (8-10 hours, foundational wrangling)</option>
                  <option value="intermediate">Intermediate (12-15 hours, end-to-end dashboard)</option>
                  <option value="advanced">Advanced (18-22 hours, automated pipeline & alerts)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateCustomProjects}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isGenerating ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {isGenerating ? 'Generating Specifications...' : 'Generate 3 Projects'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit for AI Review Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Submit Project for AI Review</h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              The AI Review Agent evaluates your deliverables against industry recruiter rubrics, providing technical feedback, missing features, and interview talking points.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">GitHub Repository URL</label>
                <input
                  type="url"
                  value={submissionGithub}
                  onChange={(e) => setSubmissionGithub(e.target.value)}
                  placeholder="https://github.com/your-username/project-repo"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Live Dashboard / Notebook Demo URL (Optional)</label>
                <input
                  type="url"
                  value={submissionDemo}
                  onChange={(e) => setSubmissionDemo(e.target.value)}
                  placeholder="https://app.powerbi.com/view?r=... or nbviewer link"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Project Summary & Solution Description</label>
                <textarea
                  rows={3}
                  value={submissionDesc}
                  onChange={(e) => setSubmissionDesc(e.target.value)}
                  placeholder="Summarize your architecture, queries, and business findings..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Key Challenges Faced & Trade-offs</label>
                <textarea
                  rows={2}
                  value={submissionChallenges}
                  onChange={(e) => setSubmissionChallenges(e.target.value)}
                  placeholder="What was the hardest part? (e.g. data cleaning, query performance)..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Key Learning Outcomes</label>
                <input
                  type="text"
                  value={submissionOutcomes}
                  onChange={(e) => setSubmissionOutcomes(e.target.value)}
                  placeholder="e.g. SQL Window Functions, DAX Measures, Star Schema"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={isSubmittingReview}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center gap-1.5"
              >
                {isSubmittingReview ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                {isSubmittingReview ? 'Generating AI Review...' : 'Submit & Review'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
