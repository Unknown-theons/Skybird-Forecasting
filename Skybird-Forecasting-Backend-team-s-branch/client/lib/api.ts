/** Centralized API service with error handling and interceptors. */

export interface ApiError {
  error: string;
  detail?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  status: number;
}

class ApiService {
  private baseURL = "/api";
  private defaultHeaders = {
    "Content-Type": "application/json",
  };

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      ...this.defaultHeaders,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          error: data as ApiError,
          status: response.status,
        };
      }

      return {
        data: data as T,
        status: response.status,
      };
    } catch (error) {
      return {
        error: {
          error: "network_error",
          detail: error instanceof Error ? error.message : "Unknown error",
        },
        status: 0,
      };
    }
  }

  private getToken(): string | null {
    return localStorage.getItem("accessToken");
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string) {
    return this.request<{ message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  }

  async getCurrentUser() {
    return this.request<{ id: number; email: string }>("/auth/me");
  }

  // Demo endpoints
  async ping() {
    return this.request<{ message: string }>("/ping");
  }
}

export const apiService = new ApiService();
