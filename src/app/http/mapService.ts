import type {
  CourseMapResponse,
  CreateCourseMapRequest,
  CreateMapElementRequest,
  MapElementResponse,
  UpdateCourseMapRequest,
  UpdateMapElementRequest,
} from "./types/map";
import $api from "./api";

export class MapService {
  static async createCourseMap(data: CreateCourseMapRequest): Promise<CourseMapResponse> {
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
      throw new Error(error.response?.data?.message || "Failed to create course map");
    }
  }

  // Получение карты курса по ID
  static async getCourseMap(id: string): Promise<CourseMapResponse> {
    try {
      const response = await $api.get(`/course-maps/${id}`);

      return response.data;
    } catch (error: any) {
      console.error("Get course map error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch course map");
    }
  }

  // Получение карты курса по ID курса
  static async getCourseMapByCourseId(courseId: string): Promise<CourseMapResponse> {
    try {
      const response = await $api.get(`/course-maps/course/${courseId}`);

      return response.data;
    } catch (error: any) {
      console.error("Get course map by course id error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch course map");
    }
  }

  // Обновление карты курса
  static async updateCourseMap(
    id: string,
    data: UpdateCourseMapRequest
  ): Promise<CourseMapResponse> {
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
      throw new Error(error.response?.data?.message || "Failed to update course map");
    }
  }

  // Удаление карты курса
  static async deleteCourseMap(id: string): Promise<{ success: boolean }> {
    try {
      const token = localStorage.getItem("accessToken");

      await $api.delete(`/course-maps/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error("Delete course map error:", error);
      throw new Error(error.response?.data?.message || "Failed to delete course map");
    }
  }

  // Элементы карты

  // Добавление элемента на карту
  static async addMapElement(
    mapId: string,
    data: CreateMapElementRequest
  ): Promise<MapElementResponse> {
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
      throw new Error(error.response?.data?.message || "Failed to add map element");
    }
  }

  // Получение элемента по ID
  static async getMapElement(elementId: string): Promise<MapElementResponse> {
    try {
      const response = await $api.get(`/course-maps/elements/${elementId}`);

      return response.data;
    } catch (error: any) {
      console.error("Get map element error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch map element");
    }
  }

  // Получение всех элементов карты
  static async getMapElements(mapId: string, type?: string): Promise<MapElementResponse[]> {
    try {
      const params = new URLSearchParams();

      if (type) params.append("type", type);

      const queryString = params.toString();
      const url = queryString
        ? `/course-maps/${mapId}/elements?${queryString}`
        : `/course-maps/${mapId}/elements`;

      const response = await $api.get(url);

      return response.data;
    } catch (error: any) {
      console.error("Get map elements error:", error);
      throw new Error(error.response?.data?.message || "Failed to fetch map elements");
    }
  }

  // Обновление элемента
  static async updateMapElement(
    elementId: string,
    data: UpdateMapElementRequest
  ): Promise<MapElementResponse> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/course-maps/elements/${elementId}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Update map element error:", error);
      throw new Error(error.response?.data?.message || "Failed to update map element");
    }
  }

  // Удаление элемента
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
      throw new Error(error.response?.data?.message || "Failed to delete map element");
    }
  }

  static async batchSaveMapElements(
    mapId: string,
    elements: CreateMapElementRequest[]
  ): Promise<MapElementResponse[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`/course-maps/${mapId}/elements/batch`, elements, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Batch save map elements error:", error);
      throw new Error(error.response?.data?.message || "Failed to batch save map elements");
    }
  }

  static async batchUpdateMapElements(
    elements: Array<{ id: string; data: UpdateMapElementRequest }>
  ): Promise<MapElementResponse[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(`/course-maps/elements/batch`, elements, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error("Batch update map elements error:", error);
      throw new Error(error.response?.data?.message || "Failed to batch update map elements");
    }
  }
}
