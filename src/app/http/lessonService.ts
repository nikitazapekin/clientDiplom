import $api from "./api";

export interface LessonResponse {
  id: string;
  mapElementId: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  orderIndex: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonRequest {
  mapElementId: string;
  title: string;
  description: string;
  content?: string;
  duration?: number;
  orderIndex: number;
  isPublished?: boolean;
}

export interface UpdateLessonRequest {
  title?: string;
  description?: string;
  content?: string;
  duration?: number;
  orderIndex?: number;
  isPublished?: boolean;
}

export class LessonService {
  static async createLesson(data: CreateLessonRequest): Promise<LessonResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`/lessons`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Create lesson error:", error);
      throw error;
    }
  }

  static async getLesson(id: string): Promise<LessonResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`/lessons/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get lesson error:", error);
      throw error;
    }
  }

  static async getLessonByMapElementId(mapElementId: string): Promise<LessonResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`/lessons/map-element/${mapElementId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get lesson by map element id error:", error);
      throw error;
    }
  }

  static async updateLesson(id: string, data: UpdateLessonRequest): Promise<LessonResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/lessons/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update lesson error:", error);
      throw error;
    }
  }

  static async deleteLesson(id: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");

      await $api.delete(`/lessons/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Delete lesson error:", error);
      throw error;
    }
  }
}
