import $api from "./api";

export interface AdminResponse {
  id: string;
  auditoryId: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  country: string;
  description?: string;
  permissions: string[];
  registeredAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface AvatarResponse {
  id: string;
  auditoryId: string;
  imageUrl: string;
  mimeType: string;
}

export class AdminService {
  static async getAdminsList(): Promise<AdminResponse[]> {
    try {
      const response = await $api.get("/students/admins-list");

      return response.data;
    } catch (error: any) {
      console.error("Get admins list error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch admins");
    }
  }

  static async getAdminByAuditoryId(auditoryId: string): Promise<AdminResponse> {
    try {
      const response = await $api.get(`/students/auditory/${auditoryId}/admin`);

      return response.data;
    } catch (error: any) {
      console.error("Get admin by auditoryId error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch admin");
    }
  }

  static async getAvatarByAuditoryId(auditoryId: string): Promise<AvatarResponse | null> {
    try {
      const response = await $api.get(`/profile/avatar/user/${auditoryId}`);
      const data = response.data;

      if (data && data.imageData && !data.imageUrl) {
        data.imageUrl = `data:${data.mimeType};base64,${data.imageData}`;
      }

      return data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }

      console.error("Get avatar error:", error.response?.data || error.message);

      return null;
    }
  }
}
