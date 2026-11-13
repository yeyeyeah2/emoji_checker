import { request } from './client';
import type { AuthData, DataEnvelope, User } from './types';

export type LoginInput = {
  identifier: string;
  password: string;
};

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  role: 'STUDENT' | 'TEACHER';
};

export type ChangePasswordInput = {
  current_password: string;
  new_password: string;
};

export const authApi = {
  async login(input: LoginInput): Promise<AuthData> {
    const response = await request<DataEnvelope<AuthData>>('/auth/login', {
      method: 'POST',
      body: input,
      auth: false,
    });
    return response.data;
  },

  async register(input: RegisterInput): Promise<AuthData> {
    const response = await request<DataEnvelope<AuthData>>('/auth/register', {
      method: 'POST',
      body: input,
      auth: false,
    });
    return response.data;
  },

  async me(signal?: AbortSignal): Promise<User> {
    const response = await request<DataEnvelope<User>>('/users/me', { signal });
    return response.data;
  },

  async changePassword(input: ChangePasswordInput): Promise<void> {
    await request<DataEnvelope<{ updated: boolean }>>('/auth/password', {
      method: 'PUT',
      body: input,
    });
  },
};
