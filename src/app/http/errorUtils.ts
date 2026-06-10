type AxiosLikeError = {
  response?: {
    status?: number;
    headers?: unknown;
    data?: { message?: string } | string;
  };
  message?: string;
};

const toAxiosLikeError = (error: unknown): AxiosLikeError => {
  if (typeof error === "object" && error !== null) {
    return error as AxiosLikeError;
  }

  return {};
};

export const getErrorResponse = (error: unknown) => toAxiosLikeError(error).response;

export const getErrorMessage = (error: unknown, fallback: string): string => {
  const axiosError = toAxiosLikeError(error);
  const responseData = axiosError.response?.data;

  if (responseData && typeof responseData === "object" && "message" in responseData) {
    const message = responseData.message;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof axiosError.message === "string" && axiosError.message) {
    return axiosError.message;
  }

  return fallback;
};
