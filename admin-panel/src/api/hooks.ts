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

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ tables: string[] }>('/tables');
      return data;
    },
  });
}

export function useTableStructure(tableName: string) {
  return useQuery({
    queryKey: ['tableStructure', tableName],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tables/${tableName}/structure`);
      return data;
    },
    enabled: !!tableName,
  });
}

export function useTableData(tableName: string, page: number = 1, limit: number = 50) {
  return useQuery({
    queryKey: ['tableData', tableName, page, limit],
    queryFn: async () => {
      const { data } = await apiClient.get(`/tables/${tableName}/data`, {
        params: { page, limit },
      });
      return data;
    },
    enabled: !!tableName,
  });
}

export function useInsertData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableName, data: rowData }: { tableName: string; data: Record<string, unknown> }) => {
      const { data } = await apiClient.post(`/tables/${tableName}/data`, { data: rowData });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tableData', variables.tableName] });
    },
  });
}

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableName, columns }: { tableName: string; columns: Array<{ name: string; type: string; primary?: boolean; autoIncrement?: boolean; nullable?: boolean; default?: string }> }) => {
      const { data } = await apiClient.post('/tables/create', { tableName, columns });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
    },
  });
}

export function useImportCSV() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableName, rows, columnMapping }: { tableName: string; rows: Record<string, unknown>[]; columnMapping?: Record<string, string> }) => {
      const { data } = await apiClient.post(`/tables/${tableName}/import-csv`, { rows, columnMapping });
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tableData', variables.tableName] });
    },
  });
}

export function useDeleteRow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tableName, id }: { tableName: string; id: string | number }) => {
      const { data } = await apiClient.delete(`/tables/${tableName}/data/${id}`);
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tableData', variables.tableName] });
    },
  });
}
