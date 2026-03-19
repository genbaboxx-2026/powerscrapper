'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AdminAuthGuard } from '@/components/AdminAuthGuard';
import {
  RECRUITMENT_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  WORK_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type RecruitmentType,
  type StructureType,
  type WorkType,
  type BusinessType,
} from '@/types';

type Owner = {
  id: string;
  companyName: string | null;
  businessType: string | null;
  representativeName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  lineDisplayName: string | null;
};

type Project = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  floors: string | null;
  totalArea: string | null;
  siteAddress: string;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  workTypes: string[];
  description: string;
  isUrgent: boolean;
  deadline: string;
  status: string;
  notifyMembers: boolean;
  rejectionReason: string | null;
  createdAt: string;
  user: Owner;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function AdminProjectDetailPage({ params }: Props) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  // 案件を取得
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const res = await fetch(`/api/admin/projects/${projectId}/review`);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'エラーが発生しました');
        }

        const data = await res.json();
        setProject(data.project);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [projectId]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!project) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/projects/${projectId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '処理に失敗しました');
      }

      // 成功時は一覧に戻る
      router.push('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  if (isLoading) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F6E56] mx-auto"></div>
            <p className="mt-4 text-[#73726C]">読み込み中...</p>
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  if (error && !project) {
    return (
      <AdminAuthGuard>
        <div className="min-h-screen bg-[#F4F3F0]">
          <header className="bg-[#0F6E56] text-white px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1"
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
            <button
              onClick={handleLogout}
              className="text-sm text-white/80 hover:text-white"
            >
              ログアウト
            </button>
          </header>
          <div className="p-4 text-center">
            <p className="text-[#E24B4A]">{error}</p>
          </div>
        </div>
      </AdminAuthGuard>
    );
  }

  if (!project) return null;

  const isPending = project.status === 'pending';

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-[#0F6E56] text-white px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1"
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
          <button
            onClick={handleLogout}
            className="text-sm text-white/80 hover:text-white"
          >
            ログアウト
          </button>
        </header>

        <main className="p-4 pb-32">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {/* ステータスバナー */}
          {!isPending && (
            <div
              className={`p-3 rounded-lg mb-4 ${
                project.status === 'approved'
                  ? 'bg-[#E1F5EE] text-[#0F6E56]'
                  : 'bg-red-50 text-[#E24B4A]'
              }`}
            >
              <p className="text-sm font-medium">
                {project.status === 'approved' ? '承認済み' : '却下済み'}
              </p>
              {project.rejectionReason && (
                <p className="text-sm mt-1">理由: {project.rejectionReason}</p>
              )}
            </div>
          )}

          {/* 投稿者情報 */}
          <div className="card p-4 mb-4">
            <h2 className="text-sm font-medium text-[#73726C] mb-3">
              投稿者情報
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">会社名</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.user.companyName || '未設定'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">業種</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.user.businessType
                    ? BUSINESS_TYPE_LABELS[project.user.businessType as BusinessType]
                    : '未設定'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">代表者</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.user.representativeName || '未設定'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">電話番号</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.user.phone || '未設定'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">メール</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.user.email || '未設定'}
                </dd>
              </div>
            </dl>
          </div>

          {/* 案件情報 */}
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              {project.isUrgent && (
                <span className="badge badge-urgent">急募</span>
              )}
              <span className="badge badge-type">
                {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
              </span>
            </div>

            <h1 className="text-xl font-bold text-[#2C2C2A] mb-4">
              {project.title}
            </h1>

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
                <dt className="w-20 text-[#73726C] shrink-0">現場住所</dt>
                <dd className="flex-1 text-[#2C2C2A]">{project.siteAddress}</dd>
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
                <dd className="flex-1 text-[#2C2C2A]">
                  {formatDate(project.deadline)}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#73726C] shrink-0">会員通知</dt>
                <dd className="flex-1 text-[#2C2C2A]">
                  {project.notifyMembers ? 'する' : 'しない'}
                </dd>
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

          {/* 却下理由入力フォーム */}
          {isPending && showRejectForm && (
            <div className="card p-4 mb-4">
              <h2 className="text-sm font-medium text-[#2C2C2A] mb-2">
                却下理由
              </h2>
              <textarea
                className="input min-h-[100px] resize-none"
                placeholder="却下理由を入力してください（任意）"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          )}
        </main>

        {/* フッターボタン */}
        {isPending && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0] p-4">
            {showRejectForm ? (
              <div className="space-y-2">
                <button
                  onClick={() => handleReview('reject')}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-[#E24B4A] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isSubmitting ? '処理中...' : '却下する'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="btn-secondary w-full"
                >
                  キャンセル
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="flex-1 py-3 border border-[#E24B4A] text-[#E24B4A] rounded-lg font-medium"
                >
                  却下
                </button>
                <button
                  onClick={() => handleReview('approve')}
                  disabled={isSubmitting}
                  className="flex-1 btn-primary disabled:opacity-50"
                >
                  {isSubmitting ? '処理中...' : '承認'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminAuthGuard>
  );
}
