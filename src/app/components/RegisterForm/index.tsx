"use client";

import Logo from "@assets/logo/logo.png";
import Button from "@components/Button/";
import Image from "next/image";

import styles from "./index.module.scss";

const RegisterForm = () => {
  const handleSubmit = () => {};

  return (
    <section className={styles.form}>
      <div className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Вход</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        <div className={styles.form__inputs}>
          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Имя</label>
              <p className={styles.form__error}>error</p>
            </div>
            <input className={styles.form__input} placeholder="Введите имя" required />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Почта</label>
              <p className={styles.form__error}>error</p>
            </div>
            <input className={styles.form__input} placeholder="Введите почту" required />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Пароль</label>
              <p className={styles.form__error}>error</p>
            </div>
            <input className={styles.form__input} placeholder="Введите пароль" required />
          </div>
        </div>
        <Button
          text={"Регистрация"}
          color={"#9f0fa7;"}
          onClick={handleSubmit}
          textColor={"#fff"}
          width="413px"
        />

        <Button
          text={"Вход"}
          color={"#d8d8d8;"}
          onClick={handleSubmit}
          textColor={"#000"}
          width="413px"
        />
      </div>
    </section>
  );
};

export default RegisterForm;
