'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from './LiffProvider';

type AuthGuardProps = {
  children: ReactNode;
  requireProfile?: boolean;
  requireAdmin?: boolean;
  requireApproval?: boolean;
  allowPending?: boolean;
  requireMember?: boolean;
};

function PreparingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEF3C7] flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[#F59E0B]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1E293B] mb-2">
          現在準備中です🙇
        </h1>
        <p className="text-[#64748B] text-sm">
          ご利用開始までしばらくお待ちください。
        </p>
      </div>
    </div>
  );
}

export function AuthGuard({
  children,
  requireProfile = false,
  requireAdmin = false,
  requireApproval = false,
  allowPending = false,
  requireMember = false,
}: AuthGuardProps) {
  const router = useRouter();
  const { isLoading, isFriend, profileCompleted, role, approvalStatus, memberRank, error } = useLiff();

  useEffect(() => {
    if (isLoading) return;

    if (isFriend === false) {
      router.replace('/auth/blocked');
      return;
    }

    if (requireApproval) {
      if (approvalStatus === 'none' || approvalStatus === null) {
        router.replace('/apply');
        return;
      }
      if (approvalStatus === 'pending' && !allowPending) {
        router.replace('/auth/pending');
        return;
      }
      if (approvalStatus === 'rejected') {
        router.replace('/auth/rejected');
        return;
      }
      if (approvalStatus !== 'approved' && approvalStatus !== 'pending') {
        router.replace('/apply');
        return;
      }
    }

    if (requireProfile && !profileCompleted) {
      router.replace('/profile/edit');
      return;
    }

    if (requireAdmin && role !== 'admin') {
      router.replace('/projects');
      return;
    }
  }, [isLoading, isFriend, profileCompleted, role, approvalStatus, memberRank, requireProfile, requireAdmin, requireApproval, allowPending, requireMember, router]);

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

  if (isFriend === false) return null;

  if (requireApproval) {
    if (approvalStatus === 'none' || approvalStatus === null) return null;
    if (approvalStatus === 'pending' && !allowPending) return null;
    if (approvalStatus === 'rejected') return null;
    if (approvalStatus !== 'approved' && approvalStatus !== 'pending') return null;
  }

  if (requireProfile && !profileCompleted) return null;
  if (requireAdmin && role !== 'admin') return null;

  // ゲスト会員がメンバー専用ページにアクセスした場合は準備中画面
  if (requireMember && approvalStatus === 'approved' && memberRank !== 'member') {
    return <PreparingScreen />;
  }

  return <>{children}</>;
}
