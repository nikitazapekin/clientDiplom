import $api from "./api";

export interface FriendResponse {
  id: string;
  clientId: string;
  friendId: string;
  friendFirstName?: string;
  friendLastName?: string;
  friendMiddleName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FriendRequestResponse {
  id: string;
  senderId: string;
  receiverId: string;
  status: "pending" | "accepted" | "rejected";
  senderAuditoryId?: string;
  senderFirstName?: string;
  senderLastName?: string;
  senderMiddleName?: string;
  receiverAuditoryId?: string;
  receiverFirstName?: string;
  receiverLastName?: string;
  receiverMiddleName?: string;
  createdAt: string;
  updatedAt: string;
}

export class FriendsService {
  static async getFriendsByAuditoryId(clientAuditoryId: string): Promise<FriendResponse[]> {
    try {
      const response = await $api.get(`/friends/auditory/${clientAuditoryId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch friends");
    }
  }

  static async searchFriends(clientAuditoryId: string, query: string): Promise<FriendResponse[]> {
    try {
      const response = await $api.get(`/friends/search`, {
        params: { clientAuditoryId, query },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to search friends");
    }
  }

  static async searchUsers(query: string): Promise<FriendResponse[]> {
    try {
      const response = await $api.get(`/friends/search-users`, {
        params: { query: query || "" },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to search users");
    }
  }

  static async removeFriend(clientAuditoryId: string, friendAuditoryId: string): Promise<void> {
    try {
      await $api.delete(`/friends`, {
        params: { clientAuditoryId, friendAuditoryId },
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to remove friend");
    }
  }

  static async checkFriendship(
    clientAuditoryId: string,
    friendAuditoryId: string
  ): Promise<{ isFriend: boolean }> {
    try {
      const response = await $api.get(`/friends/check`, {
        params: { clientAuditoryId, friendAuditoryId },
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to check friendship");
    }
  }

  static async sendFriendRequest(
    senderAuditoryId: string,
    receiverAuditoryId: string
  ): Promise<FriendRequestResponse> {
    try {
      const response = await $api.post(`/friend-requests`, {
        senderAuditoryId,
        receiverAuditoryId,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to send friend request");
    }
  }

  static async acceptFriendRequest(requestId: string): Promise<FriendResponse> {
    try {
      const response = await $api.patch(`/friend-requests/${requestId}/accept`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to accept friend request");
    }
  }

  static async rejectFriendRequest(requestId: string): Promise<FriendRequestResponse> {
    try {
      const response = await $api.patch(`/friend-requests/${requestId}/reject`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to reject friend request");
    }
  }

  static async getPendingFriendRequests(userAuditoryId: string): Promise<FriendRequestResponse[]> {
    try {
      const response = await $api.get(`/friend-requests/pending/received/${userAuditoryId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch pending friend requests");
    }
  }

  static async getSentFriendRequests(userAuditoryId: string): Promise<FriendRequestResponse[]> {
    try {
      const response = await $api.get(`/friend-requests/pending/sent/${userAuditoryId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch sent friend requests");
    }
  }

  static async cancelFriendRequest(
    senderAuditoryId: string,
    receiverAuditoryId: string
  ): Promise<void> {
    try {
      await $api.delete(`/friend-requests/cancel`, {
        params: { senderAuditoryId, receiverAuditoryId },
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to cancel friend request");
    }
  }

  static async checkPendingRequest(
    senderAuditoryId: string,
    receiverAuditoryId: string
  ): Promise<{ hasRequest: boolean }> {
    try {
      const sentRequests = await this.getSentFriendRequests(senderAuditoryId);
      const hasRequest = sentRequests.some(
        (request) => request.receiverId === receiverAuditoryId && request.status === "pending"
      );
      return { hasRequest };
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to check pending request");
    }
  }

  static async getProfileByAuditoryId(auditoryId: string) {
    try {
      const response = await $api.get(`/profile/client/auditory/${auditoryId}/full`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Failed to fetch profile");
    }
  }
}
