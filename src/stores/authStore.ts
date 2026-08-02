import { create } from '../lib/zustand';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthState {
  user: Profile | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  canAccess: (feature: string) => boolean;
}

const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  admin: ['*'],
  hse_manager: ['chat', 'knowledge', 'knowledge.write', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning', 'analytics', 'governance', 'reports'],
  hse_advisor: ['chat', 'knowledge', 'knowledge.write', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning', 'governance'],
  supervisor: ['chat', 'knowledge', 'risk', 'ptw', 'toolbox', 'incident', 'observation', 'emergency', 'learning'],
  field_worker: ['chat', 'knowledge', 'ptw', 'toolbox', 'observation', 'emergency', 'learning'],
  contractor: ['chat', 'knowledge', 'ptw', 'toolbox', 'observation', 'emergency', 'learning'],
  auditor: ['knowledge', 'analytics', 'governance', 'reports'],
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  error: null,
  initialized: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      set({ user: profile, initialized: true });
    } else {
      set({ initialized: true });
    }

    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        if (event === 'SIGNED_OUT' || !session) {
          set({ user: null });
          return;
        }
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          set({ user: profile });
        }
      })();
    });
  },

  login: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();
        if (profileError) throw profileError;
        set({ user: profile, loading: false });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      set({ error: message, loading: false });
      throw err;
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },

  hasRole: (roles: UserRole[]) => {
    const { user } = get();
    if (!user) return false;
    return roles.includes(user.role);
  },

  canAccess: (feature: string) => {
    const { user } = get();
    if (!user) return false;
    const perms = ROLE_PERMISSIONS[user.role] || [];
    return perms.includes('*') || perms.includes(feature) || perms.some(p => feature.startsWith(p));
  },
}));
