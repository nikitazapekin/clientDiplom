import $api from "./api";
import { getErrorMessage } from "./errorUtils";

export interface LessonComment {
  id: string;
  lessonDetailsId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  likes: number;
  dislikes: number;
  hasLiked: boolean;
  hasDisliked: boolean;
  createdAt: string;
  updatedAt: string;
  replies?: LessonComment[];
}

export interface LessonCommentsResponse {
  comments: LessonComment[];
  total: number;
  canComment: boolean;
}

export class LessonCommentsService {
  static async getComments(lessonDetailsId: string): Promise<LessonCommentsResponse> {
    try {
      const response = await $api.get<LessonCommentsResponse>(
        `/lesson-comments/lesson-details/${lessonDetailsId}`,
      );

      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Не удалось загрузить комментарии"));
    }
  }

  static async createComment(data: {
    lessonDetailsId: string;
    content: string;
    parentId?: string;
  }): Promise<LessonComment> {
    try {
      const response = await $api.post<LessonComment>("/lesson-comments", data);

      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Не удалось отправить комментарий"));
    }
  }

  static async toggleLike(id: string): Promise<LessonComment> {
    try {
      const response = await $api.post<LessonComment>(`/lesson-comments/${id}/like`);

      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Не удалось поставить лайк"));
    }
  }

  static async toggleDislike(id: string): Promise<LessonComment> {
    try {
      const response = await $api.post<LessonComment>(`/lesson-comments/${id}/dislike`);

      return response.data;
    } catch (error: unknown) {
      throw new Error(getErrorMessage(error, "Не удалось поставить дизлайк"));
    }
  }
}
