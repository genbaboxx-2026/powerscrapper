'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AdminAuthGuard } from '@/components/AdminAuthGuard';
import {
  RECRUITMENT_TYPE_LABELS,
  BUSINESS_TYPE_LABELS,
  type RecruitmentType,
  type BusinessType,
} from '@/types';

// Types
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

type DashboardStats = {
  totalUsers: number;
  newUsersThisWeek: number;
  totalProjects: number;
  activeProjects: number;
  pendingProjects: number;
  totalBids: number;
  bidsThisMonth: number;
  totalMatches: number;
  closedWonMatches: number;
};

type CompanyActivity = {
  companyName: string;
  projectCount: number;
  bidReceivedCount: number;
  matchCount: number;
  closedWonCount: number;
  consultationCount: number;
};

type Activity = {
  type: 'match' | 'bid' | 'project' | 'consultation';
  description: string;
  createdAt: string;
};

type MatchBidder = {
  companyName: string;
  representativeName: string;
  coverageAreas: string[];
  lineDisplayName: string;
  linePictureUrl: string | null;
};

type Match = {
  id: string;
  bidder: MatchBidder;
  adminStatus: string;
  adminMemo: string | null;
  contactedAt: string;
  closedAt: string | null;
};

type PendingBid = {
  bidderCompanyName: string;
  bidderName: string;
  createdAt: string;
};

type MatchProject = {
  id: string;
  title: string;
  ownerCompanyName: string;
  location: string;
  totalBids: number;
  totalMatches: number;
  matches: Match[];
  pendingBids: PendingBid[];
};

type StatusCounts = {
  all: number;
  contacted: number;
  negotiating: number;
  closed_won: number;
  closed_lost: number;
};

// Constants
const MAIN_TABS = [
  { value: 'overview', label: '概要' },
  { value: 'review', label: '案件審査' },
  { value: 'matching', label: 'マッチング管理' },
];

const STATUS_TABS = [
  { value: 'pending', label: '未審査' },
  { value: 'approved', label: '承認済み' },
  { value: 'rejected', label: '却下' },
];

const MATCH_STATUS_LABELS: Record<string, string> = {
  contacted: '連絡済み',
  negotiating: '商談中',
  closed_won: '成約',
  closed_lost: '不成立',
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  contacted: 'bg-[#FAEEDA] text-[#854F0B]',
  negotiating: 'bg-[#E6F1FB] text-[#185FA5]',
  closed_won: 'bg-[#D1FAE5] text-[#1D9E75]',
  closed_lost: 'bg-[#E2E8F0] text-[#64748B]',
};

export default function AdminPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState('overview');
  const [reviewTab, setReviewTab] = useState('pending');
  const [matchFilter, setMatchFilter] = useState('all');

  // Overview state
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [companyActivity, setCompanyActivity] = useState<CompanyActivity[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [isLoadingOverview, setIsLoadingOverview] = useState(true);

  // Review state
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);

  // Matching state
  const [matchProjects, setMatchProjects] = useState<MatchProject[]>([]);
  const [statusCounts, setStatusCounts] = useState<StatusCounts>({
    all: 0,
    contacted: 0,
    negotiating: 0,
    closed_won: 0,
    closed_lost: 0,
  });
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Fetch overview data
  useEffect(() => {
    if (mainTab !== 'overview') return;

    const fetchDashboard = async () => {
      setIsLoadingOverview(true);
      try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) throw new Error('データの取得に失敗しました');
        const data = await res.json();
        setStats(data.stats);
        setCompanyActivity(data.companyActivity);
        setRecentActivity(data.recentActivity);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoadingOverview(false);
      }
    };

    fetchDashboard();
  }, [mainTab]);

  // Fetch projects for review
  useEffect(() => {
    if (mainTab !== 'review') return;

    const fetchProjects = async () => {
      setIsLoadingProjects(true);
      try {
        const res = await fetch(`/api/admin/projects?status=${reviewTab}`);
        if (!res.ok) throw new Error('データの取得に失敗しました');
        const data = await res.json();
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        setIsLoadingProjects(false);
      }
    };

    fetchProjects();
  }, [mainTab, reviewTab]);

  // Fetch matches
  const fetchMatches = useCallback(async () => {
    setIsLoadingMatches(true);
    try {
      const res = await fetch(`/api/admin/matches?status=${matchFilter}`);
      if (!res.ok) throw new Error('データの取得に失敗しました');
      const data = await res.json();
      setMatchProjects(data.projects);
      setStatusCounts(data.counts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoadingMatches(false);
    }
  }, [matchFilter]);

  useEffect(() => {
    if (mainTab !== 'matching') return;
    fetchMatches();
  }, [mainTab, matchFilter, fetchMatches]);

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const handleUpdateStatus = async (matchId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminStatus: newStatus }),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      setChangingStatus(null);
      fetchMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleUpdateMemo = async (matchId: string) => {
    try {
      const res = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminMemo: memoText }),
      });
      if (!res.ok) throw new Error('更新に失敗しました');
      setEditingMemo(null);
      setMemoText('');
      fetchMatches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const getActivityBadgeStyle = (type: string) => {
    switch (type) {
      case 'match':
        return 'bg-[#2563EB] text-white';
      case 'bid':
        return 'bg-[#1D9E75] text-white';
      case 'project':
        return 'bg-[#F59E0B] text-white';
      case 'consultation':
        return 'bg-[#64748B] text-white';
      default:
        return 'bg-[#E2E8F0] text-[#64748B]';
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'match':
        return '連絡';
      case 'bid':
        return '興味あり';
      case 'project':
        return '案件';
      case 'consultation':
        return '相談';
      default:
        return type;
    }
  };

  return (
    <AdminAuthGuard>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* ヘッダー */}
        <header className="bg-[#2563EB] text-white py-3">
          <div className="px-20 flex items-center justify-between">
            <h1 className="text-lg font-bold">管理者ダッシュボード</h1>
            <button
              onClick={handleLogout}
              className="text-sm text-white/80 hover:text-white"
            >
              ログアウト
            </button>
          </div>
        </header>

        {/* メインタブ */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="flex px-20">
            {MAIN_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setMainTab(tab.value)}
                className={`flex-1 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                  mainTab === tab.value
                    ? 'border-[#2563EB] text-[#2563EB]'
                    : 'border-transparent text-[#64748B]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <main className="py-4 pb-24 px-20">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-[#E24B4A] rounded-lg text-[#E24B4A] text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">
                閉じる
              </button>
            </div>
          )}

          {/* 概要タブ */}
          {mainTab === 'overview' && (
            <>
              {isLoadingOverview ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                </div>
              ) : (
                <>
                  {/* KPIカード */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white rounded-lg p-4 border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">会員数</p>
                      <p className="text-2xl font-medium text-[#1E293B]">
                        {stats?.totalUsers || 0}
                      </p>
                      {(stats?.newUsersThisWeek || 0) > 0 && (
                        <p className="text-xs text-[#1D9E75]">
                          +{stats?.newUsersThisWeek} 今週
                        </p>
                      )}
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">案件数</p>
                      <p className="text-2xl font-medium text-[#1E293B]">
                        {stats?.totalProjects || 0}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        公開中 {stats?.activeProjects || 0} / 審査待 {stats?.pendingProjects || 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">興味あり</p>
                      <p className="text-2xl font-medium text-[#1E293B]">
                        {stats?.totalBids || 0}
                      </p>
                      <p className="text-xs text-[#64748B]">
                        今月 +{stats?.bidsThisMonth || 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-[#E2E8F0]">
                      <p className="text-xs text-[#64748B] mb-1">連絡済み</p>
                      <p className="text-2xl font-medium text-[#1E293B]">
                        {stats?.totalMatches || 0}
                      </p>
                      <p className="text-xs text-[#1D9E75]">
                        成約 {stats?.closedWonMatches || 0}
                      </p>
                    </div>
                  </div>

                  {/* 企業別活動状況 */}
                  <div className="bg-white rounded-lg border border-[#E2E8F0] mb-6">
                    <div className="p-3 border-b border-[#E2E8F0]">
                      <h2 className="text-sm font-bold text-[#1E293B]">企業別 活動状況</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#F8FAFC]">
                          <tr>
                            <th className="text-left px-3 py-2 text-[#64748B] font-medium">企業名</th>
                            <th className="text-center px-2 py-2 text-[#64748B] font-medium">案件</th>
                            <th className="text-center px-2 py-2 text-[#64748B] font-medium">興味あり</th>
                            <th className="text-center px-2 py-2 text-[#64748B] font-medium">連絡</th>
                            <th className="text-center px-2 py-2 text-[#64748B] font-medium">成約</th>
                            <th className="text-center px-2 py-2 text-[#64748B] font-medium">相談</th>
                          </tr>
                        </thead>
                        <tbody>
                          {companyActivity.map((company, i) => (
                            <tr key={i} className="border-t border-[#E2E8F0]">
                              <td className="px-3 py-2 text-[#1E293B]">{company.companyName}</td>
                              <td className="text-center px-2 py-2 text-[#1E293B]">
                                {company.projectCount || <span className="text-[#94A3B8]">0</span>}
                              </td>
                              <td className="text-center px-2 py-2 text-[#1E293B]">
                                {company.bidReceivedCount || <span className="text-[#94A3B8]">0</span>}
                              </td>
                              <td className="text-center px-2 py-2 text-[#2563EB]">
                                {company.matchCount || <span className="text-[#94A3B8]">0</span>}
                              </td>
                              <td className="text-center px-2 py-2 text-[#1D9E75]">
                                {company.closedWonCount || <span className="text-[#94A3B8]">0</span>}
                              </td>
                              <td className="text-center px-2 py-2 text-[#1E293B]">
                                {company.consultationCount || <span className="text-[#94A3B8]">0</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 最近のアクティビティ */}
                  <div className="bg-white rounded-lg border border-[#E2E8F0]">
                    <div className="p-3 border-b border-[#E2E8F0]">
                      <h2 className="text-sm font-bold text-[#1E293B]">最近のアクティビティ</h2>
                    </div>
                    <div className="divide-y divide-[#E2E8F0]">
                      {recentActivity.slice(0, 10).map((activity, i) => (
                        <div key={i} className="p-3 flex items-start gap-2">
                          <span
                            className={`px-2 py-0.5 text-xs rounded shrink-0 ${getActivityBadgeStyle(
                              activity.type
                            )}`}
                          >
                            {getActivityLabel(activity.type)}
                          </span>
                          <p className="text-sm text-[#1E293B] flex-1 line-clamp-2">
                            {activity.description}
                          </p>
                          <span className="text-xs text-[#94A3B8] shrink-0">
                            {formatRelativeTime(activity.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* 案件審査タブ */}
          {mainTab === 'review' && (
            <>
              {/* サブタブ */}
              <div className="flex gap-2 mb-4">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setReviewTab(tab.value)}
                    className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                      reviewTab === tab.value
                        ? 'bg-[#1E293B] text-white'
                        : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {isLoadingProjects ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-[#64748B]">
                  <p>
                    {reviewTab === 'pending'
                      ? '未審査の案件はありません'
                      : reviewTab === 'approved'
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
                      <h2 className="text-base font-bold text-[#1E293B] mb-2">
                        {project.title}
                      </h2>
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
                      <p className="text-sm text-[#64748B] mb-2">
                        {project.sitePrefecture || '未設定'} | {project.periodStart}〜{project.periodEnd}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                        <span className="text-sm text-[#2563EB]">詳細を確認</span>
                        {reviewTab === 'pending' && (
                          <span className="text-sm text-[#BA7517] font-medium">審査待ち</span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}

          {/* マッチング管理タブ */}
          {mainTab === 'matching' && (
            <>
              {/* フィルタバー */}
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { value: 'all', label: 'すべて' },
                  { value: 'contacted', label: '連絡済み' },
                  { value: 'negotiating', label: '商談中' },
                  { value: 'closed_won', label: '成約' },
                  { value: 'closed_lost', label: '不成立' },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMatchFilter(filter.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                      matchFilter === filter.value
                        ? 'bg-[#1E293B] text-white'
                        : 'bg-[#E2E8F0] text-[#64748B]'
                    }`}
                  >
                    {filter.label} ({statusCounts[filter.value as keyof StatusCounts] || 0})
                  </button>
                ))}
              </div>

              {isLoadingMatches ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                </div>
              ) : matchProjects.length === 0 ? (
                <div className="text-center py-12 text-[#64748B]">
                  <p>マッチングデータがありません</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {matchProjects.map((project) => (
                    <div key={project.id} className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
                      {/* 案件ヘッダー */}
                      <div className="p-4 border-b border-[#E2E8F0]">
                        <h3 className="font-bold text-[#1E293B] mb-1">{project.title}</h3>
                        <p className="text-xs text-[#64748B]">
                          投稿者: {project.ownerCompanyName} | {project.location} | 興味あり {project.totalBids}社 → 連絡 {project.totalMatches}社
                        </p>
                      </div>

                      {/* 連絡済み企業 */}
                      <div className="divide-y divide-[#E2E8F0]">
                        {project.matches.map((match) => (
                          <div key={match.id} className="p-4 bg-[#F8FAFC]">
                            <div className="flex items-start gap-3">
                              {/* アバター */}
                              <div className="w-10 h-10 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-sm font-bold shrink-0">
                                {match.bidder.companyName.charAt(0)}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-bold text-[#1E293B]">{match.bidder.companyName}</p>
                                    <p className="text-xs text-[#64748B]">
                                      {match.bidder.representativeName}
                                      {match.bidder.coverageAreas.length > 0 && (
                                        <> | {match.bidder.coverageAreas.slice(0, 3).join(', ')}</>
                                      )}
                                    </p>
                                  </div>
                                  <span className={`px-2 py-0.5 text-xs rounded shrink-0 ${MATCH_STATUS_STYLES[match.adminStatus]}`}>
                                    {MATCH_STATUS_LABELS[match.adminStatus]}
                                  </span>
                                </div>

                                {/* 日付 */}
                                <p className="text-xs text-[#94A3B8] mt-1">
                                  連絡 {formatDate(match.contactedAt)}
                                  {match.closedAt && (
                                    <> → {match.adminStatus === 'closed_won' ? '成約' : '不成立'} {formatDate(match.closedAt)}</>
                                  )}
                                </p>

                                {/* メモ */}
                                {editingMemo === match.id ? (
                                  <div className="mt-2">
                                    <textarea
                                      value={memoText}
                                      onChange={(e) => setMemoText(e.target.value)}
                                      className="w-full p-2 text-sm border border-[#E2E8F0] rounded"
                                      rows={3}
                                      placeholder="メモを入力..."
                                    />
                                    <div className="flex gap-2 mt-2">
                                      <button
                                        onClick={() => handleUpdateMemo(match.id)}
                                        className="px-3 py-1 text-xs bg-[#2563EB] text-white rounded"
                                      >
                                        保存
                                      </button>
                                      <button
                                        onClick={() => {
                                          setEditingMemo(null);
                                          setMemoText('');
                                        }}
                                        className="px-3 py-1 text-xs bg-[#E2E8F0] text-[#64748B] rounded"
                                      >
                                        キャンセル
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingMemo(match.id);
                                      setMemoText(match.adminMemo || '');
                                    }}
                                    className="mt-2 p-2 bg-white rounded text-sm cursor-pointer hover:bg-[#F1F5F9]"
                                  >
                                    {match.adminMemo ? (
                                      <p className="text-[#1E293B] whitespace-pre-wrap">{match.adminMemo}</p>
                                    ) : (
                                      <p className="text-[#94A3B8] italic">メモなし — クリックして追加</p>
                                    )}
                                  </div>
                                )}

                                {/* アクションボタン */}
                                <div className="flex gap-2 mt-2">
                                  {changingStatus === match.id ? (
                                    <div className="flex flex-wrap gap-1">
                                      {Object.entries(MATCH_STATUS_LABELS).map(([key, label]) => (
                                        <button
                                          key={key}
                                          onClick={() => handleUpdateStatus(match.id, key)}
                                          className={`px-2 py-1 text-xs rounded ${
                                            match.adminStatus === key
                                              ? 'bg-[#1E293B] text-white'
                                              : 'bg-[#E2E8F0] text-[#64748B]'
                                          }`}
                                        >
                                          {label}
                                        </button>
                                      ))}
                                      <button
                                        onClick={() => setChangingStatus(null)}
                                        className="px-2 py-1 text-xs text-[#64748B]"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setChangingStatus(match.id)}
                                      className="px-2 py-1 text-xs bg-[#E2E8F0] text-[#64748B] rounded hover:bg-[#D1D5DB]"
                                    >
                                      ステータス変更
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* 未連絡の興味あり企業 */}
                        {project.pendingBids.map((bid, i) => (
                          <div key={i} className="p-4 opacity-60">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#E2E8F0] text-[#64748B] flex items-center justify-center text-sm font-bold shrink-0">
                                {bid.bidderCompanyName.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-medium text-[#64748B]">{bid.bidderCompanyName}</p>
                                    <p className="text-xs text-[#94A3B8]">{bid.bidderName}</p>
                                  </div>
                                  <span className="px-2 py-0.5 text-xs rounded border border-[#E2E8F0] text-[#94A3B8]">
                                    興味あり（未連絡）
                                  </span>
                                </div>
                                <p className="text-xs text-[#94A3B8] mt-1">
                                  {formatDate(bid.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        {/* ナビゲーション */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0]">
          <div className="py-4 px-20">
            <Link
              href="/projects"
              className="btn-secondary w-full text-center block"
            >
              ユーザー画面に戻る
            </Link>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
