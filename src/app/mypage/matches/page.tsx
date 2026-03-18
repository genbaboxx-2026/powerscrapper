'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type RecruitmentType,
  type BusinessType,
} from '@/types';

type Counterpart = {
  id: string;
  companyName: string | null;
  businessType: string | null;
  representativeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  pictureUrl: string | null;
};

type Match = {
  id: string;
  role: 'poster' | 'bidder';
  project: {
    id: string;
    title: string;
    recruitmentType: string;
    sitePrefecture: string | null;
    periodStart: string;
    periodEnd: string;
  };
  bid: {
    id: string;
    amount: string | null;
  };
  counterpart: Counterpart;
  createdAt: string;
};

export default function MyMatchesPage() {
  const router = useRouter();
  const { userId } = useLiff();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!userId) return;

      try {
        const res = await authFetch('/api/mypage/matches', userId);
        if (res.ok) {
          const data = await res.json();
          setMatches(data.matches);
        }
      } catch (err) {
        console.error('Failed to fetch matches:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F6E56] mx-auto"></div>
            <p className="mt-4 text-[#73726C]">読み込み中...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-[#0F6E56]"
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
            マイページ
          </button>
        </header>

        <main className="p-4 pb-24">
          <h1 className="text-lg font-bold text-[#2C2C2A] mb-4">成約一覧</h1>

          {matches.length === 0 ? (
            <div className="text-center py-12 text-[#73726C]">
              <p>成約済みの案件はありません</p>
              <Link href="/projects" className="btn-primary inline-block mt-4">
                案件を探す
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="card overflow-hidden">
                  {/* ヘッダー部分（クリックで展開） */}
                  <button
                    onClick={() => toggleExpand(match.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="badge badge-type">
                        {RECRUITMENT_TYPE_LABELS[match.project.recruitmentType as RecruitmentType]}
                      </span>
                      <span className="text-xs text-[#73726C]">
                        {match.role === 'poster' ? '発注' : '受注'}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#2C2C2A] mb-2">
                      {match.project.title}
                    </h2>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-[#73726C]">
                        成約日: {formatDate(match.createdAt)}
                      </p>
                      <svg
                        className={`w-5 h-5 text-[#73726C] transition-transform ${
                          expandedId === match.id ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* 展開時のコンテンツ */}
                  {expandedId === match.id && (
                    <div className="px-4 pb-4 border-t border-[#D5D5D0]">
                      {/* 相手の情報 */}
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-[#73726C] mb-3">
                          {match.role === 'poster' ? '受注者情報' : '発注者情報'}
                        </h3>
                        <div className="bg-[#F4F3F0] rounded-lg p-4">
                          <div className="flex items-start gap-3 mb-3">
                            {match.counterpart.pictureUrl ? (
                              <img
                                src={match.counterpart.pictureUrl}
                                alt=""
                                className="w-12 h-12 rounded-full"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-[#D5D5D0] flex items-center justify-center">
                                <svg
                                  className="w-6 h-6 text-[#73726C]"
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
                            <div>
                              <h4 className="font-bold text-[#2C2C2A]">
                                {match.counterpart.companyName || '未設定'}
                              </h4>
                              <p className="text-sm text-[#73726C]">
                                {match.counterpart.businessType
                                  ? BUSINESS_TYPE_LABELS[match.counterpart.businessType as BusinessType]
                                  : ''}
                              </p>
                            </div>
                          </div>

                          <dl className="space-y-2 text-sm">
                            {match.counterpart.representativeName && (
                              <div className="flex">
                                <dt className="w-16 text-[#73726C] shrink-0">代表者</dt>
                                <dd className="flex-1 text-[#2C2C2A]">
                                  {match.counterpart.representativeName}
                                </dd>
                              </div>
                            )}
                            {match.counterpart.phone && (
                              <div className="flex">
                                <dt className="w-16 text-[#73726C] shrink-0">電話</dt>
                                <dd className="flex-1">
                                  <a
                                    href={`tel:${match.counterpart.phone}`}
                                    className="text-[#0F6E56] underline"
                                  >
                                    {match.counterpart.phone}
                                  </a>
                                </dd>
                              </div>
                            )}
                            {match.counterpart.email && (
                              <div className="flex">
                                <dt className="w-16 text-[#73726C] shrink-0">メール</dt>
                                <dd className="flex-1">
                                  <a
                                    href={`mailto:${match.counterpart.email}`}
                                    className="text-[#0F6E56] underline"
                                  >
                                    {match.counterpart.email}
                                  </a>
                                </dd>
                              </div>
                            )}
                            {match.counterpart.address && (
                              <div className="flex">
                                <dt className="w-16 text-[#73726C] shrink-0">住所</dt>
                                <dd className="flex-1 text-[#2C2C2A]">
                                  {match.counterpart.address}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>

                      {/* 案件・入札情報 */}
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-[#73726C] mb-2">
                          案件情報
                        </h3>
                        <div className="text-sm text-[#2C2C2A] space-y-1">
                          <p>
                            エリア: {match.project.sitePrefecture || '未設定'}
                          </p>
                          <p>
                            工期: {match.project.periodStart}〜
                            {match.project.periodEnd}
                          </p>
                          <p>
                            契約金額:{' '}
                            {match.bid.amount
                              ? `${parseInt(match.bid.amount).toLocaleString()}円`
                              : '未入力'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
