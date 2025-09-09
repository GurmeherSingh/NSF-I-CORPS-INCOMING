export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'trainer' | 'athlete';
  sport?: string;
  position?: string;
  createdAt: string;
}

export interface Exercise {
  id: number;
  name: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  bodyPart: string;
  category: string;
  duration?: number;
  sets?: number;
  reps?: number;
  createdBy: number;
  trainerFirstName?: string;
  trainerLastName?: string;
  createdAt: string;
}

export interface Assignment {
  assignmentId: number;
  frequency: 'daily' | 'weekly' | 'twice_weekly' | 'three_times_weekly';
  startDate: string;
  endDate?: string;
  notes?: string;
  status: 'active' | 'completed' | 'paused';
  exerciseId: number;
  exerciseName: string;
  description?: string;
  instructions?: string;
  videoUrl?: string;
  bodyPart: string;
  category: string;
  duration?: number;
  sets?: number;
  reps?: number;
  trainerFirstName?: string;
  trainerLastName?: string;
  athleteFirstName?: string;
  athleteLastName?: string;
  athleteEmail?: string;
  athleteSport?: string;
  progress?: Progress[];
  createdAt: string;
}

export interface Progress {
  id: number;
  assignmentId: number;
  completedDate: string;
  notes?: string;
  painLevel?: number;
  difficulty?: number;
  createdAt: string;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'trainer' | 'athlete';
  sport?: string;
  position?: string;
}

export interface ComplianceStats {
  period: string;
  overallCompliance: number;
  exerciseCompliance: Array<{
    assignmentId: number;
    frequency: string;
    exerciseName: string;
    completedCount: number;
    expectedCount: number;
    complianceRate: number;
  }>;
}
