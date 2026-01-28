import Logo from "@assets/logo/logo.png";
import Image from "next/image";

import styles from "./index.module.scss";

const Header = () => {
  return (
    <header className={styles.header}>
      <div className={styles.header__container}>
        <Image src={Logo} alt="Logo" />

        <nav className={styles.header__nav}>
          <ul className={styles.header__list}>
            <li className={styles.header__item}>Проблемы</li>
            <li className={styles.header__item}>Учиться</li>
            <li className={styles.header__item}>Аккаунт</li>
            <li className={styles.header__item}>Статьи</li>
            <li className={styles.header__item}>Сообщения</li>
            <li className={styles.header__item}>
              <div className={styles.header__logout}>Выход</div>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
