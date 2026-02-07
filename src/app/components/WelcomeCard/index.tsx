"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

import styles from "./index.module.scss";
import type { WelcomeCardProps } from "./types";

const WelcomeCard = ({ item }: WelcomeCardProps) => {
  const router = useRouter();
  const handleRedirect = () => {
    router.push(item.path);
  };

  return (
    <div className={styles.card} onClick={handleRedirect}>
      <h3 className={styles.card__subtitle}>{item.title}</h3>
      <div className={styles.card__wrapper}>
        <Image className={styles.card__icon} src={item.image} alt="icon" />
      </div>

      <div className={styles.card__cubes}>
        <div className={styles.card__cubesWrapper}>
          <div className={`${styles.card__cube}  ${styles.card__cube1}`} />
          <div className={`${styles.card__cube}  ${styles.card__cube2}`} />
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
