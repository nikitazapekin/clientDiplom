export enum AchievementType {
  STUDENT_RESULTS = 'student_results',
  SOLVED_TASKS = 'solved_tasks',
}

export enum AchievementTier {
  NOVICE = 'Новичок',
  ADVANCED = 'Продвинутый',
  EXPERT = 'Эксперт',
  MASTER = 'Мастер',
  BEGINNER = 'Новичок',
  INTERMEDIATE = 'Средний уровень',
  PROFESSIONAL = 'Профессионал',
  LEGENDARY = 'Легенда',
}

export interface Achievement {
  id: string;
  clientId: string;
  type: AchievementType;
  tier: AchievementTier;
  title: string;
  description: string;
  image: string;
  earnedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AchievementProgress {
  studentResults: {
    current: number;
    thresholds: { tier: AchievementTier; required: number }[];
  };
  solvedTasks: {
    current: number;
    thresholds: { tier: AchievementTier; required: number }[];
  };
}

export interface AchievementDefinition {
  title: string;
  description: string;
  image: string;
  type: AchievementType;
  threshold: number;
}

export interface AchievementDefinitions {
  novice: AchievementDefinition;
  advanced: AchievementDefinition;
  expert: AchievementDefinition;
  master: AchievementDefinition;
  beginner: AchievementDefinition;
  intermediate: AchievementDefinition;
  professional: AchievementDefinition;
  legendary: AchievementDefinition;
}
