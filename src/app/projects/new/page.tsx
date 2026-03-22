'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { AuthGuard } from '@/components/AuthGuard';
import { authFetch } from '@/lib/api';
import {
  STRUCTURE_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type StructureType,
  type BusinessType,
} from '@/types';
import { AREA_DATA, PREFECTURES } from '@/lib/areas';

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

// 年の選択肢（現在年から3年分）
const currentYear = new Date().getFullYear();
const YEARS = [currentYear, currentYear + 1, currentYear + 2];

// 月の選択肢
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

// 時期の選択肢
const PERIODS = ['初旬', '中旬', '下旬'];

type ProjectFormData = {
  title: string;
  structureType: string;
  floors: string;
  totalArea: string;
  // 現場所在地（分割）
  sitePrefecture: string;
  siteCity: string;
  // 工期（分割）
  periodStartYear: string;
  periodStartMonth: string;
  periodStartPeriod: string;
  periodEndYear: string;
  periodEndMonth: string;
  periodEndPeriod: string;
  // その他
  description: string;
  images: string[];
  isUrgent: boolean;
  notifyMembers: boolean;
  deadline: string;
};

type ProfileData = {
  companyName: string;
  businessType: string;
  representativeName: string;
  phone: string;
  email: string;
  address: string;
  coverageAreas: string[];
  licenses: string[];
  profileCompleted: boolean;
};

const initialFormData: ProjectFormData = {
  title: '',
  structureType: '',
  floors: '',
  totalArea: '',
  sitePrefecture: '',
  siteCity: '',
  periodStartYear: String(currentYear),
  periodStartMonth: '',
  periodStartPeriod: '',
  periodEndYear: String(currentYear),
  periodEndMonth: '',
  periodEndPeriod: '',
  description: '',
  images: [],
  isUrgent: false,
  notifyMembers: true,
  deadline: '',
};

const STEPS = ['LINE認証', 'プロフィール確認', '案件情報', '確認・公開'];

export default function ProjectNewPage() {
  const router = useRouter();
  const { userId, displayName, pictureUrl, isLoading: liffLoading } = useLiff();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

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

  // プロフィール取得
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await authFetch('/api/profile', userId);
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!liffLoading && userId) {
      fetchProfile();
    }
  }, [liffLoading, userId]);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!formData.title) errors.push('案件名');
    if (!formData.structureType) errors.push('構造種別');
    if (!formData.sitePrefecture) errors.push('現場所在地（都道府県）');
    if (!formData.siteCity) errors.push('現場所在地（市区町村）');
    if (!formData.periodStartMonth) errors.push('工期開始（月）');
    if (!formData.periodStartPeriod) errors.push('工期開始（時期）');
    if (!formData.periodEndMonth) errors.push('工期終了（月）');
    if (!formData.periodEndPeriod) errors.push('工期終了（時期）');
    if (!formData.description) errors.push('案件詳細・条件');
    if (!formData.deadline) errors.push('募集期限');
    return errors;
  };

  const handleNext = () => {
    if (currentStep === 3) {
      const errors = getValidationErrors();
      if (errors.length > 0) {
        setValidationErrors(errors);
        setError(`以下の必須項目を入力してください：\n${errors.join('、')}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setValidationErrors([]);
      setError(null);
    }
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // 工期のフォーマット
  const formatPeriod = (year: string, month: string, period: string) => {
    if (!year || !month || !period) return '';
    return `${year}年${month}月${period}`;
  };

  // 現場所在地のフォーマット
  const formatSiteAddress = () => {
    if (!formData.sitePrefecture) return '';
    return formData.siteCity
      ? `${formData.sitePrefecture}${formData.siteCity}`
      : formData.sitePrefecture;
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      // APIに送信するデータを整形
      const submitData = {
        title: formData.title,
        recruitmentType: 'general', // デフォルト値
        structureType: formData.structureType,
        floors: formData.floors,
        totalArea: formData.totalArea,
        siteAddress: formatSiteAddress(),
        sitePrefecture: formData.sitePrefecture,
        periodStart: formatPeriod(
          formData.periodStartYear,
          formData.periodStartMonth,
          formData.periodStartPeriod
        ),
        periodEnd: formatPeriod(
          formData.periodEndYear,
          formData.periodEndMonth,
          formData.periodEndPeriod
        ),
        workTypes: [], // 空配列
        description: formData.description,
        images: formData.images,
        isUrgent: formData.isUrgent,
        notifyMembers: formData.notifyMembers,
        deadline: formData.deadline,
      };

      const res = await authFetch('/api/projects', userId, {
        method: 'POST',
        body: submitData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '登録に失敗しました');
      }

      router.push('/projects?registered=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStep3Valid = () => {
    return (
      formData.title &&
      formData.structureType &&
      formData.sitePrefecture &&
      formData.siteCity &&
      formData.periodStartMonth &&
      formData.periodStartPeriod &&
      formData.periodEndMonth &&
      formData.periodEndPeriod &&
      formData.description &&
      formData.deadline
    );
  };

  if (isLoading || liffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
          <p className="mt-4 text-[#64748B]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireProfile>
      <div className="min-h-screen bg-[#F8FAFC] overflow-x-hidden">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/projects')}
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
            <h1 className="text-lg font-bold text-[#1E293B]">案件登録</h1>
            <div className="w-16"></div>
          </div>
        </header>

        {/* ステッパー */}
        <div className="bg-white border-b border-[#E2E8F0] px-4 py-4">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index + 1 <= currentStep
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index + 1 < currentStep ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#64748B] mt-2">
            {STEPS[currentStep - 1]}
          </p>
        </div>

        <div className="p-4 pb-24 overflow-x-hidden">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {/* Step 1: LINE認証 */}
          {currentStep === 1 && (
            <div className="card p-6 text-center">
              {pictureUrl && (
                <img
                  src={pictureUrl}
                  alt=""
                  className="w-20 h-20 rounded-full mx-auto mb-4"
                />
              )}
              <p className="text-lg font-bold text-[#1E293B]">
                {displayName || 'ユーザー'}
              </p>
              <p className="text-sm text-[#64748B] mt-1">LINE認証済み</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#EFF6FF] rounded-full text-[#2563EB] text-sm">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                認証完了
              </div>
            </div>
          )}

          {/* Step 2: プロフィール確認 */}
          {currentStep === 2 && profile && (
            <div className="space-y-4">
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-1">会社名</h3>
                <p className="text-[#1E293B]">{profile.companyName || '未登録'}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-1">業種</h3>
                <p className="text-[#1E293B]">
                  {profile.businessType
                    ? BUSINESS_TYPE_LABELS[profile.businessType as BusinessType]
                    : '未登録'}
                </p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-1">代表者名</h3>
                <p className="text-[#1E293B]">{profile.representativeName || '未登録'}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-1">連絡先</h3>
                <p className="text-[#1E293B]">{profile.phone || '未登録'}</p>
                <p className="text-[#64748B] text-sm">{profile.email || ''}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-1">対応エリア</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.coverageAreas.length > 0 ? (
                    profile.coverageAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-[#EFF6FF] text-[#2563EB] text-xs rounded"
                      >
                        {area}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#64748B]">未登録</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push('/profile/edit')}
                className="w-full py-3 border border-[#2563EB] text-[#2563EB] rounded-lg font-medium"
              >
                プロフィールを編集
              </button>
            </div>
          )}

          {/* Step 3: 案件情報入力 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* 案件名 */}
              <div className={`card p-4 ${validationErrors.includes('案件名') ? 'border-[#E24B4A] border-2' : ''}`}>
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
              <div className={`card p-4 ${validationErrors.includes('構造種別') ? 'border-[#E24B4A] border-2' : ''}`}>
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
              <div className="card p-4">
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
                      placeholder="例: 500m²"
                      value={formData.totalArea}
                      onChange={(e) =>
                        setFormData({ ...formData, totalArea: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* 現場所在地 */}
              <div className={`card p-4 ${validationErrors.includes('現場所在地（都道府県）') || validationErrors.includes('現場所在地（市区町村）') ? 'border-[#E24B4A] border-2' : ''}`}>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  現場所在地 <span className="text-[#E24B4A]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <select
                    className="input"
                    value={formData.sitePrefecture}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sitePrefecture: e.target.value,
                        siteCity: '', // 都道府県変更時に市区町村をリセット
                      })
                    }
                  >
                    <option value="">都道府県を選択</option>
                    {PREFECTURES.map((pref) => (
                      <option key={pref} value={pref}>
                        {pref}
                      </option>
                    ))}
                  </select>
                  <select
                    className="input"
                    value={formData.siteCity}
                    onChange={(e) =>
                      setFormData({ ...formData, siteCity: e.target.value })
                    }
                    disabled={!formData.sitePrefecture}
                  >
                    {!formData.sitePrefecture ? (
                      <option value="">都道府県を先に選択</option>
                    ) : (
                      <>
                        <option value="">市区町村を選択</option>
                        {AREA_DATA[formData.sitePrefecture]?.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* 工期 */}
              <div className={`card p-4 ${validationErrors.some(e => e.includes('工期')) ? 'border-[#E24B4A] border-2' : ''}`}>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  工期 <span className="text-[#E24B4A]">*</span>
                </label>

                {/* 開始時期 */}
                <p className="text-xs text-[#64748B] mb-2">開始時期</p>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <select
                    className="input text-sm"
                    value={formData.periodStartYear}
                    onChange={(e) =>
                      setFormData({ ...formData, periodStartYear: e.target.value })
                    }
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </select>
                  <select
                    className="input text-sm"
                    value={formData.periodStartMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, periodStartMonth: e.target.value })
                    }
                  >
                    <option value="">月</option>
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}月
                      </option>
                    ))}
                  </select>
                  <select
                    className="input text-sm"
                    value={formData.periodStartPeriod}
                    onChange={(e) =>
                      setFormData({ ...formData, periodStartPeriod: e.target.value })
                    }
                  >
                    <option value="">時期</option>
                    {PERIODS.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 終了時期 */}
                <p className="text-xs text-[#64748B] mb-2">終了時期</p>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    className="input text-sm"
                    value={formData.periodEndYear}
                    onChange={(e) =>
                      setFormData({ ...formData, periodEndYear: e.target.value })
                    }
                  >
                    {YEARS.map((year) => (
                      <option key={year} value={year}>
                        {year}年
                      </option>
                    ))}
                  </select>
                  <select
                    className="input text-sm"
                    value={formData.periodEndMonth}
                    onChange={(e) =>
                      setFormData({ ...formData, periodEndMonth: e.target.value })
                    }
                  >
                    <option value="">月</option>
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>
                        {month}月
                      </option>
                    ))}
                  </select>
                  <select
                    className="input text-sm"
                    value={formData.periodEndPeriod}
                    onChange={(e) =>
                      setFormData({ ...formData, periodEndPeriod: e.target.value })
                    }
                  >
                    <option value="">時期</option>
                    {PERIODS.map((period) => (
                      <option key={period} value={period}>
                        {period}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 案件詳細 */}
              <div className={`card p-4 ${validationErrors.includes('案件詳細・条件') ? 'border-[#E24B4A] border-2' : ''}`}>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  案件詳細・条件 <span className="text-[#E24B4A]">*</span>
                </label>
                <textarea
                  className="input min-h-[120px] resize-none"
                  placeholder="現場の状況、必要な機材、条件などを記入してください"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* 画像アップロード */}
              <div className="card p-4">
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

              {/* オプション */}
              <div className="card p-4 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-[#E2E8F0]"
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
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-[#E2E8F0]"
                    checked={formData.notifyMembers}
                    onChange={(e) =>
                      setFormData({ ...formData, notifyMembers: e.target.checked })
                    }
                  />
                  <span className="text-sm text-[#1E293B]">
                    公開時にLINEで会員に通知する
                  </span>
                </label>
              </div>

              {/* 募集期限 */}
              <div className={`card p-4 ${validationErrors.includes('募集期限') ? 'border-[#E24B4A] border-2' : ''}`}>
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  募集期限 <span className="text-[#E24B4A]">*</span>
                </label>
                <input
                  type="date"
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl text-base bg-white box-border"
                  value={formData.deadline}
                  onChange={(e) =>
                    setFormData({ ...formData, deadline: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {/* Step 4: 確認・公開 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="card p-4">
                <div className="flex items-center gap-2 mb-3">
                  {formData.isUrgent && (
                    <span className="badge badge-urgent">急募</span>
                  )}
                </div>
                <h2 className="text-lg font-bold text-[#1E293B] mb-4">
                  {formData.title}
                </h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex">
                    <dt className="w-24 text-[#64748B]">構造</dt>
                    <dd className="flex-1 text-[#1E293B]">
                      {STRUCTURE_TYPE_LABELS[formData.structureType as StructureType]}
                      {formData.floors && ` / ${formData.floors}`}
                      {formData.totalArea && ` / ${formData.totalArea}`}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#64748B]">現場</dt>
                    <dd className="flex-1 text-[#1E293B]">{formatSiteAddress()}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#64748B]">工期</dt>
                    <dd className="flex-1 text-[#1E293B]">
                      {formatPeriod(
                        formData.periodStartYear,
                        formData.periodStartMonth,
                        formData.periodStartPeriod
                      )}{' '}
                      〜{' '}
                      {formatPeriod(
                        formData.periodEndYear,
                        formData.periodEndMonth,
                        formData.periodEndPeriod
                      )}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#64748B]">募集期限</dt>
                    <dd className="flex-1 text-[#1E293B]">{formData.deadline}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#64748B] mb-2">
                  案件詳細・条件
                </h3>
                <p className="text-[#1E293B] whitespace-pre-wrap text-sm">
                  {formData.description}
                </p>
              </div>

              {/* 現場写真プレビュー */}
              {formData.images.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-medium text-[#64748B] mb-2">
                    現場写真（{formData.images.length}枚）
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {formData.images.map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`現場写真 ${index + 1}`}
                        className="w-20 h-20 object-cover rounded-lg border border-[#E2E8F0]"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="card p-4 bg-[#FAEEDA] border-[#BA7517]">
                <p className="text-sm text-[#BA7517]">
                  案件を登録すると、管理者による審査が行われます。
                  承認後に案件が公開され、興味ありが届いたらLINEでお知らせします。
                </p>
              </div>
            </div>
          )}
        </div>

        {/* フッターボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-[#E2E8F0] text-[#1E293B] rounded-lg font-medium"
              >
                戻る
              </button>
            )}
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                className="flex-1 btn-primary"
              >
                次へ
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 btn-primary disabled:opacity-50"
              >
                {isSubmitting ? '登録中...' : 'この内容で公開する'}
              </button>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
