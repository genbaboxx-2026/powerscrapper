'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  CONSULTATION_CATEGORY_LABELS,
  type RecruitmentType,
  type ConsultationCategory,
} from '@/types';

type MyConsultation = {
  id: string;
  category: string;
  title: string;
  status: string;
  commentCount: number;
  createdAt: string;
  latestComment: {
    userName: string;
    companyName: string | null;
    createdAt: string;
  } | null;
};

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
  connectedCount: number;
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
  { value: 'consultations', label: '自分の相談' },
  { value: 'projects', label: '自分の案件' },
  { value: 'bids', label: '興味あり送信' },
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
  connected: '連絡あり',
  rejected: '落選',
};

export default function MyPage() {
  const { userId, displayName, pictureUrl, role } = useLiff();
  const [activeTab, setActiveTab] = useState('consultations');
  const [consultations, setConsultations] = useState<MyConsultation[]>([]);
  const [projects, setProjects] = useState<MyProject[]>([]);
  const [bids, setBids] = useState<MyBid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState<string | null>(null);

  // ユーザープロフィールを取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) return;
      try {
        const res = await authFetch('/api/profile', userId);
        if (res.ok) {
          const data = await res.json();
          // 登録名（representativeName > companyName > displayName）
          setUserName(data.representativeName || data.companyName || null);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    };
    fetchProfile();
  }, [userId]);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      if (activeTab === 'consultations') {
        const res = await authFetch('/api/mypage/consultations', userId);
        if (res.ok) {
          const data = await res.json();
          setConsultations(data.consultations);
        }
      } else if (activeTab === 'projects') {
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

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-[#2563EB] text-white';
      case 'pending':
        return 'bg-[#FEF3C7] text-[#BA7517]';
      case 'rejected':
        return 'bg-[#FEE2E2] text-[#E24B4A]';
      case 'matched':
        return 'bg-[#2563EB] text-white';
      case 'closed':
        return 'bg-[#E2E8F0] text-[#64748B]';
      default:
        return 'bg-[#E2E8F0] text-[#64748B]';
    }
  };

  const getBidStatusColor = (status: string) => {
    switch (status) {
      case 'selected':
        return 'text-[#2563EB]';
      case 'connected':
        return 'text-[#06C755]';
      case 'submitted':
        return 'text-[#BA7517]';
      case 'rejected':
        return 'text-[#E24B4A]';
      default:
        return 'text-[#64748B]';
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pictureUrl ? (
                <img
                  src={pictureUrl}
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
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-[#1E293B]">
                  {userName || displayName || 'ユーザー'}
                </h1>
                <p className="text-sm text-[#64748B]">マイページ</p>
              </div>
            </div>
            <Link
              href="/projects"
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              一覧に戻る
            </Link>
          </div>
        </header>

        {/* クイックリンク */}
        <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
          <div className="flex gap-3">
            <Link
              href="/profile/edit"
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#F8FAFC] rounded-lg text-sm text-[#1E293B]"
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
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#2563EB] rounded-lg text-sm text-white"
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
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="flex">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="p-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
              <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
            </div>
          ) : activeTab === 'consultations' ? (
            // 自分の相談タブ
            consultations.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                <p>投稿した相談はありません</p>
                <Link
                  href="/consultations/new"
                  className="btn-primary inline-block mt-4"
                >
                  相談を投稿
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => (
                  <Link
                    key={consultation.id}
                    href={`/consultations/${consultation.id}`}
                    className="card block p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-xs rounded">
                        {CONSULTATION_CATEGORY_LABELS[consultation.category as ConsultationCategory] || consultation.category}
                      </span>
                      <span className="text-xs text-[#64748B]">
                        {formatDate(consultation.createdAt)}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-[#1E293B] mb-2 line-clamp-2">
                      {consultation.title}
                    </h2>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#2563EB] font-medium flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {consultation.commentCount}件
                      </span>
                    </div>
                    {consultation.latestComment && (
                      <div className="mt-3 pt-3 border-t border-[#E2E8F0]">
                        <p className="text-xs text-[#64748B]">最新コメント</p>
                        <p className="text-sm text-[#1E293B] mt-1">
                          <span className="font-medium">{consultation.latestComment.userName}</span>
                          {consultation.latestComment.companyName && (
                            <span className="text-[#64748B]">（{consultation.latestComment.companyName}）</span>
                          )}
                          <span className="text-[#64748B] ml-2 text-xs">
                            {formatDateTime(consultation.latestComment.createdAt)}
                          </span>
                        </p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )
          ) : activeTab === 'projects' ? (
            // 自分の案件タブ
            projects.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
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
                    href={`/projects/${project.id}`}
                    className="card block p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {project.isUrgent && (
                          <span className="badge badge-urgent">急募</span>
                        )}
                        {project.status !== 'matched' && (
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${getStatusColor(project.status)}`}>
                            {STATUS_LABELS[project.status] || project.status}
                          </span>
                        )}
                      </div>
                    </div>
                    <h2 className="text-base font-bold text-[#1E293B] mb-2">
                      {project.title}
                    </h2>
                    <div className="text-sm text-[#64748B] mb-3">
                      {project.sitePrefecture || '未設定'} | {project.periodStart}〜{project.periodEnd}
                    </div>

                    {/* 興味あり件数を目立つように表示 */}
                    <div className="flex items-center justify-between pt-3 border-t border-[#E2E8F0]">
                      <Link
                        href={`/projects/${project.id}/bids`}
                        onClick={(e) => e.stopPropagation()}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                          project.bidCount > 0
                            ? 'bg-[#2563EB] text-white'
                            : 'bg-[#F8FAFC] text-[#64748B]'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {project.bidCount > 0 ? `${project.bidCount}社が興味あり` : '興味あり 0件'}
                      </Link>
                      {project.connectedCount > 0 && (
                        <span className="text-xs text-[#06C755] font-medium">連絡済み: {project.connectedCount}社</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ) : (
            // 興味ありを送った案件タブ
            bids.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
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
                    <h2 className="text-base font-bold text-[#1E293B] mb-2">
                      {bid.project.title}
                    </h2>
                    <div className="flex items-center justify-between text-sm text-[#64748B]">
                      <span>送信日</span>
                      <span>{formatDate(bid.createdAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
