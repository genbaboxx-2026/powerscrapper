'use client';

import { useState, useEffect, use, useRef } from 'react';
import { useRouter } from 'next/navigation';
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

// 画像アップロード設定
const MAX_IMAGES = 5;
const MAX_IMAGE_WIDTH = 1200;
const MAX_IMAGE_SIZE_KB = 800;

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

        let quality = 0.8;
        let base64 = canvas.toDataURL('image/jpeg', quality);

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

type ProjectFormData = {
  title: string;
  recruitmentType: string;
  structureType: string;
  floors: string;
  totalArea: string;
  siteAddress: string;
  periodStart: string;
  periodEnd: string;
  workTypes: string[];
  description: string;
  images: string[];
  isUrgent: boolean;
  deadline: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditProjectPage({ params }: Props) {
  const { id } = use(params);
  const router = useRouter();
  const { userId } = useLiff();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    recruitmentType: '',
    structureType: '',
    floors: '',
    totalArea: '',
    siteAddress: '',
    periodStart: '',
    periodEnd: '',
    workTypes: [],
    description: '',
    images: [],
    isUrgent: false,
    deadline: '',
  });

  // 画像選択ハンドラー
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingImage(true);
    setError(null);

    try {
      const remainingSlots = MAX_IMAGES - formData.images.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const newImages: string[] = [];
      for (const file of filesToProcess) {
        if (!file.type.startsWith('image/')) {
          continue;
        }
        const base64 = await resizeImage(file);
        newImages.push(base64);
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (err) {
      console.error('Image processing error:', err);
      setError('画像の処理に失敗しました');
    } finally {
      setIsProcessingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 画像削除ハンドラー
  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

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

        // オーナーでない場合はリダイレクト
        if (!data.isOwner) {
          router.replace(`/projects/${id}`);
          return;
        }

        // 日付をフォーマット
        const deadlineDate = new Date(data.deadline);
        const formattedDeadline = deadlineDate.toISOString().split('T')[0];

        setFormData({
          title: data.title || '',
          recruitmentType: data.recruitmentType || '',
          structureType: data.structureType || '',
          floors: data.floors || '',
          totalArea: data.totalArea || '',
          siteAddress: data.siteAddress || '',
          periodStart: data.periodStart || '',
          periodEnd: data.periodEnd || '',
          workTypes: data.workTypes || [],
          description: data.description || '',
          images: data.images || [],
          isUrgent: data.isUrgent || false,
          deadline: formattedDeadline,
        });
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
  }, [id, userId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) return;

    if (!isFormValid()) {
      setError('必須項目を入力してください');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch(`/api/projects/${id}`, userId, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新に失敗しました');
      }

      router.push(`/projects/${id}?updated=true`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleWorkType = (type: string) => {
    setFormData((prev) => {
      const current = prev.workTypes;
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, workTypes: updated };
    });
  };

  const isFormValid = () => {
    return (
      formData.title &&
      formData.recruitmentType &&
      formData.structureType &&
      formData.siteAddress &&
      formData.periodStart &&
      formData.periodEnd &&
      formData.workTypes.length > 0 &&
      formData.description &&
      formData.deadline
    );
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
              案件を編集する
            </h1>
            <p className="text-sm text-[#64748B]">
              編集後は再度審査が必要になります。
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 募集タイプ */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                募集タイプ <span className="text-[#E24B4A]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(RECRUITMENT_TYPE_LABELS) as [RecruitmentType, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, recruitmentType: value })
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formData.recruitmentType === value
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#1E293B]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 案件名 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                案件名 <span className="text-[#E24B4A]">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: RC造3階建てビル解体工事"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            {/* 構造 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                構造 <span className="text-[#E24B4A]">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(STRUCTURE_TYPE_LABELS) as [StructureType, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, structureType: value })
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formData.structureType === value
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#1E293B]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 階数・延床面積 */}
            <div className="card p-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    階数
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="例: 地上3階"
                    value={formData.floors}
                    onChange={(e) =>
                      setFormData({ ...formData, floors: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E293B] mb-2">
                    延床面積
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="例: 500m2"
                    value={formData.totalArea}
                    onChange={(e) =>
                      setFormData({ ...formData, totalArea: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* 現場所在地 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                現場所在地 <span className="text-[#E24B4A]">*</span>
              </label>
              <input
                type="text"
                className="input"
                placeholder="例: 東京都渋谷区神宮前1-2-3"
                value={formData.siteAddress}
                onChange={(e) =>
                  setFormData({ ...formData, siteAddress: e.target.value })
                }
              />
            </div>

            {/* 工期 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                工期 <span className="text-[#E24B4A]">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  className="input"
                  placeholder="開始: 2026年4月"
                  value={formData.periodStart}
                  onChange={(e) =>
                    setFormData({ ...formData, periodStart: e.target.value })
                  }
                />
                <input
                  type="text"
                  className="input"
                  placeholder="終了: 2026年6月"
                  value={formData.periodEnd}
                  onChange={(e) =>
                    setFormData({ ...formData, periodEnd: e.target.value })
                  }
                />
              </div>
            </div>

            {/* 作業内容 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                作業内容 <span className="text-[#E24B4A]">*</span>（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(WORK_TYPE_LABELS) as [WorkType, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleWorkType(value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        formData.workTypes.includes(value)
                          ? 'bg-[#2563EB] text-white'
                          : 'bg-white border border-[#E2E8F0] text-[#1E293B]'
                      }`}
                    >
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* 案件詳細 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                案件詳細・条件 <span className="text-[#E24B4A]">*</span>
              </label>
              <textarea
                className="input min-h-[120px] resize-none"
                placeholder="現場の状況、必要な機材、条件などを詳しく記入してください"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>

            {/* 画像アップロード */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                現場写真（任意・最大{MAX_IMAGES}枚）
              </label>

              {/* 画像プレビュー */}
              {formData.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`現場写真 ${index + 1}`}
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
              {formData.images.length < MAX_IMAGES && (
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
                      現場写真を追加
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

            {/* 募集期限 */}
            <div className="card p-4 mb-4">
              <label className="block text-sm font-medium text-[#1E293B] mb-2">
                募集期限 <span className="text-[#E24B4A]">*</span>
              </label>
              <input
                type="date"
                className="input"
                value={formData.deadline}
                onChange={(e) =>
                  setFormData({ ...formData, deadline: e.target.value })
                }
              />
            </div>

            {/* オプション */}
            <div className="card p-4 mb-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-[#E2E8F0] accent-[#2563EB]"
                  checked={formData.isUrgent}
                  onChange={(e) =>
                    setFormData({ ...formData, isUrgent: e.target.checked })
                  }
                />
                <span className="text-sm text-[#1E293B]">
                  <span className="badge badge-urgent mr-1">急募</span>
                  急ぎの案件として表示
                </span>
              </label>
            </div>

            {/* 送信ボタン */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
              <button
                type="submit"
                disabled={isSubmitting || !isFormValid()}
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
