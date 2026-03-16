import type {
  AvatarResponse,
  CreateAvatarRequest,
  CreateStudentResultRequest,
  FullClientInfo,
  StudentProgress,
  StudentResultResponse,
  UpdateAvatarRequest,
} from "./types/profile";
import $api, { $apiNoRedirect } from "./api";

export class ProfileService {
  /**
   * Получение полного профиля по auditoryId (без редиректа на login)
   */
  static async getFullProfileByAuditoryId(auditoryId: string): Promise<FullClientInfo> {
    try {
      const response = await $apiNoRedirect.get(
        `/profile/client/auditory/${auditoryId}/full`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get full profile error:", error);
      console.error("Error response status:", error.response?.status);
      console.error("Error response headers:", error.response?.headers);
      console.error("Error response data:", error.response?.data);
      
      const responseData = error.response?.data;
      if (typeof responseData === 'string' && responseData.includes('<!DOCTYPE')) {
        throw new Error("Server returned HTML instead of JSON - possible redirect or auth error");
      }
      
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  }

  /**
   * Получение полной информации о клиенте по clientId (без редиректа на login)
   */
  static async getFullProfileByClientId(clientId: string): Promise<FullClientInfo> {
    try {
      const response = await $apiNoRedirect.get(
        `/profile/client/${clientId}/full`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get full profile error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  }

  // ============= AVATAR METHODS =============

  /**
   * Создание аватара через base64
   */
  static async createAvatarBase64(auditoryId: string, base64Image: string, mimeType: string): Promise<AvatarResponse> {
    try {
      const data: CreateAvatarRequest = {
        auditoryId,
        imageData: base64Image,
        mimeType: mimeType,
      };

      console.log('Creating avatar with base64:', {
        auditoryId,
        mimeType,
        base64Length: base64Image.length
      });

      const response = await $api.post(
        `/profile/avatar`,
        data
      );

      console.log('Create avatar response:', response.data);

      return response.data;
    } catch (error: any) {
      console.error("Create avatar base64 error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create avatar");
    }
  }

  /**
   * Обновление аватара через base64
   */
  static async updateAvatarBase64(avatarId: string, base64Image: string, mimeType: string): Promise<AvatarResponse> {
    try {
      const data: UpdateAvatarRequest = {
        imageData: base64Image,
        mimeType: mimeType,
      };

      console.log('Updating avatar with base64:', {
        avatarId,
        mimeType,
        base64Length: base64Image.length
      });

      const response = await $api.put(
        `/profile/avatar/${avatarId}`,
        data
      );

      console.log('Update avatar response:', response.data);

      return response.data;
    } catch (error: any) {
      console.error("Update avatar base64 error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to update avatar");
    }
  }

  /**
   * Обновление аватара по ID пользователя через base64
   */
  static async updateAvatarByAuditoryIdBase64(auditoryId: string, base64Image: string, mimeType: string): Promise<AvatarResponse> {
    try {
      const data: UpdateAvatarRequest = {
        imageData: base64Image,
        mimeType: mimeType,
      };

      console.log('Updating avatar by auditoryId with base64:', {
        auditoryId,
        mimeType,
        base64Length: base64Image.length
      });

      const response = await $api.put(
        `/profile/avatar/user/${auditoryId}`,
        data
      );

      console.log('Update avatar by user response:', response.data);

      return response.data;
    } catch (error: any) {
      console.error("Update avatar by user base64 error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to update avatar");
    }
  }

  /**
   * Загрузка аватара (создание или обновление)
   */
  static async uploadAvatarBase64(auditoryId: string, base64Image: string, mimeType: string): Promise<AvatarResponse> {
    try {
      let existingAvatar: AvatarResponse | null = null;

      try {
        existingAvatar = await this.getAvatarByAuditoryId(auditoryId);
        console.log('Existing avatar found:', existingAvatar?.id);
      } catch (error: any) {
        if (error.message.includes('not found') || error.response?.status === 404) {
          console.log('No existing avatar, will create new one');
        } else {
          throw error;
        }
      }

      if (existingAvatar) {
        console.log('Updating existing avatar with ID:', existingAvatar.id);
        return await this.updateAvatarByAuditoryIdBase64(auditoryId, base64Image, mimeType);
      } else {
        console.log('Creating new avatar');
        return await this.createAvatarBase64(auditoryId, base64Image, mimeType);
      }
    } catch (error: any) {
      console.error("Upload avatar base64 error:", error);
      throw error;
    }
  }

  /**
   * Получение аватара по ID
   */
  static async getAvatarById(id: string): Promise<AvatarResponse> {
    try {
      const response = await $api.get(
        `/profile/avatar/${id}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get avatar error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch avatar");
    }
  }

  /**
   * Получение аватара по ID пользователя
   */
  static async getAvatarByAuditoryId(auditoryId: string): Promise<AvatarResponse> {
    try {
      const response = await $api.get(
        `/profile/avatar/user/${auditoryId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get avatar by user error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch avatar");
    }
  }

  /**
   * Удаление аватара по ID
   */
  static async deleteAvatar(id: string): Promise<{ success: boolean }> {
    try {
      await $api.delete(`/profile/avatar/${id}`);

      return { success: true };
    } catch (error: any) {
      console.error("Delete avatar error:", error.response?.data || error.message);

      if (error.response?.status === 404) {
        return { success: true };
      }

      throw new Error(error.response?.data?.message || "Failed to delete avatar");
    }
  }

  /**
   * Удаление аватара по ID пользователя
   */
  static async deleteAvatarByAuditoryId(auditoryId: string): Promise<{ success: boolean }> {
    try {
      await $api.delete(`/profile/avatar/user/${auditoryId}`);

      return { success: true };
    } catch (error: any) {
      console.error("Delete avatar by user error:", error.response?.data || error.message);

      if (error.response?.status === 404) {
        return { success: true };
      }

      throw new Error(error.response?.data?.message || "Failed to delete avatar");
    }
  }

  // ============= STUDENT RESULTS METHODS =============

  /**
   * Создание результата прохождения урока
   */
  static async createStudentResult(data: CreateStudentResultRequest): Promise<StudentResultResponse> {
    try {
      const response = await $api.post(
        `/profile/student-results`,
        data
      );

      return response.data;
    } catch (error: any) {
      console.error("Create student result error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create student result");
    }
  }

  /**
   * Получение результата по ID
   */
  static async getStudentResultById(id: string): Promise<StudentResultResponse> {
    try {
      const response = await $api.get(
        `/profile/student-results/${id}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get student result error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch student result");
    }
  }

  /**
   * Получение результатов студента по clientId
   */
  static async getStudentResultsByClientId(clientId: string): Promise<StudentResultResponse[]> {
    try {
      const response = await $api.get(
        `/profile/student-results/client/${clientId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get student results error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch student results");
    }
  }

  /**
   * Получение результатов урока по lessonId
   */
  static async getStudentResultsByLessonId(lessonId: string): Promise<StudentResultResponse[]> {
    try {
      const response = await $api.get(
        `/profile/student-results/lesson/${lessonId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get lesson results error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch lesson results");
    }
  }

  /**
   * Получение прогресса студента
   */
  static async getStudentProgress(clientId: string): Promise<StudentProgress> {
    try {
      const response = await $api.get(
        `/profile/student-results/client/${clientId}/progress`
      );

      return response.data;
    } catch (error: any) {
      console.error("Get student progress error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch student progress");
    }
  }

  /**
   * Обновление результата студента
   */
  static async updateStudentResult(id: string, countOfStars: number): Promise<StudentResultResponse> {
    try {
      const response = await $api.put(
        `/profile/student-results/${id}`,
        { countOfStars }
      );

      return response.data;
    } catch (error: any) {
      console.error("Update student result error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to update student result");
    }
  }

  /**
   * Удаление результата студента
   */
  static async deleteStudentResult(id: string): Promise<{ success: boolean }> {
    try {
      await $api.delete(`/profile/student-results/${id}`);

      return { success: true };
    } catch (error: any) {
      console.error("Delete student result error:", error.response?.data || error.message);

      if (error.response?.status === 404) {
        return { success: true };
      }

      throw new Error(error.response?.data?.message || "Failed to delete student result");
    }
  }

  /**
   * Удаление всех результатов студента
   */
  static async deleteAllStudentResults(clientId: string): Promise<{ success: boolean }> {
    try {
      await $api.delete(`/profile/student-results/client/${clientId}`);

      return { success: true };
    } catch (error: any) {
      console.error("Delete all student results error:", error.response?.data || error.message);

      if (error.response?.status === 404) {
        return { success: true };
      }

      throw new Error(error.response?.data?.message || "Failed to delete student results");
    }
  }

  /**
   * Получение прогресса курса
   */
  static async getStudentCourseProgress(auditoryId: string, courseId: string) {
    try {
      const response = await $api.post(
        `/profile/student-results/client/${auditoryId}/course-progress`,
        { courseId }
      );

      return response.data;
    } catch (error: any) {
      console.error("Get course progress error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch course progress");
    }
  }
}
