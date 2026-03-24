import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, setCurrentToken } from './supabase';

export type UserType = 'company' | 'professional' | null;

interface UserCtx {
  userType: UserType;
  userId: string | null;
  companyId: string | null;
}

const UserContext = createContext<UserCtx>({ userType: null, userId: null, companyId: null });

export function UserProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<UserCtx>({ userType: null, userId: null, companyId: null });

  useEffect(() => {
    // Leitura inicial (sessão persistida)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentToken(session?.access_token ?? '');
      if (!session?.user) return;
      const meta = session.user.user_metadata ?? {};
      setCtx({
        userType: meta.user_type ?? 'company',
        userId: session.user.id,
        companyId: meta.company_id ?? null,
      });
    });

    // Listener: token e ctx atualizados diretamente do evento (sem chamar getSession)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentToken(session?.access_token ?? '');
      if (!session?.user) {
        setCtx({ userType: null, userId: null, companyId: null });
        return;
      }
      const meta = session.user.user_metadata ?? {};
      setCtx({
        userType: meta.user_type ?? 'company',
        userId: session.user.id,
        companyId: meta.company_id ?? null,
      });
    });

    return () => subscription.unsubscribe();
  }, []);

  return <UserContext.Provider value={ctx}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}