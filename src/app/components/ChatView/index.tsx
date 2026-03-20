"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import chatService, { Message } from "@/app/http/chat";
import styles from "./index.module.scss";

const ChatView = () => {
  const router = useRouter();
  const params = useParams();
  const receiverId = params.userId as string;
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [senderInfo, setSenderInfo] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [participantInfo, setParticipantInfo] = useState<any>(null);

  const currentUserId = localStorage.getItem("userId");
  
  useEffect(() => {
    if (!currentUserId || !receiverId) return;

    loadMessages();
    loadParticipantInfo();

    chatService.connect(currentUserId);
    chatService.joinConversation(currentUserId, receiverId);

    const unsubscribe = chatService.onNewMessage((message) => {
      if (
        (message.senderId === currentUserId && message.receiverId === receiverId) ||
        (message.senderId === receiverId && message.receiverId === currentUserId)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    chatService.onMessagesRead(({ senderId, receiverId }) => {
      if (senderId === currentUserId && receiverId === receiverId) {
        setMessages((prev) =>
          prev.map((msg) => ({
            ...msg,
            read: true,
          })),
        );
      }
    });

    return () => {
      unsubscribe();
      chatService.leaveConversation(currentUserId, receiverId);
    };
  }, [receiverId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      if (!currentUserId || !receiverId) return;

      const loadedMessages = await chatService.getConversationMessages(
        currentUserId,
        receiverId,
        50,
        0,
      );

      setMessages(loadedMessages);

      if (currentUserId) {
        await chatService.markMessagesAsRead(receiverId, currentUserId);
      }
    } catch (error) {
      console.error("Failed to load messages:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipantInfo = async () => {
    try {
      const info = await chatService.getUserProfile(receiverId);
      setParticipantInfo(info);
    } catch (error) {
      console.error("Failed to load participant info:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !currentUserId || !receiverId) return;

    try {
      await chatService.sendMessage(receiverId, newMessage.trim());
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
            {participantInfo
              ? `${participantInfo.firstName[0]}${participantInfo.lastName[0]}`
              : "?"}
          </div>
          <div className={styles.chatView__info}>
            <div className={styles.chatView__name}>
              {participantInfo
                ? `${participantInfo.firstName} ${participantInfo.lastName}`
                : "Загрузка..."}
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
