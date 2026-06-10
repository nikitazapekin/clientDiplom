import type {
  CourseListResponse,
  CourseResponse,
  CourseStatsResponse,
  CourseStatus,
  CreateCourseRequest,
  StudentCourseResponse,
  UpdateCourseRequest,
} from "./types/course";
import $api from "./api";
import { getErrorMessage } from "./errorUtils";

export class CourseService {
  static async createCourse(data: CreateCourseRequest): Promise<CourseResponse> {
    const token = localStorage.getItem("accessToken");
    const response = await $api.post(`/courses/create`, data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  static async getCourses(options?: {
    page?: number;
    limit?: number;
    status?: CourseStatus;
    search?: string;
  }): Promise<CourseListResponse> {
    try {
      const params = new URLSearchParams();

      if (options?.page) params.append("page", options.page.toString());

      if (options?.limit) params.append("limit", options.limit.toString());

      if (options?.status) params.append("status", options.status);

      if (options?.search) params.append("search", options.search);

      const queryString = params.toString();
      const url = queryString ? `/courses?${queryString}` : "/courses";

      const response = await $api.get(url);

      return response.data;
    } catch (error: unknown) {
      console.error("Get courses error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch courses"));
    }
  }

  static async getCourseById(id: string): Promise<CourseResponse> {
    try {
      const response = await $api.get(`/courses/${id}`);

      return response.data;
    } catch (error: unknown) {
      console.error("Get course error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch course"));
    }
  }

  static async getCourseStats(id: string): Promise<CourseStatsResponse> {
    try {
      const response = await $api.get(`/courses/${id}/stats`);

      return response.data.data ?? response.data;
    } catch (error: unknown) {
      console.error("Get course stats error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch course stats"));
    }
  }

  static async updateCourse(id: string, data: UpdateCourseRequest): Promise<CourseResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/courses/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error("Update course error:", error);
      throw new Error(getErrorMessage(error, "Failed to update course"));
    }
  }

  static async deleteCourse(id: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");

      await $api.delete(`/courses/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error: unknown) {
      console.error("Delete course error:", error);
      throw new Error(getErrorMessage(error, "Failed to delete course"));
    }
  }

  static async publishCourse(id: string): Promise<CourseResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(
        `/courses/${id}/publish`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Publish course error:", error);
      throw new Error(getErrorMessage(error, "Failed to publish course"));
    }
  }

  static async getPublishedCourses(): Promise<CourseResponse[]> {
    try {
      const response = await $api.get("/courses/published");

      return response.data;
    } catch (error: unknown) {
      console.error("Get published courses error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch published courses"));
    }
  }

  static async getCoursesByTag(tag: string): Promise<CourseResponse[]> {
    try {
      const response = await $api.get(`/courses/tag/${tag}`);

      return response.data;
    } catch (error: unknown) {
      console.error("Get courses by tag error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch courses by tag"));
    }
  }

  static async getMyCourses(): Promise<StudentCourseResponse[]> {
    try {
      const response = await $api.get("/course-subscriptions/my-courses");

      return response.data;
    } catch (error: unknown) {
      console.error("Get my courses error:", error);
      throw new Error(getErrorMessage(error, "Failed to fetch your courses"));
    }
  }
}
