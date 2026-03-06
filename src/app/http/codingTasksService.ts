import $api from "./api";

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface CodeConstraint {
  type: string;
  value: any;
}

export interface CodeTask {
  id: string;
  title: string;
  description: string;
  language: string;
  startCode: string;
  testCases: TestCase[];
  constraints: CodeConstraint[];
  difficulty: "easy" | "medium" | "hard";
  experienceReward: number;
  authorName: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCodeTaskPayload {
  title: string;
  description: string;
  language: string;
  startCode: string;
  testCases: TestCase[];
  constraints: CodeConstraint[];
  difficulty: "easy" | "medium" | "hard";
  experienceReward: number;
}

export interface SubmitSolutionResult {
  allPassed: boolean;
  results: Array<{
    index: number;
    passed: boolean;
    input: string;
    expected: string;
    actual: string;
  }>;
  experienceGained: number;
  newLevel: number;
  newExperience: number;
}

export interface StudentLevel {
  id: string;
  clientId: string;
  level: number;
  experience: number;
  solvedTasks: Array<{ id: string; codeTaskId: string; solvedAt: string }>;
}

export class CodingTasksService {
  static async createTask(data: CreateCodeTaskPayload): Promise<CodeTask> {
    const response = await $api.post("/coding-tasks/create", data);
    return response.data;
  }

  static async updateTask(id: string, data: Partial<CreateCodeTaskPayload>): Promise<CodeTask> {
    const response = await $api.put(`/coding-tasks/${id}`, data);
    return response.data;
  }

  static async deleteTask(id: string): Promise<{ success: boolean }> {
    const response = await $api.delete(`/coding-tasks/${id}`);
    return response.data;
  }

  static async getAllTasks(): Promise<CodeTask[]> {
    const response = await $api.get("/coding-tasks");
    return response.data;
  }

  static async getTask(id: string): Promise<CodeTask> {
    const response = await $api.get(`/coding-tasks/${id}`);
    return response.data;
  }

  static async getTasksByDifficulty(difficulty: string): Promise<CodeTask[]> {
    const response = await $api.get(`/coding-tasks/difficulty/${difficulty}`);
    return response.data;
  }

  static async submitSolution(taskId: string, code: string, language: string): Promise<SubmitSolutionResult> {
    const response = await $api.post("/coding-tasks/submit", { taskId, code, language });
    return response.data;
  }

  static async getStudentLevel(): Promise<StudentLevel> {
    const response = await $api.get("/coding-tasks/student-level");
    return response.data;
  }
}
