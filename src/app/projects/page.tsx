'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  WORK_TYPE_LABELS,
  type RecruitmentType,
  type WorkType,
} from '@/types';

// ===== Types =====

type Project = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  floors: string | null;
  totalArea: string | null;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  workTypes: string[];
  isUrgent: boolean;
  deadline: string;
  bidCount: number;
  createdAt: string;
  isOwner: boolean;
};

// ===== Constants =====

const PREFECTURES = [
  '東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県',
];

// ===== Message Component =====

function ToastMessage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const bidSuccess = searchParams.get('bid') === 'success';

  if (registered) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        案件を登録しました。管理者の審査後に公開されます。
      </div>
    );
  }

  if (bidSuccess) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        興味ありを送信しました。結果をお待ちください。
      </div>
    );
  }

  return null;
}

// ===== Main Content Component =====

function MainContent() {
  const { userId } = useLiff();

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilters, setProjectFilters] = useState({
    prefecture: '',
    excludeBidded: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilters.prefecture) {
        params.set('prefecture', projectFilters.prefecture);
      }
      if (projectFilters.excludeBidded) {
        params.set('excludeBidded', 'true');
      }

      const response = await authFetch(`/api/projects?${params.toString()}`, userId);
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, projectFilters.prefecture, projectFilters.excludeBidded]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <>
      {/* タブ */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="flex">
          <Link
            href="/consultations"
            className="flex-1 py-3 text-sm font-medium text-center bg-white text-[#64748B] hover:bg-[#F8FAFC]"
          >
            パワスク相談
          </Link>
          <Link
            href="/projects"
            className="flex-1 py-3 text-sm font-bold text-center bg-[#2563EB] text-white"
          >
            案件
          </Link>
        </div>
      </div>

      {/* 案件フィルタ */}
      <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            className="input text-sm py-2 px-3 min-w-[140px]"
            value={projectFilters.prefecture}
            onChange={(e) =>
              setProjectFilters({ ...projectFilters, prefecture: e.target.value })
            }
          >
            <option value="">エリア</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={projectFilters.excludeBidded}
              onChange={(e) =>
                setProjectFilters({ ...projectFilters, excludeBidded: e.target.checked })
              }
            />
            未応募のみ
          </label>
        </div>
      </div>

      {/* 案件一覧 */}
      <main className="p-4 pb-24">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-[#64748B]">
            <p>案件がありません</p>
            <p className="text-sm mt-2">新しい案件が登録されるとここに表示されます</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => {
              const daysRemaining = getDaysRemaining(project.deadline);
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={`card block p-4 ${project.isOwner ? 'card-own' : ''}`}
                >
                  {/* バッジ行 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {project.isUrgent && (
                        <span className="badge badge-urgent">急募</span>
                      )}
                      <span className="badge badge-type">
                        {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType] || '募集'}
                      </span>
                    </div>
                    <span className="text-sm text-[#64748B]">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-[#1E293B] mb-2">
                    {project.title}
                  </h2>

                  {/* エリア・工期 */}
                  <p className="text-sm text-[#64748B] mb-2">
                    {project.sitePrefecture || '未設定'} | {project.periodStart}〜{project.periodEnd}
                  </p>

                  {/* 作業内容タグ */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.workTypes.slice(0, 3).map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] text-xs rounded"
                      >
                        {WORK_TYPE_LABELS[type as WorkType]}
                      </span>
                    ))}
                    {project.workTypes.length > 3 && (
                      <span className="px-2 py-0.5 text-[#64748B] text-xs">
                        +{project.workTypes.length - 3}
                      </span>
                    )}
                  </div>

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-sm text-[#2563EB]">詳細を見る</span>
                    <span
                      className={`text-sm ${
                        daysRemaining <= 3 ? 'text-[#E24B4A]' : 'text-[#64748B]'
                      }`}
                    >
                      残り{daysRemaining}日
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* 案件登録ボタン */}
      <div className="fixed bottom-6 right-4">
        <Link
          href="/projects/new"
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
          案件を登録
        </Link>
      </div>
    </>
  );
}

// ===== Main Page =====

export default function ProjectsPage() {
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
