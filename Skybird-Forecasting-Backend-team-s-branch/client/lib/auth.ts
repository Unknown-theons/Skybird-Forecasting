// Auth API helper functions

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  temperature_unit: string;
  language: string;
  timezone?: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Token management
export const getToken = (): string | null => {
  return localStorage.getItem("accessToken");
};

export const setToken = (token: string): void => {
  localStorage.setItem("accessToken", token);
};

export const removeToken = (): void => {
  localStorage.removeItem("accessToken");
};

// API calls
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.detail) {
      // Handle Pydantic validation errors
      throw new Error(error.detail);
    }
    throw new Error(error.error || "Login failed");
  }

  return response.json();
};

export const register = async (
  data: RegisterRequest,
): Promise<{ message: string }> => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.detail) {
      // Handle Pydantic validation errors
      throw new Error(error.detail);
    }
    throw new Error(error.error || "Registration failed");
  }

  return response.json();
};

export const getCurrentUser = async (): Promise<User> => {
  const token = getToken();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch("/api/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    removeToken();
    throw new Error("Authentication failed");
  }

  return response.json();
};

// User management interfaces
export interface UserUpdateRequest {
  full_name?: string;
  bio?: string;
  avatar_url?: string;
  temperature_unit?: string;
  language?: string;
  timezone?: string;
  preferences?: Record<string, any>;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
}

// User management functions
export const updateUserProfile = async (
  data: UserUpdateRequest,
): Promise<User> => {
  const token = getToken();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch("/api/auth/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Profile update failed");
  }

  return response.json();
};

export const changePassword = async (
  data: PasswordChangeRequest,
): Promise<{ message: string }> => {
  const token = getToken();
  if (!token) {
    throw new Error("No token found");
  }

  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Password change failed");
  }

  return response.json();
};
