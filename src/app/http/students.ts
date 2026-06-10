import $api from "./api";
import { getErrorMessage, getErrorResponse } from "./errorUtils";

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

type StudentSource = Record<string, unknown> & {
  auditory?: Record<string, unknown>;
  user?: Record<string, unknown>;
};

const asString = (value: unknown, fallback = ""): string =>
  typeof value === "string" ? value : fallback;

const asOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

const normalizeStudent = (student: StudentSource): StudentResponse => ({
  id: asString(student.id),
  auditoryId: asString(student.auditoryId || student.auditory?.auditoryId),
  email: asString(student.email || student.auditory?.email || student.user?.email),
  role: asString(student.role || student.auditory?.role, "student"),
  firstName: asString(student.firstName || student.auditory?.firstName),
  lastName: asString(student.lastName || student.auditory?.lastName),
  middleName: asOptionalString(student.middleName || student.auditory?.middleName),
  phone: asString(student.phone || student.auditory?.phone),
  country: asString(student.country || student.auditory?.country),
  description: asOptionalString(student.description || student.auditory?.description),
  registeredAt: asString(
    student.registeredAt || student.createdAt || student.auditory?.registeredAt
  ),
  updatedAt: asString(student.updatedAt || student.auditory?.updatedAt),
  lastLoginAt: asOptionalString(student.lastLoginAt || student.auditory?.lastLoginAt),
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
      console.error("Get students error:", getErrorResponse(error)?.data || getErrorMessage(error, ""));
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
      console.error("Get student error:", getErrorResponse(error)?.data || getErrorMessage(error, ""));
      throw new Error(getErrorMessage(error, "Failed to fetch student"));
    }
  }
}
