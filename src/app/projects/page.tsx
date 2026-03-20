'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthGuard } from '@/components/AuthGuard';
import { useLiff } from '@/components/LiffProvider';
import { authFetch } from '@/lib/api';
import {
  RECRUITMENT_TYPE_LABELS,
  WORK_TYPE_LABELS,
  type RecruitmentType,
  type WorkType,
} from '@/types';

// ===== Types =====

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
  workTypes: string[];
  isUrgent: boolean;
  deadline: string;
  bidCount: number;
  createdAt: string;
  isOwner: boolean;
};

type Consultation = {
  id: string;
  category: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    displayName: string | null;
    companyName: string | null;
    pictureUrl: string | null;
  };
  commentCount: number;
  likeCount: number;
  isOwner: boolean;
};

// ===== Constants =====

const PREFECTURES = [
  '東京都', '神奈川県', '埼玉県', '千葉県', '茨城県', '栃木県', '群馬県',
];

const CONSULTATION_CATEGORIES = [
  { value: '', label: '全て' },
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

const CATEGORY_BADGES: Record<string, { label: string; color: string }> = {
  announcement: { label: '告知', color: 'bg-red-100 text-red-600' },
  question: { label: '質問', color: 'bg-blue-100 text-blue-600' },
  request: { label: '依頼', color: 'bg-amber-100 text-amber-600' },
  general: { label: '一般相談', color: 'bg-[#E8E8E6] text-[#64748B]' },
  technical: { label: '技術相談', color: 'bg-[#E3EDF7] text-[#4A6FA5]' },
  equipment: { label: '重機・機材', color: 'bg-[#FAEEDA] text-[#BA7517]' },
  waste: { label: '産廃関連', color: 'bg-[#EFF6FF] text-[#2563EB]' },
  regulation: { label: '法規・許可', color: 'bg-[#FDEAEA] text-[#E24B4A]' },
  other: { label: 'その他', color: 'bg-[#E8E8E6] text-[#64748B]' },
};

// ===== Message Component =====

function ToastMessage() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const bidSuccess = searchParams.get('bid') === 'success';
  const posted = searchParams.get('posted') === 'true';

  if (registered) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        案件を登録しました。管理者の審査後に公開されます。
      </div>
    );
  }

  if (bidSuccess) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        興味ありを送信しました。結果をお待ちください。
      </div>
    );
  }

  if (posted) {
    return (
      <div className="mx-4 mt-4 p-3 bg-[#EFF6FF] border border-[#2563EB] rounded-lg text-[#2563EB] text-sm">
        相談を投稿しました。
      </div>
    );
  }

  return null;
}

// ===== Main Content Component =====

function MainContent() {
  const { userId } = useLiff();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') === 'project' ? 'project' : 'consultation';

  const [activeTab, setActiveTab] = useState<'consultation' | 'project'>(initialTab);

  // Consultation state
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [consultationFilters, setConsultationFilters] = useState({
    category: '',
    myPosts: false,
  });

  // Project state
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectFilters, setProjectFilters] = useState({
    prefecture: '',
    urgentOnly: false,
    excludeBidded: false,
    myProjects: false,
  });

  const [isLoading, setIsLoading] = useState(true);

  // Fetch consultations
  const fetchConsultations = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (consultationFilters.category) {
        params.set('category', consultationFilters.category);
      }
      if (consultationFilters.myPosts) {
        params.set('myPosts', 'true');
      }

      const res = await authFetch(`/api/consultations?${params.toString()}`, userId);

      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations);
      }
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [consultationFilters, userId]);

  // Fetch projects
  const fetchProjects = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (projectFilters.prefecture) {
        params.set('prefecture', projectFilters.prefecture);
      }
      if (projectFilters.urgentOnly) {
        params.set('urgentOnly', 'true');
      }
      if (projectFilters.excludeBidded) {
        params.set('excludeBidded', 'true');
      }
      if (projectFilters.myProjects) {
        params.set('myProjects', 'true');
      }

      const res = await authFetch(`/api/projects?${params.toString()}`, userId);

      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectFilters, userId]);

  useEffect(() => {
    if (activeTab === 'consultation') {
      fetchConsultations();
    } else {
      fetchProjects();
    }
  }, [activeTab, fetchConsultations, fetchProjects]);

  const getDaysRemaining = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getUserDisplayName = (user: Consultation['user']) => {
    if (user.companyName && user.displayName) {
      return `${user.companyName} / ${user.displayName}`;
    }
    return user.companyName || user.displayName || '匿名';
  };

  const truncateText = (text: string, lines: number = 2) => {
    const lineArray = text.split('\n');
    if (lineArray.length <= lines) {
      const joined = lineArray.join('\n');
      return joined.length > 100 ? joined.slice(0, 100) + '...' : joined;
    }
    return lineArray.slice(0, lines).join('\n') + '...';
  };

  return (
    <>
      {/* タブ */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="flex">
          <button
            onClick={() => setActiveTab('consultation')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'consultation'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B]'
            }`}
          >
            パワスク相談
          </button>
          <button
            onClick={() => setActiveTab('project')}
            className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
              activeTab === 'project'
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#64748B]'
            }`}
          >
            案件
          </button>
        </div>
      </div>

      {activeTab === 'consultation' ? (
        <>
          {/* 相談フィルタ */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select
                className="input text-sm py-2 px-3 min-w-[120px]"
                value={consultationFilters.category}
                onChange={(e) =>
                  setConsultationFilters({ ...consultationFilters, category: e.target.value })
                }
              >
                {CONSULTATION_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 相談一覧 */}
          <main className="p-4 pb-24">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
              </div>
            ) : consultations.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                <p>相談がありません</p>
                <p className="text-sm mt-2">最初の相談を投稿してみましょう</p>
              </div>
            ) : (
              <div className="space-y-4">
                {consultations.map((consultation) => {
                  const categoryInfo = CATEGORY_BADGES[consultation.category] || CATEGORY_BADGES.other;
                  return (
                    <Link
                      key={consultation.id}
                      href={`/consultations/${consultation.id}`}
                      className={`card block p-4 ${consultation.isOwner ? 'card-own' : ''}`}
                    >
                      {/* ユーザー情報ヘッダー */}
                      <div className="flex items-start gap-3 mb-3">
                        {consultation.user.pictureUrl ? (
                          <img
                            src={consultation.user.pictureUrl}
                            alt=""
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#E2E8F0]"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1E293B] truncate">
                            {consultation.user.companyName || '未設定'}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            {consultation.user.representativeName || consultation.user.displayName || ''}
                          </p>
                        </div>
                        <span className="text-xs text-[#64748B] whitespace-nowrap">
                          {formatDateTime(consultation.createdAt)}
                        </span>
                      </div>

                      {/* カテゴリバッジ */}
                      <div className="mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </span>
                      </div>

                      {/* タイトル */}
                      <h2 className="text-base font-bold text-[#1E293B] mb-2">
                        {consultation.title}
                      </h2>

                      {/* 本文プレビュー */}
                      <p className="text-sm text-[#64748B] mb-3 line-clamp-2">
                        {truncateText(consultation.body)}
                      </p>

                      {/* フッター */}
                      <div className="flex items-center justify-end">
                        <span className="text-xs text-[#2563EB]">
                          💬 {consultation.commentCount}件
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>

          {/* 相談投稿ボタン */}
          <div className="fixed bottom-6 right-4">
            <Link
              href="/consultations/new"
              className="btn-primary flex items-center gap-2 shadow-lg"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              相談する
            </Link>
          </div>
        </>
      ) : (
        <>
          {/* 案件フィルタ */}
          <div className="bg-white border-b border-[#E2E8F0] px-4 py-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              <select
                className="input text-sm py-2 px-3 min-w-[100px]"
                value={projectFilters.prefecture}
                onChange={(e) =>
                  setProjectFilters({ ...projectFilters, prefecture: e.target.value })
                }
              >
                <option value="">エリア</option>
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-sm whitespace-nowrap px-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={projectFilters.urgentOnly}
                  onChange={(e) =>
                    setProjectFilters({ ...projectFilters, urgentOnly: e.target.checked })
                  }
                />
                急募のみ
              </label>
              <label className="flex items-center gap-1 text-sm whitespace-nowrap px-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={projectFilters.excludeBidded}
                  onChange={(e) =>
                    setProjectFilters({ ...projectFilters, excludeBidded: e.target.checked })
                  }
                />
                興味あり済を除外
              </label>
              <label className="flex items-center gap-1 text-sm whitespace-nowrap px-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={projectFilters.myProjects}
                  onChange={(e) =>
                    setProjectFilters({ ...projectFilters, myProjects: e.target.checked })
                  }
                />
                自分が登録
              </label>
            </div>
          </div>

          {/* 案件一覧 */}
          <main className="p-4 pb-24">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-12 text-[#64748B]">
                <p>案件がありません</p>
                <p className="text-sm mt-2">新しい案件が登録されるとここに表示されます</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((project) => {
                  const daysRemaining = getDaysRemaining(project.deadline);
                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className={`card block p-4 ${project.isOwner ? 'card-own' : ''}`}
                    >
                      {/* バッジ行 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {project.isOwner && (
                            <span className="px-2 py-0.5 bg-[#E3EDF7] text-[#4A6FA5] text-xs rounded font-medium border border-[#B8D4E8]">
                              自分の案件
                            </span>
                          )}
                          {project.isUrgent && (
                            <span className="badge badge-urgent">急募</span>
                          )}
                          <span className="badge badge-type">
                            {RECRUITMENT_TYPE_LABELS[project.recruitmentType as RecruitmentType]}
                          </span>
                        </div>
                        <span className="text-sm text-[#64748B]">
                          {formatDate(project.createdAt)}
                        </span>
                      </div>

                      {/* タイトル */}
                      <h2 className="text-base font-bold text-[#1E293B] mb-2">
                        {project.title}
                      </h2>

                      {/* エリア・工期 */}
                      <p className="text-sm text-[#64748B] mb-2">
                        {project.sitePrefecture || '未設定'} | {project.periodStart}〜{project.periodEnd}
                      </p>

                      {/* 作業内容タグ */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {project.workTypes.slice(0, 3).map((type) => (
                          <span
                            key={type}
                            className="px-2 py-0.5 bg-[#F8FAFC] text-[#64748B] text-xs rounded"
                          >
                            {WORK_TYPE_LABELS[type as WorkType]}
                          </span>
                        ))}
                        {project.workTypes.length > 3 && (
                          <span className="px-2 py-0.5 text-[#64748B] text-xs">
                            +{project.workTypes.length - 3}
                          </span>
                        )}
                      </div>

                      {/* フッター */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                        <span className="text-sm text-[#2563EB]">詳細を見る</span>
                        <span
                          className={`text-sm ${
                            daysRemaining <= 3 ? 'text-[#E24B4A]' : 'text-[#64748B]'
                          }`}
                        >
                          残り{daysRemaining}日
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>

          {/* 案件登録ボタン */}
          <div className="fixed bottom-6 right-4">
            <Link
              href="/projects/new"
              className="btn-primary flex items-center gap-2 shadow-lg"
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              案件を登録
            </Link>
          </div>
        </>
      )}
    </>
  );
}

// ===== Main Page =====

export default function ProjectsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1E293B]">PowerScrapper</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/mypage"
              className="flex items-center gap-1 text-sm text-[#2563EB]"
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              マイページ
            </Link>
          </div>
        </header>

        {/* トーストメッセージ */}
        <Suspense fallback={null}>
          <ToastMessage />
        </Suspense>

        {/* メインコンテンツ */}
        <Suspense fallback={
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
          </div>
        }>
          <MainContent />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
