import WelcomeCard from "@components/WelcomeCard";

import styles from "./index.module.scss";

import { homepageNavigation } from "@/app/constants";

const WelcomeComponent = () => {
  return (
    <section className={styles.welcome}>
      <div className={styles.welcome__container}>
        <div className={styles.welcome__preview}>
          <h1 className={styles.welcome__title}>Добро пожаловать!</h1>

          <h2 className={styles.welcome__description}>Куда направимся?</h2>
        </div>
        <div className={styles.welcome__cards}>
          {homepageNavigation.map((item) => (
            <WelcomeCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default WelcomeComponent;
