import type { LeaderboardResponse } from "./types/leaders";
import $api from "./api";

export class LeadersService {
  static async getLeaderboard(page: number = 1): Promise<LeaderboardResponse> {
    const token = localStorage.getItem("accessToken");
    const response = await $api.get("/leaders", {
      headers: { Authorization: `Bearer ${token}` },
      params: { page },
    });

    return response.data;
  }
}
