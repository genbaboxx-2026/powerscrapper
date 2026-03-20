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
  selectedAt: string | null;
  createdAt: string;
  bidder: Bidder;
};

type Project = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProjectBidsPage({ params }: Props) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const [project, setProject] = useState<Project | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);

  useEffect(() => {
    const fetchBids = async () => {
      if (!userId) return;

      try {
        const res = await authFetch(`/api/projects/${projectId}/bids`, userId);

        if (!res.ok) {
          if (res.status === 403) {
            setError('この案件の興味ありリストを閲覧する権限がありません');
          } else if (res.status === 404) {
            setError('案件が見つかりません');
          } else {
            setError('エラーが発生しました');
          }
          return;
        }

        const data = await res.json();
        setProject(data.project);
        setBids(data.bids);

        // 選定済みの入札があれば取得
        const matchedBid = data.bids.find((b: Bid) => b.isMatched);
        if (matchedBid) {
          setSelectedBidId(matchedBid.id);
        }
      } catch (err) {
        console.error('Failed to fetch bids:', err);
        setError('エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchBids();
    }
  }, [projectId, userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
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

  if (error || !project) {
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
            <p className="text-[#E24B4A]">{error || '案件が見つかりません'}</p>
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
            案件詳細
          </button>
        </header>

        <main className="p-4 pb-24">
          {/* 案件タイトル */}
          <div className="card p-4 mb-4">
            <h1 className="text-lg font-bold text-[#1E293B]">{project.title}</h1>
            <p className="text-sm text-[#64748B] mt-1">
              興味あり: {bids.length}件
            </p>
          </div>

          {/* 入札一覧 */}
          {bids.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              <p>まだ興味ありがありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bids.map((bid) => (
                <div
                  key={bid.id}
                  className={`card p-4 ${
                    bid.isMatched ? 'border-2 border-[#2563EB]' : ''
                  }`}
                >
                  {/* 入札者情報 */}
                  <div className="flex items-start gap-3 mb-3">
                    {bid.bidder.pictureUrl ? (
                      <img
                        src={bid.bidder.pictureUrl}
                        alt=""
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-[#64748B]"
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[#1E293B] truncate">
                          {bid.bidder.companyName || '未設定'}
                        </h3>
                        {bid.isMatched && (
                          <span className="px-2 py-0.5 bg-[#2563EB] text-white text-xs rounded">
                            選定済み
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-[#64748B]">
                        {bid.bidder.businessType
                          ? BUSINESS_TYPE_LABELS[bid.bidder.businessType as BusinessType]
                          : '未設定'}
                      </p>
                    </div>
                  </div>

                  {/* 金額 */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-[#64748B]">見積金額</span>
                    <span className="text-lg font-bold text-[#1E293B]">
                      {bid.amount
                        ? `${parseInt(bid.amount).toLocaleString()}円`
                        : '未入力'}
                    </span>
                  </div>

                  {/* メッセージ */}
                  <div className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
                    <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
                      {bid.message}
                    </p>
                  </div>

                  {/* 会社情報 */}
                  {(bid.bidder.coverageAreas.length > 0 ||
                    bid.bidder.licenses.length > 0) && (
                    <div className="space-y-2 mb-3">
                      {bid.bidder.coverageAreas.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-[#64748B]">対応エリア:</span>
                          {bid.bidder.coverageAreas.map((area) => (
                            <span
                              key={area}
                              className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs rounded"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      )}
                      {bid.bidder.licenses.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          <span className="text-xs text-[#64748B]">資格:</span>
                          {bid.bidder.licenses.slice(0, 3).map((license) => (
                            <span
                              key={license}
                              className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] text-xs rounded"
                            >
                              {license}
                            </span>
                          ))}
                          {bid.bidder.licenses.length > 3 && (
                            <span className="text-xs text-[#64748B]">
                              +{bid.bidder.licenses.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B]">
                      {formatDate(bid.createdAt)}
                    </span>
                    {!selectedBidId && (
                      <Link
                        href={`/projects/${projectId}/bids/${bid.id}/select`}
                        className="text-sm text-[#2563EB] font-medium"
                      >
                        この企業に決める
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
