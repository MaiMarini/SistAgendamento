import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { restoreSession, onAuthStateChange, type AuthUser } from './auth';

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
    restoreSession().then((user) => {
      if (user) {
        setCtx({
          userType: user.user_type,
          userId: user.id,
          companyId: user.company_id,
        });
      }
    });

    const unsubscribe = onAuthStateChange((_event, user) => {
      if (!user) {
        setCtx({ userType: null, userId: null, companyId: null });
        return;
      }
      setCtx({
        userType: user.user_type,
        userId: user.id,
        companyId: user.company_id,
      });
    });

    return () => unsubscribe();
  }, []);

  return <UserContext.Provider value={ctx}>{children}</UserContext.Provider>;
}

export function useCurrentUser() {
  return useContext(UserContext);
}
