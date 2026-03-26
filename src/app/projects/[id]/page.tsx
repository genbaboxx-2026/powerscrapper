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
  images: string[];
  isUrgent: boolean;
  deadline: string;
  status: string;
  bidCount: number;
  isOwner: boolean;
  hasBid: boolean;
  bidId: string | null;
  bidStatus: string | null;
  ownerInfo: {
    companyName: string;
    representativeName: string;
    phone: string;
    email: string | null;
  } | null;
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCancelBidConfirm, setShowCancelBidConfirm] = useState(false);
  const [isCancellingBid, setIsCancellingBid] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isRepublishing, setIsRepublishing] = useState(false);

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

        // 入札がある場合は既読にマーク
        if (data.hasBid && data.bidId) {
          try {
            await authFetch('/api/mypage/mark-item-read', userId, {
              method: 'POST',
              body: { itemType: 'bid', itemId: data.bidId },
            });
          } catch (e) {
            console.error('Failed to mark bid as read:', e);
          }
        }
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

  const handleDelete = async () => {
    if (!userId) return;

    setIsDeleting(true);

    try {
      const res = await authFetch(`/api/projects/${id}`, userId, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }

      router.push('/projects?deleted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除に失敗しました');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStop = async () => {
    if (!userId) return;

    setIsStopping(true);

    try {
      const res = await authFetch(`/api/projects/${id}`, userId, {
        method: 'PATCH',
        body: { status: 'closed' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '停止に失敗しました');
      }

      // 成功したらprojectのstatusを更新
      if (project) {
        setProject({ ...project, status: 'closed' });
      }
      setShowStopConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止に失敗しました');
      setShowStopConfirm(false);
    } finally {
      setIsStopping(false);
    }
  };

  const handleRepublish = async () => {
    if (!userId) return;

    setIsRepublishing(true);

    try {
      const res = await authFetch(`/api/projects/${id}`, userId, {
        method: 'PATCH',
        body: { status: 'approved' },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '掲載再開に失敗しました');
      }

      // 成功したらprojectのstatusを更新
      if (project) {
        setProject({ ...project, status: 'approved' });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '掲載再開に失敗しました');
    } finally {
      setIsRepublishing(false);
    }
  };

  const handleCancelBid = async () => {
    if (!userId) return;

    setIsCancellingBid(true);

    try {
      const res = await authFetch(`/api/projects/${id}/bids`, userId, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '取り消しに失敗しました');
      }

      // 成功したらprojectのhasBidをfalseに更新
      if (project) {
        setProject({ ...project, hasBid: false, bidCount: project.bidCount - 1 });
      }
      setShowCancelBidConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取り消しに失敗しました');
      setShowCancelBidConfirm(false);
    } finally {
      setIsCancellingBid(false);
    }
  };

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
      <AuthGuard requireApproval allowPending>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B]">読み込み中...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error || !project) {
    return (
      <AuthGuard requireApproval allowPending>
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
            <p className="text-[#E24B4A]">{error || '案件が見つかりません'}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const daysRemaining = getDaysRemaining(project.deadline);
  const isExpired = daysRemaining < 0;

  return (
    <AuthGuard requireApproval allowPending>
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
            案件一覧
          </button>
        </header>

        <main className="p-4 pb-24">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {/* メインカード */}
          <div className="card p-4 mb-4">
            {/* バッジ */}
            {project.isUrgent && (
              <div className="mb-3">
                <span className="badge badge-urgent">急募</span>
              </div>
            )}

            {/* タイトル */}
            <h1 className="text-xl font-bold text-[#1E293B] mb-4">
              {project.title}
            </h1>

            {/* 詳細情報 */}
            <dl className="space-y-3 text-sm">
              <div className="flex">
                <dt className="w-20 text-[#64748B] shrink-0">構造</dt>
                <dd className="flex-1 text-[#1E293B]">
                  {STRUCTURE_TYPE_LABELS[project.structureType as StructureType]}
                  {project.floors && ` / ${project.floors}`}
                  {project.totalArea && ` / ${project.totalArea}`}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#64748B] shrink-0">現場</dt>
                <dd className="flex-1 text-[#1E293B]">
                  {project.isOwner && project.siteAddress
                    ? project.siteAddress
                    : project.sitePrefecture || '非公開'}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#64748B] shrink-0">工期</dt>
                <dd className="flex-1 text-[#1E293B]">
                  {project.periodStart} 〜 {project.periodEnd}
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#64748B] shrink-0">作業内容</dt>
                <dd className="flex-1">
                  <div className="flex flex-wrap gap-1">
                    {project.workTypes.map((type) => (
                      <span
                        key={type}
                        className="px-2 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs rounded"
                      >
                        {WORK_TYPE_LABELS[type as WorkType]}
                      </span>
                    ))}
                  </div>
                </dd>
              </div>
              <div className="flex">
                <dt className="w-20 text-[#64748B] shrink-0">募集期限</dt>
                <dd className="flex-1">
                  <span className="text-[#1E293B]">
                    {formatDeadline(project.deadline)}
                  </span>
                  {!isExpired && (
                    <span
                      className={`ml-2 ${
                        daysRemaining <= 3 ? 'text-[#E24B4A]' : 'text-[#64748B]'
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
            </dl>
          </div>

          {/* 案件詳細 */}
          <div className="card p-4 mb-4">
            <h2 className="text-sm font-medium text-[#64748B] mb-2">
              案件詳細・条件
            </h2>
            <p className="text-[#1E293B] whitespace-pre-wrap text-sm leading-relaxed">
              {project.description}
            </p>
          </div>

          {/* 現場写真 */}
          {project.images && project.images.length > 0 && (
            <div className="card p-4 mb-4">
              <h2 className="text-sm font-medium text-[#64748B] mb-3">
                現場写真（{project.images.length}枚）
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {project.images.map((image, index) => (
                  <img
                    key={index}
                    src={image}
                    alt={`現場写真 ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-[#E2E8F0]"
                    onClick={() => window.open(image, '_blank')}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 返答あり時の登録者情報 */}
          {!project.isOwner && project.bidStatus === 'connected' && project.ownerInfo && (
            <div className="card p-4 border-[#06C755] border-2">
              <h2 className="text-sm font-bold text-[#06C755] mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                案件登録者の連絡先
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex">
                  <dt className="w-20 text-[#64748B]">会社名</dt>
                  <dd className="flex-1 text-[#1E293B] font-medium">{project.ownerInfo.companyName}</dd>
                </div>
                <div className="flex">
                  <dt className="w-20 text-[#64748B]">担当者</dt>
                  <dd className="flex-1 text-[#1E293B]">{project.ownerInfo.representativeName}</dd>
                </div>
                <div className="flex">
                  <dt className="w-20 text-[#64748B]">電話番号</dt>
                  <dd className="flex-1 text-[#1E293B]">
                    <a href={`tel:${project.ownerInfo.phone}`} className="text-[#2563EB] underline">
                      {project.ownerInfo.phone}
                    </a>
                  </dd>
                </div>
                {project.ownerInfo.email && (
                  <div className="flex">
                    <dt className="w-20 text-[#64748B]">メール</dt>
                    <dd className="flex-1 text-[#1E293B]">
                      <a href={`mailto:${project.ownerInfo.email}`} className="text-[#2563EB] underline">
                        {project.ownerInfo.email}
                      </a>
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* 注意事項 */}
          {!project.isOwner && project.bidStatus !== 'connected' && (
            <div className="card p-4 bg-[#F8FAFC] border-[#E2E8F0]">
              <p className="text-xs text-[#64748B]">
                ※ 登録者の企業名・連絡先は興味ありを送信後、選定された場合にのみ開示されます。
              </p>
            </div>
          )}

          {/* オーナー用の編集・削除ボタン */}
          {project.isOwner && (
            <div className="card p-4">
              <h3 className="text-sm font-medium text-[#64748B] mb-3">
                案件の管理
              </h3>
              <div className="flex gap-2 mb-2">
                <Link
                  href={`/projects/${id}/edit`}
                  className="flex-1 py-2 px-4 border border-[#2563EB] text-[#2563EB] rounded-lg text-sm font-medium text-center"
                >
                  編集する
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex-1 py-2 px-4 border border-[#E24B4A] text-[#E24B4A] rounded-lg text-sm font-medium"
                >
                  削除する
                </button>
              </div>
              {project.status !== 'closed' && (
                <button
                  onClick={() => setShowStopConfirm(true)}
                  className="w-full py-2 px-4 border border-[#64748B] text-[#64748B] rounded-lg text-sm font-medium"
                >
                  募集を停止する
                </button>
              )}
              {project.status === 'closed' && (
                <div className="space-y-2">
                  <button
                    onClick={handleRepublish}
                    disabled={isRepublishing}
                    className="w-full py-2 px-4 bg-[#2563EB] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {isRepublishing ? '処理中...' : '掲載を再開する'}
                  </button>
                  <p className="text-xs text-[#64748B] text-center">
                    この案件は現在停止中です
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        {/* フッターボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          {project.isOwner ? (
            <Link
              href={`/projects/${project.id}/bids`}
              className={`w-full text-center block py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                project.bidCount > 0
                  ? 'bg-[#2563EB] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0]'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              興味ありリスト（{project.bidCount}社）
            </Link>
          ) : project.hasBid && project.bidStatus === 'connected' ? (
            <div className="text-center text-sm text-[#06C755] font-medium">
              返答済み - 上記の連絡先をご確認ください
            </div>
          ) : project.hasBid ? (
            <button
              onClick={() => setShowCancelBidConfirm(true)}
              className="w-full py-3 border border-[#E24B4A] text-[#E24B4A] rounded-lg font-medium"
            >
              興味ありを取り消す
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

        {/* 興味あり取り消し確認モーダル */}
        {showCancelBidConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">
                興味ありを取り消しますか？
              </h3>
              <p className="text-sm text-[#64748B] mb-6">
                取り消すと、この案件への応募がキャンセルされます。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelBidConfirm(false)}
                  disabled={isCancellingBid}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#1E293B] rounded-lg font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCancelBid}
                  disabled={isCancellingBid}
                  className="flex-1 py-3 bg-[#E24B4A] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isCancellingBid ? '取り消し中...' : '取り消す'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 削除確認モーダル */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">
                案件を削除しますか？
              </h3>
              <p className="text-sm text-[#64748B] mb-6">
                この操作は取り消せません。関連する興味ありも全て削除されます。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#1E293B] rounded-lg font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 bg-[#E24B4A] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isDeleting ? '削除中...' : '削除する'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 停止確認モーダル */}
        {showStopConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full">
              <h3 className="text-lg font-bold text-[#1E293B] mb-2">
                募集を停止しますか？
              </h3>
              <p className="text-sm text-[#64748B] mb-6">
                案件一覧から非表示になります。停止後も編集から再公開できます。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStopConfirm(false)}
                  disabled={isStopping}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#1E293B] rounded-lg font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleStop}
                  disabled={isStopping}
                  className="flex-1 py-3 bg-[#64748B] text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {isStopping ? '停止中...' : '停止する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
