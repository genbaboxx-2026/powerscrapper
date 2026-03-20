'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  WORK_TYPE_LABELS,
  type RecruitmentType,
  type StructureType,
  type WorkType,
} from '@/types';

type Project = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  floors: string | null;
  totalArea: string | null;
  siteAddress: string | null;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  workTypes: string[];
  description: string;
  isUrgent: boolean;
  deadline: string;
  status: string;
  bidCount: number;
  isOwner: boolean;
  hasBid: boolean;
  createdAt: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ProjectDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!userId) return;

      try {
        const res = await authFetch(`/api/projects/${id}`, userId);

        if (!res.ok) {
          if (res.status === 404) {
            setError('案件が見つかりません');
          } else {
            setError('エラーが発生しました');
          }
          return;
        }

        const data = await res.json();
        setProject(data);
      } catch (err) {
        console.error('Failed to fetch project:', err);
        setError('エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProject();
    }
  }, [id, userId]);

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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

  if (error || !project) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#F4F3F0]">
          <header className="bg-white border-b border-[#D5D5D0] px-4 py-3">
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

  const daysRemaining = getDaysRemaining(project.deadline);
  const isExpired = daysRemaining < 0;

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
            案件一覧
          </button>
        </header>

        <main className="p-4 pb-24">
          {/* メインカード */}
          <div className="card p-4 mb-4">
            {/* バッジ */}
            <div className="flex items-center gap-2 mb-3">
              {project.isUrgent && (
                <span className="badge badge-urgent">急募</span>
              )}
              <span className="badge badge-type">
                {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
              </span>
            </div>

            {/* タイトル */}
            <h1 className="text-xl font-bold text-[#2C2C2A] mb-4">
              {project.title}
            </h1>

            {/* 詳細情報 */}
            <dl className="space-y-3 text-sm">
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">構造</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {STRUCTURE_TYPE_LABELS[project.structureType as StructureType]}
                  {project.floors && ` / ${project.floors}`}
                  {project.totalArea && ` / ${project.totalArea}`}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">現場</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.isOwner && project.siteAddress
                    ? project.siteAddress
                    : project.sitePrefecture || '非公開'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">工期</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.periodStart} 〜 {project.periodEnd}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">作業内容</dt>
                <dd className="flex-1">
                  <div className="flex flex-wrap gap-1">
                    {project.workTypes.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-[#E1F5EE] text-[#0F6E56] text-xs rounded"
                      >
                        {WORK_TYPE_LABELS[type as WorkType]}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">募集期限</dt>
                <dd className="flex-1">
                  <span className="text-[#2C2C2A]">
                    {formatDeadline(project.deadline)}
                  </span>
                  {!isExpired && (
                    <span
                      className={`ml-2 ${
                        daysRemaining <= 3 ? 'text-[#E24B4A]' : 'text-[#73726C]'
                      }`}
                    >
                      （残り{daysRemaining}日）
                    </span>
                  )}
                  {isExpired && (
                    <span className="ml-2 text-[#E24B4A]">（募集終了）</span>
                  )}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">興味あり</dt>
                <dd className="flex-1 text-[#2C2C2A]">{project.bidCount}件</dd>
              </div>
            </dl>
          </div>

          {/* 案件詳細 */}
          <div className="card p-4 mb-4">
            <h2 className="text-sm font-medium text-[#73726C] mb-2">
              案件詳細・条件
            </h2>
            <p className="text-[#2C2C2A] whitespace-pre-wrap text-sm leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* 注意事項 */}
          {!project.isOwner && (
            <div className="card p-4 bg-[#F4F3F0] border-[#D5D5D0]">
              <p className="text-xs text-[#73726C]">
                ※ 登録者の企業名・連絡先は興味ありを送信後、選定された場合にのみ開示されます。
              </p>
            </div>
          )}
        </main>

        {/* フッターボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0] p-4">
          {project.isOwner ? (
            <Link
              href={`/projects/${project.id}/bids`}
              className="btn-primary w-full text-center block"
            >
              興味ありリスト（{project.bidCount}件）
            </Link>
          ) : project.hasBid ? (
            <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              興味ありを送信済み
            </button>
          ) : isExpired ? (
            <button disabled className="btn-primary w-full opacity-50 cursor-not-allowed">
              募集終了
            </button>
          ) : (
            <Link
              href={`/bid/${project.id}`}
              className="btn-primary w-full text-center block"
            >
              興味あり
            </Link>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
