'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';

// ===== Types =====

type Consultation = {
  id: string;
  category: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    companyName: string | null;
    pictureUrl: string | null;
  };
  commentCount: number;
  likeCount: number;
  isOwner: boolean;
};

// ===== Constants =====

const CONSULTATION_CATEGORIES = [
  { value: '', label: '全て' },
  { value: 'announcement', label: '告知' },
  { value: 'question', label: '質問' },
  { value: 'request', label: '依頼' },
  { value: 'general', label: '一般相談' },
  { value: 'technical', label: '技術相談' },
  { value: 'equipment', label: '重機・機材' },
  { value: 'waste', label: '産廃関連' },
  { value: 'regulation', label: '法規・許可' },
  { value: 'other', label: 'その他' },
];

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  announcement: { label: '告知', color: 'bg-red-100 text-red-600' },
  question: { label: '質問', color: 'bg-blue-100 text-blue-600' },
  request: { label: '依頼', color: 'bg-amber-100 text-amber-600' },
  general: { label: '一般相談', color: 'bg-[#E8E8E6] text-[#64748B]' },
  technical: { label: '技術相談', color: 'bg-[#E3EDF7] text-[#4A6FA5]' },
  equipment: { label: '重機・機材', color: 'bg-[#FAEEDA] text-[#BA7517]' },
  waste: { label: '産廃関連', color: 'bg-[#EFF6FF] text-[#2563EB]' },
  regulation: { label: '法規・許可', color: 'bg-[#FDEAEA] text-[#E24B4A]' },
  other: { label: 'その他', color: 'bg-[#E8E8E6] text-[#64748B]' },
};

// ===== Message Component =====

function ToastMessage() {
  const searchParams = useSearchParams();
  const posted = searchParams.get('posted') === 'true';
  const deleted = searchParams.get('deleted') === 'true';

  if (posted) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        相談を投稿しました。
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        相談を削除しました。
      </div>
    );
  }

  return null;
}

// ===== Main Content Component =====

function MainContent() {
  const { userId } = useLiff();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultationFilters, setConsultationFilters] = useState({
    category: '',
    myPosts: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchConsultations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (consultationFilters.category) {
        params.set('category', consultationFilters.category);
      }

      const response = await authFetch(`/api/consultations?${params.toString()}`, userId);
      if (response.ok) {
        const data = await response.json();
        setConsultations(data.consultations);
      }
    } catch (error) {
      console.error('Failed to fetch consultations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, consultationFilters.category]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const truncateText = (text: string, lines: number = 2) => {
    const lineArray = text.split('\n');
    if (lineArray.length <= lines) {
      const joined = lineArray.join('\n');
      return joined.length > 100 ? joined.slice(0, 100) + '...' : joined;
    }
    return lineArray.slice(0, lines).join('\n') + '...';
  };

  return (
    <>
      {/* タブ */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="flex">
          <Link
            href="/consultations"
            className="flex-1 py-3 text-sm font-bold text-center bg-[#2563EB] text-white"
          >
            パワスク相談
          </Link>
          <Link
            href="/projects"
            className="flex-1 py-3 text-sm font-medium text-center bg-white text-[#64748B] hover:bg-[#F8FAFC]"
          >
            案件
          </Link>
        </div>
      </div>

      {/* 相談フィルタ */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            className="input text-sm py-2 px-3 min-w-[120px]"
            value={consultationFilters.category}
            onChange={(e) =>
              setConsultationFilters({ ...consultationFilters, category: e.target.value })
            }
          >
            {CONSULTATION_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 相談一覧 */}
      <main className="p-4 pb-24">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
          </div>
        ) : consultations.length === 0 ? (
          <div className="text-center py-12 text-[#64748B]">
            <p>相談がありません</p>
            <p className="text-sm mt-2">最初の相談を投稿してみましょう</p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((consultation) => {
              const categoryInfo = CATEGORY_BADGES[consultation.category] || CATEGORY_BADGES.other;
              return (
                <Link
                  key={consultation.id}
                  href={`/consultations/${consultation.id}`}
                  className={`card block p-4 ${consultation.isOwner ? 'card-own' : ''}`}
                >
                  {/* ユーザー情報ヘッダー */}
                  <div className="flex items-start gap-3 mb-3">
                    {consultation.user.pictureUrl ? (
                      <img
                        src={consultation.user.pictureUrl}
                        alt=""
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#E2E8F0]"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#1E293B] truncate">
                        {consultation.user.companyName || '未設定'}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {consultation.user.displayName || ''}
                      </p>
                    </div>
                    <span className="text-xs text-[#64748B] whitespace-nowrap">
                      {formatDateTime(consultation.createdAt)}
                    </span>
                  </div>

                  {/* カテゴリバッジ */}
                  <div className="mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${categoryInfo.color}`}>
                      {categoryInfo.label}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-[#1E293B] mb-2">
                    {consultation.title}
                  </h2>

                  {/* 本文プレビュー */}
                  <p className="text-sm text-[#64748B] mb-3 line-clamp-2">
                    {truncateText(consultation.body)}
                  </p>

                  {/* フッター */}
                  <div className="flex items-center justify-end gap-3">
                    <span className="flex items-center gap-1 text-xs text-[#94A3B8]">
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
                          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                        />
                      </svg>
                      {consultation.likeCount}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[#2563EB]">
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
                          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                        />
                      </svg>
                      {consultation.commentCount}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* 相談投稿ボタン */}
      <div className="fixed bottom-6 right-4">
        <Link
          href="/consultations/new"
          className="btn-primary flex items-center gap-2 shadow-lg"
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          相談する
        </Link>
      </div>
    </>
  );
}

// ===== Main Page =====

export default function ConsultationsPage() {
  return (
    <AuthGuard requireApproval requireMember>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1E293B]">PowerScrapper</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/mypage"
              className="flex items-center gap-1 text-sm text-[#2563EB]"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              マイページ
            </Link>
          </div>
        </header>

        {/* トーストメッセージ */}
        <Suspense fallback={null}>
          <ToastMessage />
        </Suspense>

        {/* メインコンテンツ */}
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
          </div>
        }>
          <MainContent />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
