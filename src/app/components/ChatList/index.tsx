"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import chatService, { Conversation, User } from "@/app/http/chat";
import styles from "./index.module.scss";

const ChatList = () => {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      chatService.connect(userId);

      chatService.onNewMessage((message) => {
        loadConversations();
      });

      setConversations([]);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    try {
      const results = await chatService.searchUsers(query);
      setSearchResults(results);
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

  const formatDate = (dateString: string) => {
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
    const userId = localStorage.getItem("userId");
    const isOwnMessage = senderId === userId;
    
    return isOwnMessage ? `Вы: ${content}` : content;
  };

  return (
    <div className={styles.chatList}>
      <div className={styles.chatList__header}>
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
                    {user.firstName[0]}{user.lastName[0]}
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
              onClick={() =>
                selectConversation(
                  conversation.participant1Id ===
                    localStorage.getItem("userId")
                    ? conversation.participant2Id
                    : conversation.participant1Id,
                )
              }
            >
              <div className={styles.chatList__avatar}>
                {conversation.participantFirstName[0]}
                {conversation.participantLastName[0]}
              </div>
              <div className={styles.chatList__info}>
                <div className={styles.chatList__header}>
                  <div className={styles.chatList__name}>
                    {conversation.participantFirstName}{" "}
                    {conversation.participantLastName}
                  </div>
                  <div className={styles.chatList__time}>
                    {conversation.lastMessage &&
                      formatDate(conversation.lastMessage.createdAt)}
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
