import api from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export const authService = {
  login: async (data: LoginData): Promise<AuthResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', data.email);
    formData.append('password', data.password);
    
    const response = await api.post<AuthResponse>(
      '/api/auth/login',
      formData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    
    console.log('Login response:', response.data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      console.log('Token saved to localStorage:', response.data.access_token.substring(0, 20) + '...');
      // Verify it was saved
      const savedToken = localStorage.getItem('token');
      console.log('Token verification:', savedToken ? 'Saved successfully' : 'FAILED TO SAVE');
    } else {
      console.error('No access_token in response:', response.data);
    }
    
    return response.data;
  },

  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/api/auth/register', data);
    
    console.log('Register response:', response.data);
    if (response.data.access_token) {
      localStorage.setItem('token', response.data.access_token);
      console.log('Token saved to localStorage:', response.data.access_token.substring(0, 20) + '...');
      // Verify it was saved
      const savedToken = localStorage.getItem('token');
      console.log('Token verification:', savedToken ? 'Saved successfully' : 'FAILED TO SAVE');
    } else {
      console.error('No access_token in response:', response.data);
    }
    
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },
};

