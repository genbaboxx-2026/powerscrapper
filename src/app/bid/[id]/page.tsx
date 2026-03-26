'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  STRUCTURE_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type RecruitmentType,
  type StructureType,
  type BusinessType,
} from '@/types';

const MESSAGE_TEMPLATES = [
  'この案件に対応可能です。弊社の実績を活かして貢献できると考えています。詳細をお聞かせいただけますか？',
  '対応エリア内の案件で興味があります。工期や現場の詳細について相談させてください。',
  '同種の工事実績があり、すぐに対応可能です。まずはお話しできればと思います。',
  '条件次第で対応を検討したいです。詳しい条件を教えていただけますか？',
];

type Project = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  floors: string | null;
  totalArea: string | null;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  description: string;
  isUrgent: boolean;
  deadline: string;
};

type UserProfile = {
  companyName: string;
  businessType: string;
  coverageAreas: string[];
  licenses: string[];
  companyDescription: string;
};

type Props = {
  params: Promise<{ id: string }>;
};

export default function BidPage({ params }: Props) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const { userId, profileCompleted } = useLiff();
  const [project, setProject] = useState<Project | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'input' | 'confirm'>('input');

  const [formData, setFormData] = useState({
    availableFrom: '',
    message: '',
  });
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState<number | null>(null);

  const handleTemplateSelect = (index: number) => {
    setSelectedTemplateIndex(index);
    setFormData({ ...formData, message: MESSAGE_TEMPLATES[index] });
  };

  const truncateTemplate = (text: string, maxLength: number = 20) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  // 案件情報とプロフィールを取得
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;

      try {
        // 案件情報を取得
        const projectRes = await authFetch(`/api/projects/${projectId}`, userId);

        if (!projectRes.ok) {
          if (projectRes.status === 404) {
            setError('案件が見つかりません');
          } else {
            setError('エラーが発生しました');
          }
          return;
        }

        const projectData = await projectRes.json();

        // 自分の案件の場合
        if (projectData.isOwner) {
          setError('自分の案件には興味ありを送れません');
          return;
        }

        // 既に興味あり送信済みの場合
        if (projectData.hasBid) {
          setError('既にこの案件に興味ありを送信済みです');
          return;
        }

        // 募集期限切れの場合
        if (new Date(projectData.deadline) < new Date()) {
          setError('この案件は募集期限を過ぎています');
          return;
        }

        setProject(projectData);

        // プロフィール情報を取得
        const profileRes = await authFetch('/api/profile', userId);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          setProfile({
            companyName: profileData.companyName || '',
            businessType: profileData.businessType || '',
            coverageAreas: profileData.coverageAreas || [],
            licenses: profileData.licenses || [],
            companyDescription: profileData.companyDescription || '',
          });
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        setError('エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchData();
    }
  }, [projectId, userId]);

  // プロフィール未完了の場合
  useEffect(() => {
    if (!isLoading && !profileCompleted && !error) {
      setError('興味ありを送るには会社プロフィールの登録が必要です');
    }
  }, [isLoading, profileCompleted, error]);

  const handleSubmit = async () => {
    if (!userId || !project) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await authFetch('/api/bids', userId, {
        method: 'POST',
        body: {
          projectId: project.id,
          availableFrom: formData.availableFrom || null,
          message: formData.message,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '送信に失敗しました');
      }

      // 成功時は案件一覧に遷移
      router.push('/projects?bid=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
      setStep('input');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.message.trim()) {
      setError('アピールメッセージを入力してください');
      return;
    }

    setError(null);
    setStep('confirm');
  };

  if (isLoading) {
    return (
      <AuthGuard requireApproval requireMember>
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2563EB] mx-auto"></div>
            <p className="mt-4 text-[#64748B]">読み込み中...</p>
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (error && !project) {
    return (
      <AuthGuard requireApproval requireMember>
        <div className="min-h-screen bg-[#F8FAFC]">
          <header className="bg-white border-b border-[#E2E8F0] px-4 py-3">
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
          <div className="p-4 text-center">
            <p className="text-[#E24B4A]">{error}</p>
            {!profileCompleted && (
              <button
                onClick={() => router.push('/profile/edit')}
                className="btn-primary mt-4"
              >
                プロフィールを登録する
              </button>
            )}
          </div>
        </div>
      </AuthGuard>
    );
  }

  if (!project) return null;

  return (
    <AuthGuard requireApproval requireMember>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 sticky top-0 z-10">
          <button
            onClick={() => (step === 'confirm' ? setStep('input') : router.back())}
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
            {step === 'confirm' ? '入力に戻る' : '案件詳細'}
          </button>
        </header>

        {/* ステップインジケーター */}
        <div className="bg-white px-4 py-3 border-b border-[#E2E8F0]">
          <div className="flex justify-center gap-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  step === 'input'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#E2E8F0] text-white'
                }`}
              >
                1
              </div>
              <span
                className={`text-sm ${
                  step === 'input' ? 'text-[#2563EB] font-medium' : 'text-[#64748B]'
                }`}
              >
                入力
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
                  step === 'confirm'
                    ? 'bg-[#2563EB] text-white'
                    : 'bg-[#E2E8F0] text-white'
                }`}
              >
                2
              </div>
              <span
                className={`text-sm ${
                  step === 'confirm' ? 'text-[#2563EB] font-medium' : 'text-[#64748B]'
                }`}
              >
                確認
              </span>
            </div>
          </div>
        </div>

        <main className="p-4 pb-24">
          {/* 案件サマリー */}
          <div className="card p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              {project.isUrgent && (
                <span className="badge badge-urgent">急募</span>
              )}
              <span className="badge badge-type">
                {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
              </span>
            </div>
            <h1 className="text-lg font-bold text-[#1E293B] mb-2">
              {project.title}
            </h1>
            <div className="text-sm text-[#64748B] space-y-1">
              <p>
                {STRUCTURE_TYPE_LABELS[project.structureType as StructureType]}
                {project.floors && ` / ${project.floors}`}
              </p>
              <p>
                {project.sitePrefecture || '未設定'} | {project.periodStart}〜
                {project.periodEnd}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {step === 'input' ? (
            <form onSubmit={handleConfirm}>
              {/* 対応可能時期 */}
              <div className="card p-4 mb-4">
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  対応可能時期
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="例：即日対応可、4月上旬から、2週間後から"
                  value={formData.availableFrom}
                  onChange={(e) =>
                    setFormData({ ...formData, availableFrom: e.target.value })
                  }
                />
                <p className="text-xs text-[#64748B] mt-2">
                  ※ おおよその目安で構いません
                </p>
              </div>

              {/* アピールメッセージ */}
              <div className="card p-4 mb-4">
                <label className="block text-sm font-medium text-[#1E293B] mb-2">
                  アピールメッセージ <span className="text-[#E24B4A]">*</span>
                </label>

                {/* テンプレート選択 */}
                <div className="mb-3">
                  <p className="text-xs text-[#64748B] mb-2">テンプレートから選ぶ</p>
                  <div className="flex flex-wrap gap-2">
                    {MESSAGE_TEMPLATES.map((template, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleTemplateSelect(index)}
                        className={`px-3 py-2 text-xs rounded-lg border transition-colors text-left ${
                          selectedTemplateIndex === index
                            ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                            : 'border-[#E2E8F0] bg-[#F9F9F7] text-[#64748B] hover:border-[#64748B]'
                        }`}
                      >
                        {truncateTemplate(template)}
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  className="input min-h-[140px] resize-none"
                  placeholder="自社の強み、実績、対応可能な作業内容などをアピールしてください。"
                  value={formData.message}
                  onChange={(e) => {
                    setFormData({ ...formData, message: e.target.value });
                    // ユーザーが編集したらテンプレート選択をクリア
                    if (selectedTemplateIndex !== null && e.target.value !== MESSAGE_TEMPLATES[selectedTemplateIndex]) {
                      setSelectedTemplateIndex(null);
                    }
                  }}
                  required
                />
              </div>

              {/* 会社情報プレビュー */}
              {profile && (
                <div className="card p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium text-[#64748B]">
                      登録者に表示される あなたの会社情報
                    </h2>
                    <Link
                      href="/profile/edit"
                      className="text-xs text-[#2563EB] underline"
                    >
                      プロフィールを編集
                    </Link>
                  </div>

                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">会社名</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.companyName || '未設定'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">業種</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.businessType
                          ? BUSINESS_TYPE_LABELS[profile.businessType as BusinessType]
                          : '未設定'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">対応エリア</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.coverageAreas.length > 0
                          ? profile.coverageAreas.join('、')
                          : '未設定'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">保有資格</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.licenses.length > 0
                          ? profile.licenses.join('、')
                          : '未設定'}
                      </dd>
                    </div>
                    {profile.companyDescription && (
                      <div className="pt-2 border-t border-[#E2E8F0]">
                        <dt className="text-[#64748B] mb-1">会社紹介</dt>
                        <dd className="text-[#1E293B] whitespace-pre-wrap text-xs">
                          {profile.companyDescription}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <p className="text-xs text-[#64748B] mt-3 pt-3 border-t border-[#E2E8F0]">
                    ※ この情報が興味あり送信時に登録者へ送られます
                  </p>
                </div>
              )}

              {/* 送信ボタン */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
                <button type="submit" className="btn-primary w-full">
                  確認画面へ
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* 確認画面 */}
              <div className="card p-4 mb-4">
                <h2 className="text-sm font-medium text-[#64748B] mb-3">
                  送信内容の確認
                </h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex">
                    <dt className="w-24 text-[#64748B] shrink-0">対応可能時期</dt>
                    <dd className="flex-1 text-[#1E293B]">
                      {formData.availableFrom || '未入力'}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-[#64748B] shrink-0">メッセージ</dt>
                    <dd className="flex-1 text-[#1E293B] whitespace-pre-wrap">
                      {formData.message}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 会社情報プレビュー（確認画面でも表示） */}
              {profile && (
                <div className="card p-4 mb-4 bg-[#F9F9F7]">
                  <h2 className="text-sm font-medium text-[#64748B] mb-3">
                    送信される会社情報
                  </h2>
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">会社名</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.companyName || '未設定'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">業種</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.businessType
                          ? BUSINESS_TYPE_LABELS[profile.businessType as BusinessType]
                          : '未設定'}
                      </dd>
                    </div>
                    <div className="flex">
                      <dt className="w-20 text-[#64748B] shrink-0">対応エリア</dt>
                      <dd className="flex-1 text-[#1E293B]">
                        {profile.coverageAreas.length > 0
                          ? profile.coverageAreas.join('、')
                          : '未設定'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="card p-4 bg-[#F8FAFC] border-[#E2E8F0]">
                <p className="text-xs text-[#64748B]">
                  ※ 送信後の取り消しはできません。内容をよくご確認ください。
                  <br />※ 選定されると、相互の連絡先が開示されます。
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-primary w-full disabled:opacity-50"
                >
                  {isSubmitting ? '送信中...' : '興味ありを送る'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
