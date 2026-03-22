'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
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
  lineDisplayName: string | null;
  phone: string | null;
  email: string | null;
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

  // 連絡モーダル用state
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedBid, setSelectedBid] = useState<Bid | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  const handleConnect = async () => {
    if (!userId || !selectedBid) return;

    setIsConnecting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/bids/${selectedBid.id}/connect`, userId, {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '連絡に失敗しました');
      }

      // bidsの該当入札を更新
      setBids(bids.map(b =>
        b.id === selectedBid.id
          ? { ...b, isMatched: true, status: 'connected' }
          : b
      ));

      // 成功 - モーダルを閉じる
      setShowConnectModal(false);
      setSelectedBid(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '連絡に失敗しました');
      setShowConnectModal(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const openConnectModal = (bid: Bid) => {
    setSelectedBid(bid);
    setShowConnectModal(true);
  };

  const closeModal = () => {
    setShowConnectModal(false);
    setSelectedBid(null);
  };

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

  if (error && !project) {
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

  if (!project) return null;

  const connectedCount = bids.filter(b => b.isMatched).length;

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
              興味あり: {bids.length}社
              {connectedCount > 0 && (
                <span className="ml-2 text-[#2563EB]">（連絡済み: {connectedCount}社）</span>
              )}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

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
                  className="card p-4"
                >

                  {/* LINEプロフィール + 会社情報 */}
                  <div className="flex items-start gap-3 mb-3">
                    {bid.bidder.pictureUrl ? (
                      <img
                        src={bid.bidder.pictureUrl}
                        alt=""
                        className="w-14 h-14 rounded-full border-2 border-[#06C755]"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#E2E8F0] flex items-center justify-center border-2 border-[#06C755]">
                        <svg
                          className="w-7 h-7 text-[#64748B]"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#1E293B] text-lg">
                        {bid.bidder.companyName || '未設定'}
                      </h3>
                      {bid.bidder.lineDisplayName && (
                        <p className="text-sm text-[#64748B] flex items-center gap-1">
                          <svg className="w-4 h-4 text-[#06C755]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                          </svg>
                          {bid.bidder.lineDisplayName}
                        </p>
                      )}
                      <p className="text-sm text-[#64748B]">
                        {bid.bidder.businessType
                          ? BUSINESS_TYPE_LABELS[bid.bidder.businessType as BusinessType]
                          : '未設定'}
                      </p>
                      {bid.bidder.representativeName && (
                        <p className="text-sm text-[#1E293B]">
                          担当: {bid.bidder.representativeName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 対応可能時期 */}
                  {bid.amount && (
                    <div className="flex items-center justify-between mb-3 bg-[#EFF6FF] rounded-lg px-3 py-2">
                      <span className="text-sm text-[#2563EB] font-medium">対応可能時期</span>
                      <span className="text-sm font-bold text-[#1E293B]">
                        {bid.amount}
                      </span>
                    </div>
                  )}

                  {/* アピールメッセージ */}
                  <div className="bg-[#F8FAFC] rounded-lg p-3 mb-3">
                    <p className="text-xs text-[#64748B] mb-1">アピールメッセージ</p>
                    <p className="text-sm text-[#1E293B] whitespace-pre-wrap">
                      {bid.message}
                    </p>
                  </div>

                  {/* 対応エリア・資格 */}
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
                          <span className="text-xs text-[#64748B]">保有資格:</span>
                          {bid.bidder.licenses.slice(0, 3).map((license) => (
                            <span
                              key={license}
                              className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] text-xs rounded border border-[#E2E8F0]"
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

                  {/* 連絡先情報（連絡済みの場合に表示） */}
                  {bid.isMatched && (bid.bidder.phone || bid.bidder.email) && (
                    <div className="bg-[#F0FDF4] border border-[#22C55E]/30 rounded-lg p-3 mb-3">
                      <p className="text-xs font-bold text-[#15803D] mb-2 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        連絡先情報
                      </p>
                      <div className="space-y-1.5">
                        {bid.bidder.representativeName && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-[#1E293B]">{bid.bidder.representativeName}</span>
                          </div>
                        )}
                        {bid.bidder.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <a href={`tel:${bid.bidder.phone}`} className="text-[#2563EB] underline">{bid.bidder.phone}</a>
                          </div>
                        )}
                        {bid.bidder.email && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <a href={`mailto:${bid.bidder.email}`} className="text-[#2563EB] underline">{bid.bidder.email}</a>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                    <span className="text-xs text-[#64748B]">
                      {formatDate(bid.createdAt)}
                    </span>
                    {bid.isMatched ? (
                      <span className="px-4 py-2 bg-[#94A3B8] text-white text-sm font-medium rounded-lg flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
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
                        連絡完了
                      </span>
                    ) : (
                      <button
                        onClick={() => openConnectModal(bid)}
                        className="px-4 py-2 bg-[#06C755] text-white text-sm font-medium rounded-lg flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.349 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
                        </svg>
                        この企業に連絡する
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* 連絡確認モーダル */}
        {showConnectModal && selectedBid && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-[#1E293B] mb-3">
                この企業に連絡しますか？
              </h3>
              <p className="text-sm text-[#1E293B] mb-3">
                <span className="font-bold">{selectedBid.bidder.companyName}</span> に
                あなたの連絡先をLINEで送信します。
              </p>
              <div className="bg-[#F8FAFC] rounded-lg p-3 mb-4 text-sm text-[#64748B]">
                <p className="font-medium text-[#1E293B] mb-1">相手に送信される情報:</p>
                <p>・会社名、担当者名</p>
                <p>・電話番号、メールアドレス</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={closeModal}
                  disabled={isConnecting}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#1E293B] rounded-lg font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1 py-3 bg-[#06C755] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isConnecting ? '送信中...' : '連絡する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
