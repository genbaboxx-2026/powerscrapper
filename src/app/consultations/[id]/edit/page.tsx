'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';

const CATEGORIES = [
  { value: 'general', label: '一般相談' },
  { value: 'technical', label: '技術相談' },
  { value: 'equipment', label: '重機・機材' },
  { value: 'waste', label: '産廃関連' },
  { value: 'regulation', label: '法規・許可' },
  { value: 'other', label: 'その他' },
];

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditConsultationPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    body: '',
  });

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

        // オーナーでない場合はリダイレクト
        if (!data.consultation.isOwner) {
          router.replace(`/consultations/${id}`);
          return;
        }

        setFormData({
          category: data.consultation.category,
          title: data.consultation.title,
          body: data.consultation.body,
        });
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
  }, [id, userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    if (!formData.category || !formData.title.trim() || !formData.body.trim()) {
      setError('全ての項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/consultations/${id}`, userId, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      router.push(`/consultations/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B]">読み込み中...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
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
            戻る
          </button>
        </header>

        <main className="p-4 pb-24">
          <div className="card p-4 mb-4">
            <h1 className="text-lg font-bold text-[#1E293B] mb-2">
              相談を編集する
            </h1>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* カテゴリ */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                カテゴリ <span className="text-[#E24B4A]">*</span>
              </label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                required
              >
                <option value="">選択してください</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* タイトル */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                タイトル <span className="text-[#E24B4A]">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="相談のタイトルを入力"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                maxLength={100}
                required
              />
            </div>

            {/* 相談内容 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                相談内容 <span className="text-[#E24B4A]">*</span>
              </label>
              <textarea
                className="input min-h-[200px] resize-none"
                placeholder="相談したい内容を詳しく書いてください"
                value={formData.body}
                onChange={(e) =>
                  setFormData({ ...formData, body: e.target.value })
                }
                required
              />
            </div>

            {/* 送信ボタン */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? '更新中...' : '更新する'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
