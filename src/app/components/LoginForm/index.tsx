"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "@assets/logo/logo.png";
import Button from "@components/Button/";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { z } from "zod";

import styles from "./index.module.scss";

const loginSchema = z.object({
  email: z.string().min(1, "Почта обязательна").email("Некорректный формат почты"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      console.log("Form data:", data);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.form}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Вход</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        <div className={styles.form__inputs}>
          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Почта</label>
              {errors.email && <p className={styles.form__error}>{errors.email.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите почту"
              type="email"
              disabled={isLoading}
              {...register("email")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Пароль</label>
              {errors.password && <p className={styles.form__error}>{errors.password.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите пароль"
              type="password"
              disabled={isLoading}
              {...register("password")}
            />
          </div>
        </div>

        <Button
          text={isLoading ? "Загрузка..." : "Вход"}
          color="#9f0fa7"
          onClick={handleSubmit(onSubmit)}
          textColor="#fff"
          width="413px"
        />

        <Button
          text="Регистрация"
          color="#d8d8d8"
          onClick={() => {
            console.log("Go to registration");
          }}
          textColor="#000"
          width="413px"
        />
      </form>
    </section>
  );
};

export default LoginForm;
