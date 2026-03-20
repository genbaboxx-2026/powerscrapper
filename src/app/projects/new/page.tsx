'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { AuthGuard } from '@/components/AuthGuard';
import { authFetch } from '@/lib/api';
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
  recruitmentType: '',
  structureType: '',
  floors: '',
  totalArea: '',
  siteAddress: '',
  periodStart: '',
  periodEnd: '',
  workTypes: [],
  description: '',
  isUrgent: false,
  notifyMembers: true,
  deadline: '',
};

const STEPS = ['LINE認証', 'プロフィール確認', '案件情報', '確認・公開'];

export default function ProjectNewPage() {
  const router = useRouter();
  const { userId, displayName, pictureUrl, isLoading: liffLoading } = useLiff();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ProjectFormData>(initialFormData);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await authFetch('/api/projects', userId, {
        method: 'POST',
        body: formData,
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

  const toggleWorkType = (type: string) => {
    setFormData((prev) => {
      const current = prev.workTypes;
      const updated = current.includes(type)
        ? current.filter((t) => t !== type)
        : [...current, type];
      return { ...prev, workTypes: updated };
    });
  };

  const isStep3Valid = () => {
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

  if (isLoading || liffLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F6E56] mx-auto"></div>
          <p className="mt-4 text-[#73726C]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthGuard requireProfile>
      <div className="min-h-screen bg-[#F4F3F0]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#D5D5D0] px-4 py-3 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-[#2C2C2A]">案件登録</h1>
        </header>

        {/* ステッパー */}
        <div className="bg-white border-b border-[#D5D5D0] px-4 py-4">
          <div className="flex items-center justify-between max-w-sm mx-auto">
            {STEPS.map((step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    index + 1 <= currentStep
                      ? 'bg-[#0F6E56] text-white'
                      : 'bg-[#D5D5D0] text-[#73726C]'
                  }`}
                >
                  {index + 1}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-8 h-0.5 mx-1 ${
                      index + 1 < currentStep ? 'bg-[#0F6E56]' : 'bg-[#D5D5D0]'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#73726C] mt-2">
            {STEPS[currentStep - 1]}
          </p>
        </div>

        <div className="p-4 pb-24">
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
              <p className="text-lg font-bold text-[#2C2C2A]">
                {displayName || 'ユーザー'}
              </p>
              <p className="text-sm text-[#73726C] mt-1">LINE認証済み</p>
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#E1F5EE] rounded-full text-[#0F6E56] text-sm">
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
                <h3 className="text-sm font-medium text-[#73726C] mb-1">会社名</h3>
                <p className="text-[#2C2C2A]">{profile.companyName || '未登録'}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#73726C] mb-1">業種</h3>
                <p className="text-[#2C2C2A]">
                  {profile.businessType
                    ? BUSINESS_TYPE_LABELS[profile.businessType as BusinessType]
                    : '未登録'}
                </p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#73726C] mb-1">代表者名</h3>
                <p className="text-[#2C2C2A]">{profile.representativeName || '未登録'}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#73726C] mb-1">連絡先</h3>
                <p className="text-[#2C2C2A]">{profile.phone || '未登録'}</p>
                <p className="text-[#73726C] text-sm">{profile.email || ''}</p>
              </div>
              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#73726C] mb-1">対応エリア</h3>
                <div className="flex flex-wrap gap-1 mt-1">
                  {profile.coverageAreas.length > 0 ? (
                    profile.coverageAreas.map((area) => (
                      <span
                        key={area}
                        className="px-2 py-1 bg-[#E1F5EE] text-[#0F6E56] text-xs rounded"
                      >
                        {area}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#73726C]">未登録</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => router.push('/profile/edit')}
                className="w-full py-3 border border-[#0F6E56] text-[#0F6E56] rounded-lg font-medium"
              >
                プロフィールを編集
              </button>
            </div>
          )}

          {/* Step 3: 案件情報入力 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {/* 募集タイプ */}
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                            ? 'bg-[#0F6E56] text-white'
                            : 'bg-white border border-[#D5D5D0] text-[#2C2C2A]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 案件名 */}
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                            ? 'bg-[#0F6E56] text-white'
                            : 'bg-white border border-[#D5D5D0] text-[#2C2C2A]'
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
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                            ? 'bg-[#0F6E56] text-white'
                            : 'bg-white border border-[#D5D5D0] text-[#2C2C2A]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* 案件詳細 */}
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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

              {/* 募集期限 */}
              <div className="card p-4">
                <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              <div className="card p-4 space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-[#D5D5D0]"
                    checked={formData.isUrgent}
                    onChange={(e) =>
                      setFormData({ ...formData, isUrgent: e.target.checked })
                    }
                  />
                  <span className="text-sm text-[#2C2C2A]">
                    <span className="badge badge-urgent mr-1">急募</span>
                    急ぎの案件として表示
                  </span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-[#D5D5D0]"
                    checked={formData.notifyMembers}
                    onChange={(e) =>
                      setFormData({ ...formData, notifyMembers: e.target.checked })
                    }
                  />
                  <span className="text-sm text-[#2C2C2A]">
                    公開時にLINEで会員に通知する
                  </span>
                </label>
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
                  <span className="badge badge-type">
                    {RECRUITMENT_TYPE_LABELS[formData.recruitmentType as RecruitmentType]}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-[#2C2C2A] mb-4">
                  {formData.title}
                </h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex">
                    <dt className="w-24 text-[#73726C]">構造</dt>
                    <dd className="flex-1 text-[#2C2C2A]">
                      {STRUCTURE_TYPE_LABELS[formData.structureType as StructureType]}
                      {formData.floors && ` / ${formData.floors}`}
                      {formData.totalArea && ` / ${formData.totalArea}`}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#73726C]">現場</dt>
                    <dd className="flex-1 text-[#2C2C2A]">{formData.siteAddress}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#73726C]">工期</dt>
                    <dd className="flex-1 text-[#2C2C2A]">
                      {formData.periodStart} 〜 {formData.periodEnd}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#73726C]">作業内容</dt>
                    <dd className="flex-1">
                      <div className="flex flex-wrap gap-1">
                        {formData.workTypes.map((type) => (
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
                    <dt className="w-24 text-[#73726C]">募集期限</dt>
                    <dd className="flex-1 text-[#2C2C2A]">{formData.deadline}</dd>
                  </div>
                </dl>
              </div>

              <div className="card p-4">
                <h3 className="text-sm font-medium text-[#73726C] mb-2">
                  案件詳細・条件
                </h3>
                <p className="text-[#2C2C2A] whitespace-pre-wrap text-sm">
                  {formData.description}
                </p>
              </div>

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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0] p-4">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={handleBack}
                className="flex-1 py-3 border border-[#D5D5D0] text-[#2C2C2A] rounded-lg font-medium"
              >
                戻る
              </button>
            )}
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 3 && !isStep3Valid()}
                className="flex-1 btn-primary disabled:opacity-50"
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
