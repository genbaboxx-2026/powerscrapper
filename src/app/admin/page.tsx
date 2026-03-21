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

type Broadcast = {
  id: string;
  type: string;
  status: string;
  title: string;
  body: string | null;
  eventDate: string | null;
  eventVenue: string | null;
  formUrl: string | null;
  imageUrl: string | null;
  pdfUrl: string | null;
  youtubeUrl: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  sentCount: number | null;
  createdAt: string;
};

// Constants
const MAIN_TABS = [
  { value: 'overview', label: '概要' },
  { value: 'review', label: '案件審査' },
  { value: 'matching', label: 'マッチング管理' },
  { value: 'broadcast', label: '配信管理' },
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

  // Broadcast state
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [isLoadingBroadcasts, setIsLoadingBroadcasts] = useState(true);
  const [broadcastFilter, setBroadcastFilter] = useState('all');
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [editingBroadcast, setEditingBroadcast] = useState<Broadcast | null>(null);
  const [broadcastForm, setBroadcastForm] = useState({
    type: 'news',
    title: '',
    body: '',
    eventDate: '',
    eventVenue: '',
    formUrl: '',
    imageUrl: '',
    pdfUrl: '',
    youtubeUrl: '',
    scheduledAt: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<'image' | 'pdf' | null>(null);

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

  // Fetch broadcasts
  const fetchBroadcasts = useCallback(async () => {
    setIsLoadingBroadcasts(true);
    try {
      const statusParam = broadcastFilter !== 'all' ? `&status=${broadcastFilter}` : '';
      const res = await fetch(`/api/admin/broadcasts?${statusParam}`);
      if (!res.ok) throw new Error('データの取得に失敗しました');
      const data = await res.json();
      setBroadcasts(data.broadcasts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoadingBroadcasts(false);
    }
  }, [broadcastFilter]);

  useEffect(() => {
    if (mainTab !== 'broadcast') return;
    fetchBroadcasts();
  }, [mainTab, broadcastFilter, fetchBroadcasts]);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const url = editingBroadcast
        ? `/api/admin/broadcasts/${editingBroadcast.id}`
        : '/api/admin/broadcasts';
      const method = editingBroadcast ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcastForm),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }
      setShowBroadcastForm(false);
      setEditingBroadcast(null);
      setBroadcastForm({
        type: 'news',
        title: '',
        body: '',
        eventDate: '',
        eventVenue: '',
        formUrl: '',
        imageUrl: '',
        pdfUrl: '',
        youtubeUrl: '',
        scheduledAt: '',
      });
      fetchBroadcasts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendBroadcast = async (id: string) => {
    if (!confirm('この配信を今すぐ送信しますか？')) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}/send`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '送信に失敗しました');
      }
      const data = await res.json();
      alert(`${data.sentCount}名に配信しました`);
      fetchBroadcasts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleDeleteBroadcast = async (id: string) => {
    if (!confirm('この配信を削除しますか？')) return;
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '削除に失敗しました');
      }
      fetchBroadcasts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'pdf') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(fileType);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', fileType);

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }
      const data = await res.json();
      setBroadcastForm((prev) => ({
        ...prev,
        [fileType === 'image' ? 'imageUrl' : 'pdfUrl']: data.url,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUploadingFile(null);
    }
  };

  const openEditForm = (broadcast: Broadcast) => {
    setEditingBroadcast(broadcast);
    setBroadcastForm({
      type: broadcast.type,
      title: broadcast.title,
      body: broadcast.body || '',
      eventDate: broadcast.eventDate || '',
      eventVenue: broadcast.eventVenue || '',
      formUrl: broadcast.formUrl || '',
      imageUrl: broadcast.imageUrl || '',
      pdfUrl: broadcast.pdfUrl || '',
      youtubeUrl: broadcast.youtubeUrl || '',
      scheduledAt: broadcast.scheduledAt ? broadcast.scheduledAt.slice(0, 16) : '',
    });
    setShowBroadcastForm(true);
  };

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
          <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
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
          <div className="flex max-w-5xl mx-auto px-6">
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

        <main className="py-4 pb-24 max-w-5xl mx-auto px-6">
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

          {/* 配信管理タブ */}
          {mainTab === 'broadcast' && (
            <>
              {/* 新規作成ボタン */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2">
                  {['all', 'draft', 'scheduled', 'sent'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setBroadcastFilter(status)}
                      className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                        broadcastFilter === status
                          ? 'bg-[#1E293B] text-white'
                          : 'bg-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      {status === 'all' ? 'すべて' : status === 'draft' ? '下書き' : status === 'scheduled' ? '予約済み' : '送信済み'}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setEditingBroadcast(null);
                    setBroadcastForm({
                      type: 'news',
                      title: '',
                      body: '',
                      eventDate: '',
                      eventVenue: '',
                      formUrl: '',
                      imageUrl: '',
                      pdfUrl: '',
                      youtubeUrl: '',
                      scheduledAt: '',
                    });
                    setShowBroadcastForm(true);
                  }}
                  className="px-4 py-2 bg-[#2563EB] text-white text-sm rounded-lg font-medium"
                >
                  新規作成
                </button>
              </div>

              {/* 配信フォーム */}
              {showBroadcastForm && (
                <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 mb-4">
                  <h3 className="font-bold text-[#1E293B] mb-4">
                    {editingBroadcast ? '配信を編集' : '新規配信を作成'}
                  </h3>
                  <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        種別
                      </label>
                      <select
                        value={broadcastForm.type}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, type: e.target.value })}
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                      >
                        <option value="event">イベント</option>
                        <option value="news">お知らせ</option>
                        <option value="article">記事</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        タイトル *
                      </label>
                      <input
                        type="text"
                        value={broadcastForm.title}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        本文
                      </label>
                      <textarea
                        value={broadcastForm.body}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, body: e.target.value })}
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                        rows={4}
                      />
                    </div>

                    {broadcastForm.type === 'event' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#1E293B] mb-1">
                              開催日時
                            </label>
                            <input
                              type="text"
                              value={broadcastForm.eventDate}
                              onChange={(e) => setBroadcastForm({ ...broadcastForm, eventDate: e.target.value })}
                              placeholder="例: 2024年4月15日 14:00〜"
                              className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1E293B] mb-1">
                              会場
                            </label>
                            <input
                              type="text"
                              value={broadcastForm.eventVenue}
                              onChange={(e) => setBroadcastForm({ ...broadcastForm, eventVenue: e.target.value })}
                              className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        {broadcastForm.type === 'event' ? '申込フォームURL' : '詳細URL'}
                      </label>
                      <input
                        type="url"
                        value={broadcastForm.formUrl}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, formUrl: e.target.value })}
                        placeholder="https://"
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#1E293B] mb-1">
                          画像
                        </label>
                        {broadcastForm.imageUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#1D9E75]">アップロード済み</span>
                            <button
                              type="button"
                              onClick={() => setBroadcastForm({ ...broadcastForm, imageUrl: '' })}
                              className="text-xs text-[#E24B4A]"
                            >
                              削除
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'image')}
                            disabled={uploadingFile !== null}
                            className="w-full text-sm"
                          />
                        )}
                        {uploadingFile === 'image' && (
                          <p className="text-xs text-[#64748B] mt-1">アップロード中...</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#1E293B] mb-1">
                          PDF
                        </label>
                        {broadcastForm.pdfUrl ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#1D9E75]">アップロード済み</span>
                            <button
                              type="button"
                              onClick={() => setBroadcastForm({ ...broadcastForm, pdfUrl: '' })}
                              className="text-xs text-[#E24B4A]"
                            >
                              削除
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={(e) => handleFileUpload(e, 'pdf')}
                            disabled={uploadingFile !== null}
                            className="w-full text-sm"
                          />
                        )}
                        {uploadingFile === 'pdf' && (
                          <p className="text-xs text-[#64748B] mt-1">アップロード中...</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        YouTube URL
                      </label>
                      <input
                        type="url"
                        value={broadcastForm.youtubeUrl}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#1E293B] mb-1">
                        予約配信日時（空欄の場合は下書き保存）
                      </label>
                      <input
                        type="datetime-local"
                        value={broadcastForm.scheduledAt}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, scheduledAt: e.target.value })}
                        className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-[#2563EB] text-white text-sm rounded-lg font-medium disabled:opacity-50"
                      >
                        {isSubmitting ? '保存中...' : '保存'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowBroadcastForm(false);
                          setEditingBroadcast(null);
                        }}
                        className="px-4 py-2 bg-[#E2E8F0] text-[#64748B] text-sm rounded-lg font-medium"
                      >
                        キャンセル
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 配信一覧 */}
              {isLoadingBroadcasts ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                </div>
              ) : broadcasts.length === 0 ? (
                <div className="text-center py-12 text-[#64748B]">
                  <p>配信はまだありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {broadcasts.map((broadcast) => (
                    <div
                      key={broadcast.id}
                      className="bg-white rounded-lg border border-[#E2E8F0] p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            broadcast.type === 'event' ? 'bg-[#E6F1FB] text-[#185FA5]' :
                            broadcast.type === 'news' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                            'bg-[#E2E8F0] text-[#64748B]'
                          }`}>
                            {broadcast.type === 'event' ? 'イベント' : broadcast.type === 'news' ? 'お知らせ' : '記事'}
                          </span>
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            broadcast.status === 'sent' ? 'bg-[#D1FAE5] text-[#1D9E75]' :
                            broadcast.status === 'scheduled' ? 'bg-[#E6F1FB] text-[#185FA5]' :
                            'bg-[#E2E8F0] text-[#64748B]'
                          }`}>
                            {broadcast.status === 'sent' ? '送信済み' : broadcast.status === 'scheduled' ? '予約済み' : '下書き'}
                          </span>
                        </div>
                        <span className="text-xs text-[#94A3B8]">
                          {formatDate(broadcast.createdAt)}
                        </span>
                      </div>
                      <h4 className="font-bold text-[#1E293B] mb-1">{broadcast.title}</h4>
                      {broadcast.body && (
                        <p className="text-sm text-[#64748B] line-clamp-2 mb-2">{broadcast.body}</p>
                      )}
                      {broadcast.sentAt && (
                        <p className="text-xs text-[#1D9E75] mb-2">
                          {formatDate(broadcast.sentAt)} に {broadcast.sentCount}名に送信
                        </p>
                      )}
                      {broadcast.scheduledAt && broadcast.status === 'scheduled' && (
                        <p className="text-xs text-[#185FA5] mb-2">
                          {formatDate(broadcast.scheduledAt)} に送信予定
                        </p>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-[#E2E8F0]">
                        {broadcast.status !== 'sent' && (
                          <>
                            <button
                              onClick={() => openEditForm(broadcast)}
                              className="px-3 py-1 text-xs bg-[#E2E8F0] text-[#64748B] rounded hover:bg-[#D1D5DB]"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleSendBroadcast(broadcast.id)}
                              className="px-3 py-1 text-xs bg-[#2563EB] text-white rounded hover:bg-[#1D4ED8]"
                            >
                              今すぐ送信
                            </button>
                            <button
                              onClick={() => handleDeleteBroadcast(broadcast.id)}
                              className="px-3 py-1 text-xs bg-[#E24B4A] text-white rounded hover:bg-[#DC2626]"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </main>

      </div>
    </AdminAuthGuard>
  );
}
