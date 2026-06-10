import $api, { $apiNoRedirect } from "./api";
import { getErrorMessage } from "./errorUtils";

export interface CertificateResponse {
  id: string;
  clientId: string;
  courseId: string;
  date: string;
  url: string;
  digital: string;
  isViewed: boolean;
  firstName: string;
  lastName: string;
  middleName: string;
  courseName: string;
  createdAt: string;
  updatedAt: string;
}

export interface CertificateWithStudentInfo {
  id: string;
  clientId: string;
  courseId: string;
  date: string;
  url: string;
  digital: string;
  isViewed: boolean;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  courseName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCertificateRequest {
  auditoryId: string;
  courseId: string;
  date: string;
  courseName: string;
  studentName: string;
}

export interface UpdateCertificateRequest {
  date?: string;
  url?: string;
  digital?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  courseName?: string;
}

export interface CertificateSearchParams {
  firstName?: string;
  lastName?: string;
  courseName?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CertificateSearchResponse {
  certificates: CertificateResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class CertificateService {
  static async searchCertificates(
    params: CertificateSearchParams
  ): Promise<CertificateSearchResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.firstName) queryParams.append("firstName", params.firstName);

      if (params.lastName) queryParams.append("lastName", params.lastName);

      if (params.courseName) queryParams.append("courseName", params.courseName);

      if (params.dateFrom) queryParams.append("dateFrom", params.dateFrom);

      if (params.dateTo) queryParams.append("dateTo", params.dateTo);

      if (params.page) queryParams.append("page", params.page.toString());

      if (params.limit) queryParams.append("limit", params.limit.toString());

      const queryString = queryParams.toString();
      const url = queryString ? `/certificates/search?${queryString}` : "/certificates/search";

      const response = await $api.get(url);

      return response.data;
    } catch (error: unknown) {
      console.error("Search certificates error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to search certificates"));
    }
  }

  static async updateCertificate(
    id: string,
    data: UpdateCertificateRequest
  ): Promise<CertificateResponse> {
    try {
      const response = await $api.put(`/certificates/${id}`, data);

      return response.data;
    } catch (error: unknown) {
      console.error("Update certificate error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to update certificate"));
    }
  }

  static async deleteCertificate(id: string): Promise<void> {
    try {
      await $api.delete(`/certificates/${id}`);
    } catch (error: unknown) {
      console.error("Delete certificate error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to delete certificate"));
    }
  }

  static async getCertificateById(id: string): Promise<CertificateResponse> {
    try {
      const response = await $api.get(`/certificates/${id}`);

      return response.data;
    } catch (error: unknown) {
      console.error("Get certificate error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to fetch certificate"));
    }
  }

  static async createCertificate(data: CreateCertificateRequest): Promise<CertificateResponse> {
    try {
      console.log(" Creating certificate:", {
        auditoryId: data.auditoryId,
        studentName: data.studentName,
        courseName: data.courseName,
      });

      const response = await $api.post(`/certificates`, data);

      console.log(" Certificate created:", response.data);

      return response.data;
    } catch (error: unknown) {
      console.error(" Create certificate error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to create certificate"));
    }
  }

  static async setIsViewed(id: string): Promise<CertificateResponse> {
    try {
      const response = await $api.put(`/certificates/setIsViewed`, { id });

      return response.data;
    } catch (error: unknown) {
      console.error("setIsViewed error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to set isViewed"));
    }
  }

  static async getCertificatesByAuditoryId(auditoryId: string): Promise<CertificateResponse[]> {
    try {
      console.log("Fetching certificates for auditory:", auditoryId);

      const response = await $apiNoRedirect.get(`/certificates/auditory/${auditoryId}`);

      return response.data;
    } catch (error: unknown) {
      console.error("Get certificates error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to fetch certificates"));
    }
  }

  static async getCertificatesByClientId(clientId: string): Promise<CertificateResponse[]> {
    try {
      const response = await $apiNoRedirect.get(`/certificates/client/${clientId}`);

      return response.data;
    } catch (error: unknown) {
      console.error(" Get certificates error:", error.response?.data || error.message);
      throw new Error(getErrorMessage(error, "Failed to fetch certificates"));
    }
  }

  static async createStudentCertificate(
    auditoryId: string,
    studentName: string,
    courseName: string,
    courseId: string
  ): Promise<CertificateResponse> {
    const data: CreateCertificateRequest = {
      auditoryId,
      courseId,
      studentName,
      courseName,
      date: new Date().toISOString().split("T")[0],
    };

    return this.createCertificate(data);
  }
}
