"use client";

import Logo from "@assets/logo/logo.png";
import Button from "@components/Button/";
import Image from "next/image";

import styles from "./index.module.scss";

const LoginForm = () => {
  const handleSubmit = () => {};

  return (
    <section className={styles.form}>
      <div className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Вход</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        <Button
          text={"Вход"}
          color={"#9f0fa7;"}
          onClick={handleSubmit}
          textColor={"#fff"}
          width="413px"
        />

        <Button
          text={"Регистрация"}
          color={"#d8d8d8;"}
          onClick={handleSubmit}
          textColor={"#000"}
          width="413px"
        />
      </div>
    </section>
  );
};

export default LoginForm;
