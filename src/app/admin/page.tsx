'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuthGuard } from '@/components/AdminAuthGuard';
import {
  RECRUITMENT_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type RecruitmentType,
  type BusinessType,
} from '@/types';

type Owner = {
  id: string;
  companyName: string | null;
  businessType: string | null;
  displayName: string | null;
};

type Project = {
  id: string;
  title: string;
  recruitmentType: string;
  structureType: string;
  sitePrefecture: string | null;
  periodStart: string;
  periodEnd: string;
  isUrgent: boolean;
  deadline: string;
  status: string;
  bidCount: number;
  createdAt: string;
  owner: Owner;
};

const STATUS_TABS = [
  { value: 'pending', label: '未審査' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
];

export default function AdminPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // 案件一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/admin/projects?status=${activeTab}`);

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'エラーが発生しました');
        }

        const data = await res.json();
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, [activeTab]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-[#2563EB] text-white px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold">管理者ダッシュボード</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-white/80 hover:text-white"
          >
            ログアウト
          </button>
        </header>

        {/* タブ */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="flex">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="p-4 pb-24">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
              <p className="mt-4 text-[#64748B] text-sm">読み込み中...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-[#64748B]">
              <p>
                {activeTab === 'pending'
                  ? '未審査の案件はありません'
                  : activeTab === 'approved'
                  ? '承認済みの案件はありません'
                  : '却下された案件はありません'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/admin/projects/${project.id}`}
                  className="card block p-4"
                >
                  {/* バッジ行 */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
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

                  {/* 投稿者情報 */}
                  <div className="bg-[#F8FAFC] rounded p-2 mb-2">
                    <p className="text-sm text-[#1E293B]">
                      投稿者: {project.owner.companyName || project.owner.displayName || '未設定'}
                    </p>
                    {project.owner.businessType && (
                      <p className="text-xs text-[#64748B]">
                        {BUSINESS_TYPE_LABELS[project.owner.businessType as BusinessType]}
                      </p>
                    )}
                  </div>

                  {/* 案件情報 */}
                  <p className="text-sm text-[#64748B] mb-2">
                    {project.sitePrefecture || '未設定'} | {project.periodStart}〜
                    {project.periodEnd}
                  </p>

                  {/* フッター */}
                  <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                    <span className="text-sm text-[#2563EB]">詳細を確認</span>
                    {activeTab === 'pending' && (
                      <span className="text-sm text-[#BA7517] font-medium">
                        審査待ち
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>

        {/* ナビゲーション */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4">
          <Link
            href="/projects"
            className="btn-secondary w-full text-center block"
          >
            ユーザー画面に戻る
          </Link>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
