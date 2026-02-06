import $api from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  phone: string;
  country: string;
  description?: string;
  role?: "client" | "admin";
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  tokenType: string;
  userId: string;
  email: string;
  role: "client" | "admin";
  fullName: string;
}

export interface ValidateResponse {
  isValid: boolean;
  expiresAt?: string;
  userId?: string;
  email?: string;
  role?: string;
}

export interface UserData {
  accessToken: string | null;
  role: string | null;
  email: string | null;
  userId: string | null;
}

class TokenManager {
  static getAccessToken(): string | null {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("accessToken");
  }

  static setAccessToken(token: string): void {
    if (typeof window === "undefined") return;

    console.log("TOKEN", token);
    localStorage.setItem("accessToken", token);
  }

  static getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;

    return localStorage.getItem("refreshToken");
  }

  static setRefreshToken(token: string): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("refreshToken", token);
  }

  static setUserData(data: { role: string; email: string; userId: string }): void {
    if (typeof window === "undefined") return;

    localStorage.setItem("userRole", data.role);
    localStorage.setItem("userEmail", data.email);
    localStorage.setItem("userId", data.userId);
  }

  static getUserData(): UserData {
    if (typeof window === "undefined") {
      return { accessToken: null, role: null, email: null, userId: null };
    }

    return {
      accessToken: localStorage.getItem("accessToken"),
      role: localStorage.getItem("userRole"),
      email: localStorage.getItem("userEmail"),
      userId: localStorage.getItem("userId"),
    };
  }

  static clearAll(): void {
    if (typeof window === "undefined") return;

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userId");
  }
}

export class AuthService {
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await $api.post("/auth/login", credentials);
      const apiResponse = response.data;
      const data = apiResponse.data;

      console.log("Full API response:", apiResponse);
      console.log("Auth data:", data);
      console.log("ACCESS", data.accessToken);

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        console.log("Access token saved:", data.accessToken);
      }

      if (data.refreshToken) {
        if (typeof window !== "undefined") {
          localStorage.setItem("refreshToken", data.refreshToken);
          console.log("Refresh token saved:", data.refreshToken);
        }
      }

      if (data.role && data.email && data.userId) {
        if (typeof window !== "undefined") {
          localStorage.setItem("userRole", data.role);
          localStorage.setItem("userEmail", data.email);
          localStorage.setItem("userId", data.userId);
          console.log("User data saved:", {
            role: data.role,
            email: data.email,
            userId: data.userId,
          });
        }
      }

      return data;
    } catch (error: any) {
      console.error("Login error:", error);
      throw new Error(error.response?.data?.message || "Login failed");
    }
  }

  static async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      console.log("Registering user:", userData.email);

      const response = await $api.post("/auth/register", userData);
      const apiResponse = response.data;
      const data = apiResponse.data;

      if (data.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.accessToken);
      }

      if (data.refreshToken && typeof window !== "undefined") {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      if (data.role && data.email && data.userId && typeof window !== "undefined") {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userEmail", data.email);
        localStorage.setItem("userId", data.userId);
      }

      return data;
    } catch (error: any) {
      console.error("Registration error:", error);
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  }

  static async validateToken(token: string): Promise<ValidateResponse> {
    try {
      const response = await $api.post("/auth/validate", { token });
      const apiResponse = response.data;

      return apiResponse.data || { isValid: false };
    } catch {
      return { isValid: false };
    }
  }

  static async refreshToken(): Promise<string> {
    try {
      const refreshToken = TokenManager.getRefreshToken();

      if (!refreshToken) {
        throw new Error("No refresh token available");
      }

      const response = await $api.post("/auth/refresh", {
        refreshToken,
      });

      const apiResponse = response.data;
      const data = apiResponse.data;

      if (data.accessToken && typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.accessToken);
      }

      if (data.refreshToken && typeof window !== "undefined") {
        localStorage.setItem("refreshToken", data.refreshToken);
      }

      return data.accessToken;
    } catch {
      this.clearAuthData();
      throw new Error("SESSION_EXPIRED");
    }
  }

  static async logout(): Promise<void> {
    try {
      await $api.post("/auth/logout");
    } catch (error) {
      console.warn("Logout error (but clearing local storage anyway):", error);
    } finally {
      this.clearAuthData();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  static async checkAuth(): Promise<boolean> {
    try {
      const token = TokenManager.getAccessToken();

      if (!token) {
        return false;
      }

      const result = await this.validateToken(token);

      return result.isValid;
    } catch {
      return false;
    }
  }

  static getCurrentUser(): UserData {
    return TokenManager.getUserData();
  }

  static hasRole(requiredRole: string): boolean {
    const userData = TokenManager.getUserData();

    return userData.role === requiredRole;
  }

  static isAdmin(): boolean {
    return this.hasRole("admin");
  }

  static isClient(): boolean {
    return this.hasRole("client");
  }

  private static saveAuthData(data: AuthResponse): void {
    if (data.accessToken) {
      TokenManager.setAccessToken(data.accessToken);
    }

    if (data.refreshToken) {
      TokenManager.setRefreshToken(data.refreshToken);
    }

    TokenManager.setUserData({
      role: data.role,
      email: data.email,
      userId: data.userId,
    });
  }

  private static clearAuthData(): void {
    TokenManager.clearAll();
  }
}

export default AuthService;
