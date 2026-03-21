"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import styles from "./index.module.scss";

import type { Message, User } from "@/app/http/chat";
import chatService from "@/app/http/chat";

type ParticipantInfo = Pick<User, "firstName" | "lastName">;

const ChatView = () => {
  const router = useRouter();
  const params = useParams();
  const receiverId = params.userId as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const userId = window.localStorage.getItem("userId");

    setCurrentUserId(userId);

    if (userId) {
      chatService.connect(userId);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId || !receiverId) {
      return;
    }

    let isActive = true;

    const isConversationMessage = (message: Message) =>
      (message.senderId === currentUserId && message.receiverId === receiverId) ||
      (message.senderId === receiverId && message.receiverId === currentUserId);

    const syncConversation = async () => {
      try {
        setLoading(true);

        const [loadedMessages, loadedParticipantInfo] = await Promise.all([
          chatService.getConversationMessages(currentUserId, receiverId, 50, 0),
          chatService.getUserProfile(receiverId),
        ]);

        if (!isActive) {
          return;
        }

        setMessages(loadedMessages);
        setParticipantInfo({
          firstName: loadedParticipantInfo.firstName ?? "",
          lastName: loadedParticipantInfo.lastName ?? "",
        });

        await chatService.markMessagesAsRead(receiverId, currentUserId);
      } catch (error) {
        console.error("Failed to load chat data:", error);
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    chatService.joinConversation(currentUserId, receiverId);
    void syncConversation();

    const unsubscribeMessage = chatService.onNewMessage((message) => {
      if (!isConversationMessage(message) || !isActive) {
        return;
      }

      if (message.receiverId === currentUserId) {
        void chatService.markMessagesAsRead(message.senderId, currentUserId);
      }

      setMessages((prev) => {
        if (prev.some((existingMessage) => existingMessage.id === message.id)) {
          return prev;
        }

        return [...prev, message];
      });
    });

    const unsubscribeRead = chatService.onMessagesRead(
      ({ senderId, receiverId: readReceiverId }) => {
        if (!isActive || senderId !== currentUserId || readReceiverId !== receiverId) {
          return;
        }

        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            read: msg.senderId === currentUserId ? true : msg.read,
          })),
        );
      }
    );

    return () => {
      isActive = false;
      unsubscribeMessage();
      unsubscribeRead();
      chatService.leaveConversation(currentUserId, receiverId);
    };
  }, [receiverId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    const content = newMessage.trim();

    if (!content || !currentUserId || !receiverId) return;

    try {
      await chatService.sendMessage(receiverId, content);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
      alert("Не удалось отправить сообщение");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();

    if (date.toDateString() === today.toDateString()) {
      return "Сегодня";
    }

    const yesterday = new Date(today);

    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === yesterday.toDateString()) {
      return "Вчера";
    }

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderDateSeparator = (index: number) => {
    if (index === 0) return true;

    const current = new Date(messages[index].createdAt);
    const previous = new Date(messages[index - 1].createdAt);

    return current.toDateString() !== previous.toDateString();
  };

  const participantInitials = participantInfo
    ? `${participantInfo.firstName?.[0] ?? ""}${participantInfo.lastName?.[0] ?? ""}` || "?"
    : "?";
  const participantName = participantInfo
    ? `${participantInfo.firstName ?? ""} ${participantInfo.lastName ?? ""}`.trim() || "Без имени"
    : "Загрузка...";

  return (
    <div className={styles.chatView}>
      <div className={styles.chatView__header}>
        <button
          className={styles.chatView__back}
          onClick={() => router.back()}
        >
          ← Назад
        </button>
        <div className={styles.chatView__participant}>
          <div className={styles.chatView__avatar}>
            {participantInitials}
          </div>
          <div className={styles.chatView__info}>
            <div className={styles.chatView__name}>
              {participantName}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.chatView__messages}>
        {loading ? (
          <div className={styles.chatView__loading}>Загрузка...</div>
        ) : messages.length === 0 ? (
          <div className={styles.chatView__empty}>
            Нет сообщений. Начните диалог!
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={message.id}>
              {renderDateSeparator(index) && (
                <div className={styles.chatView__date}>
                  {formatDate(message.createdAt)}
                </div>
              )}
              <div
                className={`${styles.chatView__message} ${
                  message.senderId === currentUserId
                    ? styles.chatView__message_own
                    : styles.chatView__message_other
                }`}
              >
                <div className={styles.chatView__messageContent}>
                  {message.content}
                </div>
                <div className={styles.chatView__messageTime}>
                  {formatTime(message.createdAt)}
                  {message.senderId === currentUserId && message.read && (
                    <span className={styles.chatView__readMark}>✓✓</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className={styles.chatView__input} onSubmit={handleSendMessage}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Введите сообщение..."
          className={styles.chatView__inputField}
        />
        <button
          type="submit"
          disabled={!newMessage.trim()}
          className={styles.chatView__send}
        >
          Отправить
        </button>
      </form>
    </div>
  );
};

export default ChatView;
