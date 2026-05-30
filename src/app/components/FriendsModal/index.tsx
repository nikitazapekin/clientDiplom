"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

import { AuthService } from "@/app/http/auth";
import {
  type FriendRequestResponse,
  type FriendResponse,
  FriendsService,
} from "@/app/http/friends";

import styles from "./index.module.scss";

type TabType = "my-friends" | "find-friends" | "requests";

const getAvatarUrl = (item: Record<string, any>): string | null => {
  const avatar = item.avatar as { imageUrl?: string; mimeType?: string } | undefined;
  if (avatar?.imageUrl) {
    if (avatar.imageUrl.startsWith("data:")) return avatar.imageUrl;
    if (avatar.imageUrl.startsWith("http://") || avatar.imageUrl.startsWith("https://"))
      return avatar.imageUrl;
    if (avatar.mimeType) return `data:${avatar.mimeType};base64,${avatar.imageUrl}`;
  }
  return null;
};

const FriendModal = ({ onClose }: { onClose: () => void }) => {
  const [activeTab, setActiveTab] = useState<TabType>("my-friends");
  const [friends, setFriends] = useState<FriendResponse[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequestResponse[]>([]);
  const [allUsers, setAllUsers] = useState<FriendResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendResponse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [userAuditoryId, setUserAuditoryId] = useState<string | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const userData = AuthService.getCurrentUser();
      if (!userData.userId) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      setUserAuditoryId(userData.userId);
      const [friendsData, requestsData] = await Promise.all([
        FriendsService.getFriendsByAuditoryId(userData.userId),
        FriendsService.getPendingFriendRequests(userData.userId),
      ]);
      setFriends(friendsData);
      setPendingRequests(requestsData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load friends");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const userData = AuthService.getCurrentUser();
      if (!userData.userId) {
        setError("User not authenticated");
        setLoading(false);
        return;
      }
      setUserAuditoryId(userData.userId);
      const usersData = await FriendsService.searchUsers("");
      setAllUsers(usersData);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    if (activeTab === "find-friends") {
      await loadAllUsers();
    } else {
      await loadFriends();
    }
  }, [activeTab, loadFriends, loadAllUsers]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSearch = useCallback(async () => {
    if (!userAuditoryId) return;
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      if (activeTab === "my-friends") {
        const results = await FriendsService.searchFriends(userAuditoryId, searchQuery);
        setSearchResults(results);
      } else if (activeTab === "find-friends") {
        const results = await FriendsService.searchUsers(searchQuery);
        setSearchResults(results);
      }
    } catch {
      console.error("Search error");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, userAuditoryId, activeTab]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 500);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery, handleSearch]);

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await FriendsService.acceptFriendRequest(requestId);
      await loadFriends();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to accept friend request");
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await FriendsService.rejectFriendRequest(requestId);
      await loadFriends();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reject friend request");
    }
  };

  const handleRemoveFriend = async (friendAuditoryId: string) => {
    if (!confirm("Вы уверены, что хотите удалить этого друга?")) return;
    if (!userAuditoryId) return;
    try {
      await FriendsService.removeFriend(userAuditoryId, friendAuditoryId);
      await loadFriends();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to remove friend");
    }
  };

  const handleAddFriend = async (friendAuditoryId: string) => {
    if (!userAuditoryId) return;
    try {
      const status = await FriendsService.checkFriendship(userAuditoryId, friendAuditoryId);
      if (status.isFriend) {
        alert("Этот пользователь уже в друзьях");
        return;
      }
      const pending = await FriendsService.checkPendingRequest(userAuditoryId, friendAuditoryId);
      if (pending.hasRequest) {
        alert("Запрос уже отправлен");
        return;
      }
      await FriendsService.sendFriendRequest(userAuditoryId, friendAuditoryId);
      alert("Запрос отправлен!");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Не удалось отправить заявку");
    }
  };

  const renderAvatar = (item: Record<string, any>, fallbackLetter?: string) => {
    const url = getAvatarUrl(item);
    if (url) {
      return <img src={url} alt="" className={styles.avatarImage} />;
    }
    return <div className={styles.avatarFallback}>{fallbackLetter || "?"}</div>;
  };

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const getCurrentData = () => {
    if (searchResults.length > 0) return searchResults;
    if (activeTab === "my-friends") return friends;
    if (activeTab === "find-friends") return allUsers;
    return [];
  };

  const currentData = getCurrentData();
  const isMyFriendsTab = activeTab === "my-friends";
  const isFindFriendsTab = activeTab === "find-friends";
  const isRequestsTab = activeTab === "requests";
  const showRequests = isMyFriendsTab && searchResults.length === 0 && pendingRequests.length > 0;

  const renderBody = () => {
    if (loading && !refreshing) {
      return <div className={styles.centerContainer}><div className={styles.loader} /></div>;
    }

    if (error && friends.length === 0 && allUsers.length === 0 && pendingRequests.length === 0) {
      return (
        <div className={styles.centerContainer}>
          <div className={styles.errorText}>{error}</div>
          <button className={styles.retryButton} onClick={loadData}>Повторить</button>
        </div>
      );
    }

    return (
      <div className={styles.bodyContainer}>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${isMyFriendsTab ? styles.tabButtonActive : ""}`}
            onClick={() => switchTab("my-friends")}
          >
            Мои друзья
          </button>
          <button
            className={`${styles.tabButton} ${isFindFriendsTab ? styles.tabButtonActive : ""}`}
            onClick={() => switchTab("find-friends")}
          >
            Найти друзей
          </button>
          <button
            className={`${styles.tabButton} ${isRequestsTab ? styles.tabButtonActive : ""}`}
            onClick={() => switchTab("requests")}
          >
            <span className={styles.tabButtonWithBadge}>
              Запросы
              {pendingRequests.length > 0 && (
                <span className={styles.badge}>
                  {pendingRequests.length > 99 ? "99+" : pendingRequests.length}
                </span>
              )}
            </span>
          </button>
        </div>

        {!isRequestsTab && (
          <div className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              placeholder={
                isMyFriendsTab ? "Найти друзей..." : "Найти пользователей по имени..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && <span className={styles.searchingText}>Поиск...</span>}
          </div>
        )}

        <div className={styles.listContainer}>
          {isRequestsTab && (
            <div className={styles.list}>
              {pendingRequests.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <div className={styles.emptyText}>Нет запросов в друзья</div>
                </div>
              ) : (
                pendingRequests.map((item) => {
                  const fullName = `${item.senderFirstName || ""} ${item.senderMiddleName || ""} ${item.senderLastName || ""}`.trim();
                  const initial = item.senderFirstName?.[0]?.toUpperCase();
                  return (
                    <div key={item.id} className={styles.requestCard}>
                      <div className={styles.avatarContainer}>
                        {renderAvatar(item as Record<string, any>, initial)}
                      </div>
                      <div className={styles.requestInfo}>
                        <div className={styles.friendName}>{fullName || "Unknown"}</div>
                        <div className={styles.friendSince}>
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className={styles.requestActions}>
                        <button
                          className={styles.acceptButton}
                          onClick={() => handleAcceptRequest(item.id)}
                          title="Принять"
                        >
                          ✓
                        </button>
                        <button
                          className={styles.rejectButton}
                          onClick={() => handleRejectRequest(item.id)}
                          title="Отклонить"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {!isRequestsTab && (
            <div className={styles.list}>
              {showRequests && (
                <>
                  <div className={styles.sectionTitle}>
                    Ожидание подтверждения ({pendingRequests.length})
                  </div>
                  {pendingRequests.map((item) => {
                    const fullName = `${item.senderFirstName || ""} ${item.senderMiddleName || ""} ${item.senderLastName || ""}`.trim();
                    const initial = item.senderFirstName?.[0]?.toUpperCase();
                    return (
                      <div key={item.id} className={styles.requestCard}>
                        <div className={styles.avatarContainer}>
                          {renderAvatar(item as Record<string, any>, initial)}
                        </div>
                        <div className={styles.requestInfo}>
                          <div className={styles.friendName}>{fullName || "Unknown"}</div>
                          <div className={styles.friendSince}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className={styles.requestActions}>
                          <button
                            className={styles.acceptButton}
                            onClick={() => handleAcceptRequest(item.id)}
                            title="Принять"
                          >
                            ✓
                          </button>
                          <button
                            className={styles.rejectButton}
                            onClick={() => handleRejectRequest(item.id)}
                            title="Отклонить"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {currentData.length === 0 && searchResults.length === 0 ? (
                <div className={styles.emptyContainer}>
                  <div className={styles.emptyText}>
                    {isMyFriendsTab ? "Нет друзей" : "Пользователей не найдено"}
                  </div>
                </div>
              ) : (
                (currentData as FriendResponse[]).map((item) => {
                  const fullName = `${item.friendFirstName || ""} ${item.friendMiddleName || ""} ${item.friendLastName || ""}`.trim();
                  const initial = item.friendFirstName?.[0]?.toUpperCase();

                  if (searchResults.length > 0) {
                    return (
                      <div key={item.id} className={styles.friendCard}>
                        <div
                          className={styles.friendInfoClickable}
                          onClick={() => handleRemoveFriend(item.friendId)}
                        >
                          <div className={styles.avatarContainer}>
                            {renderAvatar(item as Record<string, any>, initial)}
                          </div>
                          <div className={styles.friendInfo}>
                            <div className={styles.friendName}>{fullName || "Unknown"}</div>
                            <div className={styles.friendEmail}>{item.friendId}</div>
                          </div>
                        </div>
                        {isMyFriendsTab ? (
                          <button
                            className={styles.removeFriendButton}
                            onClick={() => handleRemoveFriend(item.friendId)}
                          >
                            Удалить
                          </button>
                        ) : (
                          <button
                            className={styles.addFriendButton}
                            onClick={() => handleAddFriend(item.friendId)}
                          >
                            + Добавить
                          </button>
                        )}
                      </div>
                    );
                  }

                  if (isMyFriendsTab) {
                    return (
                      <div
                        key={item.id}
                        className={styles.friendCard}
                        onDoubleClick={() => handleRemoveFriend(item.friendId)}
                      >
                        <div className={styles.avatarContainer}>
                          {renderAvatar(item as Record<string, any>, initial)}
                        </div>
                        <div className={styles.friendInfo}>
                          <div className={styles.friendName}>{fullName || "Unknown"}</div>
                          <div className={styles.friendSince}>
                            Добавлен {new Date(item.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <button
                          className={styles.removeFriendButton}
                          onClick={() => handleRemoveFriend(item.friendId)}
                          title="Удалить из друзей"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div key={item.id} className={styles.friendCard}>
                      <div className={styles.friendInfoClickable}>
                        <div className={styles.avatarContainer}>
                          {renderAvatar(item as Record<string, any>, initial)}
                        </div>
                        <div className={styles.friendInfo}>
                          <div className={styles.friendName}>{fullName || "Unknown"}</div>
                        </div>
                      </div>
                      <button
                        className={styles.addFriendButton}
                        onClick={() => handleAddFriend(item.friendId)}
                      >
                        + Добавить
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Друзья</h2>
          <button className={styles.closeButton} onClick={onClose}>
            ✕
          </button>
        </div>
        <div className={styles.modalContent}>
          {renderBody()}
        </div>
      </div>
    </div>
  );
};

export default FriendModal;
