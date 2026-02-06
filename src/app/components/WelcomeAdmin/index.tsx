import WelcomeCard from "../WelcomeCard";

import styles from "./index.module.scss";

import { adminNavigation } from "@/app/constants";

const WelcomeAdmin = () => {
  return (
    <div className={styles.courses}>
      <div className={styles.courses__container}>
        <h1 className={styles.courses__title}>Добро пожаловать в AlgoLab HRM</h1>

        <div className={styles.courses__smileys}>
          <div className={styles.courses__smiley}>
            <span>😊</span>
          </div>
          <div className={styles.courses__smiley}>
            <span>🙌</span>
          </div>
          <div className={styles.courses__smiley}>
            <span>📖</span>
          </div>
          <div className={styles.courses__smiley}>
            <span>👁️</span>
          </div>
        </div>

        <div className={styles.courses__description}>
          <p className={styles.courses__text}>Создание и редактирование учебных материалов</p>
          <div className={styles.courses__round} />

          <p className={styles.courses__text}>Удобная единая система управления</p>
          <div className={styles.courses__round} />
          <p className={styles.courses__text}>Управление над студентами</p>
        </div>

        <div className={styles.courses__cards}>
          {adminNavigation.map((item) => (
            <WelcomeCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default WelcomeAdmin;
