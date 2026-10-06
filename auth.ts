export interface UserAccount {
  id: string;
  fullName: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  targetRole: string;
  education?: string;
  experience?: string;
  onboardingCompleted: boolean;
  weeklyHours: number;
  learningPreferences?: {
    learningFormat: string;
    difficulty: string;
    sessionStyle: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: UserAccount | null;
  isAuthenticated: boolean;
  token?: string;
  rememberMe?: boolean;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  targetRole?: string;
  weeklyHours?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}
