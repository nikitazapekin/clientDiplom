import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios from "axios";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://31.128.40.81:3002";

const BASE_URL = API_BASE_URL;

const isBrowser = typeof window !== "undefined";

export const $api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

class TokenManager {
  static getAccessToken(): string | null {
    if (!isBrowser) return null;

    return localStorage.getItem("accessToken");
  }

  static setAccessToken(token: string): void {
    if (!isBrowser) return;

    localStorage.setItem("accessToken", token);
  }

  static removeAccessToken(): void {
    if (!isBrowser) return;

    localStorage.removeItem("accessToken");
  }

  static setUserData(data: { role: string; email: string; userId: string }): void {
    if (!isBrowser) return;

    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("userId", data.userId);
  }

  static getUserData(): { role: string | null; email: string | null; userId: string | null } {
    if (!isBrowser) return { role: null, email: null, userId: null };

    return {
      role: localStorage.getItem("userRole"),
      email: localStorage.getItem("userEmail"),
      userId: localStorage.getItem("userId"),
    };
  }

  static clearAll(): void {
    if (!isBrowser) return;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
  }
}

$api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isBrowser) {
      const token = TokenManager.getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

$api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _skipRedirect?: boolean;
    };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      TokenManager.clearAll();

      if (isBrowser && window.location.pathname !== "/login" && !originalRequest._skipRedirect) {
        window.location.href = "/login?session=expired";
      }
    }

    return Promise.reject(error);
  }
);

export const setBaseUrl = (url: string) => {
  $api.defaults.baseURL = url;
};

export const getBaseUrl = () => $api.defaults.baseURL;

export const $apiNoRedirect = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000,
  maxRedirects: 0,
  validateStatus: (status) => status < 500,
  headers: {
    "Content-Type": "application/json",
  },
});

$apiNoRedirect.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (isBrowser) {
      const token = TokenManager.getAccessToken();

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

$apiNoRedirect.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status === 302) {
      console.log("Redirect detected:", error.response.headers.location);
    }

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      TokenManager.clearAll();
    }

    return Promise.reject(error);
  }
);

export default $api;
