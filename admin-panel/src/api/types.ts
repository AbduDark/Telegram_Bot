export interface Admin {
  id: number;
  username: string;
  role: 'admin' | 'superadmin';
  created_at?: string;
  last_login?: string;
}

export interface User {
  telegram_user_id: string;
  username: string | null;
  subscription_type: 'regular' | 'vip' | null;
  subscription_start: string | null;
  subscription_end: string | null;
  is_active: boolean;
  free_searches_used: number;
  bonus_searches: number;
  referral_code?: string;
  referred_by?: string;
  terms_accepted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  telegram_user_id: string;
  username: string | null;
  subscription_type: 'regular' | 'vip' | null;
  subscription_start: string | null;
  subscription_end: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SearchHistoryItem {
  id: number;
  telegram_user_id: string;
  username?: string;
  search_query: string;
  search_type: 'phone' | 'facebook_id';
  results_count: number;
  created_at: string;
}

export interface ReferralInfo {
  telegram_user_id: string;
  username: string | null;
  referral_code: string;
  total_referrals: number;
  bonus_searches: number;
  created_at: string;
}

export interface ReferralUse {
  referral_code: string;
  referrer_id: string;
  referred_user_id: string;
  referred_username: string | null;
  discount_used: boolean;
  subscription_granted: boolean;
  created_at: string;
}

export interface ReferralStats {
  totalReferrals: number;
  totalBonusSearches: number;
  topReferrers: ReferralInfo[];
  recentReferrals: ReferralUse[];
}

export interface SubscriptionBreakdown {
  subscription_type: string;
  count: number;
}

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  estimatedRevenue: number;
  searchesToday: number;
  newUsersToday: number;
  totalSearches: number;
  subscriptionBreakdown: SubscriptionBreakdown[];
}

export interface BotSetting {
  key: string;
  value: string;
  updated_at?: string;
  updated_by?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  admin: Admin;
}

export interface PaginatedResponse<T> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersResponse extends PaginatedResponse<User> {
  users: User[];
}

export interface SubscriptionsResponse extends PaginatedResponse<Subscription> {
  subscriptions: Subscription[];
}

export interface SearchHistoryResponse extends PaginatedResponse<SearchHistoryItem> {
  history: SearchHistoryItem[];
}

export interface UserDetailsResponse {
  user: User;
  searchHistory: SearchHistoryItem[];
  referral: ReferralInfo | null;
}

export interface SettingsResponse {
  settings: BotSetting[];
}
