import $api from "./api";
import { getErrorMessage, getErrorResponse } from "./errorUtils";

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "php"
  | "ruby"
  | "rust"
  | "csharp"
  | "golang"
  | "java"
  | "cpp";

export interface ExecuteCodeRequest {
  language: CodeLanguage;
  code: string;
}

export interface ExecuteCodeResponse {
  output: string;

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
    } catch (error: unknown) {
      console.error("Execute code error:", error);

      const responseData = getErrorResponse(error)?.data;
      const responseError =
        responseData && typeof responseData === "object" && "error" in responseData
          ? String((responseData as { error?: string }).error ?? "")
          : "";
      const message = responseError || getErrorMessage(error, "Не удалось выполнить код");

      return { output: "", error: `Ошибка: ${message}` };
    }
  }
}
