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

const PREFECTURES = [
  '東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県',
];

function RegistrationMessage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';

  if (!registered) return null;

  return (
    <div className="mx-4 mt-4 p-3 bg-[#E1F5EE] border border-[#0F6E56] rounded-lg text-[#0F6E56] text-sm">
      案件を登録しました。管理者の審査後に公開されます。
    </div>
  );
}

function ProjectsContent() {
  const { userId } = useLiff();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    recruitmentType: '',
    prefecture: '',
    urgentOnly: false,
  });

  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.recruitmentType) {
        params.set('recruitmentType', filters.recruitmentType);
      }
      if (filters.prefecture) {
        params.set('prefecture', filters.prefecture);
      }
      if (filters.urgentOnly) {
        params.set('urgentOnly', 'true');
      }

      const res = await authFetch(`/api/projects?${params.toString()}`, userId);

      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filters, userId]);

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
      {/* フィルタバー */}
      <div className="bg-white border-b border-[#D5D5D0] px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <select
            className="input text-sm py-2 px-3 min-w-[130px]"
            value={filters.recruitmentType}
            onChange={(e) =>
              setFilters({ ...filters, recruitmentType: e.target.value })
            }
          >
            <option value="">募集タイプ</option>
            {Object.entries(RECRUITMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            className="input text-sm py-2 px-3 min-w-[100px]"
            value={filters.prefecture}
            onChange={(e) =>
              setFilters({ ...filters, prefecture: e.target.value })
            }
          >
            <option value="">エリア</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1 text-sm whitespace-nowrap px-2">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={filters.urgentOnly}
              onChange={(e) =>
                setFilters({ ...filters, urgentOnly: e.target.checked })
              }
            />
            急募のみ
          </label>
        </div>
      </div>

      {/* 案件一覧 */}
      <main className="p-4 pb-24">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0F6E56] mx-auto"></div>
            <p className="mt-4 text-[#73726C] text-sm">読み込み中...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 text-[#73726C]">
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
                  className={`card block p-4 ${project.isOwner ? 'bg-[#F0F7FF] border-[#B8D4E8]' : ''}`}
                >
                  {/* バッジ行 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {project.isOwner && (
                        <span className="px-2 py-0.5 bg-[#E3EDF7] text-[#4A6FA5] text-xs rounded font-medium border border-[#B8D4E8]">
                          自分の案件
                        </span>
                      )}
                      {project.isUrgent && (
                        <span className="badge badge-urgent">急募</span>
                      )}
                      <span className="badge badge-type">
                        {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
                      </span>
                    </div>
                    <span className="text-sm text-[#73726C]">
                      {formatDate(project.createdAt)}
                    </span>
                  </div>

                  {/* タイトル */}
                  <h2 className="text-base font-bold text-[#2C2C2A] mb-2">
                    {project.title}
                  </h2>

                  {/* エリア・工期 */}
                  <p className="text-sm text-[#73726C] mb-2">
                    {project.sitePrefecture || '未設定'} | {project.periodStart}〜{project.periodEnd}
                  </p>

                  {/* 作業内容タグ */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {project.workTypes.slice(0, 3).map((type) => (
                      <span
                        key={type}
                        className="px-2 py-0.5 bg-[#F4F3F0] text-[#73726C] text-xs rounded"
                      >
                        {WORK_TYPE_LABELS[type as WorkType]}
                      </span>
                    ))}
                    {project.workTypes.length > 3 && (
                      <span className="px-2 py-0.5 text-[#73726C] text-xs">
                        +{project.workTypes.length - 3}
                      </span>
                    )}
                  </div>

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#D5D5D0]">
                    <span className="text-sm text-[#0F6E56]">詳細を見る</span>
                    <span
                      className={`text-sm ${
                        daysRemaining <= 3 ? 'text-[#E24B4A]' : 'text-[#73726C]'
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

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-3">
          <h1 className="text-lg font-bold text-[#2C2C2A]">案件一覧</h1>
        </header>

        {/* 登録完了メッセージ（Suspense で囲む） */}
        <Suspense fallback={null}>
          <RegistrationMessage />
        </Suspense>

        <ProjectsContent />
      </div>
    </AuthGuard>
  );
}
