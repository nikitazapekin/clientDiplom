"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import Logo from "@assets/logo/logo.png";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { z } from "zod";

import styles from "./index.module.scss";

import AuthService from "@/app/http/auth";

const loginSchema = z.object({
  email: z.string().min(1, "Почта обязательна").email("Некорректный формат почты"),
  password: z.string().min(6, "Пароль должен содержать минимум 6 символов"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const router = useRouter();

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
    setLoginError(null);

    try {
      console.log("Login attempt for:", data.email);

      const authResponse = await AuthService.login(data);

      console.log("RESSP", authResponse);

      if (authResponse.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/dashboard");
      }

      router.refresh();
    } catch (error: any) {
      let errorMessage = "Ошибка при входе";

      if (error.message) {
        errorMessage = error.message;

        if (
          error.message.includes("Invalid credentials") ||
          error.message.includes("Неверные учетные данные")
        ) {
          errorMessage = "Неверный email или пароль";
        } else if (
          error.message.includes("User not found") ||
          error.message.includes("Пользователь не найден")
        ) {
          errorMessage = "Пользователь с таким email не найден";
        } else if (
          error.message.includes("Registration failed") ||
          error.message.includes("Login failed")
        ) {
          errorMessage = "Ошибка сервера. Попробуйте позже";
        }
      }

      setLoginError(errorMessage);

      if (error.response?.status === 401) {
        AuthService.logout().catch(console.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationClick = () => {
    router.push("/register");
  };

  return (
    <section className={styles.form}>
      <form onSubmit={handleSubmit(onSubmit)} className={styles.form__content}>
        <div className={styles.form__preview}>
          <h1 className={styles.form__title}>Вход</h1>
          <Image src={Logo} alt="Logo" />
        </div>

        {loginError && <div className={styles.form__errorMessage}>{loginError}</div>}

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
          {isLoading ? "Вход..." : "Войти"}
        </button>

        <div className={styles.form__divider}>
          <span>Или</span>
        </div>

        <button
          type="button"
          onClick={handleRegistrationClick}
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
          }}
        >
          Зарегистрироваться
        </button>
      </form>
    </section>
  );
};

export default LoginForm;

/*

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
        */
