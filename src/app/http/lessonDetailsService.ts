// app/http/lessonDetailsService.ts
import $api from "./api";

export interface SlideBlock {
  id: string;
  order: number;
  type: string;
  [key: string]: unknown;
}

export interface Slide {
  id: string;
  title: string;
  type: "lesson" | "test";
  orderIndex: number;
  blocks: SlideBlock[];
}

export interface LessonDetailsResponse {
  id: string;
  lessonId: string;
  slides: Slide[];
  tests: Slide[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlideDto {
  title: string;
  type: "lesson" | "test";
  orderIndex: number;
  blocks?: object[];
}

export interface CreateTestDto {
  title: string;
  orderIndex: number;
  blocks?: object[];
}

export interface CreateLessonDetailsRequest {
  lessonId: string;
  slides?: CreateSlideDto[];
  tests?: CreateTestDto[];
}

export interface UpdateSlideDto extends CreateSlideDto {
  id?: string;
}

export interface UpdateTestDto extends CreateTestDto {
  id?: string;
}

export interface UpdateLessonDetailsRequest {
  slides?: UpdateSlideDto[];
  tests?: UpdateTestDto[];
}

export class LessonDetailsService {
  private static readonly BASE_URL = "/lesson-details";

  static async createLessonDetails(
    data: CreateLessonDetailsRequest
  ): Promise<LessonDetailsResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(this.BASE_URL, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Create lesson details error:", error);
      throw error;
    }
  }

  static async getLessonDetailsById(id: string): Promise<LessonDetailsResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`${this.BASE_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get lesson details error:", error);
      throw error;
    }
  }

  static async getLessonDetailsByLessonId(lessonId: string): Promise<LessonDetailsResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`${this.BASE_URL}/lesson/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get lesson details by lesson id error:", error);
      throw error;
    }
  }

  static async updateLessonDetails(
    id: string,
    data: UpdateLessonDetailsRequest
  ): Promise<LessonDetailsResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`${this.BASE_URL}/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update lesson details error:", error);
      throw error;
    }
  }

  static async deleteLessonDetails(id: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.delete(`${this.BASE_URL}/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Delete lesson details error:", error);
      throw error;
    }
  }

  static async deleteLessonDetailsByLessonId(lessonId: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.delete(`${this.BASE_URL}/lesson/${lessonId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Delete lesson details by lesson id error:", error);
      throw error;
    }
  }
}
