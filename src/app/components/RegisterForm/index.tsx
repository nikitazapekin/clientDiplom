"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "@assets/logo/logo.png";
import Button from "@components/Button/";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { z } from "zod";

import styles from "./index.module.scss";

const registerSchema = z.object({
  name: z
    .string()
    .min(2, "Имя должно содержать минимум 2 символа")
    .max(50, "Имя слишком длинное")
    .regex(/^[a-zA-Zа-яА-ЯёЁ\s]+$/, "Имя может содержать только буквы и пробелы"),
  email: z.string().min(1, "Почта обязательна").email("Некорректный формат почты"),
  password: z
    .string()
    .min(6, "Пароль должен содержать минимум 6 символов")
    .regex(/[A-Z]/, "Пароль должен содержать хотя бы одну заглавную букву")
    .regex(/[0-9]/, "Пароль должен содержать хотя бы одну цифру"),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      console.log("Register form data:", data);
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className={styles.form}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Регистрация</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        <div className={styles.form__inputs}>
          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Имя</label>
              {errors.name && <p className={styles.form__error}>{errors.name.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите имя"
              type="text"
              disabled={isLoading}
              {...register("name")}
            />
          </div>

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
          text={isLoading ? "Регистрация..." : "Регистрация"}
          color="#9f0fa7"
          onClick={handleSubmit(onSubmit)}
          textColor="#fff"
          width="413px"
        />

        <Button
          text="Вход"
          color="#d8d8d8"
          onClick={() => {
            console.log("Go to login");
          }}
          textColor="#000"
          width="413px"
        />
      </form>
    </section>
  );
};

export default RegisterForm;
