'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import liff from '@line/liff';

type LiffContextType = {
  userId: string | null;
  displayName: string | null;
  pictureUrl: string | null;
  idToken: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isFriend: boolean | null;
  profileCompleted: boolean;
  role: string | null;
  approvalStatus: string | null;
  memberRank: string | null;
  rejectionReason: string | null;
  error: string | null;
  logout: () => void;
};

const LiffContext = createContext<LiffContextType>({
  userId: null,
  displayName: null,
  pictureUrl: null,
  idToken: null,
  isLoggedIn: false,
  isLoading: true,
  isFriend: null,
  profileCompleted: false,
  role: null,
  approvalStatus: null,
  memberRank: null,
  rejectionReason: null,
  error: null,
  logout: () => {},
});

export function LiffProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<LiffContextType, 'logout'>>({
    userId: null,
    displayName: null,
    pictureUrl: null,
    idToken: null,
    isLoggedIn: false,
    isLoading: true,
    isFriend: null,
    profileCompleted: false,
    role: null,
    approvalStatus: null,
    memberRank: null,
    rejectionReason: null,
    error: null,
  });

  const logout = () => {
    liff.logout();
    window.location.reload();
  };

  useEffect(() => {
    // /admin配下のページではLIFF初期化をスキップ
    if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
      setState(prev => ({
        ...prev,
        isLoading: false,
      }));
      return;
    }

    const initializeLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        if (!liffId) {
          throw new Error('NEXT_PUBLIC_LIFF_ID is not defined');
        }

        await liff.init({ liffId });

        // ログインしていない場合はログイン画面へ
        if (!liff.isLoggedIn()) {
          // LINE内ブラウザの場合は自動ログイン
          // 外部ブラウザの場合はログインページへリダイレクト
          liff.login();
          return;
        }

        // プロフィール取得
        const profile = await liff.getProfile();

        // IDトークン取得（サーバー側での検証用）
        const idToken = liff.getIDToken();

        // サーバーに認証リクエスト
        const res = await fetch('/api/auth/line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile.userId,
            displayName: profile.displayName,
            pictureUrl: profile.pictureUrl,
            idToken: idToken,
          }),
        });

        if (!res.ok) {
          throw new Error('Authentication failed');
        }

        const data = await res.json();

        setState({
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl ?? null,
          idToken: idToken,
          isLoggedIn: true,
          isLoading: false,
          isFriend: data.isFriend,
          profileCompleted: data.user?.profileCompleted ?? false,
          role: data.user?.role ?? null,
          approvalStatus: data.user?.approvalStatus ?? null,
          memberRank: data.user?.memberRank ?? null,
          rejectionReason: data.user?.rejectionReason ?? null,
          error: null,
        });
      } catch (err) {
        console.error('LIFF init failed:', err);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'LIFF initialization failed',
        }));
      }
    };

    initializeLiff();
  }, []);

  return (
    <LiffContext.Provider value={{ ...state, logout }}>
      {children}
    </LiffContext.Provider>
  );
}

export const useLiff = () => useContext(LiffContext);
