'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  format: string;
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

type NotificationSetting = {
  id: string;
  key: string;
  label: string;
  category: string;
  description: string | null;
  enabled: boolean;
};

type GroupedSettings = {
  A: NotificationSetting[];
  B: NotificationSetting[];
  C: NotificationSetting[];
};

type CategoryLabels = {
  A: string;
  B: string;
  C: string;
};

type NotificationDetail = {
  recipient: string;
  timing: string;
  preview: string;
};

// 各通知の詳細情報
const NOTIFICATION_DETAILS: Record<string, NotificationDetail> = {
  // カテゴリA: 自動応答
  a_welcome: {
    recipient: '友だち追加したユーザー',
    timing: 'LINE公式アカウントを友だち追加した時',
    preview: '「パワースクラッパーネットワークへようこそ！」というウェルカムメッセージと、案件一覧・案件登録・マイページへのリンクボタン付きFlex Message',
  },
  a_event_info: {
    recipient: 'メッセージ送信者',
    timing: '「イベント案内」とメッセージを送った時',
    preview: '最新のイベント情報（タイトル・日時・会場・申込URL）を表示するFlex Message。イベントがない場合はデフォルトメッセージ',
  },
  a_contact_info: {
    recipient: 'メッセージ送信者',
    timing: '「お問い合わせ」とメッセージを送った時',
    preview: '運営事務局の連絡先情報（メール・電話）を表示するFlex Message',
  },
  a_postback_projects: {
    recipient: 'リッチメニュータップ者',
    timing: 'リッチメニューで「案件一覧」をタップした時',
    preview: '「案件一覧を確認する」というテキストと、LIFFアプリの案件一覧ページへのリンクボタン付きFlex Message',
  },
  a_postback_register: {
    recipient: 'リッチメニュータップ者',
    timing: 'リッチメニューで「案件登録」をタップした時',
    preview: '「案件を登録する」というテキストと、LIFFアプリの案件登録ページへのリンクボタン付きFlex Message',
  },
  a_postback_mypage: {
    recipient: 'リッチメニュータップ者',
    timing: 'リッチメニューで「マイページ」をタップした時',
    preview: '「マイページ」というテキストと、LIFFアプリのマイページへのリンクボタン付きFlex Message',
  },
  a_postback_profile: {
    recipient: 'リッチメニュータップ者',
    timing: 'リッチメニューで「プロフィール」をタップした時',
    preview: '「会社プロフィール」というテキストと、LIFFアプリのプロフィール編集ページへのリンクボタン付きFlex Message',
  },
  // カテゴリB: アクション通知
  b_bid_received: {
    recipient: '案件登録者',
    timing: '他社が自分の案件に「興味あり」を送信した時',
    preview: '「興味ありが届きました」というタイトルで、案件名・興味あり送信者の会社名を表示。案件詳細ページへのリンクボタン付きFlex Message',
  },
  b_bid_selected: {
    recipient: '興味あり送信者',
    timing: '自分が送った「興味あり」が案件登録者に選択された時',
    preview: '「興味ありが選択されました」というタイトルで、案件名・登録者の連絡先情報を表示するFlex Message',
  },
  b_bid_selected_owner: {
    recipient: '案件登録者',
    timing: '自分が「興味あり」を選択した時（確認通知）',
    preview: '「連絡先を共有しました」というタイトルで、選択した業者名と案件名を表示するFlex Message',
  },
  b_bid_rejected: {
    recipient: '興味あり送信者',
    timing: '案件の募集が終了し、自分の興味ありが選択されなかった時',
    preview: '「案件の募集が終了しました」というタイトルで、案件名を表示。他の案件を探すリンクボタン付きFlex Message',
  },
  b_match_contact: {
    recipient: '案件登録者 & 興味あり送信者（双方）',
    timing: '「連絡する」ボタンでマッチングが成立した時',
    preview: '相手の連絡先情報（会社名・代表者・電話・メール）を表示するFlex Message',
  },
  b_project_approved: {
    recipient: '案件登録者',
    timing: '管理者が案件を承認した時',
    preview: '「案件が公開されました」というタイトルで、案件名と案件詳細ページへのリンクボタン付きFlex Message',
  },
  b_project_rejected: {
    recipient: '案件登録者',
    timing: '管理者が案件を却下した時',
    preview: '「案件が却下されました」というタイトルで、案件名と却下理由を表示するFlex Message',
  },
  b_new_project_admin: {
    recipient: '管理者（role=admin）',
    timing: '新規案件が登録された時',
    preview: '「新規案件が登録されました」というタイトルで、案件名・登録者会社名を表示。管理画面へのリンク付きFlex Message',
  },
  b_new_project_broadcast: {
    recipient: '全会員（ブロードキャスト）',
    timing: '案件が承認された時',
    preview: '「新着案件のお知らせ」というタイトルで、案件名・現場所在地・工期を表示。案件詳細ページへのリンクボタン付きFlex Message',
  },
  // カテゴリC: 定期配信
  c_weekly_digest: {
    recipient: '全会員（ブロードキャスト）',
    timing: '毎週月曜9時（Vercel Cron）',
    preview: '「今週の新着案件まとめ」というタイトルで、直近1週間の新着案件リスト（最大5件）を表示するFlex Message',
  },
  c_auto_close: {
    recipient: '案件登録者',
    timing: '毎日0時（Vercel Cron）に募集期限が過ぎた案件をチェック',
    preview: '「案件の募集が終了しました」というタイトルで、案件名を表示。マイページへのリンクボタン付きFlex Message',
  },
};

// 編集可能な通知のキーとSiteSettingキーのマッピング
const EDITABLE_NOTIFICATIONS: Record<string, string> = {
  // カテゴリA: Postback系
  a_postback_projects: 'notification_a_postback_projects',
  a_postback_register: 'notification_a_postback_register',
  a_postback_mypage: 'notification_a_postback_mypage',
  a_postback_profile: 'notification_a_postback_profile',
  // カテゴリA: その他
  a_contact_info: 'contact_info',
  a_welcome: 'welcome_message',
  a_event_info: 'event_fallback',
  // カテゴリB: システム自動通知
  b_bid_received: 'notification_b_bid_received',
  b_bid_selected: 'notification_b_bid_selected',
  b_bid_selected_owner: 'notification_b_bid_selected_owner',
  b_bid_rejected: 'notification_b_bid_rejected',
  b_match_contact: 'notification_b_match_contact',
  b_project_approved: 'notification_b_project_approved',
  b_project_rejected: 'notification_b_project_rejected',
  b_new_project_admin: 'notification_b_new_project_admin',
  b_new_project_broadcast: 'notification_b_new_project_broadcast',
  // カテゴリC: 定期配信
  c_weekly_digest: 'notification_c_weekly_digest',
  // c_auto_close は通知なしのため編集不要
};

// 編集不要な通知（通知なしのもの）
const NON_EDITABLE_NOTIFICATIONS = ['c_auto_close'];

// 通知の編集タイプを判定
type NotificationEditType = 'postback' | 'category_a_other' | 'category_b' | 'category_c' | 'none';
const getNotificationEditType = (key: string): NotificationEditType => {
  if (key.startsWith('a_postback_')) return 'postback';
  if (key === 'a_contact_info' || key === 'a_welcome' || key === 'a_event_info') return 'category_a_other';
  if (key.startsWith('b_')) return 'category_b';
  if (key === 'c_weekly_digest') return 'category_c';
  return 'none';
};

// サイト設定の型定義
type ContactInfoSetting = {
  companyName: string;
  personName: string;
  phone: string;
  email: string;
  lineId: string;
  note: string;
  imageUrl: string | null;
};

type WelcomeMessageSetting = {
  title: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string;
  buttonUrl: string;
};

type EventFallbackSetting = {
  message: string;
  imageUrl: string | null;
};

// Postback系通知の型定義
type PostbackNotificationSetting = {
  textMessage: string;      // ボタン押下前に表示されるテキスト
  buttonLabel: string;      // ボタンラベル
  buttonUrl: string;        // ボタンURL（遷移先）
  imageUrl: string | null;  // 画像（任意）
};

// カテゴリB（システム自動通知）の型定義
type SystemNotificationSetting = {
  headingText: string;      // 見出しテキスト
  supplementMessage: string; // 補足メッセージ（末尾に追加）
  imageUrl: string | null;  // 画像（任意、heroに表示）
};

// カテゴリC（週次まとめ配信）の型定義
type WeeklyDigestSetting = {
  headingText: string;      // 見出しテキスト
  supplementMessage: string; // 補足メッセージ
  imageUrl: string | null;  // 画像
};

type SiteSettingValue = ContactInfoSetting | WelcomeMessageSetting | EventFallbackSetting | PostbackNotificationSetting | SystemNotificationSetting | WeeklyDigestSetting;

// 各通知のデフォルトURL（LIFF）
const POSTBACK_DEFAULT_URLS: Record<string, string> = {
  a_postback_projects: '/projects',
  a_postback_register: '/projects/new',
  a_postback_mypage: '/mypage',
  a_postback_profile: '/profile/edit',
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

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URLクエリパラメータからタブを取得
  const mainTab = searchParams.get('tab') || 'overview';
  const setMainTab = (tab: string) => {
    router.push(`/admin?tab=${tab}`);
  };

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
    format: 'card',
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

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<GroupedSettings>({ A: [], B: [], C: [] });
  const [categoryLabels, setCategoryLabels] = useState<CategoryLabels>({ A: '', B: '', C: '' });
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [broadcastSubTab, setBroadcastSubTab] = useState<'broadcasts' | 'settings'>('broadcasts');
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);

  // Site settings edit state
  const [editingSiteSetting, setEditingSiteSetting] = useState<string | null>(null);
  const [siteSettingForm, setSiteSettingForm] = useState<SiteSettingValue | null>(null);
  const [isLoadingSiteSetting, setIsLoadingSiteSetting] = useState(false);
  const [isSavingSiteSetting, setIsSavingSiteSetting] = useState(false);
  const [uploadingSiteSettingImage, setUploadingSiteSettingImage] = useState(false);

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

  // Fetch notification settings
  const fetchNotificationSettings = useCallback(async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/notification-settings');
      if (!res.ok) throw new Error('データの取得に失敗しました');
      const data = await res.json();
      setNotificationSettings(data.grouped);
      setCategoryLabels(data.categoryLabels);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab !== 'broadcast' || broadcastSubTab !== 'settings') return;
    fetchNotificationSettings();
  }, [mainTab, broadcastSubTab, fetchNotificationSettings]);

  const handleToggleNotification = async (key: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/admin/notification-settings/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '更新に失敗しました');
      }
      // Update local state
      setNotificationSettings((prev) => ({
        A: prev.A.map((s) => (s.key === key ? { ...s, enabled } : s)),
        B: prev.B.map((s) => (s.key === key ? { ...s, enabled } : s)),
        C: prev.C.map((s) => (s.key === key ? { ...s, enabled } : s)),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    }
  };

  // Site settings handlers
  // 通知タイプに応じた空のフォームを初期化
  const getEmptyFormForNotification = (notificationKey: string): SiteSettingValue => {
    const editType = getNotificationEditType(notificationKey);
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

    switch (editType) {
      case 'postback': {
        const defaultPath = POSTBACK_DEFAULT_URLS[notificationKey] || '/';
        return {
          textMessage: '',
          buttonLabel: '',
          buttonUrl: `https://liff.line.me/${liffId}${defaultPath}`,
          imageUrl: null,
        } as PostbackNotificationSetting;
      }
      case 'category_b':
        return {
          headingText: '',
          supplementMessage: '',
          imageUrl: null,
        } as SystemNotificationSetting;
      case 'category_c':
        return {
          headingText: '',
          supplementMessage: '',
          imageUrl: null,
        } as WeeklyDigestSetting;
      case 'category_a_other':
        if (notificationKey === 'a_contact_info') {
          return {
            companyName: '',
            personName: '',
            phone: '',
            email: '',
            lineId: '',
            note: '',
            imageUrl: null,
          } as ContactInfoSetting;
        } else if (notificationKey === 'a_welcome') {
          return {
            title: '',
            body: '',
            imageUrl: null,
            buttonLabel: '',
            buttonUrl: `https://liff.line.me/${liffId}/profile/edit`,
          } as WelcomeMessageSetting;
        } else {
          return {
            message: '',
            imageUrl: null,
          } as EventFallbackSetting;
        }
      default:
        return { message: '', imageUrl: null } as EventFallbackSetting;
    }
  };

  const openSiteSettingEdit = async (notificationKey: string) => {
    const settingKey = EDITABLE_NOTIFICATIONS[notificationKey];
    if (!settingKey) return;

    setIsLoadingSiteSetting(true);
    setEditingSiteSetting(notificationKey);

    try {
      const res = await fetch(`/api/admin/site-settings/${settingKey}`);
      if (!res.ok) throw new Error('設定の取得に失敗しました');
      const data = await res.json();
      // データがない場合は空のフォームを初期化
      if (data.value) {
        setSiteSettingForm(data.value);
      } else {
        setSiteSettingForm(getEmptyFormForNotification(notificationKey));
      }
    } catch (err) {
      // エラー時も空のフォームを表示
      setSiteSettingForm(getEmptyFormForNotification(notificationKey));
    } finally {
      setIsLoadingSiteSetting(false);
    }
  };

  const closeSiteSettingEdit = () => {
    setEditingSiteSetting(null);
    setSiteSettingForm(null);
  };

  const handleSiteSettingSave = async () => {
    if (!editingSiteSetting || !siteSettingForm) return;

    const settingKey = EDITABLE_NOTIFICATIONS[editingSiteSetting];
    if (!settingKey) return;

    setIsSavingSiteSetting(true);
    try {
      const res = await fetch(`/api/admin/site-settings/${settingKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: siteSettingForm }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '保存に失敗しました');
      }
      setEditingSiteSetting(null);
      setSiteSettingForm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setIsSavingSiteSetting(false);
    }
  };

  const handleSiteSettingImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !siteSettingForm) return;

    setUploadingSiteSettingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');

      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'アップロードに失敗しました');
      }
      const data = await res.json();
      setSiteSettingForm((prev) => prev ? { ...prev, imageUrl: data.url } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setUploadingSiteSettingImage(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // クリエイティブフォーマットの場合、画像必須
    if (broadcastForm.format === 'creative' && !broadcastForm.imageUrl) {
      setError('クリエイティブフォーマットでは画像が必須です');
      return;
    }

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
        format: 'card',
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
      format: broadcast.format || 'card',
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
              {/* サブタブ */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setBroadcastSubTab('broadcasts')}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    broadcastSubTab === 'broadcasts'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  配信一覧
                </button>
                <button
                  onClick={() => setBroadcastSubTab('settings')}
                  className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                    broadcastSubTab === 'settings'
                      ? 'bg-[#2563EB] text-white'
                      : 'bg-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  通知設定
                </button>
              </div>

              {/* 配信一覧サブタブ */}
              {broadcastSubTab === 'broadcasts' && (
                <>
                  {/* フィルタ・新規作成ボタン */}
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
                          format: 'card',
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
                        フォーマット
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => setBroadcastForm({ ...broadcastForm, format: 'simple' })}
                          className={`p-3 rounded-lg border-2 text-center transition-colors ${
                            broadcastForm.format === 'simple'
                              ? 'border-[#2563EB] bg-[#EEF2FF]'
                              : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                          }`}
                        >
                          <div className="text-lg mb-1">💬</div>
                          <div className="text-xs font-medium text-[#1E293B]">シンプル</div>
                          <div className="text-xs text-[#64748B]">テキスト+URL</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBroadcastForm({ ...broadcastForm, format: 'card' })}
                          className={`p-3 rounded-lg border-2 text-center transition-colors ${
                            broadcastForm.format === 'card'
                              ? 'border-[#2563EB] bg-[#EEF2FF]'
                              : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                          }`}
                        >
                          <div className="text-lg mb-1">📋</div>
                          <div className="text-xs font-medium text-[#1E293B]">カード</div>
                          <div className="text-xs text-[#64748B]">お知らせ形式</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setBroadcastForm({ ...broadcastForm, format: 'creative' })}
                          className={`p-3 rounded-lg border-2 text-center transition-colors ${
                            broadcastForm.format === 'creative'
                              ? 'border-[#2563EB] bg-[#EEF2FF]'
                              : 'border-[#E2E8F0] hover:border-[#94A3B8]'
                          }`}
                        >
                          <div className="text-lg mb-1">🎨</div>
                          <div className="text-xs font-medium text-[#1E293B]">クリエイティブ</div>
                          <div className="text-xs text-[#64748B]">画像メイン</div>
                        </button>
                      </div>
                    </div>

                    {/* クリエイティブ以外ではタイトルと本文を表示 */}
                    {broadcastForm.format !== 'creative' && (
                      <>
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
                      </>
                    )}

                    {broadcastForm.type === 'event' && broadcastForm.format !== 'creative' && (
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

                    {/* クリエイティブの場合は画像→詳細URLの順、それ以外は詳細URL→画像+PDFの順 */}
                    {broadcastForm.format === 'creative' ? (
                      <>
                        {/* 画像（必須） */}
                        <div>
                          <label className="block text-sm font-medium text-[#1E293B] mb-2">
                            画像 *（必須）
                          </label>
                          {broadcastForm.imageUrl ? (
                            <div className="relative border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                              <img
                                src={broadcastForm.imageUrl}
                                alt="アップロード画像"
                                className="w-full h-48 object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setBroadcastForm({ ...broadcastForm, imageUrl: '' })}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <label className="block cursor-pointer">
                              <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-8 text-center hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
                                <div className="flex justify-center mb-3">
                                  <div className="w-16 h-16 bg-[#E2E8F0] rounded-full flex items-center justify-center">
                                    <svg className="w-8 h-8 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                </div>
                                <p className="text-sm font-medium text-[#1E293B] mb-1">
                                  画像をアップロード
                                </p>
                                <p className="text-xs text-[#64748B] mb-3">
                                  クリックまたはドラッグ&ドロップ
                                </p>
                                <span className="inline-block px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8]">
                                  ファイルを選択
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, 'image')}
                                  disabled={uploadingFile !== null}
                                  className="hidden"
                                />
                              </div>
                            </label>
                          )}
                          {uploadingFile === 'image' && (
                            <div className="mt-2 flex items-center gap-2">
                              <div className="animate-spin w-4 h-4 border-2 border-[#2563EB] border-t-transparent rounded-full"></div>
                              <span className="text-sm text-[#64748B]">アップロード中...</span>
                            </div>
                          )}
                          <p className="text-xs text-[#64748B] mt-2">
                            画像タップでURLに遷移します。推奨サイズ: 1200x628px以上
                          </p>
                        </div>

                        {/* 詳細URL */}
                        <div>
                          <label className="block text-sm font-medium text-[#1E293B] mb-1">
                            詳細URL（任意）
                          </label>
                          <input
                            type="url"
                            value={broadcastForm.formUrl}
                            onChange={(e) => setBroadcastForm({ ...broadcastForm, formUrl: e.target.value })}
                            placeholder="https://"
                            className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                          />
                          <p className="text-xs text-[#64748B] mt-1">
                            画像タップ時の遷移先URL
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* 詳細URL（非クリエイティブ） */}
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

                        {/* 画像+PDF */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-[#1E293B] mb-2">
                              画像
                            </label>
                            {broadcastForm.imageUrl ? (
                              <div className="relative border-2 border-[#E2E8F0] rounded-lg overflow-hidden">
                                <img
                                  src={broadcastForm.imageUrl}
                                  alt="アップロード画像"
                                  className="w-full h-32 object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => setBroadcastForm({ ...broadcastForm, imageUrl: '' })}
                                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ) : (
                              <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-4 text-center hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
                                  <div className="flex justify-center mb-2">
                                    <svg className="w-8 h-8 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  <p className="text-xs text-[#64748B]">画像を選択</p>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleFileUpload(e, 'image')}
                                    disabled={uploadingFile !== null}
                                    className="hidden"
                                  />
                                </div>
                              </label>
                            )}
                            {uploadingFile === 'image' && (
                              <div className="mt-1 flex items-center gap-1">
                                <div className="animate-spin w-3 h-3 border-2 border-[#2563EB] border-t-transparent rounded-full"></div>
                                <span className="text-xs text-[#64748B]">アップロード中...</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#1E293B] mb-2">
                              PDF
                            </label>
                            {broadcastForm.pdfUrl ? (
                              <div className="border-2 border-[#E2E8F0] rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <svg className="w-8 h-8 text-[#E24B4A]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zm-2.5 9.5a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5zm3 0a.5.5 0 01.5.5v3a.5.5 0 01-1 0v-3a.5.5 0 01.5-.5z"/>
                                  </svg>
                                  <span className="text-sm text-[#1D9E75]">PDF添付済み</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setBroadcastForm({ ...broadcastForm, pdfUrl: '' })}
                                  className="text-xs text-[#E24B4A] hover:underline"
                                >
                                  削除
                                </button>
                              </div>
                            ) : (
                              <label className="block cursor-pointer">
                                <div className="border-2 border-dashed border-[#CBD5E1] rounded-lg p-4 text-center hover:border-[#2563EB] hover:bg-[#F8FAFC] transition-colors">
                                  <div className="flex justify-center mb-2">
                                    <svg className="w-8 h-8 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </div>
                                  <p className="text-xs text-[#64748B]">PDFを選択</p>
                                  <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={(e) => handleFileUpload(e, 'pdf')}
                                    disabled={uploadingFile !== null}
                                    className="hidden"
                                  />
                                </div>
                              </label>
                            )}
                            {uploadingFile === 'pdf' && (
                              <div className="mt-1 flex items-center gap-1">
                                <div className="animate-spin w-3 h-3 border-2 border-[#2563EB] border-t-transparent rounded-full"></div>
                                <span className="text-xs text-[#64748B]">アップロード中...</span>
                              </div>
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
                      </>
                    )}

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

              {/* 通知設定サブタブ */}
              {broadcastSubTab === 'settings' && (
                <>
                  {isLoadingSettings ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {(['A', 'B', 'C'] as const).map((category) => (
                        <div key={category} className="bg-white rounded-lg border border-[#E2E8F0]">
                          <div className="p-4 border-b border-[#E2E8F0]">
                            <h3 className="font-bold text-[#1E293B]">
                              カテゴリ {category}: {categoryLabels[category]}
                            </h3>
                          </div>
                          <div className="divide-y divide-[#E2E8F0]">
                            {notificationSettings[category].map((setting) => {
                              const isExpanded = expandedNotification === setting.key;
                              const details = NOTIFICATION_DETAILS[setting.key];
                              return (
                                <div key={setting.key} className="overflow-hidden">
                                  {/* ヘッダー部分（常に表示） */}
                                  <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                                    onClick={() => setExpandedNotification(isExpanded ? null : setting.key)}
                                  >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                      <svg
                                        className={`w-4 h-4 text-[#64748B] transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                      </svg>
                                      <p className="text-sm font-medium text-[#1E293B] truncate">{setting.label}</p>
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleNotification(setting.key, !setting.enabled);
                                      }}
                                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                                        setting.enabled ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                                      }`}
                                    >
                                      <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                          setting.enabled ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                      />
                                    </button>
                                  </div>

                                  {/* 展開時の詳細パネル */}
                                  {isExpanded && details && (
                                    <div className="px-4 pb-4 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                                      <div className="pt-4 space-y-4">
                                        {/* 通知名（大きく） */}
                                        <div>
                                          <h4 className="text-lg font-bold text-[#1E293B]">{setting.label}</h4>
                                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                                            category === 'A' ? 'bg-[#E6F1FB] text-[#185FA5]' :
                                            category === 'B' ? 'bg-[#FAEEDA] text-[#854F0B]' :
                                            'bg-[#D1FAE5] text-[#1D9E75]'
                                          }`}>
                                            カテゴリ {category}
                                          </span>
                                        </div>

                                        {/* 説明文 */}
                                        {setting.description && (
                                          <div>
                                            <p className="text-xs font-medium text-[#64748B] mb-1">説明</p>
                                            <p className="text-sm text-[#1E293B]">{setting.description}</p>
                                          </div>
                                        )}

                                        {/* 送信先 */}
                                        <div>
                                          <p className="text-xs font-medium text-[#64748B] mb-1">送信先</p>
                                          <p className="text-sm text-[#1E293B] flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                            {details.recipient}
                                          </p>
                                        </div>

                                        {/* 送信タイミング */}
                                        <div>
                                          <p className="text-xs font-medium text-[#64748B] mb-1">送信タイミング</p>
                                          <p className="text-sm text-[#1E293B] flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#1D9E75]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {details.timing}
                                          </p>
                                        </div>

                                        {/* 送信内容のプレビュー */}
                                        <div>
                                          <p className="text-xs font-medium text-[#64748B] mb-1">送信内容</p>
                                          <div className="bg-white rounded-lg border border-[#E2E8F0] p-3">
                                            <div className="flex items-start gap-2">
                                              <div className="w-8 h-8 bg-[#06C755] rounded-lg flex items-center justify-center shrink-0">
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                                </svg>
                                              </div>
                                              <p className="text-sm text-[#1E293B] leading-relaxed">{details.preview}</p>
                                            </div>
                                          </div>
                                        </div>

                                        {/* 編集可能な通知には編集ボタンを表示 */}
                                        <div className="pt-2 border-t border-[#E2E8F0]">
                                          {NON_EDITABLE_NOTIFICATIONS.includes(setting.key) ? (
                                            <div className="bg-[#F1F5F9] rounded-lg p-3">
                                              <p className="text-sm text-[#64748B]">
                                                この通知は処理のみで通知送信は行われないため、編集項目はありません。
                                              </p>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => openSiteSettingEdit(setting.key)}
                                              className="w-full px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] transition-colors"
                                            >
                                              送信内容を編集
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* サイト設定編集モーダル */}
                  {editingSiteSetting && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
                          <h3 className="font-bold text-[#1E293B]">送信内容を編集</h3>
                          <button
                            onClick={closeSiteSettingEdit}
                            className="text-[#64748B] hover:text-[#1E293B]"
                          >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {isLoadingSiteSetting ? (
                          <div className="p-8 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB] mx-auto"></div>
                          </div>
                        ) : siteSettingForm && (
                          <div className="p-4 space-y-4">
                            {/* お問い合わせ応答の編集フォーム */}
                            {editingSiteSetting === 'a_contact_info' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">会社名</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as ContactInfoSetting).companyName || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, companyName: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">担当者名</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as ContactInfoSetting).personName || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, personName: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">電話番号</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as ContactInfoSetting).phone || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, phone: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="03-xxxx-xxxx"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">メールアドレス</label>
                                  <input
                                    type="email"
                                    value={(siteSettingForm as ContactInfoSetting).email || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, email: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">LINE ID</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as ContactInfoSetting).lineId || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, lineId: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="@xxxxxxxx"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">補足メッセージ</label>
                                  <textarea
                                    value={(siteSettingForm as ContactInfoSetting).note || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as ContactInfoSetting, note: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={3}
                                  />
                                </div>
                              </>
                            )}

                            {/* ウェルカムメッセージの編集フォーム */}
                            {editingSiteSetting === 'a_welcome' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">タイトル</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as WelcomeMessageSetting).title || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WelcomeMessageSetting, title: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">本文</label>
                                  <textarea
                                    value={(siteSettingForm as WelcomeMessageSetting).body || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WelcomeMessageSetting, body: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={4}
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">ボタンラベル</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as WelcomeMessageSetting).buttonLabel || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WelcomeMessageSetting, buttonLabel: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">ボタンURL</label>
                                  <input
                                    type="url"
                                    value={(siteSettingForm as WelcomeMessageSetting).buttonUrl || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WelcomeMessageSetting, buttonUrl: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="https://"
                                  />
                                </div>
                              </>
                            )}

                            {/* イベント案内応答の編集フォーム */}
                            {editingSiteSetting === 'a_event_info' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">イベントがない時のメッセージ</label>
                                  <textarea
                                    value={(siteSettingForm as EventFallbackSetting).message || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as EventFallbackSetting, message: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={4}
                                  />
                                </div>
                              </>
                            )}

                            {/* Postback系通知の編集フォーム */}
                            {getNotificationEditType(editingSiteSetting) === 'postback' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">テキストメッセージ</label>
                                  <p className="text-xs text-[#64748B] mb-1">ボタン押下前に表示されるテキスト</p>
                                  <textarea
                                    value={(siteSettingForm as PostbackNotificationSetting).textMessage || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as PostbackNotificationSetting, textMessage: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={3}
                                    placeholder="例: 案件一覧を確認する"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">ボタンラベル</label>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as PostbackNotificationSetting).buttonLabel || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as PostbackNotificationSetting, buttonLabel: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="例: 案件一覧を見る"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">ボタンURL</label>
                                  <p className="text-xs text-[#64748B] mb-1">遷移先URL（デフォルトはLIFFのURL）</p>
                                  <input
                                    type="url"
                                    value={(siteSettingForm as PostbackNotificationSetting).buttonUrl || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as PostbackNotificationSetting, buttonUrl: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="https://liff.line.me/..."
                                  />
                                </div>
                              </>
                            )}

                            {/* カテゴリB（システム自動通知）の編集フォーム */}
                            {getNotificationEditType(editingSiteSetting) === 'category_b' && (
                              <>
                                <div className="bg-[#F1F5F9] rounded-lg p-3 mb-2">
                                  <p className="text-xs text-[#64748B]">
                                    案件名や会員名などの動的データ部分はそのまま維持されます。固定テキスト部分のみ編集できます。
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">見出しテキスト</label>
                                  <p className="text-xs text-[#64748B] mb-1">通知の見出し部分のテキスト</p>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as SystemNotificationSetting).headingText || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as SystemNotificationSetting, headingText: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="例: 興味ありが届きました"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">補足メッセージ</label>
                                  <p className="text-xs text-[#64748B] mb-1">Flex Messageの末尾に追加表示されるテキスト（任意）</p>
                                  <textarea
                                    value={(siteSettingForm as SystemNotificationSetting).supplementMessage || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as SystemNotificationSetting, supplementMessage: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={3}
                                    placeholder="例: ご確認よろしくお願いいたします"
                                  />
                                </div>
                              </>
                            )}

                            {/* カテゴリC（週次まとめ配信）の編集フォーム */}
                            {getNotificationEditType(editingSiteSetting) === 'category_c' && (
                              <>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">見出しテキスト</label>
                                  <p className="text-xs text-[#64748B] mb-1">週次まとめ配信の見出し</p>
                                  <input
                                    type="text"
                                    value={(siteSettingForm as WeeklyDigestSetting).headingText || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WeeklyDigestSetting, headingText: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    placeholder="例: 今週の新着案件まとめ"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-[#1E293B] mb-1">補足メッセージ</label>
                                  <p className="text-xs text-[#64748B] mb-1">Flex Messageの末尾に追加表示されるテキスト（任意）</p>
                                  <textarea
                                    value={(siteSettingForm as WeeklyDigestSetting).supplementMessage || ''}
                                    onChange={(e) => setSiteSettingForm({ ...siteSettingForm as WeeklyDigestSetting, supplementMessage: e.target.value })}
                                    className="w-full p-2 border border-[#E2E8F0] rounded text-sm"
                                    rows={3}
                                    placeholder="例: 気になる案件があればチェックしてみてください"
                                  />
                                </div>
                              </>
                            )}

                            {/* 画像アップロード（共通） */}
                            <div>
                              <label className="block text-sm font-medium text-[#1E293B] mb-1">画像</label>
                              {(siteSettingForm as { imageUrl?: string | null }).imageUrl ? (
                                <div className="space-y-2">
                                  <img
                                    src={(siteSettingForm as { imageUrl?: string | null }).imageUrl || ''}
                                    alt="Preview"
                                    className="w-full h-32 object-cover rounded border border-[#E2E8F0]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setSiteSettingForm({ ...siteSettingForm, imageUrl: null })}
                                    className="text-xs text-[#E24B4A] hover:underline"
                                  >
                                    画像を削除
                                  </button>
                                </div>
                              ) : (
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSiteSettingImageUpload}
                                  disabled={uploadingSiteSettingImage}
                                  className="w-full text-sm"
                                />
                              )}
                              {uploadingSiteSettingImage && (
                                <p className="text-xs text-[#64748B] mt-1">アップロード中...</p>
                              )}
                            </div>

                            {/* 保存ボタン */}
                            <div className="flex gap-2 pt-4 border-t border-[#E2E8F0]">
                              <button
                                onClick={handleSiteSettingSave}
                                disabled={isSavingSiteSetting}
                                className="flex-1 px-4 py-2 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50"
                              >
                                {isSavingSiteSetting ? '保存中...' : '保存'}
                              </button>
                              <button
                                onClick={closeSiteSettingEdit}
                                className="px-4 py-2 bg-[#E2E8F0] text-[#64748B] text-sm font-medium rounded-lg hover:bg-[#D1D5DB]"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>

      </div>
    </AdminAuthGuard>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563EB]"></div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}
