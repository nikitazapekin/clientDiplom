import $api from "./api";

export enum ReviewStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export interface BlockReview {
  id: string;
  slideId?: string;
  testId?: string;
  blockId: string;
  reviewerId: string;
  reviewerName: string;
  proposedChanges: Record<string, unknown>;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSlideReviewDto {
  slideId: string;
  blockId: string;
  reviewerId: string;
  reviewerName: string;
  proposedChanges: Record<string, unknown>;
  comment: string;
}

export interface CreateTestReviewDto {
  testId: string;
  blockId: string;
  reviewerId: string;
  reviewerName: string;
  proposedChanges: Record<string, unknown>;
  comment: string;
}

export class ReviewService {
  private static readonly BASE_URL = "/reviews";

  static async createSlideReview(data: CreateSlideReviewDto): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`${this.BASE_URL}/slide`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error("Create slide review error:", error);
      throw error;
    }
  }

  static async createTestReview(data: CreateTestReviewDto): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.post(`${this.BASE_URL}/test`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error("Create test review error:", error);
      throw error;
    }
  }

  static async getSlideReviews(slideId: string): Promise<BlockReview[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`${this.BASE_URL}/slide/${slideId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error("Get slide reviews error:", error);
      throw error;
    }
  }

  static async getTestReviews(testId: string): Promise<BlockReview[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(`${this.BASE_URL}/test/${testId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: unknown) {
      console.error("Get test reviews error:", error);
      throw error;
    }
  }

  static async getBlockReviews(
    slideOrTestId: string,
    blockId: string,
    type: "slide" | "test"
  ): Promise<BlockReview[]> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.get(
        `${this.BASE_URL}/block/${slideOrTestId}/${blockId}/${type}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Get block reviews error:", error);
      throw error;
    }
  }

  static async acceptSlideReview(reviewId: string): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(
        `${this.BASE_URL}/slide/${reviewId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Accept slide review error:", error);
      throw error;
    }
  }

  static async acceptTestReview(reviewId: string): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(
        `${this.BASE_URL}/test/${reviewId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Accept test review error:", error);
      throw error;
    }
  }

  static async rejectSlideReview(reviewId: string): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(
        `${this.BASE_URL}/slide/${reviewId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Reject slide review error:", error);
      throw error;
    }
  }

  static async rejectTestReview(reviewId: string): Promise<BlockReview> {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await $api.put(
        `${this.BASE_URL}/test/${reviewId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      console.error("Reject test review error:", error);
      throw error;
    }
  }
}
