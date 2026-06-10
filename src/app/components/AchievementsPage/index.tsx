"use client";

import { useCallback, useEffect, useState } from "react";

import styles from "./index.module.scss";

import { AchievementsService } from "@/app/http/achievements";
import { AuthService } from "@/app/http/auth";
import { LeadersService } from "@/app/http/leaders";
import type { Achievement, AchievementProgress } from "@/app/http/types/achievements";
import type { LeaderboardEntry, LeaderboardResponse } from "@/app/http/types/leaders";

const RANK_COLORS: Record<number, { background: string; border: string }> = {
  1: { background: "#fff8e1", border: "#f59e0b" },
  2: { background: "#f8fafc", border: "#cbd5e1" },
  3: { background: "#fff7ed", border: "#fdba74" },
};

const LEADERBOARD_PAGE_SIZE = 50;

const getTierColor = (tier: string): string => {
  const tierColors: Record<string, string> = {
    novice: "#379c07",
    advanced: "#3b82f6",
    expert: "#8b5cf6",
    master: "#f59e0b",
    beginner: "#379c07",
    intermediate: "#3b82f6",
    professional: "#8b5cf6",
    legendary: "#f59e0b",
  };

  return tierColors[tier] || "#6b7280";
};

const getTierLabel = (tier: string): string => {
  const tierLabels: Record<string, string> = {
    novice: "Новичок",
    advanced: "Продвинутый",
    expert: "Эксперт",
    master: "Мастер",
    beginner: "Начинающий",
    intermediate: "Средний",
    professional: "Профессионал",
    legendary: "Легенда",
  };

  return tierLabels[tier] || tier;
};

const getRankMark = (rank: number): string => {
  if (rank === 1) return "🥇";

  if (rank === 2) return "🥈";

  if (rank === 3) return "🥉";

  return `#${rank}`;
};

const getLeaderboardAvatarUri = (leader: LeaderboardEntry): string | null => {
  if (!leader.avatarUrl) return null;

  if (leader.avatarUrl.startsWith("data:")) return leader.avatarUrl;

  return `data:${leader.avatarMimeType || "image/jpeg"};base64,${leader.avatarUrl}`;
};

const getInitials = (leader: LeaderboardEntry): string => {
  const initials = [leader.firstName, leader.lastName]
    .map((v) => v?.trim()?.[0] || "")
    .join("")
    .toUpperCase();

  return initials || "ST";
};

const AchievementsPage = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [progress, setProgress] = useState<AchievementProgress | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAchievements = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userData = AuthService.getCurrentUser();
      const auditoryId = userData.userId;

      if (!auditoryId) {
        setError("Пользователь не авторизован");

        return;
      }

      try {
        await AchievementsService.checkAndAwardAchievements(auditoryId);
      } catch {
        // silent
      }

      const [achievementsData, progressData, leaderboardData] = await Promise.all([
        AchievementsService.getAchievementsByAuditoryId(auditoryId),
        AchievementsService.getAchievementProgress(auditoryId),
        LeadersService.getLeaderboard(currentPage),
      ]);

      setAchievements(achievementsData);
      setProgress(progressData);
      setLeaderboard(leaderboardData);
    } catch {
      setError("Не удалось загрузить достижения и рейтинг");
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    void loadAchievements();
  }, [loadAchievements]);

  const handlePageChange = (nextPage: number) => {
    if (!leaderboard) return;

    if (nextPage < 1 || nextPage > leaderboard.totalPages) return;

    if (nextPage === currentPage) return;

    setCurrentPage(nextPage);
  };

  const renderProgressItem = (
    label: string,
    current: number,
    thresholds: { tier: string; required: number }[],
  ) => {
    const nextThreshold = thresholds.find((t) => t.required > current);
    const currentProgress = nextThreshold ? (current / nextThreshold.required) * 100 : 100;

    return (
      <div className={styles.progressItem}>
        <div className={styles.progressLabel}>{label}</div>
        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{ width: `${Math.min(currentProgress, 100)}%` }}
          />
        </div>
        <div className={styles.progressText}>
          {current} / {nextThreshold?.required || "∞"}
        </div>
      </div>
    );
  };

  const renderProgressSection = () => {
    if (!progress) return null;

    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Прогресс</h2>

        {renderProgressItem(
          "Уроки с 2+ звездами",
          progress.studentResults.current,
          progress.studentResults.thresholds,
        )}

        {renderProgressItem(
          "Решенные задачи",
          progress.solvedTasks.current,
          progress.solvedTasks.thresholds,
        )}
      </div>
    );
  };

  const renderMyRankSection = () => {
    const currentUser = leaderboard?.currentUser;

    if (!leaderboard || !currentUser) return null;

    return (
      <div className={styles.myRankCard}>
        <div className={styles.myRankLabel}>Моя позиция</div>
        <div className={styles.myRankName}>{currentUser.fullName}</div>
        <div className={styles.myRankMeta}>
          Уровень {currentUser.level} из {leaderboard.totalStudents} студентов
        </div>

        <div className={styles.myRankStatsRow}>
          <div className={styles.myRankStat}>
            <div className={styles.myRankStatValue}>#{currentUser.rank}</div>
            <div className={styles.myRankStatLabel}>место</div>
          </div>
          <div className={styles.myRankStat}>
            <div className={styles.myRankStatValue}>{currentUser.score}</div>
            <div className={styles.myRankStatLabel}>общий XP</div>
          </div>
        </div>
      </div>
    );
  };

  const renderLeaderboardRow = (leader: LeaderboardEntry) => {
    const isCurrentUser = leaderboard?.currentUser?.clientId === leader.clientId;
    const colors = RANK_COLORS[leader.rank] || {
      background: "#f9fafb",
      border: "#e5e7eb",
    };
    const avatarUri = getLeaderboardAvatarUri(leader);

    return (
      <div
        key={leader.id}
        className={`${styles.leaderboardRow} ${isCurrentUser ? styles.leaderboardRowCurrent : ""}`}
        style={{ backgroundColor: colors.background, borderColor: colors.border }}
      >
        <div className={styles.leaderboardRankBadge}>
          <span className={styles.leaderboardRankText}>{getRankMark(leader.rank)}</span>
        </div>

        {avatarUri ? (
          <img src={avatarUri} alt="" className={styles.leaderboardAvatar} />
        ) : (
          <div className={styles.leaderboardAvatarPlaceholder}>
            <span>{getInitials(leader)}</span>
          </div>
        )}

        <div className={styles.leaderboardInfo}>
          <div className={styles.leaderboardName}>{leader.fullName}</div>
          <div className={styles.leaderboardMeta}>
            Уровень {leader.level}
            {isCurrentUser ? " • это вы" : ""}
          </div>
        </div>

        <div className={styles.leaderboardScore}>
          <div className={styles.leaderboardScoreValue}>{leader.score}</div>
          <div className={styles.leaderboardScoreLabel}>XP</div>
        </div>
      </div>
    );
  };

  const renderLeaderboardSection = () => {
    if (!leaderboard) return null;

    const pageStart = (leaderboard.page - 1) * leaderboard.limit + 1;
    const pageEnd = Math.min(
      leaderboard.page * leaderboard.limit,
      leaderboard.totalStudents,
    );

    return (
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Рейтинг по XP</h2>
        <p className={styles.sectionCaption}>
          Студенты отсортированы по общему опыту, заработанному за решенные задачи.
        </p>

        <div className={styles.leaderboardHeaderRow}>
          <span className={styles.leaderboardPageSummary}>
            {leaderboard.totalStudents > 0
              ? `Показано ${pageStart}-${pageEnd} из ${leaderboard.totalStudents}`
              : "Пока нет студентов в рейтинге"}
          </span>
          <span className={styles.leaderboardPageSummary}>
            По {LEADERBOARD_PAGE_SIZE} на страницу
          </span>
        </div>

        {renderMyRankSection()}

        {leaderboard.leaders.length > 0 ? (
          <div className={styles.leaderboardList}>
            {leaderboard.leaders.map(renderLeaderboardRow)}
          </div>
        ) : (
          <div className={styles.emptyBlock}>
            <p className={styles.emptyText}>
              Рейтинг пока пуст. Решите первую задачу, чтобы попасть в таблицу лидеров.
            </p>
          </div>
        )}

        {leaderboard.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={`${styles.paginationButton} ${leaderboard.page === 1 ? styles.paginationButtonDisabled : ""}`}
              disabled={leaderboard.page === 1}
              onClick={() => handlePageChange(leaderboard.page - 1)}
            >
              Назад
            </button>

            <span className={styles.paginationText}>
              Страница {leaderboard.page} из {leaderboard.totalPages}
            </span>

            <button
              className={`${styles.paginationButton} ${leaderboard.page === leaderboard.totalPages ? styles.paginationButtonDisabled : ""}`}
              disabled={leaderboard.page === leaderboard.totalPages}
              onClick={() => handlePageChange(leaderboard.page + 1)}
            >
              Вперед
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAchievementCard = (item: Achievement) => (
    <div key={item.id} className={styles.achievementCard}>
      {item.image && item.image.startsWith("http") ? (
        <img src={item.image} alt="" className={styles.achievementImage} />
      ) : (
        <div
          className={styles.achievementImageFallback}
          style={{ backgroundColor: getTierColor(item.tier) }}
        >
          🏆
        </div>
      )}

      <div className={styles.achievementContent}>
        <h3 className={styles.achievementTitle}>{item.title}</h3>
        <p className={styles.achievementDescription}>{item.description}</p>
        <span className={styles.achievementTier} style={{ color: getTierColor(item.tier) }}>
          {getTierLabel(item.tier)}
        </span>
        <span className={styles.achievementDate}>
          Получено:{" "}
          {new Date(item.earnedAt).toLocaleDateString("ru-RU", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );

  const renderAchievementsSection = () => (
    <div className={styles.sectionBlock}>
      <h2 className={styles.sectionTitle}>Достижения</h2>

      {achievements.length > 0 ? (
        achievements.map(renderAchievementCard)
      ) : (
        <div className={styles.emptyBlock}>
          <div className={styles.emptyIcon}>🏆</div>
          <p className={styles.emptyText}>
            Пока нет достижений. Проходите уроки и решайте задачи, чтобы открыть первые награды.
          </p>
        </div>
      )}
    </div>
  );

  if (loading && !leaderboard && achievements.length === 0) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loadingContainer}>
            <div className={styles.loader} />
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.page}>
        <div className={styles.container}>
          <div className={styles.errorContainer}>
            <div className={styles.errorIcon}>⚠️</div>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryButton} onClick={loadAchievements}>
              Попробовать снова
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page}>
      <div className={styles.container}>
        {renderProgressSection()}
        {renderLeaderboardSection()}
        {renderAchievementsSection()}
      </div>
    </section>
  );
};

export default AchievementsPage;
