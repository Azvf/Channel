import { useState, useEffect } from 'react';
import { authService } from '../../../services/authService';
import { AuthState } from '../../../shared/types/auth';

export function useAuth() {
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    // 订阅 Service 状态变化
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    login: authService.login.bind(authService),
    logout: authService.logout.bind(authService)
  };
}

