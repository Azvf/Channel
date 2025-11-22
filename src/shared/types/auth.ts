export interface Device {
  id: string;
  name: string;
  lastSync: number;
  isCurrent: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  provider: 'google' | 'apple';
  plan: 'free' | 'pro';
  devices?: Device[];
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export const ANONYMOUS_STATE: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

