import { UserAccount, SignupData, LoginCredentials } from '../types/auth';
import { LearnerProfile } from '../types/learner';
import { DEMO_ALEX_PROFILE } from '../data/demoData';

const USERS_STORAGE_KEY = 'edupath_registered_users_v2';
const SESSION_STORAGE_KEY = 'edupath_active_session_v2';

// Seed demo user Alex
export const DEMO_USER_ALEX: UserAccount = {
  id: 'user_alex_demo',
  fullName: 'Alex Rivera',
  email: 'alex.rivera@example.com',
  targetRole: 'Data Analyst',
  education: "Bachelor's in Information Systems",
  experience: '2 years as Business Systems Coordinator',
  onboardingCompleted: true,
  weeklyHours: 7,
  learningPreferences: {
    learningFormat: 'Mixed',
    difficulty: 'Balanced',
    sessionStyle: 'Deep-focus sessions',
  },
  createdAt: '2024-01-15T08:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

interface StoredUserRecord extends UserAccount {
  passwordHash: string; // simulated hash for secure client store
}

class AuthServiceClass {
  private listeners: Array<(user: UserAccount | null) => void> = [];

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    try {
      const existing = localStorage.getItem(USERS_STORAGE_KEY);
      if (!existing) {
        const initialUsers: Record<string, StoredUserRecord> = {
          [DEMO_USER_ALEX.id]: {
            ...DEMO_USER_ALEX,
            passwordHash: this.hashPassword('password123'),
          },
        };
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(initialUsers));
        
        // Also seed Alex's initial profile in user-isolated storage
        this.setUserData(DEMO_USER_ALEX.id, 'profile', DEMO_ALEX_PROFILE);
      }
    } catch (err) {
      console.error('Error initializing AuthService:', err);
    }
  }

  private hashPassword(password: string): string {
    // Deterministic simple hash for mock/client store
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
      const char = password.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `hash_${Math.abs(hash)}_${password.length}`;
  }

  private getAllUsers(): Record<string, StoredUserRecord> {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      console.error(e);
      return {};
    }
  }

  private saveAllUsers(users: Record<string, StoredUserRecord>) {
    try {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error(e);
    }
  }

  public getCurrentUser(): UserAccount | null {
    try {
      const session = localStorage.getItem(SESSION_STORAGE_KEY);
      if (!session) return null;
      const parsed = JSON.parse(session);
      return parsed.user || null;
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  public onAuthStateChanged(callback: (user: UserAccount | null) => void): () => void {
    this.listeners.push(callback);
    callback(this.getCurrentUser());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(user: UserAccount | null) {
    this.listeners.forEach((listener) => {
      try {
        listener(user);
      } catch (err) {
        console.error('Auth listener error:', err);
      }
    });
  }

  public async signUp(data: SignupData): Promise<UserAccount> {
    const users = this.getAllUsers();
    const emailKey = data.email.trim().toLowerCase();

    // Check if user already exists
    const exists = Object.values(users).some(
      (u) => u.email.toLowerCase() === emailKey
    );
    if (exists) {
      throw new Error('An account with this email address already exists. Please log in.');
    }

    if (!data.fullName || data.fullName.trim().length < 2) {
      throw new Error('Please enter a valid full name.');
    }
    if (!data.password || data.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const newUser: StoredUserRecord = {
      id: userId,
      fullName: data.fullName.trim(),
      email: emailKey,
      targetRole: data.targetRole || 'Software Engineer',
      weeklyHours: data.weeklyHours || 7,
      onboardingCompleted: false, // will trigger onboarding for customized baseline
      createdAt: now,
      updatedAt: now,
      passwordHash: this.hashPassword(data.password),
    };

    users[userId] = newUser;
    this.saveAllUsers(users);

    // Initialize blank starter profile for this user
    const initialProfile: LearnerProfile = {
      id: userId,
      name: newUser.fullName,
      currentRole: 'Aspiring ' + newUser.targetRole,
      currentEducation: 'Self-directed Learner',
      yearsExperience: '0-1 years',
      targetRole: newUser.targetRole,
      careerGoal: `Transition to a full-time ${newUser.targetRole} role with verified skills and portfolio proof`,
      learningPreference: 'Balanced',
      weeklyHours: newUser.weeklyHours,
      technicalSkills: [
        {
          id: `sk-${Date.now()}-1`,
          name: 'Core Fundamentals',
          level: 'Beginner',
          category: 'Foundations',
          progress: 25,
          status: 'In Progress',
        },
      ],
      softSkills: [
        {
          id: `sk-${Date.now()}-2`,
          name: 'Problem Solving',
          level: 'Intermediate',
          category: 'Cognitive',
          progress: 50,
          status: 'In Progress',
        },
      ],
      certifications: [],
      projects: [],
      overallProgress: 15,
      skillsAcquiredCount: 1,
      skillsInProgressCount: 2,
      remainingGapsCount: 4,
      totalLearningHours: 0,
      streakDays: 1,
    };

    this.setUserData(userId, 'profile', initialProfile);
    this.setUserData(userId, 'streak', 1);
    this.setUserData(userId, 'completed_activities', []);
    this.setUserData(userId, 'practice_attempts', []);

    // Set active session
    const { passwordHash: _, ...publicUser } = newUser;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: publicUser }));
    this.notifyListeners(publicUser);

    return publicUser;
  }

  public async login(credentials: LoginCredentials): Promise<UserAccount> {
    const users = this.getAllUsers();
    const emailKey = credentials.email.trim().toLowerCase();

    const matchedUser = Object.values(users).find(
      (u) => u.email.toLowerCase() === emailKey
    );

    if (!matchedUser) {
      throw new Error('No account found with this email. Please check your spelling or sign up.');
    }

    const expectedHash = this.hashPassword(credentials.password);
    if (matchedUser.passwordHash !== expectedHash) {
      throw new Error('Incorrect password. Please try again or use the reset password option.');
    }

    const { passwordHash: _, ...publicUser } = matchedUser;
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ user: publicUser, rememberMe: Boolean(credentials.rememberMe) })
    );
    this.notifyListeners(publicUser);

    return publicUser;
  }

  public async loginAsDemo(): Promise<UserAccount> {
    this.ensureInitialized();
    const users = this.getAllUsers();
    let alex = users[DEMO_USER_ALEX.id];

    if (!alex) {
      alex = {
        ...DEMO_USER_ALEX,
        passwordHash: this.hashPassword('password123'),
      };
      users[DEMO_USER_ALEX.id] = alex;
      this.saveAllUsers(users);
      this.setUserData(DEMO_USER_ALEX.id, 'profile', DEMO_ALEX_PROFILE);
    }

    const { passwordHash: _, ...publicUser } = alex;
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: publicUser }));
    this.notifyListeners(publicUser);
    return publicUser;
  }

  public async logout(): Promise<void> {
    // Note: Logging out clears session but preserves the user's isolated data in localStorage!
    localStorage.removeItem(SESSION_STORAGE_KEY);
    this.notifyListeners(null);
  }

  public async resetPassword(email: string, newPassword: string): Promise<boolean> {
    const users = this.getAllUsers();
    const emailKey = email.trim().toLowerCase();

    const matchedUser = Object.values(users).find(
      (u) => u.email.toLowerCase() === emailKey
    );

    if (!matchedUser) {
      throw new Error('No user found with that email address.');
    }

    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters long.');
    }

    matchedUser.passwordHash = this.hashPassword(newPassword);
    matchedUser.updatedAt = new Date().toISOString();
    users[matchedUser.id] = matchedUser;
    this.saveAllUsers(users);

    return true;
  }

  public async updateAccount(userId: string, updates: Partial<UserAccount>): Promise<UserAccount> {
    const users = this.getAllUsers();
    const existing = users[userId];
    if (!existing) {
      throw new Error('User not found.');
    }

    const updated: StoredUserRecord = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    users[userId] = updated;
    this.saveAllUsers(users);

    const { passwordHash: _, ...publicUser } = updated;
    const currentSession = this.getCurrentUser();
    if (currentSession?.id === userId) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: publicUser }));
      this.notifyListeners(publicUser);
    }

    return publicUser;
  }

  // ----------------------------------------------------
  // User Data Isolation Helpers
  // ----------------------------------------------------
  private getUserKey(userId: string, dataKey: string): string {
    return `edupath_uid_${userId}_${dataKey}`;
  }

  public getUserData<T>(userId: string, dataKey: string, fallback: T): T {
    try {
      const key = this.getUserKey(userId, dataKey);
      const raw = localStorage.getItem(key);
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`Error reading ${dataKey} for user ${userId}:`, err);
      return fallback;
    }
  }

  public setUserData<T>(userId: string, dataKey: string, value: T): void {
    try {
      const key = this.getUserKey(userId, dataKey);
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error(`Error writing ${dataKey} for user ${userId}:`, err);
    }
  }

  public removeUserData(userId: string, dataKey: string): void {
    try {
      const key = this.getUserKey(userId, dataKey);
      localStorage.removeItem(key);
    } catch (err) {
      console.error(`Error removing ${dataKey} for user ${userId}:`, err);
    }
  }

  public listAllRegisteredUsers(): Array<{ id: string; fullName: string; email: string; targetRole: string }> {
    const users = this.getAllUsers();
    return Object.values(users).map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      targetRole: u.targetRole,
    }));
  }
}

export const AuthService = new AuthServiceClass();
