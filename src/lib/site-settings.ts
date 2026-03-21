import { prisma } from '@/lib/prisma';

// 型定義
export type ContactInfo = {
  companyName: string;
  personName: string;
  phone: string;
  email: string;
  lineId: string;
  note: string;
  imageUrl: string | null;
};

export type WelcomeMessage = {
  title: string;
  body: string;
  imageUrl: string | null;
  buttonLabel: string;
  buttonUrl: string;
};

export type EventFallback = {
  message: string;
  imageUrl: string | null;
};

// Postback系通知の型定義
export type PostbackNotificationContent = {
  textMessage: string;      // ボタン押下前に表示されるテキスト
  buttonLabel: string;      // ボタンラベル
  buttonUrl: string;        // ボタンURL（遷移先）
  imageUrl: string | null;  // 画像（任意）
};

// カテゴリB（システム自動通知）の型定義
export type SystemNotificationContent = {
  headingText: string;      // 見出しテキスト
  supplementMessage: string | null; // 補足メッセージ（末尾に追加）
  imageUrl: string | null;  // 画像（任意、heroに表示）
};

// カテゴリC（週次まとめ配信）の型定義
export type WeeklyDigestContent = {
  headingText: string;      // 見出しテキスト
  supplementMessage: string | null; // 補足メッセージ
  imageUrl: string | null;  // 画像
};

/**
 * サイト設定を取得（フォールバックなし）
 */
export async function getSiteSetting<T>(key: string): Promise<T | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (setting) {
      return JSON.parse(setting.value) as T;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get site setting "${key}":`, error);
    return null;
  }
}

/**
 * 通知コンテンツのキーマッピング
 */
export const NOTIFICATION_CONTENT_KEYS: Record<string, string> = {
  // カテゴリA: Postback系
  a_postback_projects: 'notification_a_postback_projects',
  a_postback_register: 'notification_a_postback_register',
  a_postback_mypage: 'notification_a_postback_mypage',
  a_postback_profile: 'notification_a_postback_profile',
  // カテゴリA: その他
  a_welcome: 'welcome_message',
  a_contact_info: 'contact_info',
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
};

/**
 * Postback系通知コンテンツを取得
 */
export async function getPostbackNotificationContent(key: string): Promise<PostbackNotificationContent | null> {
  const settingKey = NOTIFICATION_CONTENT_KEYS[key];
  if (!settingKey) return null;
  return getSiteSetting<PostbackNotificationContent>(settingKey);
}

/**
 * システム自動通知コンテンツを取得
 */
export async function getSystemNotificationContent(key: string): Promise<SystemNotificationContent | null> {
  const settingKey = NOTIFICATION_CONTENT_KEYS[key];
  if (!settingKey) return null;
  return getSiteSetting<SystemNotificationContent>(settingKey);
}

/**
 * 週次まとめ配信コンテンツを取得
 */
export async function getWeeklyDigestContent(): Promise<WeeklyDigestContent | null> {
  return getSiteSetting<WeeklyDigestContent>(NOTIFICATION_CONTENT_KEYS.c_weekly_digest);
}

/**
 * お問い合わせ情報を取得（フォールバックなし）
 */
export async function getContactInfo(): Promise<ContactInfo | null> {
  return getSiteSetting<ContactInfo>('contact_info');
}

/**
 * ウェルカムメッセージを取得（フォールバックなし）
 */
export async function getWelcomeMessage(): Promise<WelcomeMessage | null> {
  return getSiteSetting<WelcomeMessage>('welcome_message');
}

/**
 * イベントフォールバックメッセージを取得（フォールバックなし）
 */
export async function getEventFallback(): Promise<EventFallback | null> {
  return getSiteSetting<EventFallback>('event_fallback');
}
