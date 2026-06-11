"use client";

import type { CSSProperties } from "react";

import styles from "./index.module.scss";

import type { CertificateResponse } from "@/app/http/certificate";

const CONFETTI_PIECES = Array.from({ length: 24 }, (_, index) => ({
  id: index,
  left: `${(index * 4.17).toFixed(2)}%`,
  delay: `${(index % 6) * 0.12}s`,
  duration: `${3 + (index % 4) * 0.35}s`,
  rotation: `${(index * 19) % 360}deg`,
  color: ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#8338ec", "#fb5607"][index % 6],
}));

type CertificateAwardModalProps = {
  certificate: CertificateResponse;
  isOpen: boolean;
  showConfetti?: boolean;
  onClose: () => void;
  onOpenCertificate?: () => void;
};

export default function CertificateAwardModal({
  certificate,
  isOpen,
  showConfetti = true,
  onClose,
  onOpenCertificate,
}: CertificateAwardModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleOpenCertificate = () => {
    if (onOpenCertificate) {
      onOpenCertificate();

      return;
    }

    window.open(certificate.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(event) => event.stopPropagation()}>
        {showConfetti ? (
          <div className={styles.confettiLayer} aria-hidden="true">
            {CONFETTI_PIECES.map((piece) => (
              <span
                key={piece.id}
                className={styles.confettiPiece}
                style={
                  {
                    left: piece.left,
                    animationDelay: piece.delay,
                    animationDuration: piece.duration,
                    backgroundColor: piece.color,
                    transform: `rotate(${piece.rotation})`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        ) : null}

        <button type="button" className={styles.closeButton} onClick={onClose}>
          ×
        </button>

        <p className={styles.modalType}>Сертификат готов</p>
        <h2 className={styles.modalTitle}>Курс завершён</h2>
        <p className={styles.modalDescription}>
          Вы завершили курс «{certificate.courseName}» минимум на 90% звёзд. Сертификат уже создан
          и доступен для просмотра.
        </p>

        <img
          src={certificate.url}
          alt={`Сертификат курса ${certificate.courseName}`}
          className={styles.certificateImage}
        />

        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Позже
          </button>
          <button type="button" className={styles.primaryButton} onClick={handleOpenCertificate}>
            Открыть сертификат
          </button>
        </div>
      </div>
    </div>
  );
}
