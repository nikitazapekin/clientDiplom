import $api from "./api";

export interface CheckpointResponse {
  id: string;
  mapElementId: string;
  title: string;
  description: string;
  type: string;
  orderIndex: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckpointRequest {
  mapElementId: string;
  title: string;
  description: string;
  type: string;
  orderIndex?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished?: boolean;
}

export interface UpdateCheckpointRequest {
  title?: string;
  description?: string;
  type?: string;
  orderIndex?: number;
  passingScore?: number;
  maxAttempts?: number;
  timeLimit?: number;
  instructions?: string;
  isPublished?: boolean;
}

export class CheckpointService {
  static async createCheckpoint(data: CreateCheckpointRequest): Promise<CheckpointResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`/checkpoints`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Create checkpoint error:", error);
      throw error;
    }
  }

  static async getCheckpoint(id: string): Promise<CheckpointResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`/checkpoints/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get checkpoint error:", error);
      throw error;
    }
  }

  static async getCheckpointByMapElementId(mapElementId: string): Promise<CheckpointResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`/checkpoints/map-element/${mapElementId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get checkpoint by map element id error:", error);
      throw error;
    }
  }

  static async updateCheckpoint(
    id: string,
    data: UpdateCheckpointRequest
  ): Promise<CheckpointResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/checkpoints/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update checkpoint error:", error);
      throw error;
    }
  }

  static async deleteCheckpoint(id: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");

      await $api.delete(`/checkpoints/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Delete checkpoint error:", error);
      throw error;
    }
  }
}
