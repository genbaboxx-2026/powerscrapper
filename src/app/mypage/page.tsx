'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  type RecruitmentType,
} from '@/types';

type MyProject = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  isUrgent: boolean;
  deadline: string;
  status: string;
  bidCount: number;
  isMatched: boolean;
  createdAt: string;
};

type MyBid = {
  id: string;
  amount: string | null;
  message: string;
  status: string;
  createdAt: string;
  project: {
    id: string;
    title: string;
    recruitmentType: string;
    sitePrefecture: string | null;
    periodStart: string;
    periodEnd: string;
    status: string;
    deadline: string;
  };
};

const TABS = [
  { value: 'projects', label: '登録案件' },
  { value: 'bids', label: '興味あり' },
  { value: 'matches', label: '成約済み' },
];

const STATUS_LABELS: Record<string, string> = {
  pending: '審査中',
  approved: '公開中',
  rejected: '却下',
  matched: '成約済み',
  closed: '終了',
};

const BID_STATUS_LABELS: Record<string, string> = {
  submitted: '送信済み',
  selected: '選定済み',
  rejected: '落選',
};

export default function MyPage() {
  const { userId, displayName, pictureUrl, role } = useLiff();
  const [activeTab, setActiveTab] = useState('projects');
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [bids, setBids] = useState<MyBid[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      if (activeTab === 'projects') {
        const res = await authFetch('/api/mypage/projects', userId);
        if (res.ok) {
          const data = await res.json();
          setProjects(data.projects);
        }
      } else if (activeTab === 'bids') {
        const res = await authFetch('/api/bids', userId);
        if (res.ok) {
          const data = await res.json();
          setBids(data.bids);
        }
      } else if (activeTab === 'matches') {
        const res = await authFetch('/api/mypage/matches', userId);
        if (res.ok) {
          const data = await res.json();
          setMatchCount(data.matches.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-[#0F6E56]';
      case 'pending':
        return 'text-[#BA7517]';
      case 'rejected':
        return 'text-[#E24B4A]';
      case 'matched':
        return 'text-[#0F6E56]';
      default:
        return 'text-[#73726C]';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'text-[#0F6E56]';
      case 'submitted':
        return 'text-[#BA7517]';
      case 'rejected':
        return 'text-[#E24B4A]';
      default:
        return 'text-[#73726C]';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-4">
          <div className="flex items-center gap-3">
            {pictureUrl ? (
              <img
                src={pictureUrl}
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-[#2C2C2A]">
                {displayName || 'ユーザー'}
              </h1>
              <p className="text-sm text-[#73726C]">マイページ</p>
            </div>
          </div>
        </header>

        {/* クイックリンク */}
        <div className="bg-white border-b border-[#D5D5D0] px-4 py-3">
          <div className="flex gap-3">
            <Link
              href="/profile/edit"
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#F4F3F0] rounded-lg text-sm text-[#2C2C2A]"
            >
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              プロフィール
            </Link>
            {role === 'admin' && (
              <Link
                href="/admin"
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#0F6E56] rounded-lg text-sm text-white"
              >
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
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                管理者
              </Link>
            )}
          </div>
        </div>

        {/* タブ */}
        <div className="bg-white border-b border-[#D5D5D0]">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#0F6E56] text-[#0F6E56]'
                    : 'border-transparent text-[#73726C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="p-4 pb-24">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F6E56] mx-auto"></div>
              <p className="mt-4 text-[#73726C] text-sm">読み込み中...</p>
            </div>
          ) : activeTab === 'projects' ? (
            projects.length === 0 ? (
              <div className="text-center py-12 text-[#73726C]">
                <p>登録した案件はありません</p>
                <Link
                  href="/projects/new"
                  className="btn-primary inline-block mt-4"
                >
                  案件を登録
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => (
                  <Link
                    key={project.id}
                    href={
                      project.bidCount > 0
                        ? `/projects/${project.id}/bids`
                        : `/projects/${project.id}`
                    }
                    className="card block p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {project.isUrgent && (
                          <span className="badge badge-urgent">急募</span>
                        )}
                        <span className="badge badge-type">
                          {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
                        </span>
                      </div>
                      <span
                        className={`text-sm font-medium ${getStatusColor(project.status)}`}
                      >
                        {STATUS_LABELS[project.status] || project.status}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#2C2C2A] mb-2">
                      {project.title}
                    </h2>
                    <div className="flex items-center justify-between text-sm text-[#73726C]">
                      <span>
                        {project.sitePrefecture || '未設定'} | {project.periodStart}
                        〜{project.periodEnd}
                      </span>
                      <span className="text-[#0F6E56] font-medium">
                        興味あり {project.bidCount}件
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : activeTab === 'bids' ? (
            bids.length === 0 ? (
              <div className="text-center py-12 text-[#73726C]">
                <p>興味ありを送った案件はありません</p>
                <Link href="/projects" className="btn-primary inline-block mt-4">
                  案件を探す
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bids.map((bid) => (
                  <Link
                    key={bid.id}
                    href={`/projects/${bid.project.id}`}
                    className="card block p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="badge badge-type">
                        {RECRUITMENT_TYPE_LABELS[bid.project.recruitmentType as RecruitmentType]}
                      </span>
                      <span
                        className={`text-sm font-medium ${getBidStatusColor(bid.status)}`}
                      >
                        {BID_STATUS_LABELS[bid.status] || bid.status}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#2C2C2A] mb-2">
                      {bid.project.title}
                    </h2>
                    <div className="flex items-center justify-between text-sm text-[#73726C]">
                      <span>送信日</span>
                      <span>{formatDate(bid.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            // 成約済みタブ
            <div className="text-center py-6">
              <p className="text-[#73726C] mb-4">
                {matchCount > 0
                  ? `成約済み案件が ${matchCount} 件あります`
                  : '成約済みの案件はありません'}
              </p>
              {matchCount > 0 && (
                <Link
                  href="/mypage/matches"
                  className="btn-primary inline-block"
                >
                  成約一覧を見る
                </Link>
              )}
            </div>
          )}
        </main>

        {/* ナビゲーション */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0]">
          <div className="flex">
            <Link
              href="/projects"
              className="flex-1 flex flex-col items-center py-3 text-[#73726C]"
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
              href="/mypage"
              className="flex-1 flex flex-col items-center py-3 text-[#0F6E56]"
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
