import React, { useState, useEffect } from 'react';
import {
  LearnerProfile,
  TodayPlanItem,
  CareerProfileAnalysisResult,
  SkillGapAnalysis,
  LearningPath,
  LearningActivity,
} from './types';
import { DEMO_ALEX_PROFILE, SAMPLE_TODAY_PLAN } from './data/demoData';
import { AgentService } from './services/agentService';
import { SkillGapAnalyzer } from './services/skillGapAnalyzer';
import { LearningPathService } from './services/learningPathService';
import { AuthService } from './services/authService';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layout & Modals
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OnboardingModal } from './components/OnboardingModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';

// Views
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { ProfileView } from './views/ProfileView';
import { SkillGapView } from './views/SkillGapView';
import { LearningPathView } from './views/LearningPathView';
import { CoursesVideosView } from './views/CoursesVideosView';
import { PracticeView } from './views/PracticeView';
import { ProjectsView } from './views/ProjectsView';
import { CommunicationCoachView } from './views/CommunicationCoachView';
import { MockInterviewView } from './views/MockInterviewView';
import { ProgressView } from './views/ProgressView';
import { MentorView } from './views/MentorView';
import { Compass, RefreshCw } from 'lucide-react';

function AppContent() {
  const { user, isAuthenticated, isLoading, userId } = useAuth();

  // Navigation View
  const [currentView, setCurrentView] = useState<string>('dashboard');

  // Initial skill focus for practice drills
  const [practiceInitialSkill, setPracticeInitialSkill] = useState<string>('SQL');

  // Resource Recommendation Focus State
  const [resourceInitialFocus, setResourceInitialFocus] = useState<{
    skill?: string;
    objective?: string;
    activityTitle?: string;
  } | null>(null);

  // Backend & Gemini Connectivity
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);

  // Modals
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // User-scoped isolated state
  const [learnerProfile, setLearnerProfile] = useState<LearnerProfile>(DEMO_ALEX_PROFILE);
  const [todayPlan, setTodayPlan] = useState<TodayPlanItem[]>(SAMPLE_TODAY_PLAN);
  const [careerAnalysisResult, setCareerAnalysisResult] = useState<CareerProfileAnalysisResult | null>(null);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);
  const [learningStreak, setLearningStreak] = useState<number>(5);

  // Check backend health
  useEffect(() => {
    AgentService.checkBackendHealth().then((health) => {
      setHasGeminiKey(health.hasGeminiKey);
    });
  }, []);

  // Sync state whenever the active user changes (data isolation)
  useEffect(() => {
    if (!userId || !user) return;

    // Load or generate user-isolated profile
    const savedProfile = AuthService.getUserData<LearnerProfile | null>(userId, 'learner_profile', null);
    if (savedProfile) {
      setLearnerProfile(savedProfile);
    } else if (userId === 'user_alex_chen') {
      setLearnerProfile(DEMO_ALEX_PROFILE);
      AuthService.setUserData(userId, 'learner_profile', DEMO_ALEX_PROFILE);
    } else {
      // Default generated profile customized for this specific user
      const initialCustomProfile: LearnerProfile = {
        id: userId,
        name: user.fullName || user.name || 'New Learner',
        currentRole: 'Early Career Professional',
        currentEducation: "Bachelor's Degree",
        yearsExperience: '1-2 years',
        targetRole: user.targetRole || 'Data Analyst',
        careerGoal: `Transition to ${user.targetRole || 'Data Analyst'} with verified skills`,
        learningPreference: 'Hands-on Projects',
        weeklyHours: user.weeklyHours || 8,
        remainingGapsCount: 4,
        overallProgress: 15,
        skillsAcquiredCount: 1,
        skillsInProgressCount: 3,
        totalLearningHours: 12,
        streakDays: 1,
        certifications: [],
        projects: [],
        technicalSkills: [
          { id: 'sk-1', name: 'SQL', level: 'Beginner', targetLevel: 'Advanced', progress: 25, status: 'In Progress', category: 'Database' },
          { id: 'sk-2', name: 'Power BI', level: 'Beginner', targetLevel: 'Advanced', progress: 20, status: 'In Progress', category: 'Visualization' },
          { id: 'sk-3', name: 'Python', level: 'Beginner', targetLevel: 'Intermediate', progress: 15, status: 'In Progress', category: 'Programming' },
          { id: 'sk-4', name: 'Statistics & Math', level: 'Beginner', targetLevel: 'Intermediate', progress: 10, status: 'Skill Gap', category: 'Theory' },
        ],
        softSkills: [
          { id: 'soft-1', name: 'Stakeholder Communication', level: 'Beginner', progress: 40, category: 'Soft Skills' },
          { id: 'soft-2', name: 'Data Storytelling', level: 'Beginner', progress: 20, category: 'Soft Skills' },
        ],
      };
      setLearnerProfile(initialCustomProfile);
      AuthService.setUserData(userId, 'learner_profile', initialCustomProfile);
    }

    // Load user's today plan
    const savedPlan = AuthService.getUserData<TodayPlanItem[]>(userId, 'today_plan', SAMPLE_TODAY_PLAN);
    setTodayPlan(savedPlan);

    // Load user's career analysis
    const savedAnalysis = AuthService.getUserData<CareerProfileAnalysisResult | null>(userId, 'career_analysis', null);
    setCareerAnalysisResult(savedAnalysis);

    // Load user's skill gap analysis
    const defaultGap = SkillGapAnalyzer.getDemoSkillGapAnalysis(savedProfile || DEMO_ALEX_PROFILE);
    const savedGap = AuthService.getUserData<SkillGapAnalysis>(userId, 'skill_gap_analysis', defaultGap);
    setSkillGapAnalysis(savedGap);

    // Load user's learning path
    const defaultPath = LearningPathService.getDemoLearningPath(savedProfile || DEMO_ALEX_PROFILE);
    const savedPath = AuthService.getUserData<LearningPath>(userId, 'learning_path', defaultPath);
    setLearningPath(savedPath);

    // Load user's completed activity IDs
    const defaultCompletedIds = userId === 'user_alex_chen' ? ['w1-a1', 'w1-a2', 'w2-a1', 'w2-a2', 'w3-a1', 'w3-a2'] : [];
    const savedCompleted = AuthService.getUserData<string[]>(userId, 'completed_activity_ids', defaultCompletedIds);
    setCompletedActivityIds(savedCompleted);

    // Load user's streak
    const savedStreak = AuthService.getUserData<number>(userId, 'learning_streak', userId === 'user_alex_chen' ? 5 : 1);
    setLearningStreak(savedStreak);
  }, [userId, user]);

  // Persist handlers that save to active user's storage
  const handleUpdateProfile = (updated: LearnerProfile) => {
    setLearnerProfile(updated);
    if (userId) {
      AuthService.setUserData(userId, 'learner_profile', updated);
    }
  };

  const handleUpdateCareerAnalysis = (analysis: CareerProfileAnalysisResult) => {
    setCareerAnalysisResult(analysis);
    if (userId) {
      AuthService.setUserData(userId, 'career_analysis', analysis);
    }
  };

  const handleUpdateSkillGapAnalysis = (analysis: SkillGapAnalysis) => {
    setSkillGapAnalysis(analysis);
    if (userId) {
      AuthService.setUserData(userId, 'skill_gap_analysis', analysis);
    }
  };

  const handleUpdateLearningPath = (path: LearningPath) => {
    setLearningPath(path);
    if (userId) {
      AuthService.setUserData(userId, 'learning_path', path);
    }
  };

  const handleTogglePlanItem = (id: string) => {
    setTodayPlan((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
      if (userId) {
        AuthService.setUserData(userId, 'today_plan', updated);
      }
      return updated;
    });
  };

  const handleToggleActivity = (activity: LearningActivity) => {
    const isNowCompleted = !completedActivityIds.includes(activity.id);
    const updatedIds = isNowCompleted
      ? [...completedActivityIds, activity.id]
      : completedActivityIds.filter((id) => id !== activity.id);

    setCompletedActivityIds(updatedIds);
    if (userId) {
      AuthService.setUserData(userId, 'completed_activity_ids', updatedIds);
    }

    if (activity.skill) {
      setLearnerProfile((prev) => {
        const targetSkillName = activity.skill?.toLowerCase();
        const updatedSkills = prev.technicalSkills.map((sk) => {
          if (
            sk.name.toLowerCase().includes(targetSkillName || '') ||
            (targetSkillName && targetSkillName.includes(sk.name.toLowerCase()))
          ) {
            const newProgress = isNowCompleted
              ? Math.min(100, (sk.progress || 50) + 5)
              : Math.max(0, (sk.progress || 50) - 5);
            return { ...sk, progress: newProgress };
          }
          return sk;
        });

        const updatedProfile = { ...prev, technicalSkills: updatedSkills };
        if (userId) {
          AuthService.setUserData(userId, 'learner_profile', updatedProfile);
        }
        return updatedProfile;
      });
    }
  };

  const handleResetDemo = () => {
    if (!userId) return;
    setLearnerProfile(DEMO_ALEX_PROFILE);
    setTodayPlan(SAMPLE_TODAY_PLAN);
    setCareerAnalysisResult(null);
    setSkillGapAnalysis(SkillGapAnalyzer.getDemoSkillGapAnalysis(DEMO_ALEX_PROFILE));
    setLearningPath(LearningPathService.getDemoLearningPath(DEMO_ALEX_PROFILE));
    setCompletedActivityIds(['w1-a1', 'w1-a2', 'w2-a1', 'w2-a2', 'w3-a1', 'w3-a2']);
    setLearningStreak(5);

    AuthService.removeUserData(userId, 'learner_profile');
    AuthService.removeUserData(userId, 'today_plan');
    AuthService.removeUserData(userId, 'career_analysis');
    AuthService.removeUserData(userId, 'skill_gap_analysis');
    AuthService.removeUserData(userId, 'learning_path');
    AuthService.removeUserData(userId, 'completed_activity_ids');
    AuthService.removeUserData(userId, 'learning_streak');
  };

  const handleCompleteOnboarding = (newProfile: LearnerProfile) => {
    handleUpdateProfile(newProfile);
    setShowOnboarding(false);
    setCurrentView('learning_path');
  };

  const handleFindResourcesForActivity = (activity: LearningActivity) => {
    setResourceInitialFocus({
      skill: activity.skill,
      objective: activity.learningObjective,
      activityTitle: activity.title,
    });
    setCurrentView('courses');
  };

  const handleStartPracticeForSkill = (skill: string) => {
    setPracticeInitialSkill(skill);
    setCurrentView('practice');
  };

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <span className="font-extrabold text-xl text-white tracking-tight">
            EduPath <span className="text-indigo-400">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
          <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
          <span>Securing session & isolated career roadmap...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated State: Show AuthView
  if (!isAuthenticated) {
    return <AuthView />;
  }

  // 3. Authenticated Platform Shell
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={(view) => setCurrentView(view)}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHelp={() => setShowHelp(true)}
        skillsGapsCount={skillGapAnalysis?.counts?.gap ?? learnerProfile.remainingGapsCount}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <Header
          currentView={currentView}
          learnerProfile={learnerProfile}
          onResetDemo={handleResetDemo}
          onStartOnboarding={() => setShowOnboarding(true)}
          onOpenSettings={() => setShowSettings(true)}
          onOpenHelp={() => setShowHelp(true)}
          onToggleMobileMenu={() => setIsOpenMobile(true)}
          onSearchSelect={(view) => setCurrentView(view)}
          hasGeminiKey={hasGeminiKey}
        />

        {/* View Container */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {currentView === 'dashboard' && (
            <DashboardView
              learnerProfile={learnerProfile}
              todayPlan={todayPlan}
              onTogglePlanItem={handleTogglePlanItem}
              onNavigate={(view) => setCurrentView(view)}
              careerAnalysisResult={careerAnalysisResult}
              skillGapAnalysis={skillGapAnalysis}
              learningPath={learningPath}
              completedActivityIds={completedActivityIds}
              learningStreak={learningStreak}
            />
          )}

          {currentView === 'profile' && (
            <ProfileView
              learnerProfile={learnerProfile}
              onUpdateProfile={handleUpdateProfile}
              onNavigate={(view) => setCurrentView(view)}
              careerAnalysisResult={careerAnalysisResult}
              onUpdateCareerAnalysis={handleUpdateCareerAnalysis}
            />
          )}

          {currentView === 'skill_gap' && (
            <SkillGapView
              learnerProfile={learnerProfile}
              onNavigate={(view) => setCurrentView(view)}
              careerAnalysisResult={careerAnalysisResult}
              skillGapAnalysis={skillGapAnalysis}
              onUpdateSkillGapAnalysis={handleUpdateSkillGapAnalysis}
            />
          )}

          {currentView === 'learning_path' && (
            <LearningPathView
              learnerProfile={learnerProfile}
              skillGapAnalysis={skillGapAnalysis}
              learningPath={learningPath}
              onUpdateLearningPath={handleUpdateLearningPath}
              completedActivityIds={completedActivityIds}
              onToggleActivity={handleToggleActivity}
              onNavigate={(view) => setCurrentView(view)}
              learningStreak={learningStreak}
              onFindResourcesForActivity={handleFindResourcesForActivity}
            />
          )}

          {currentView === 'courses' && (
            <CoursesVideosView
              onNavigate={(view) => setCurrentView(view)}
              learnerProfile={learnerProfile}
              skillGapAnalysis={skillGapAnalysis}
              learningPath={learningPath}
              initialFocus={resourceInitialFocus}
              onClearInitialFocus={() => setResourceInitialFocus(null)}
            />
          )}

          {currentView === 'practice' && (
            <PracticeView
              learnerProfile={learnerProfile}
              initialSkill={practiceInitialSkill}
              onNavigateToResources={(skill) => {
                setResourceInitialFocus({ skill });
                setCurrentView('courses');
              }}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              onNavigate={(view) => setCurrentView(view)}
              learnerProfile={learnerProfile}
              skillGapAnalysis={skillGapAnalysis}
              learningPath={learningPath}
            />
          )}

          {currentView === 'communication' && (
            <CommunicationCoachView
              learnerProfile={learnerProfile}
              onNavigate={(view) => setCurrentView(view)}
            />
          )}

          {currentView === 'mock_interview' && (
            <MockInterviewView
              onNavigate={(view) => setCurrentView(view)}
              learnerProfile={learnerProfile}
              skillGapAnalysis={skillGapAnalysis}
              learningPath={learningPath}
            />
          )}

          {currentView === 'progress' && (
            <ProgressView
              learnerProfile={learnerProfile}
              onNavigate={(view) => setCurrentView(view)}
              learningPath={learningPath}
              skillGapAnalysis={skillGapAnalysis}
              onUpdateLearningPath={(newPath) => {
                setLearningPath(newPath);
                if (userId) {
                  AuthService.setUserData(userId, 'learning_path', newPath);
                }
              }}
              onUpdateSkillGapAnalysis={(newAnalysis) => {
                setSkillGapAnalysis(newAnalysis);
                if (userId) {
                  AuthService.setUserData(userId, 'skill_gap_analysis', newAnalysis);
                }
              }}
            />
          )}

          {currentView === 'mentor' && (
            <MentorView
              learnerProfile={learnerProfile}
              onNavigate={(view) => setCurrentView(view)}
              learningPath={learningPath}
              skillGapAnalysis={skillGapAnalysis}
            />
          )}
        </main>
      </div>

      {/* Onboarding Modal (Shown automatically for new users or manually triggered) */}
      <OnboardingModal
        isOpen={showOnboarding || (user !== null && user.onboardingCompleted === false)}
        onComplete={handleCompleteOnboarding}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        learnerProfile={learnerProfile}
        onUpdateProfile={handleUpdateProfile}
        onResetDemo={handleResetDemo}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Architecture & Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
