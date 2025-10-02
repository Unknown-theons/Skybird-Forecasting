// Auth API helper functions

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: number;
  email: string;
}

// Token management
export const getToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

export const setToken = (token: string): void => {
  localStorage.setItem('accessToken', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('accessToken');
};

// API calls
export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.detail) {
      // Handle Pydantic validation errors
      throw new Error(error.detail);
    }
    throw new Error(error.error || 'Login failed');
  }

  return response.json();
};

export const register = async (data: RegisterRequest): Promise<{ message: string }> => {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.detail) {
      // Handle Pydantic validation errors
      throw new Error(error.detail);
    }
    throw new Error(error.error || 'Registration failed');
  }

  return response.json();
};

export const getCurrentUser = async (): Promise<User> => {
  const token = getToken();
  if (!token) {
    throw new Error('No token found');
  }

  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    removeToken();
    throw new Error('Authentication failed');
  }

  return response.json();
};
