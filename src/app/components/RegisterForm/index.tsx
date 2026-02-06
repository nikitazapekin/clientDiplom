"use client";

import { useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import Logo from "@assets/logo/logo.png";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";

import styles from "./index.module.scss";

import AuthService from "@/app/http/auth";

const registerSchema = z
  .object({
    email: z.string().min(1, "Почта обязательна").email("Некорректный формат почты"),
    password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
    confirmPassword: z.string().min(1, "Подтвердите пароль"),
    firstName: z.string().min(1, "Имя обязательно"),
    lastName: z.string().min(1, "Фамилия обязательна"),
    middleName: z.string().optional(),
    phone: z.string().min(1, "Телефон обязателен"),
    country: z.string().min(1, "Страна обязательна"),
    // role полностью убрано
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

const RegisterForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      middleName: "",
      phone: "",
      country: "",
    },
  });

  const onSubmit: SubmitHandler<RegisterFormData> = async (data) => {
    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const { confirmPassword, ...registerData } = data;

      const dataToSend = {
        ...registerData,
        role: "client" as const,
      };

      const response = await AuthService.register(dataToSend);

      console.log(response);
      setSuccess("Регистрация успешна! Вы будете перенаправлены...");

      setTimeout(() => {
        router.push("/login?registered=true");
      }, 2000);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Ошибка регистрации. Пожалуйста, попробуйте снова.");
    } finally {
      setIsLoading(false);
    }
  };

  const password = watch("password");

  return (
    <section className={styles.form}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Регистрация</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        {error && <div className={styles.form__errorMessage}>{error}</div>}

        {success && <div className={styles.form__successMessage}>{success}</div>}

        <div className={styles.form__inputs}>
          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Почта*</label>
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
              <label className={styles.form__label}>Пароль*</label>
              {errors.password && <p className={styles.form__error}>{errors.password.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите пароль (минимум 6 символов)"
              type="password"
              disabled={isLoading}
              {...register("password")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Подтвердите пароль*</label>
              {errors.confirmPassword && (
                <p className={styles.form__error}>{errors.confirmPassword.message}</p>
              )}
            </div>
            <input
              className={styles.form__input}
              placeholder="Повторите пароль"
              type="password"
              disabled={isLoading}
              {...register("confirmPassword")}
            />
            {password && watch("confirmPassword") && password !== watch("confirmPassword") && (
              <p className={styles.form__error}>Пароли не совпадают</p>
            )}
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Имя*</label>
              {errors.firstName && <p className={styles.form__error}>{errors.firstName.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите имя"
              type="text"
              disabled={isLoading}
              {...register("firstName")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Фамилия*</label>
              {errors.lastName && <p className={styles.form__error}>{errors.lastName.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите фамилию"
              type="text"
              disabled={isLoading}
              {...register("lastName")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Отчество</label>
              {errors.middleName && (
                <p className={styles.form__error}>{errors.middleName.message}</p>
              )}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите отчество (необязательно)"
              type="text"
              disabled={isLoading}
              {...register("middleName")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Телефон*</label>
              {errors.phone && <p className={styles.form__error}>{errors.phone.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="+7 (999) 123-45-67"
              type="tel"
              disabled={isLoading}
              {...register("phone")}
            />
          </div>

          <div className={styles.form__panel}>
            <div className={styles.form__subpreview}>
              <label className={styles.form__label}>Страна*</label>
              {errors.country && <p className={styles.form__error}>{errors.country.message}</p>}
            </div>
            <input
              className={styles.form__input}
              placeholder="Введите страну"
              type="text"
              disabled={isLoading}
              {...register("country")}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={styles.submitButton}
          style={{
            backgroundColor: "#9f0fa7",
            color: "#fff",
            width: "413px",
            padding: "12px",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "500",
            cursor: isLoading ? "not-allowed" : "pointer",
            opacity: isLoading ? 0.7 : 1,
          }}
        >
          {isLoading ? "Регистрация..." : "Зарегистрироваться"}
        </button>

        <Link href="/login">
          <button
            type="button"
            className={styles.linkButton}
            style={{
              backgroundColor: "#d8d8d8",
              color: "#000",
              width: "413px",
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "500",
              cursor: "pointer",
              marginTop: "10px",
            }}
          >
            Уже есть аккаунт? Войти
          </button>
        </Link>
      </form>
    </section>
  );
};

export default RegisterForm;
