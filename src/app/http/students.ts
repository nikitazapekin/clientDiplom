import $api from "./api";

export interface StudentResponse {
  id: string;
  auditoryId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  country: string;
  description?: string;
  registeredAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

export interface StudentsListResponse {
  students: StudentResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetStudentsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class StudentsService {
  /**
   * Get students list with pagination and search
   */
  static async getStudents(params?: GetStudentsParams): Promise<StudentsListResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params?.page) queryParams.append("page", params.page.toString());
      if (params?.limit) queryParams.append("limit", params.limit.toString());
      if (params?.search) queryParams.append("search", params.search);

      const queryString = queryParams.toString();
      const url = queryString ? `/students?${queryString}` : "/students";

      const response = await $api.get(url);

      return response.data;
    } catch (error: any) {
      console.error("Get students error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch students");
    }
  }

  /**
   * Search students by name, lastName, or id
   */
  static async searchStudents(query: string, page?: number, limit?: number): Promise<StudentsListResponse> {
    return this.getStudents({
      page: page || 1,
      limit: limit || 10,
      search: query,
    });
  }

  /**
   * Get student by auditoryId
   */
  static async getStudentByAuditoryId(auditoryId: string): Promise<StudentResponse> {
    try {
      const response = await $api.get(`/students/auditory/${auditoryId}`);

      return response.data;
    } catch (error: any) {
      console.error("Get student error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch student");
    }
  }
}
