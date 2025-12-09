import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  DashboardStats,
  UsersResponse,
  UserDetailsResponse,
  SubscriptionsResponse,
  ReferralStats,
  SettingsResponse,
  SearchHistoryResponse,
} from './types';

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<LoginResponse> => {
      const { data } = await apiClient.post<LoginResponse>('/login', credentials);
      return data;
    },
    onSuccess: (data) => {
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_refresh_token', data.refreshToken);
      localStorage.setItem('admin_user', JSON.stringify(data.admin));
    },
  });
}

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const { data } = await apiClient.get<DashboardStats>('/stats');
      return data;
    },
  });
}

export function useUsers(page: number = 1, limit: number = 20, search: string = '') {
  return useQuery({
    queryKey: ['users', page, limit, search],
    queryFn: async (): Promise<UsersResponse> => {
      const { data } = await apiClient.get<UsersResponse>('/users', {
        params: { page, limit, search },
      });
      return data;
    },
  });
}

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: async (): Promise<UserDetailsResponse> => {
      const { data } = await apiClient.get<UserDetailsResponse>(`/users/${userId}`);
      return data;
    },
    enabled: !!userId,
  });
}

export function useSubscriptions(
  page: number = 1,
  limit: number = 20,
  status?: string,
  type?: string
) {
  return useQuery({
    queryKey: ['subscriptions', page, limit, status, type],
    queryFn: async (): Promise<SubscriptionsResponse> => {
      const { data } = await apiClient.get<SubscriptionsResponse>('/subscriptions', {
        params: { page, limit, status, type },
      });
      return data;
    },
  });
}

export function useReferrals() {
  return useQuery({
    queryKey: ['referrals'],
    queryFn: async (): Promise<ReferralStats> => {
      const { data } = await apiClient.get<ReferralStats>('/referrals');
      return data;
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async (): Promise<SettingsResponse> => {
      const { data } = await apiClient.get<SettingsResponse>('/settings');
      return data;
    },
  });
}

export function useSearchHistory(page: number = 1, limit: number = 50, type?: string) {
  return useQuery({
    queryKey: ['searchHistory', page, limit, type || null],
    queryFn: async (): Promise<SearchHistoryResponse> => {
      const params: Record<string, unknown> = { page, limit };
      if (type) {
        params.type = type;
      }
      const { data } = await apiClient.get<SearchHistoryResponse>('/search-history', { params });
      return data;
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const { data } = await apiClient.put('/settings', { settings });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      action,
      months,
      subscription_type,
    }: {
      userId: string;
      action: 'extend' | 'cancel';
      months?: number;
      subscription_type?: string;
    }) => {
      const { data } = await apiClient.put(`/users/${userId}/subscription`, {
        action,
        months,
        subscription_type,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useAddFreeSearches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, count }: { userId: string; count: number }) => {
      const { data } = await apiClient.put(`/users/${userId}/free-searches`, { count });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
}
