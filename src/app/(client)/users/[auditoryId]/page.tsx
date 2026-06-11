"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import styles from "./page.module.scss";

import Button from "@/app/components/Button";
import StudentLevelWheel from "@/app/components/StudentLevelWheel";
import { AuthService } from "@/app/http/auth";
import { CodingTasksService, type StudentLevel } from "@/app/http/codingTasksService";
import { getErrorMessage } from "@/app/http/errorUtils";
import { ProfileService } from "@/app/http/profile";
import type { FullClientInfo } from "@/app/http/types/profile";

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const auditoryId = params.auditoryId as string;

  const [profile, setProfile] = useState<FullClientInfo | null>(null);
  const [studentLevel, setStudentLevel] = useState<StudentLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = AuthService.getCurrentUser().userId;
  const isOwnProfile = currentUserId === auditoryId;

  const loadProfile = useCallback(async () => {
    if (!auditoryId) {
      setError("Профиль не найден");
      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const profileData = await ProfileService.getFullProfileByAuditoryId(auditoryId);

      if (profileData.avatar?.imageUrl && !profileData.avatar.imageUrl.startsWith("data:")) {
        profileData.avatar.imageUrl = `data:${profileData.avatar.mimeType};base64,${profileData.avatar.imageUrl}`;
      }

      setProfile(profileData);

      const level = await CodingTasksService.getStudentLevelByClientId(profileData.clientId).catch(
        () => null,
      );

      setStudentLevel(level);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Не удалось загрузить профиль"));
    } finally {
      setLoading(false);
    }
  }, [auditoryId]);

  useEffect(() => {
    if (isOwnProfile) {
      router.replace("/account");

      return;
    }

    void loadProfile();
  }, [isOwnProfile, loadProfile, router]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка профиля...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className={styles.page}>
        <button type="button" className={styles.backBtn} onClick={() => router.back()}>
          Назад
        </button>
        <div className={styles.error}>{error || "Профиль не найден"}</div>
      </div>
    );
  }

  const fullName = [profile.firstName, profile.middleName, profile.lastName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.page}>
      <button type="button" className={styles.backBtn} onClick={() => router.back()}>
        Назад
      </button>

      <div className={styles.card}>
        <div className={styles.header}>
          {profile.avatar?.imageUrl ? (
            <img src={profile.avatar.imageUrl} alt="" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              {profile.firstName?.[0]}
              {profile.lastName?.[0]}
            </div>
          )}

          <h1 className={styles.name}>{fullName || "Студент"}</h1>
          <p className={styles.email}>{profile.email}</p>
        </div>

        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{profile.totalLessons}</span>
            <span className={styles.statLabel}>Уроков</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{studentLevel?.solvedTasks?.length ?? 0}</span>
            <span className={styles.statLabel}>Задач</span>
          </div>
        </div>

        {profile.description ? (
          <div className={styles.description}>
            <h2>О себе</h2>
            <p>{profile.description}</p>
          </div>
        ) : null}

        <div className={styles.actions}>
          <Button
            color="#9F0FA7"
            textColor="#fff"
            text="Написать сообщение"
            onClick={() => router.push(`/messages/${auditoryId}`)}
            width="auto"
          />
        </div>

        <div className={styles.levelSection}>
          <StudentLevelWheel
            level={studentLevel?.level ?? 1}
            experience={studentLevel?.experience ?? 0}
          />
        </div>
      </div>
    </div>
  );
}
