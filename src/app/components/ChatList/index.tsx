"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";

import type { Conversation, User } from "@/app/http/chat";
import chatService from "@/app/http/chat";

const ChatList = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    const initializeChats = async () => {
      try {
        const userId = window.localStorage.getItem("userId");

        if (!isActive) {
          return;
        }

        setCurrentUserId(userId);

        if (!userId) {
          setLoading(false);

          return;
        }

        chatService.connect(userId);
      } catch (error) {
        console.error("Failed to load user ID:", error);

        if (isActive) {
          setLoading(false);
        }
      }
    };

    void initializeChats();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) {
      return;
    }

    let isActive = true;

    const refreshConversations = async () => {
      try {
        setLoading(true);
        const loadedConversations = await chatService.getConversations(currentUserId);

        if (isActive) {
          setConversations(loadedConversations);
        }
      } catch (error) {
        console.error("Failed to load conversations:", error);

        if (isActive) {
          setConversations([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void refreshConversations();

    const unsubscribeMessage = chatService.onNewMessage((message) => {
      if (message.senderId === currentUserId || message.receiverId === currentUserId) {
        void refreshConversations();
      }
    });

    const handleWindowFocus = () => {
      void refreshConversations();
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isActive = false;
      unsubscribeMessage();
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [currentUserId]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.trim().length < 1) {
      setSearchResults([]);
      setIsSearching(false);

      return;
    }

    setIsSearching(true);

    try {
      const results = await chatService.searchUsers(query);

      setSearchResults(results.filter((user) => user.id !== currentUserId));
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };

  const selectConversation = (userId: string) => {
    router.push(`/messages/${userId}`);
  };

  const selectNewChat = (user: User) => {
    selectConversation(user.id);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getLastMessageText = (conversation: Conversation) => {
    if (!conversation.lastMessage) {
      return "Нет сообщений";
    }

    const { content, senderId } = conversation.lastMessage;
    const isOwnMessage = senderId === currentUserId;

    return isOwnMessage ? `Вы: ${content}` : content;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}` || "?";
  };

  return (
    <div className={styles.chatList}>
      <div className={styles.chatList__pageHeader}>
        <h1>Сообщения</h1>
        <div className={styles.chatList__search}>
          <input
            type="text"
            placeholder="Поиск по имени и фамилии..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className={styles.chatList__searchInput}
          />
        </div>
      </div>

      <div className={styles.chatList__content}>
        {loading ? (
          <div className={styles.chatList__loading}>Загрузка...</div>
        ) : isSearching ? (
          <div className={styles.chatList__results}>
            {searchResults.length === 0 ? (
              <div className={styles.chatList__empty}>
                Ничего не найдено
              </div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className={styles.chatList__item}
                  onClick={() => selectNewChat(user)}
                >
                  <div className={styles.chatList__avatar}>
                    {getInitials(user.firstName, user.lastName)}
                  </div>
                  <div className={styles.chatList__info}>
                    <div className={styles.chatList__name}>
                      {user.fullName}
                    </div>
                    <div className={styles.chatList__email}>
                      {user.email}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : conversations.length === 0 ? (
          <div className={styles.chatList__empty}>
            У вас пока нет сообщений
            <br />
            Найдите собеседника через поиск
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={styles.chatList__item}
              onClick={() => {
                const participantId =
                  conversation.participant1Id === currentUserId
                    ? conversation.participant2Id
                    : conversation.participant1Id;

                selectConversation(participantId);
              }}
            >
              <div className={styles.chatList__avatar}>
                {getInitials(
                  conversation.participantFirstName,
                  conversation.participantLastName,
                )}
              </div>
              <div className={styles.chatList__info}>
                <div className={styles.chatList__header}>
                  <div className={styles.chatList__name}>
                    {conversation.participantFirstName}{" "}
                    {conversation.participantLastName}
                  </div>
                  <div className={styles.chatList__time}>
                    {conversation.lastMessage &&
                      formatTime(conversation.lastMessage.createdAt)}
                  </div>
                </div>
                <div className={styles.chatList__message}>
                  {getLastMessageText(conversation)}
                </div>
              </div>
              {conversation.unreadCount > 0 && (
                <div className={styles.chatList__badge}>
                  {conversation.unreadCount}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList;
