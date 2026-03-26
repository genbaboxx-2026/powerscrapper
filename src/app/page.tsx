'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiff } from '@/components/LiffProvider';

function WelcomeScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <h1 className="text-xl font-bold text-[#1E293B] mb-4">
          パワスクへようこそ！🔨
        </h1>
        <p className="text-sm text-[#1E293B] mb-2">
          解体業界の仲間とつながる
          <br />
          コミュニティ＆プラットフォームです。
        </p>
        <p className="text-sm text-[#64748B] mb-6">
          サービスをご利用いただくには
          <br />
          入会申請が必要です。
        </p>
        <Link
          href="/apply"
          className="btn-primary inline-block w-full text-center"
        >
          入会申請する
        </Link>
      </div>
    </div>
  );
}

function PendingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEF3C7] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1E293B] mb-2">審査中です</h1>
        <p className="text-sm text-[#64748B]">
          入会申請を受け付けました。
          <br />
          管理者が確認中ですので、
          <br />
          しばらくお待ちください。
        </p>
      </div>
    </div>
  );
}

function RejectedScreen({ reason }: { reason: string | null }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEE2E2] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1E293B] mb-2">入会申請が承認されませんでした</h1>
        <p className="text-sm text-[#64748B] mb-4">
          誠に申し訳ございませんが、
          <br />
          今回の入会申請は承認されませんでした。
        </p>
        {reason && (
          <div className="bg-[#FEF2F2] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-[#DC2626] font-medium mb-1">理由</p>
            <p className="text-sm text-[#1E293B]">{reason}</p>
          </div>
        )}
        <Link
          href="/apply"
          className="btn-primary inline-block w-full text-center"
        >
          再申請する
        </Link>
      </div>
    </div>
  );
}

function PreparingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="card p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-[#FEF3C7] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-[#1E293B] mb-2">現在準備中です🙇</h1>
        <p className="text-sm text-[#64748B]">
          ご利用開始までしばらくお待ちください。
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { isLoading, approvalStatus, memberRank, rejectionReason } = useLiff();

  useEffect(() => {
    if (isLoading) return;
    // メンバー会員のみ /projects にリダイレクト
    if (approvalStatus === 'approved' && memberRank === 'member') {
      router.replace('/projects');
    }
  }, [isLoading, approvalStatus, memberRank, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-4 text-gray-600 text-sm">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (approvalStatus === 'approved' && memberRank === 'member') {
    return null; // リダイレクト待ち
  }

  if (approvalStatus === 'approved' && memberRank !== 'member') {
    return <PreparingScreen />;
  }

  if (approvalStatus === 'pending') {
    return <PendingScreen />;
  }

  if (approvalStatus === 'rejected') {
    return <RejectedScreen reason={rejectionReason} />;
  }

  // none / null / 未ログイン
  return <WelcomeScreen />;
}
