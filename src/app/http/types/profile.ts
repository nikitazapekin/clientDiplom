export interface AvatarResponse {
  id: string;
  auditoryId: string;
  mimeType: string;
  fileSize: number;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentResultResponse {
  id: string;
  clientId: string;
  lessonId: string;
  countOfStars: number;
  completedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FullClientInfo {
  clientId: string;
  auditoryId: string;
  email: string;
  role: string;
  isActive: boolean;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  country: string;
  description?: string;
  registeredAt: string;
  lastLoginAt?: string | null;
  avatar?: AvatarResponse;
  studentResults: StudentResultResponse[];
  totalLessons: number;
  averageStars: number;
}

export interface CreateAvatarRequest {
  auditoryId: string;
  imageData: string; // base64 без префикса
  mimeType: string;
}

export interface UpdateAvatarRequest {
  imageData?: string;
  mimeType?: string;
}

export interface CreateStudentResultRequest {
  clientId: string;
  lessonId: string;
  countOfStars: number;
}

export interface UpdateStudentResultRequest {
  countOfStars?: number;
}

export interface StudentProgress {
  totalLessons: number;
  averageStars: number;
  results: StudentResultResponse[];
}
