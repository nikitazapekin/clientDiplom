import $api from "./api";
import { getErrorMessage } from "./errorUtils";

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

const normalizeStudent = (student: Record<string, unknown>): StudentResponse => ({
  id: student.id,
  auditoryId: student.auditoryId || student.auditory?.auditoryId || "",
  email: student.email || student.auditory?.email || student.user?.email || "",
  role: student.role || student.auditory?.role || "student",
  firstName: student.firstName || student.auditory?.firstName || "",
  lastName: student.lastName || student.auditory?.lastName || "",
  middleName: student.middleName || student.auditory?.middleName,
  phone: student.phone || student.auditory?.phone || "",
  country: student.country || student.auditory?.country || "",
  description: student.description || student.auditory?.description,
  registeredAt: student.registeredAt || student.createdAt || student.auditory?.registeredAt || "",
  updatedAt: student.updatedAt || student.auditory?.updatedAt || "",
  lastLoginAt: student.lastLoginAt || student.auditory?.lastLoginAt,
  isActive:
    typeof student.isActive === "boolean"
      ? student.isActive
      : typeof student.auditory?.isActive === "boolean"
        ? student.auditory.isActive
        : true,
});

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

      return {
        ...response.data,
        students: Array.isArray(response.data?.students)
          ? response.data.students.map(normalizeStudent)
          : [],
      };
    } catch (error: unknown) {
      console.error("Get students error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to fetch students"));
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

      return normalizeStudent(response.data);
    } catch (error: unknown) {
      console.error("Get student error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to fetch student"));
    }
  }
}
