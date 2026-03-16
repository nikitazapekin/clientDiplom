import $api, { $apiNoRedirect } from "./api";

// Типы для сертификатов
export interface CertificateResponse {
  id: string;
  clientId: string;
  courseId: string;
  date: string;
  url: string;
  digital: string;
  isViewed: boolean;
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
}

export class CertificateService {
  /**
   * Создание нового сертификата
   */
  static async createCertificate(data: CreateCertificateRequest): Promise<CertificateResponse> {
    try {
      console.log("📝 Creating certificate:", {
        auditoryId: data.auditoryId,
        studentName: data.studentName,
        courseName: data.courseName
      });

      const response = await $api.post(
        `/certificates`,
        data
      );

      console.log("✅ Certificate created:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("❌ Create certificate error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to create certificate");
    }
  }

  /**
   * Отметить сертификат как просмотренный
   */
  static async setIsViewed(id: string): Promise<CertificateResponse> {
    try {
      const response = await $api.put(
        `/certificates/setIsViewed`,
        { id }
      );
      return response.data;
    } catch (error: any) {
      console.error("❌ setIsViewed error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to set isViewed");
    }
  }

  /**
   * Получение всех сертификатов по auditoryId
   */
  static async getCertificatesByAuditoryId(auditoryId: string): Promise<CertificateResponse[]> {
    try {
      console.log("📥 Fetching certificates for auditory:", auditoryId);

      const response = await $apiNoRedirect.get(
        `/certificates/auditory/${auditoryId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Get certificates error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch certificates");
    }
  }

  /**
   * Получение всех сертификатов по clientId
   */
  static async getCertificatesByClientId(clientId: string): Promise<CertificateResponse[]> {
    try {
      const response = await $apiNoRedirect.get(
        `/certificates/client/${clientId}`
      );

      return response.data;
    } catch (error: any) {
      console.error("❌ Get certificates error:", error.response?.data || error.message);
      throw new Error(error.response?.data?.message || "Failed to fetch certificates");
    }
  }

  /**
   * Создание сертификата для студента
   */
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
      date: new Date().toISOString().split('T')[0],
    };

    return this.createCertificate(data);
  }
}
