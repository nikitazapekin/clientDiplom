import type {
  Achievement,
  AchievementProgress,
} from "./types/achievements";
import $api from "./api";

export class AchievementsService {
  static async getAchievementsByAuditoryId(auditoryId: string): Promise<Achievement[]> {
    const token = localStorage.getItem("accessToken");
    const response = await $api.get(`/achievements/auditory/${auditoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  }

  static async getAchievementProgress(auditoryId: string): Promise<AchievementProgress> {
    const token = localStorage.getItem("accessToken");
    const response = await $api.get(`/achievements/progress/${auditoryId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  }

  static async checkAndAwardAchievements(auditoryId: string): Promise<Achievement[]> {
    const token = localStorage.getItem("accessToken");
    const response = await $api.post(
      `/achievements/check-and-award`,
      { auditoryId },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    return response.data;
  }
}
