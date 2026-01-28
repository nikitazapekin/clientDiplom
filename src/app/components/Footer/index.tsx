import styles from "./index.module.scss";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footer__container}>
        <div className={styles.footer__copyright}>© {currentYear} AlgoLab. Все права защищены.</div>
      </div>
    </footer>
  );
};

export default Footer;
