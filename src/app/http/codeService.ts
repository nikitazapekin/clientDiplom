import $api from "./api";

export type CodeLanguage = "javascript" | "python" | "csharp" | "golang" | "java";

export interface ExecuteCodeRequest {
  language: CodeLanguage;
  code: string;
}

export interface ExecuteCodeResponse {
  output: string;
  /** Compile or runtime error from server (stderr). */
  error?: string;
}

export class CodeService {
  static async executeCode(data: ExecuteCodeRequest): Promise<ExecuteCodeResponse> {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

      const response = await $api.post(
        "/code/execute",
        {
          language: data.language,
          code: data.code,
        },
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined
      );

      return response.data;
    } catch (error: any) {
      console.error("Execute code error:", error);

      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Не удалось выполнить код";

      return { output: "", error: `Ошибка: ${message}` };
    }
  }
}
