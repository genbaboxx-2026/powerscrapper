'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import { BUSINESS_TYPE_LABELS, COVERAGE_AREAS, type BusinessType } from '@/types';

type Member = {
  id: string;
  companyName: string | null;
  businessType: string | null;
  coverageAreas: string[];
  licenses: string[];
  companyDescription: string | null;
  pictureUrl: string | null;
};

const BUSINESS_TYPE_BADGE_COLORS: Record<string, string> = {
  general_contractor: 'bg-[#EFF6FF] text-[#2563EB]', // 緑
  subcontractor: 'bg-[#E3EDF7] text-[#4A6FA5]', // 青
  craftsman: 'bg-[#FAEEDA] text-[#BA7517]', // 琥珀
  waste_disposal: 'bg-[#FDEAEA] text-[#E24B4A]', // 赤
  equipment: 'bg-[#F3E8F5] text-[#8B5A9B]', // 紫
};

const BUSINESS_TYPE_OPTIONS = [
  { value: '', label: '全て' },
  { value: 'general_contractor', label: '元請' },
  { value: 'subcontractor', label: '協力会社' },
  { value: 'craftsman', label: '職人' },
  { value: 'waste_disposal', label: '産廃業者' },
  { value: 'equipment', label: '重機業者' },
];

export default function MembersPage() {
  const { userId } = useLiff();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    businessType: '',
    area: '',
  });

  const fetchMembers = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.businessType) {
        params.set('businessType', filters.businessType);
      }
      if (filters.area) {
        params.set('area', filters.area);
      }

      const res = await authFetch(`/api/members?${params.toString()}`, userId);

      if (res.ok) {
        const data = await res.json();
        setMembers(data.members);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const truncateText = (text: string, maxLength: number = 80) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/projects" className="text-[#2563EB]">
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
              </Link>
              <h1 className="text-lg font-bold text-[#1E293B]">会員一覧</h1>
            </div>
          </div>
        </header>

        {/* フィルタ */}
        <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <select
              className="input text-sm py-2 px-3 min-w-[120px]"
              value={filters.businessType}
              onChange={(e) =>
                setFilters({ ...filters, businessType: e.target.value })
              }
            >
              {BUSINESS_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className="input text-sm py-2 px-3 min-w-[100px]"
              value={filters.area}
              onChange={(e) =>
                setFilters({ ...filters, area: e.target.value })
              }
            >
              <option value="">エリア</option>
              {COVERAGE_AREAS.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 会員一覧 */}
        <main className="p-4 pb-24">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
              <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              <p>該当する会員企業がありません</p>
              <p className="text-sm mt-2">フィルタ条件を変更してみてください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id} className="card p-4">
                  {/* ヘッダー行 */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* プロフィール画像 */}
                    {member.pictureUrl ? (
                      <img
                        src={member.pictureUrl}
                        alt=""
                        className="w-12 h-12 rounded-full flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#E2E8F0] flex items-center justify-center flex-shrink-0">
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
                      {/* 会社名 */}
                      <h2 className="text-base font-bold text-[#1E293B] truncate">
                        {member.companyName || '未設定'}
                      </h2>

                      {/* 業種バッジ */}
                      {member.businessType && (
                        <span
                          className={`inline-block px-2 py-0.5 text-xs rounded font-medium mt-1 ${
                            BUSINESS_TYPE_BADGE_COLORS[member.businessType] ||
                            'bg-[#E8E8E6] text-[#64748B]'
                          }`}
                        >
                          {BUSINESS_TYPE_LABELS[member.businessType as BusinessType] ||
                            member.businessType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 対応エリア */}
                  {member.coverageAreas.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#64748B] mb-1">対応エリア</p>
                      <div className="flex flex-wrap gap-1">
                        {member.coverageAreas.map((area) => (
                          <span
                            key={area}
                            className="px-2 py-0.5 bg-[#F8FAFC] text-[#1E293B] text-xs rounded"
                          >
                            {area}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 保有資格 */}
                  {member.licenses.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-[#64748B] mb-1">保有資格</p>
                      <div className="flex flex-wrap gap-1">
                        {member.licenses.map((license) => (
                          <span
                            key={license}
                            className="px-2 py-0.5 bg-[#E3EDF7] text-[#4A6FA5] text-xs rounded"
                          >
                            {license}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 会社紹介 */}
                  {member.companyDescription && (
                    <div className="pt-3 border-t border-[#E2E8F0]">
                      <p className="text-sm text-[#64748B] line-clamp-2">
                        {truncateText(member.companyDescription)}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* ナビゲーション */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0]">
          <div className="flex">
            <Link
              href="/projects"
              className="flex-1 flex flex-col items-center py-3 text-[#64748B]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span className="text-xs mt-1">案件</span>
            </Link>
            <Link
              href="/members"
              className="flex-1 flex flex-col items-center py-3 text-[#2563EB]"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <span className="text-xs mt-1">会員</span>
            </Link>
            <Link
              href="/mypage"
              className="flex-1 flex flex-col items-center py-3 text-[#64748B]"
            >
              <svg
                className="w-6 h-6"
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
              <span className="text-xs mt-1">マイページ</span>
            </Link>
          </div>
        </nav>
      </div>
    </AuthGuard>
  );
}
