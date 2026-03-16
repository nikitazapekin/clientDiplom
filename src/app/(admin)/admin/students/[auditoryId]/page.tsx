"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProfileService } from "@/app/http/profile";
import { CertificateService, type CertificateResponse } from "@/app/http/certificate";
import { CodingTasksService, type CodeTask, type StudentLevel } from "@/app/http/codingTasksService";
import type { FullClientInfo } from "@/app/http/types/profile";
import styles from "./page.module.scss";

const DIFFICULTIES: Record<string, { label: string; color: string }> = {
  easy: { label: "Легкий", color: "#4caf50" },
  medium: { label: "Средний", color: "#ff9800" },
  hard: { label: "Сложный", color: "#f44336" },
};

const StudentProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const auditoryId = params.auditoryId as string;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log("StudentProfilePage rendered, params:", params);
      console.log("Current URL:", window.location.href);
      console.log("Token in localStorage:", localStorage.getItem("accessToken") ? "exists" : "missing");
      console.log("User role:", localStorage.getItem("userRole"));
    }
  }, [params]);
  
 

  const [profile, setProfile] = useState<FullClientInfo | null>(null);
  const [certificates, setCertificates] = useState<CertificateResponse[]>([]);
  const [certificatesLoading, setCertificatesLoading] = useState(false);
  const [activeCertIndex, setActiveCertIndex] = useState(0);
  
  const [allTasks, setAllTasks] = useState<CodeTask[]>([]);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const certSliderRef = useRef<HTMLDivElement>(null);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!auditoryId) {
        setError("ID студента не указан");
        return;
      }

      const profileData = await ProfileService.getFullProfileByAuditoryId(auditoryId);

      if (profileData.avatar) {
        if (profileData.avatar.imageUrl && !profileData.avatar.imageUrl.startsWith("data:")) {
          profileData.avatar.imageUrl = `data:${profileData.avatar.mimeType};base64,${profileData.avatar.imageUrl}`;
        }
      }

      setProfile(profileData);

      setCertificatesLoading(true);
      try {
        const certs = await CertificateService.getCertificatesByAuditoryId(auditoryId);
        setCertificates(certs);
      } catch (certErr) {
        console.error("Failed to load certificates:", certErr);
      } finally {
        setCertificatesLoading(false);
      }

      setTasksLoading(true);
      try {
        const [tasksData, levelData] = await Promise.all([
          CodingTasksService.getAllTasks(),
          CodingTasksService.getStudentLevel().catch(() => null),
        ]);
        setAllTasks(tasksData);
        setStudentLevel(levelData);
      } catch (tasksErr) {
        console.error("Failed to load tasks:", tasksErr);
      } finally {
        setTasksLoading(false);
      }
    } catch (err: any) {
      console.error("loadProfile error:", err);
      console.error("Error response:", err.response);
      setError(err.message || "Не удалось загрузить профиль");
    } finally {
      setLoading(false);
    }
  }, [auditoryId]);

  useEffect(() => {
    console.log("StudentProfilePage: useEffect triggered, loading profile...");
    console.log("loadProfile function:", loadProfile);
    loadProfile();
  }, [loadProfile]);

  const getSolvedTasks = () => {
    if (!studentLevel?.solvedTasks) return [];
    return studentLevel.solvedTasks
      .map((solved) => {
        const task = allTasks.find((t) => t.id === solved.codeTaskId);
        return task ? { ...task, solvedAt: solved.solvedAt } : null;
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b!.solvedAt).getTime() - new Date(a!.solvedAt).getTime());
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ru-RU", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Сегодня";
    if (diffDays === 1) return "Вчера";
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  const handleScroll = (direction: "prev" | "next") => {
    if (!certSliderRef.current) return;
    const scrollAmount = 320;
    certSliderRef.current.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  const solvedTasks = getSolvedTasks();
  const displayTasks = showAllTasks ? solvedTasks : solvedTasks.slice(0, 5);

  if (loading) {
    return <div className={styles.loading}>Загрузка профиля...</div>;
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorText}>{error}</div>
        <button className={styles.retryButton} onClick={loadProfile}>
          Повторить
        </button>
        <button className={styles.backButton} onClick={() => router.back()}>
          Назад к списку
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorText}>Данные профиля недоступны</div>
        <button className={styles.backButton} onClick={() => router.back()}>
          Назад к списку
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <button className={styles.backButton} onClick={() => router.back()}>
        ← Назад к списку студентов
      </button>

      <div className={styles.header}>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatarContainer}>
            {profile.avatar ? (
              <img src={profile.avatar.imageUrl} alt="Avatar" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                <span className={styles.avatarPlaceholderText}>
                  {profile.firstName?.[0]}{profile.lastName?.[0]}
                </span>
              </div>
            )}
          </div>
        </div>

        <h1 className={styles.name}>
          {profile.firstName} {profile.lastName}
          {profile.middleName ? ` ${profile.middleName}` : ""}
        </h1>

        <div className={styles.emailContainer}>
          <span className={styles.email}>{profile.email}</span>
        </div>

        <div className={`${styles.statusBadge} ${profile.isActive ? styles.statusActive : styles.statusInactive}`}>
          <span className={styles.statusText}>
            {profile.isActive ? "Активен" : "Не активен"}
          </span>
        </div>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statItem}>
          <span className={styles.statValue}>{solvedTasks.length}</span>
          <span className={styles.statLabel}>Решено задач</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{studentLevel?.level || 1}</span>
          <span className={styles.statLabel}>Уровень</span>
        </div>
        <div className={styles.statDivider} />
        <div className={styles.statItem}>
          <span className={styles.statValue}>{studentLevel?.experience || 0}</span>
          <span className={styles.statLabel}>Опыт</span>
        </div>
      </div>

      {certificatesLoading ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Сертификаты</h2>
          <div className={styles.loadingSmall}>Загрузка сертификатов...</div>
        </div>
      ) : certificates.length > 0 ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Сертификаты</h2>
          <div className={styles.certSliderContainer}>
            <button 
              className={styles.certNavButton} 
              onClick={() => handleScroll("prev")}
              disabled={activeCertIndex === 0}
            >
              ←
            </button>
            <div 
              className={styles.certSlider} 
              ref={certSliderRef}
              onScroll={(e) => {
                const scrollLeft = e.currentTarget.scrollLeft;
                const index = Math.round(scrollLeft / 320);
                setActiveCertIndex(index);
              }}
            >
              {certificates.map((cert) => (
                <div key={cert.id} className={styles.certSlide}>
                  <img src={cert.url} alt="Certificate" className={styles.certImage} />
                  <span className={styles.certDate}>{formatDate(cert.date)}</span>
                </div>
              ))}
            </div>
            <button 
              className={styles.certNavButton} 
              onClick={() => handleScroll("next")}
              disabled={activeCertIndex === certificates.length - 1}
            >
              →
            </button>
          </div>
          {certificates.length > 1 && (
            <div className={styles.certDots}>
              {certificates.map((_, i) => (
                <span
                  key={i}
                  className={`${styles.certDot} ${i === activeCertIndex ? styles.certDotActive : ""}`}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Личная информация</h2>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Телефон</span>
            <span className={styles.infoItemValue}>{profile.phone || "-"}</span>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Страна</span>
            <span className={styles.infoItemValue}>{profile.country || "-"}</span>
          </div>
          {profile.description && (
            <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
              <span className={styles.infoItemLabel}>Описание</span>
              <span className={styles.infoItemValue}>{profile.description}</span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>Зарегистрирован</span>
            <span className={styles.infoItemValue}>{formatDate(profile.registeredAt)}</span>
          </div>
          {profile.lastLoginAt && (
            <div className={styles.infoItem}>
              <span className={styles.infoItemLabel}>Последний вход</span>
              <span className={styles.infoItemValue}>
                {new Date(profile.lastLoginAt).toLocaleDateString("ru-RU", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoItemLabel}>ID (Auditory)</span>
            <span className={styles.infoItemValue}>{profile.auditoryId}</span>
          </div>
        </div>
      </div>

      {tasksLoading ? (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Решенные задачи</h2>
          <div className={styles.loadingSmall}>Загрузка задач...</div>
        </div>
      ) : solvedTasks.length > 0 ? (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Решенные задачи</h2>
            {solvedTasks.length > 5 && (
              <button 
                className={styles.viewAllButton}
                onClick={() => setShowAllTasks(!showAllTasks)}
              >
                {showAllTasks ? "Скрыть" : `Показать все (${solvedTasks.length})`}
              </button>
            )}
          </div>
          <div className={styles.tasksList}>
            {displayTasks.map((task: any) => {
              const diffInfo = DIFFICULTIES[task.difficulty] || DIFFICULTIES.easy;
              return (
                <div key={task.id} className={styles.taskCard}>
                  <div className={styles.taskHeader}>
                    <span className={styles.taskTitle}>✅ {task.title}</span>
                    <span className={`${styles.taskBadge}`} style={{ backgroundColor: diffInfo.color }}>
                      {diffInfo.label}
                    </span>
                  </div>
                  <p className={styles.taskDesc} style={{ 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>{task.description}</p>
                  <div className={styles.taskFooter}>
                    <span className={styles.taskMeta}>
                      {task.languages?.join(", ")} | {task.testCases?.length ?? 0} тестов
                    </span>
                    <span className={styles.taskXp}>+{task.experienceReward} XP</span>
                  </div>
                  <div className={styles.taskFooter}>
                    <span className={styles.taskAuthor}>Автор: {task.authorName}</span>
                    <span className={styles.taskSolvedDate}>{formatDateShort(task.solvedAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Решенные задачи</h2>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>💻</span>
            <span className={styles.emptyText}>У студента пока нет решенных задач</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfilePage;
