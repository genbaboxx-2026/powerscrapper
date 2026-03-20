'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from './LiffProvider';

type AuthGuardProps = {
  children: ReactNode;
  requireProfile?: boolean;
  requireAdmin?: boolean;
};

export function AuthGuard({
  children,
  requireProfile = false,
  requireAdmin = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isFriend, profileCompleted, role, error } = useLiff();

  useEffect(() => {
    if (isLoading) return;

    // 友だちでない場合はブロック画面へ
    if (isFriend === false) {
      router.replace('/auth/blocked');
      return;
    }

    // プロフィール必須のページでプロフィール未完了の場合
    if (requireProfile && !profileCompleted) {
      router.replace('/profile/edit');
      return;
    }

    // 管理者専用ページで管理者でない場合
    if (requireAdmin && role !== 'admin') {
      router.replace('/projects');
      return;
    }
  }, [isLoading, isFriend, profileCompleted, role, requireProfile, requireAdmin, router]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
          <p className="mt-4 text-[#64748B]">読み込み中...</p>
        </div>
      </div>
    );
  }

  // エラー
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center px-4">
          <p className="text-[#E24B4A]">エラーが発生しました</p>
          <p className="mt-2 text-[#64748B] text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // 友だちでない場合（リダイレクト前）
  if (isFriend === false) {
    return null;
  }

  // プロフィール未完了（リダイレクト前）
  if (requireProfile && !profileCompleted) {
    return null;
  }

  // 管理者でない（リダイレクト前）
  if (requireAdmin && role !== 'admin') {
    return null;
  }

  return <>{children}</>;
}
