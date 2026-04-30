import type {
  CommunityComment,
  CreateForumCommentRequest,
  CreateForumQuestionRequest,
  ForumQuestion,
  ForumQuestionsListResponse,
  ForumQuestionStatus,
  UpdateForumCommentRequest,
  UpdateForumQuestionRequest,
} from "./types/community";
import $api from "./api";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error === "object" && error && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

class ForumApiService {
  async getQuestions(params?: {
    page?: number;
    limit?: number;
    search?: string;
    tag?: string;
    status?: ForumQuestionStatus;
  }): Promise<ForumQuestionsListResponse> {
    try {
      const response = await $api.get<ForumQuestionsListResponse>("/forum/questions", { params });

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load forum questions"));
    }
  }

  async getQuestionById(id: string): Promise<ForumQuestion> {
    try {
      const response = await $api.get<ForumQuestion>(`/forum/questions/${id}`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to load question"));
    }
  }

  async createQuestion(payload: CreateForumQuestionRequest): Promise<ForumQuestion> {
    try {
      const response = await $api.post<ForumQuestion>("/forum/questions", payload);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to create question"));
    }
  }

  async updateQuestion(id: string, payload: UpdateForumQuestionRequest): Promise<ForumQuestion> {
    try {
      const response = await $api.put<ForumQuestion>(`/forum/questions/${id}`, payload);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to update question"));
    }
  }

  async updateQuestionStatus(
    id: string,
    status: ForumQuestionStatus,
  ): Promise<ForumQuestion> {
    try {
      const response = await $api.patch<ForumQuestion>(`/forum/questions/${id}/status`, { status });

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to update question status"));
    }
  }

  async toggleQuestionLike(id: string): Promise<ForumQuestion> {
    try {
      const response = await $api.post<ForumQuestion>(`/forum/questions/${id}/like`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to like question"));
    }
  }

  async toggleQuestionDislike(id: string): Promise<ForumQuestion> {
    try {
      const response = await $api.post<ForumQuestion>(`/forum/questions/${id}/dislike`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to dislike question"));
    }
  }

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    try {
      const response = await $api.delete<{ success: boolean }>(`/forum/questions/${id}`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to delete question"));
    }
  }

  async createComment(
    questionId: string,
    payload: CreateForumCommentRequest,
  ): Promise<CommunityComment> {
    try {
      const response = await $api.post<CommunityComment>(`/forum/questions/${questionId}/comments`, payload);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to create answer"));
    }
  }

  async updateComment(
    id: string,
    payload: UpdateForumCommentRequest,
  ): Promise<CommunityComment> {
    try {
      const response = await $api.put<CommunityComment>(`/forum/comments/${id}`, payload);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to update answer"));
    }
  }

  async deleteComment(id: string): Promise<{ success: boolean }> {
    try {
      const response = await $api.delete<{ success: boolean }>(`/forum/comments/${id}`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to delete answer"));
    }
  }

  async toggleCommentLike(id: string): Promise<CommunityComment> {
    try {
      const response = await $api.post<CommunityComment>(`/forum/comments/${id}/like`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to like answer"));
    }
  }

  async toggleCommentDislike(id: string): Promise<CommunityComment> {
    try {
      const response = await $api.post<CommunityComment>(`/forum/comments/${id}/dislike`);

      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, "Failed to dislike answer"));
    }
  }
}

const forumService = new ForumApiService();

export default forumService;
