'use client';

import { useState } from 'react';
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

export default function NewConsultationPage() {
  const router = useRouter();
  const { userId } = useLiff();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    body: '',
  });

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
      const res = await authFetch('/api/consultations', userId, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '投稿に失敗しました');
      }

      router.push('/projects?tab=consultation&posted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              相談を投稿する
            </h1>
            <p className="text-sm text-[#64748B]">
              解体業界で働く仲間に相談してみましょう。
            </p>
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

            {/* 注意事項 */}
            <div className="card p-4 mb-4 bg-[#F8FAFC] border-[#E2E8F0]">
              <p className="text-xs text-[#64748B]">
                ※ 投稿内容は会員全員に公開されます。
                <br />※ 個人情報や機密情報は記載しないでください。
              </p>
            </div>

            {/* 送信ボタン */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full disabled:opacity-50"
              >
                {isSubmitting ? '投稿中...' : '投稿する'}
              </button>
            </div>
          </form>
        </main>
      </div>
    </AuthGuard>
  );
}
