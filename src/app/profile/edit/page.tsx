'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  COVERAGE_AREAS,
  LICENSES,
} from '@/types';

const JOB_TITLES = [
  '代表取締役',
  '取締役',
  '部長',
  '課長',
  '主任',
  '一般社員',
  'その他',
] as const;

type ProfileFormData = {
  companyName: string;
  representativeName: string;
  jobTitle: string;
  phone: string;
  email: string;
  address: string;
  coverageAreas: string[];
  licenses: string[];
  websiteUrl: string;
  companyDescription: string;
  lineFriendLinkConsent: boolean;
};

const initialFormData: ProfileFormData = {
  companyName: '',
  representativeName: '',
  jobTitle: '',
  phone: '',
  email: '',
  address: '',
  coverageAreas: [],
  licenses: [],
  websiteUrl: '',
  companyDescription: '',
  lineFriendLinkConsent: false,
};

export default function ProfileEditPage() {
  const router = useRouter();
  const { userId, displayName, pictureUrl, isLoading: liffLoading, isFriend } = useLiff();
  const [formData, setFormData] = useState<ProfileFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 友だちでない場合はブロック画面へ
  useEffect(() => {
    if (!liffLoading && isFriend === false) {
      router.replace('/auth/blocked');
    }
  }, [liffLoading, isFriend, router]);

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
          setFormData({
            companyName: data.companyName || '',
            representativeName: data.representativeName || '',
            jobTitle: data.jobTitle || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            coverageAreas: data.coverageAreas || [],
            licenses: data.licenses || [],
            websiteUrl: data.websiteUrl || '',
            companyDescription: data.companyDescription || '',
            lineFriendLinkConsent: data.lineFriendLinkConsent || false,
          });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSaving(true);

    try {
      const res = await authFetch('/api/profile', userId, {
        method: 'PUT',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }

      router.push('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setIsSaving(false);
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

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[#2563EB] mb-2"
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
        <h1 className="text-lg font-bold text-[#1E293B]">会社プロフィール登録</h1>
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

      <form onSubmit={handleSubmit} className="p-4 pb-24">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
            {error}
          </div>
        )}

        {/* 会社名 */}
        <div className="card p-4 mb-4">
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

        {/* 名前 */}
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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

        {/* 所在地 */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#1E293B] mb-2">
            所在地
          </label>
          <input
            type="text"
            className="input"
            placeholder="東京都新宿区○○町1-2-3"
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />
        </div>

        {/* 対応エリア */}
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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
        <div className="card p-4 mb-4">
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

        {/* LINE友だちリンク送付同意 */}
        <div className="card p-4 mb-4">
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
              マッチング成立時に、相手にLINE友だち追加リンクを送付することに同意します
              <span className="text-[#E24B4A]"> *</span>
            </span>
          </label>
        </div>

        {/* 送信ボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          <button
            type="submit"
            disabled={isSaving || !formData.lineFriendLinkConsent}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSaving ? '保存中...' : 'プロフィールを保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
