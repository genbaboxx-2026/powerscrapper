'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  general: { label: '一般相談', color: 'bg-[#E8E8E6] text-[#73726C]' },
  technical: { label: '技術相談', color: 'bg-[#E3EDF7] text-[#4A6FA5]' },
  equipment: { label: '重機・機材', color: 'bg-[#FAEEDA] text-[#BA7517]' },
  waste: { label: '産廃関連', color: 'bg-[#E1F5EE] text-[#0F6E56]' },
  regulation: { label: '法規・許可', color: 'bg-[#FDEAEA] text-[#E24B4A]' },
  other: { label: 'その他', color: 'bg-[#E8E8E6] text-[#73726C]' },
};

type User = {
  id: string;
  displayName: string | null;
  companyName: string | null;
  pictureUrl: string | null;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: User;
  isOwner: boolean;
};

type Consultation = {
  id: string;
  category: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  user: User;
  isOwner: boolean;
  comments: Comment[];
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function ConsultationDetailPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchConsultation = async () => {
      if (!userId) return;

      try {
        const res = await authFetch(`/api/consultations/${id}`, userId);

        if (!res.ok) {
          if (res.status === 404) {
            setError('相談が見つかりません');
          } else {
            setError('エラーが発生しました');
          }
          return;
        }

        const data = await res.json();
        setConsultation(data.consultation);
      } catch (err) {
        console.error('Failed to fetch consultation:', err);
        setError('エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchConsultation();
    }
  }, [id, userId]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId || !commentBody.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await authFetch(`/api/consultations/${id}/comments`, userId, {
        method: 'POST',
        body: { body: commentBody },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'コメントの投稿に失敗しました');
      }

      // コメント投稿成功後、ページをリロードして最新のコメントを取得
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'コメントの投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getUserDisplayName = (user: User) => {
    return user.companyName || user.displayName || '匿名';
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

  if (error || !consultation) {
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
            <p className="text-[#E24B4A]">{error || '相談が見つかりません'}</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  const categoryInfo = CATEGORY_LABELS[consultation.category] || CATEGORY_LABELS.other;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => router.push('/projects')}
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
            相談一覧
          </button>
        </header>

        <main className="p-4 pb-32">
          {/* 相談本文 */}
          <div className="card p-4 mb-4">
            {/* カテゴリ・日時 */}
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2 py-0.5 text-xs rounded font-medium ${categoryInfo.color}`}>
                {categoryInfo.label}
              </span>
              <span className="text-xs text-[#73726C]">
                {formatDateTime(consultation.createdAt)}
              </span>
            </div>

            {/* タイトル */}
            <h1 className="text-lg font-bold text-[#2C2C2A] mb-3">
              {consultation.title}
            </h1>

            {/* 投稿者 */}
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#D5D5D0]">
              {consultation.user.pictureUrl ? (
                <img
                  src={consultation.user.pictureUrl}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#D5D5D0] flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-[#73726C]"
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
              <span className="text-sm text-[#2C2C2A]">
                {getUserDisplayName(consultation.user)}
              </span>
              {consultation.isOwner && (
                <span className="px-2 py-0.5 bg-[#E3EDF7] text-[#4A6FA5] text-xs rounded">
                  投稿者
                </span>
              )}
            </div>

            {/* 本文 */}
            <p className="text-[#2C2C2A] whitespace-pre-wrap leading-relaxed">
              {consultation.body}
            </p>
          </div>

          {/* コメント一覧 */}
          <div className="mb-4">
            <h2 className="text-sm font-medium text-[#73726C] mb-3 px-1">
              コメント（{consultation.comments.length}件）
            </h2>

            {consultation.comments.length === 0 ? (
              <div className="card p-4 text-center text-[#73726C] text-sm">
                まだコメントがありません
              </div>
            ) : (
              <div className="space-y-3">
                {consultation.comments.map((comment) => (
                  <div key={comment.id} className="card p-4">
                    {/* コメントヘッダー */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {comment.user.pictureUrl ? (
                          <img
                            src={comment.user.pictureUrl}
                            alt=""
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-[#D5D5D0] flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-[#73726C]"
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
                        <span className="text-sm text-[#2C2C2A]">
                          {getUserDisplayName(comment.user)}
                        </span>
                        {comment.user.id === consultation.user.id && (
                          <span className="px-1.5 py-0.5 bg-[#E3EDF7] text-[#4A6FA5] text-xs rounded">
                            投稿者
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#73726C]">
                        {formatDateTime(comment.createdAt)}
                      </span>
                    </div>

                    {/* コメント本文 */}
                    <p className="text-sm text-[#2C2C2A] whitespace-pre-wrap">
                      {comment.body}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* コメント入力フォーム */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0] p-4">
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <textarea
              className="input flex-1 min-h-[44px] max-h-[100px] resize-none py-2"
              placeholder="コメントを入力..."
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={1}
            />
            <button
              type="submit"
              disabled={isSubmitting || !commentBody.trim()}
              className="btn-primary px-4 disabled:opacity-50"
            >
              {isSubmitting ? '...' : '送信'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}
