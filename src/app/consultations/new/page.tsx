'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';

const CATEGORIES = [
  { value: 'announcement', label: '告知' },
  { value: 'question', label: '質問' },
  { value: 'request', label: '依頼' },
  { value: 'general', label: '一般相談' },
  { value: 'technical', label: '技術相談' },
  { value: 'equipment', label: '重機・機材' },
  { value: 'waste', label: '産廃関連' },
  { value: 'regulation', label: '法規・許可' },
  { value: 'other', label: 'その他' },
];

const MAX_IMAGES = 3;
const MAX_IMAGE_WIDTH = 800;
const MAX_IMAGE_SIZE_KB = 500;

// 画像をリサイズしてBase64に変換
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // 最大幅でリサイズ
        if (width > MAX_IMAGE_WIDTH) {
          height = (height * MAX_IMAGE_WIDTH) / width;
          width = MAX_IMAGE_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // 品質を調整して目標サイズ以下にする
        let quality = 0.8;
        let base64 = canvas.toDataURL('image/jpeg', quality);

        // サイズが大きすぎる場合は品質を下げる
        while (base64.length > MAX_IMAGE_SIZE_KB * 1024 * 1.37 && quality > 0.1) {
          quality -= 0.1;
          base64 = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(base64);
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function NewConsultationPage() {
  const router = useRouter();
  const { userId } = useLiff();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: '',
    title: '',
    body: '',
  });
  const [images, setImages] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImage(true);
    setError(null);

    try {
      const remainingSlots = MAX_IMAGES - images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const newImages: string[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) {
          continue;
        }
        const base64 = await resizeImage(file);
        newImages.push(base64);
      }

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Image processing error:', err);
      setError('画像の処理に失敗しました');
    } finally {
      setIsProcessingImage(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

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
        body: { ...formData, images },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '投稿に失敗しました');
      }

      router.push('/consultations?posted=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : '投稿に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard requireApproval requireMember>
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
          <div className="mb-4">
            <h1 className="text-lg font-bold text-[#1E293B] mb-1">
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

            {/* 画像アップロード */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                画像を追加（最大{MAX_IMAGES}枚）
              </label>

              {/* 画像プレビュー */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`添付画像 ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-[#E2E8F0]"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-[#E24B4A] text-white rounded-full flex items-center justify-center text-sm"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* 画像追加ボタン */}
              {images.length < MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingImage}
                  className="w-full py-3 border-2 border-dashed border-[#E2E8F0] rounded-lg text-[#64748B] text-sm flex items-center justify-center gap-2 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors disabled:opacity-50"
                >
                  {isProcessingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      処理中...
                    </>
                  ) : (
                    <>
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
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      画像を選択
                    </>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

            {/* 注意事項 */}
            <div className="mb-4">
              <p className="text-xs text-[#64748B]">
                ※ 投稿内容は会員全員に公開されます。
                <br />※ 個人情報や機密情報は記載しないでください。
              </p>
            </div>

            {/* 送信ボタン */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
              <button
                type="submit"
                disabled={isSubmitting || isProcessingImage}
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
