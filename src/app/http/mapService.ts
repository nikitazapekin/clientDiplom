import type { MapElementResponse, UpdateMapElementRequest } from "./types/map";
import $api from "./api";

export class MapService {
  static async createCourseMap(data: any): Promise<any> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`/course-maps`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Create course map error:", error);
      throw error;
    }
  }

  static async getCourseMapByCourseId(courseId: string): Promise<any> {
    try {
      const response = await $api.get(`/course-maps/course/${courseId}`);

      return response.data;
    } catch (error: any) {
      console.error("Get course map by course id error:", error);
      throw error;
    }
  }

  static async updateCourseMap(id: string, data: any): Promise<any> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/course-maps/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update course map error:", error);
      throw error;
    }
  }

  static async addMapElement(mapId: string, data: any): Promise<any> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`/course-maps/${mapId}/elements`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Add map element error:", error);
      throw error;
    }
  }

  static async getMapElements(mapId: string): Promise<any[]> {
    try {
      const response = await $api.get(`/course-maps/${mapId}/elements`);

      return response.data;
    } catch (error: any) {
      console.error("Get map elements error:", error);
      throw error;
    }
  }
  static async updateMapElement(
    elementId: string,
    data: UpdateMapElementRequest
  ): Promise<MapElementResponse> {
    try {
      const token = localStorage.getItem("accessToken");

      // Если это временный ID, пробуем найти реальный ID
      if (elementId.startsWith("temp_")) {
        console.warn("⚠️ Попытка обновить элемент с временным ID:", elementId);
        throw new Error("Элемент еще не сохранен на сервере");
      }

      const response = await $api.put(`/course-maps/elements/${elementId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update map element error:", error);

      // Более подробная информация об ошибке
      if (error.response?.status === 404) {
        console.error(`Элемент с ID ${elementId} не найден на сервере`);
        throw new Error(`Элемент с ID ${elementId} не найден. Возможно, он был удален.`);
      }

      throw new Error(error.response?.data?.message || "Failed to update map element");
    }
  }

  static async deleteMapElement(elementId: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");

      await $api.delete(`/course-maps/elements/${elementId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Delete map element error:", error);

      if (error.response?.status === 404) {
        return { success: true }; // Элемент уже удален
      }

      throw error;
    }
  }
}
