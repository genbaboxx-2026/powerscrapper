'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  COVERAGE_AREAS,
  LICENSES,
} from '@/types';
import { PREFECTURES } from '@/lib/areas';

const JOB_TITLES = [
  '代表取締役',
  '取締役',
  '部長',
  '課長',
  '主任',
  '一般社員',
  'その他',
] as const;

type ApplicationFormData = {
  companyName: string;
  representativeName: string;
  jobTitle: string;
  phone: string;
  email: string;
  addressPrefecture: string;
  addressDetail: string;
  coverageAreas: string[];
  licenses: string[];
  websiteUrl: string;
  companyDescription: string;
  lineFriendLinkConsent: boolean;
  referrerName: string;
};

const initialFormData: ApplicationFormData = {
  companyName: '',
  representativeName: '',
  jobTitle: '',
  phone: '',
  email: '',
  addressPrefecture: '',
  addressDetail: '',
  coverageAreas: [],
  licenses: [],
  websiteUrl: '',
  companyDescription: '',
  lineFriendLinkConsent: false,
  referrerName: '',
};

export default function ApplyPage() {
  const router = useRouter();
  const { userId, displayName, pictureUrl, isLoading: liffLoading, isFriend, approvalStatus } = useLiff();
  const [formData, setFormData] = useState<ApplicationFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 友だちでない場合はブロック画面へ
  useEffect(() => {
    if (!liffLoading && isFriend === false) {
      router.replace('/auth/blocked');
    }
  }, [liffLoading, isFriend, router]);

  // 既に申請済みの場合はリダイレクト
  useEffect(() => {
    if (!liffLoading && approvalStatus) {
      if (approvalStatus === 'pending') {
        router.replace('/auth/pending');
      } else if (approvalStatus === 'approved') {
        router.replace('/projects');
      }
    }
  }, [liffLoading, approvalStatus, router]);

  // 既存のプロフィール情報を取得
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
          setFormData((prev) => ({
            ...prev,
            companyName: data.companyName || '',
            representativeName: data.representativeName || '',
            jobTitle: data.jobTitle || '',
            phone: data.phone || '',
            email: data.email || '',
            addressPrefecture: data.address ? (PREFECTURES.find(p => data.address.startsWith(p)) || '') : '',
            addressDetail: data.address ? data.address.replace(/^.{2,3}[都道府県]/, '') : '',
            coverageAreas: data.coverageAreas || [],
            licenses: data.licenses || [],
            websiteUrl: data.websiteUrl || '',
            companyDescription: data.companyDescription || '',
            lineFriendLinkConsent: data.lineFriendLinkConsent || false,
          }));
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (!liffLoading && userId && (approvalStatus === 'none' || approvalStatus === 'rejected')) {
      fetchProfile();
    } else if (!liffLoading) {
      setIsLoading(false);
    }
  }, [liffLoading, userId, approvalStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const { addressPrefecture, addressDetail, ...rest } = formData;
      const res = await authFetch('/api/apply', userId, {
        method: 'POST',
        body: { ...rest, address: addressPrefecture + addressDetail },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '申請に失敗しました');
      }

      router.push('/auth/pending');
    } catch (err) {
      setError(err instanceof Error ? err.message : '申請に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (
    field: 'coverageAreas' | 'licenses',
    item: string
  ) => {
    setFormData((prev) => {
      const current = prev[field];
      const updated = current.includes(item)
        ? current.filter((i) => i !== item)
        : [...current, item];
      return { ...prev, [field]: updated };
    });
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

  // 既に申請済みの場合は表示しない（リダイレクト待ち）
  if (approvalStatus && approvalStatus !== 'none' && approvalStatus !== 'rejected') {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#1E293B]">入会申請</h1>
        {displayName && (
          <div className="flex items-center gap-2 mt-2">
            {pictureUrl && (
              <img
                src={pictureUrl}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
            <p className="text-sm text-[#64748B]">
              {displayName} / LINE認証済み
            </p>
          </div>
        )}
      </header>

      {/* 説明 */}
      <div className="p-4">
        <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4 mb-4">
          <p className="text-sm text-[#1E293B]">
            PowerScrapperの集いは審査制となっております。以下の情報をご入力の上、入会申請をお願いします。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
            {error}
          </div>
        )}

        {/* 会社名 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            会社名 <span className="text-[#E24B4A]">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="株式会社パワー解体"
            value={formData.companyName}
            onChange={(e) =>
              setFormData({ ...formData, companyName: e.target.value })
            }
            required
          />
        </div>

        {/* 所在地 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            所在地
          </label>
          <select
            className="input mb-2"
            value={formData.addressPrefecture}
            onChange={(e) =>
              setFormData({ ...formData, addressPrefecture: e.target.value })
            }
          >
            <option value="">都道府県を選択</option>
            {PREFECTURES.map((pref) => (
              <option key={pref} value={pref}>
                {pref}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="input"
            placeholder="市区町村・番地・建物名"
            value={formData.addressDetail}
            onChange={(e) =>
              setFormData({ ...formData, addressDetail: e.target.value })
            }
          />
        </div>

        {/* 名前 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            名前 <span className="text-[#E24B4A]">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="山田太郎"
            value={formData.representativeName}
            onChange={(e) =>
              setFormData({ ...formData, representativeName: e.target.value })
            }
            required
          />
        </div>

        {/* 役職 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            役職 <span className="text-[#E24B4A]">*</span>
          </label>
          <select
            className="input"
            value={formData.jobTitle}
            onChange={(e) =>
              setFormData({ ...formData, jobTitle: e.target.value })
            }
            required
          >
            <option value="">選択してください</option>
            {JOB_TITLES.map((title) => (
              <option key={title} value={title}>
                {title}
              </option>
            ))}
          </select>
        </div>

        {/* 電話番号 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            電話番号 <span className="text-[#E24B4A]">*</span>
          </label>
          <input
            type="tel"
            className="input"
            placeholder="03-1234-5678"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            required
          />
        </div>

        {/* メールアドレス */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            メールアドレス
          </label>
          <input
            type="email"
            className="input"
            placeholder="info@example.com"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        {/* 対応エリア */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            対応エリア（複数選択可）
          </label>
          <div className="flex flex-wrap gap-2">
            {COVERAGE_AREAS.map((area) => (
              <button
                key={area}
                type="button"
                onClick={() => toggleArrayItem('coverageAreas', area)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.coverageAreas.includes(area)
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#1E293B]'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* 保有許可・資格 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            保有許可・資格（複数選択可）
          </label>
          <div className="flex flex-wrap gap-2">
            {LICENSES.map((license) => (
              <button
                key={license}
                type="button"
                onClick={() => toggleArrayItem('licenses', license)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  formData.licenses.includes(license)
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-white border border-[#E2E8F0] text-[#1E293B]'
                }`}
              >
                {license}
              </button>
            ))}
          </div>
        </div>

        {/* HP URL */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            HP URL
          </label>
          <input
            type="url"
            className="input"
            placeholder="https://example.com"
            value={formData.websiteUrl}
            onChange={(e) =>
              setFormData({ ...formData, websiteUrl: e.target.value })
            }
          />
        </div>

        {/* 会社紹介 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            会社紹介
          </label>
          <textarea
            className="input min-h-[120px] resize-none"
            placeholder="会社の特徴、強み、実績などをご記入ください"
            value={formData.companyDescription}
            onChange={(e) =>
              setFormData({ ...formData, companyDescription: e.target.value })
            }
          />
        </div>

        {/* 紹介者名（必須） */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            紹介者名 <span className="text-[#E24B4A]">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="紹介者がいない場合は「なし」とご記入ください"
            value={formData.referrerName}
            onChange={(e) =>
              setFormData({ ...formData, referrerName: e.target.value })
            }
            required
          />
        </div>

        {/* 情報共有同意 */}
        <div className="mb-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              className="w-5 h-5 mt-0.5 rounded border-[#E2E8F0] accent-[#2563EB]"
              checked={formData.lineFriendLinkConsent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lineFriendLinkConsent: e.target.checked,
                })
              }
              required
            />
            <span className="text-sm text-[#1E293B]">
              案件の連絡時に、相手企業へ会社名・お名前・電話番号・メールアドレスが共有されることに同意します
              <span className="text-[#E24B4A]"> *</span>
            </span>
          </label>
        </div>

        {/* 送信ボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          <button
            type="submit"
            disabled={isSubmitting || !formData.lineFriendLinkConsent || !formData.referrerName}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSubmitting ? '申請中...' : '入会申請する'}
          </button>
        </div>
      </form>
    </div>
  );
}
