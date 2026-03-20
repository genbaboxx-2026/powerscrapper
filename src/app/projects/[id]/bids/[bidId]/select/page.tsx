'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import { BUSINESS_TYPE_LABELS, type BusinessType } from '@/types';

type Bidder = {
  id: string;
  companyName: string | null;
  businessType: string | null;
  representativeName: string | null;
  coverageAreas: string[];
  licenses: string[];
  companyDescription: string | null;
  pictureUrl: string | null;
};

type Bid = {
  id: string;
  amount: string | null;
  message: string;
  status: string;
  isMatched: boolean;
  createdAt: string;
  bidder: Bidder;
};

type Project = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  params: Promise<{ id: string; bidId: string }>;
};

export default function SelectBidPage({ params }: Props) {
  const { id: projectId, bidId } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const [bid, setBid] = useState<Bid | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchBid = async () => {
      if (!userId) return;

      try {
        const res = await authFetch(`/api/bids/${bidId}/select`, userId);

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'エラーが発生しました');
          return;
        }

        const data = await res.json();
        setBid(data.bid);
        setProject(data.project);

        // 既に選定済みの場合
        if (data.bid.isMatched) {
          setIsCompleted(true);
        }
      } catch (err) {
        console.error('Failed to fetch bid:', err);
        setError('エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchBid();
    }
  }, [bidId, userId]);

  const handleSelect = async () => {
    if (!userId || !bid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/bids/${bidId}/select`, userId, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '選定に失敗しました');
      }

      setIsCompleted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '選定に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B]">読み込み中...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error && !bid) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC]">
          <header className="bg-white border-b border-[#E2E8F0] px-4 py-3">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1 text-[#2563EB]"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              戻る
            </button>
          </header>
          <div className="p-4 text-center">
            <p className="text-[#E24B4A]">{error}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!bid || !project) return null;

  // 選定完了画面
  if (isCompleted) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F8FAFC]">
          <header className="bg-white border-b border-[#E2E8F0] px-4 py-3">
            <h1 className="text-lg font-bold text-[#1E293B]">選定完了</h1>
          </header>

          <main className="p-4 pb-24">
            <div className="card p-6 text-center">
              <div className="w-16 h-16 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-[#2563EB]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#1E293B] mb-2">
                選定が完了しました
              </h2>
              <p className="text-sm text-[#64748B] mb-4">
                {bid.bidder.companyName || '企業'}を選定しました。
                <br />
                相手の連絡先がマイページで確認できます。
              </p>

              <div className="bg-[#F8FAFC] rounded-lg p-4 mb-6 text-left">
                <h3 className="text-sm font-medium text-[#1E293B] mb-2">
                  選定した会社
                </h3>
                <p className="text-lg font-bold text-[#2563EB]">
                  {bid.bidder.companyName || '未設定'}
                </p>
                <p className="text-sm text-[#64748B]">
                  {bid.bidder.businessType
                    ? BUSINESS_TYPE_LABELS[bid.bidder.businessType as BusinessType]
                    : ''}
                </p>
              </div>
            </div>
          </main>

          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 space-y-2">
            <Link
              href="/mypage/matches"
              className="btn-primary w-full text-center block"
            >
              成約一覧を見る
            </Link>
            <Link
              href="/projects"
              className="btn-secondary w-full text-center block"
            >
              案件一覧に戻る
            </Link>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#2563EB]"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            興味ありリスト
          </button>
        </header>

        <main className="p-4 pb-24">
          <div className="card p-4 mb-4">
            <h1 className="text-lg font-bold text-[#1E293B] mb-2">
              この企業に決める
            </h1>
            <p className="text-sm text-[#64748B]">
              {project.title}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {/* 入札者情報 */}
          <div className="card p-4 mb-4">
            <div className="flex items-start gap-3 mb-4">
              {bid.bidder.pictureUrl ? (
                <img
                  src={bid.bidder.pictureUrl}
                  alt=""
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[#E2E8F0] flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-[#64748B]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold text-[#1E293B]">
                  {bid.bidder.companyName || '未設定'}
                </h2>
                <p className="text-sm text-[#64748B]">
                  {bid.bidder.businessType
                    ? BUSINESS_TYPE_LABELS[bid.bidder.businessType as BusinessType]
                    : '未設定'}
                </p>
                {bid.bidder.representativeName && (
                  <p className="text-sm text-[#64748B]">
                    代表: {bid.bidder.representativeName}
                  </p>
                )}
              </div>
            </div>

            {/* 見積金額 */}
            <div className="bg-[#F8FAFC] rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">見積金額</span>
                <span className="text-xl font-bold text-[#1E293B]">
                  {bid.amount
                    ? `${parseInt(bid.amount).toLocaleString()}円`
                    : '未入力'}
                </span>
              </div>
            </div>

            {/* メッセージ */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-[#64748B] mb-2">
                アピールメッセージ
              </h3>
              <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
                {bid.message}
              </p>
            </div>

            {/* 会社情報 */}
            {bid.bidder.companyDescription && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-2">
                  会社紹介
                </h3>
                <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
                  {bid.bidder.companyDescription}
                </p>
              </div>
            )}

            {bid.bidder.coverageAreas.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-2">
                  対応エリア
                </h3>
                <div className="flex flex-wrap gap-1">
                  {bid.bidder.coverageAreas.map((area) => (
                    <span
                      key={area}
                      className="px-2 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs rounded"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {bid.bidder.licenses.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-[#64748B] mb-2">
                  保有資格
                </h3>
                <div className="flex flex-wrap gap-1">
                  {bid.bidder.licenses.map((license) => (
                    <span
                      key={license}
                      className="px-2 py-1 bg-[#F8FAFC] text-[#64748B] text-xs rounded"
                    >
                      {license}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 注意事項 */}
          <div className="card p-4 bg-[#F8FAFC] border-[#E2E8F0]">
            <p className="text-xs text-[#64748B]">
              ※ 選定すると相互の連絡先が開示され、直接やり取りができるようになります。
              <br />※ 選定は1社のみです。選定後の変更はできません。
              <br />※ 選定されなかった企業には自動で通知されます。
            </p>
          </div>
        </main>

        {/* 選定ボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          <button
            onClick={handleSelect}
            disabled={isSubmitting}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? '選定中...' : 'この企業に決める'}
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
