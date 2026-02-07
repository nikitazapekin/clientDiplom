import type {
  CourseListResponse,
  CourseResponse,
  CourseStatus,
  CreateCourseRequest,
  UpdateCourseRequest,
} from "./types/course";
import $api from "./api";

export class CourseService {
  /*   static async createCourse(data: CreateCourseRequest): Promise<CourseResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      console.log("TOKEM", token )
           const response = await axios({
        method: 'POST',
        url: 'http://localhost:3002/courses/create', // ПОРТ 3000, а не 3002!
        data: data,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      
      console.log("Response:", response.data);
//  const response = await $api.post("/courses/create", data, {
  //      headers: {
    //      Authorization: `Bearer ${token}`,
     //   },
     // }); 
      return response.data;
    } catch (error: any) {
      console.error("Create course error:", error);
      throw new Error(error.response?.data?.message || "Failed to create course");
    }
  }
 */

  static async createCourse(data: CreateCourseRequest): Promise<CourseResponse> {
    console.log("DATAaaaaaaaaaaaaaaaaaaaaaaa", data);
    try {
      console.log("🚀 Клиент пытается отправить на порт 3002");

      // ВАЖНО: порт 3002!
      const response = await fetch("http://localhost:3002/courses/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      console.log("📤 Статус ответа:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();

        console.error("❌ Текст ошибки:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      console.log("✅ Успех! Ответ:", result);

      return result;
    } catch (error: any) {
      console.error("💥 Ошибка в CourseService:", error);
      throw error;
    }
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
    } catch (error: any) {
      console.error("Get courses error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch courses");
    }
  }

  static async getCourseById(id: string): Promise<CourseResponse> {
    try {
      const response = await $api.get(`/courses/${id}`);

      return response.data;
    } catch (error: any) {
      console.error("Get course error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch course");
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
    } catch (error: any) {
      console.error("Update course error:", error);
      throw new Error(error.response?.data?.message || "Failed to update course");
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
    } catch (error: any) {
      console.error("Delete course error:", error);
      throw new Error(error.response?.data?.message || "Failed to delete course");
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
    } catch (error: any) {
      console.error("Publish course error:", error);
      throw new Error(error.response?.data?.message || "Failed to publish course");
    }
  }

  static async getPublishedCourses(): Promise<CourseResponse[]> {
    try {
      const response = await $api.get("/courses/published");

      return response.data;
    } catch (error: any) {
      console.error("Get published courses error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch published courses");
    }
  }

  static async getCoursesByTag(tag: string): Promise<CourseResponse[]> {
    try {
      const response = await $api.get(`/courses/tag/${tag}`);

      return response.data;
    } catch (error: any) {
      console.error("Get courses by tag error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch courses by tag");
    }
  }

  static async getMyCourses(): Promise<CourseResponse[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get("/courses/my-courses", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Get my courses error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch your courses");
    }
  }
}
