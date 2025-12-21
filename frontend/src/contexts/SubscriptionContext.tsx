import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import api from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

type SubscriptionStatus = 'active' | 'paused' | 'terminated' | 'expired' | null;

interface SubscriptionState {
  isBlocked: boolean;
  status: SubscriptionStatus;
  statusDisplay: string | null;
  message: string | null;
  contactEmail: string;
  isLoading: boolean;
  error: string | null;
}

interface SubscriptionContextType extends SubscriptionState {
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    isBlocked: false,
    status: null,
    statusDisplay: null,
    message: null,
    contactEmail: 'hello@oneo.com',
    isLoading: true,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    // Skip check for non-client users or unauthenticated
    if (!isAuthenticated || !user || user.role !== 'client') {
      setState(prev => ({ ...prev, isLoading: false, isBlocked: false }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await api.get('/companies/my/features/');
      setState({
        isBlocked: false,
        status: response.data.subscription_status || 'active',
        statusDisplay: null,
        message: null,
        contactEmail: 'hello@oneo.com',
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const axiosError = err as {
        response?: {
          status?: number;
          data?: {
            error_code?: string;
            subscription_status?: string;
            subscription_status_display?: string;
            message?: string;
            contact_email?: string;
          };
        };
      };

      if (
        axiosError.response?.status === 403 &&
        axiosError.response?.data?.error_code === 'subscription_blocked'
      ) {
        setState({
          isBlocked: true,
          status: axiosError.response.data.subscription_status as SubscriptionStatus,
          statusDisplay: axiosError.response.data.subscription_status_display || null,
          message: axiosError.response.data.message || null,
          contactEmail: axiosError.response.data.contact_email || 'hello@oneo.com',
          isLoading: false,
          error: null,
        });
      } else {
        // Network or other errors - block access to prevent bypass via devtools
        console.error('Failed to check subscription status:', err);
        setState({
          isBlocked: true,
          status: null,
          statusDisplay: 'Connection Error',
          message: 'Unable to verify your subscription status. Please check your internet connection and try again.',
          contactEmail: 'hello@oneo.com',
          isLoading: false,
          error: 'Failed to check subscription status',
        });
      }
    }
  }, [isAuthenticated, user]);

  // Check subscription when auth state is ready
  useEffect(() => {
    if (!authLoading) {
      checkSubscription();
    }
  }, [authLoading, checkSubscription]);

  const value: SubscriptionContextType = {
    ...state,
    refetch: checkSubscription,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionStatus() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionStatus must be used within a SubscriptionProvider');
  }
  return context;
}
