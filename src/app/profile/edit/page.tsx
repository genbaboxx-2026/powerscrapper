'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  BUSINESS_TYPE_LABELS,
  COVERAGE_AREAS,
  LICENSES,
  type BusinessType,
} from '@/types';

type ProfileFormData = {
  companyName: string;
  businessType: string;
  representativeName: string;
  phone: string;
  email: string;
  address: string;
  coverageAreas: string[];
  licenses: string[];
  companyDescription: string;
  lineFriendLinkConsent: boolean;
};

const initialFormData: ProfileFormData = {
  companyName: '',
  businessType: '',
  representativeName: '',
  phone: '',
  email: '',
  address: '',
  coverageAreas: [],
  licenses: [],
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
            businessType: data.businessType || '',
            representativeName: data.representativeName || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            coverageAreas: data.coverageAreas || [],
            licenses: data.licenses || [],
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
      <div className="min-h-screen flex items-center justify-center bg-[#F4F3F0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F6E56] mx-auto"></div>
          <p className="mt-4 text-[#73726C]">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F3F0]">
      {/* ヘッダー */}
      <header className="bg-white border-b border-[#D5D5D0] px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold text-[#2C2C2A]">会社プロフィール登録</h1>
        {displayName && (
          <div className="flex items-center gap-2 mt-2">
            {pictureUrl && (
              <img
                src={pictureUrl}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
            <p className="text-sm text-[#73726C]">
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
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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

        {/* 業種カテゴリ */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
            業種カテゴリ <span className="text-[#E24B4A]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(BUSINESS_TYPE_LABELS) as [BusinessType, string][]).map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, businessType: value })
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.businessType === value
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

        {/* 代表者名 */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
            代表者名 <span className="text-[#E24B4A]">*</span>
          </label>
          <input
            type="text"
            className="input"
            placeholder="田中太郎"
            value={formData.representativeName}
            onChange={(e) =>
              setFormData({ ...formData, representativeName: e.target.value })
            }
            required
          />
        </div>

        {/* 電話番号 */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                    ? 'bg-[#0F6E56] text-white'
                    : 'bg-white border border-[#D5D5D0] text-[#2C2C2A]'
                }`}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* 保有許可・資格 */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
                    ? 'bg-[#0F6E56] text-white'
                    : 'bg-white border border-[#D5D5D0] text-[#2C2C2A]'
                }`}
              >
                {license}
              </button>
            ))}
          </div>
        </div>

        {/* 会社紹介 */}
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-[#2C2C2A] mb-2">
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
              className="w-5 h-5 mt-0.5 rounded border-[#D5D5D0]"
              checked={formData.lineFriendLinkConsent}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lineFriendLinkConsent: e.target.checked,
                })
              }
            />
            <span className="text-sm text-[#2C2C2A]">
              マッチング成立時に、相手にLINE友だち追加リンクを送付することに同意します
            </span>
          </label>
        </div>

        {/* 送信ボタン */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5D5D0] p-4">
          <button
            type="submit"
            disabled={isSaving}
            className="btn-primary w-full disabled:opacity-50"
          >
            {isSaving ? '保存中...' : 'プロフィールを保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
