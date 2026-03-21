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

// デフォルト値
const DEFAULTS = {
  contact_info: {
    companyName: '株式会社GENBABOXX',
    personName: '担当者',
    phone: '',
    email: 'support@genbaboxx.co.jp',
    lineId: '@517yajzb',
    note: 'お気軽にご連絡ください',
    imageUrl: null,
  } as ContactInfo,
  welcome_message: {
    title: 'パワースクラッパーネットワークへようこそ！',
    body: '解体業界のコミュニティ＋マッチングプラットフォームです。まずは会社プロフィールを登録しましょう！',
    imageUrl: null,
    buttonLabel: 'プロフィールを登録',
    buttonUrl: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID || ''}/profile/edit`,
  } as WelcomeMessage,
  event_fallback: {
    message: '現在予定されているイベントはありません。決まり次第お知らせします！',
    imageUrl: null,
  } as EventFallback,
};

/**
 * サイト設定を取得（フォールバック付き）
 */
export async function getSiteSetting<T>(key: string): Promise<T | null> {
  try {
    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (setting) {
      return JSON.parse(setting.value) as T;
    }

    // デフォルト値を返す
    if (key in DEFAULTS) {
      return DEFAULTS[key as keyof typeof DEFAULTS] as T;
    }

    return null;
  } catch (error) {
    console.error(`Failed to get site setting "${key}":`, error);
    // エラー時もデフォルト値を返す
    if (key in DEFAULTS) {
      return DEFAULTS[key as keyof typeof DEFAULTS] as T;
    }
    return null;
  }
}

/**
 * お問い合わせ情報を取得
 */
export async function getContactInfo(): Promise<ContactInfo> {
  const info = await getSiteSetting<ContactInfo>('contact_info');
  return info || DEFAULTS.contact_info;
}

/**
 * ウェルカムメッセージを取得
 */
export async function getWelcomeMessage(): Promise<WelcomeMessage> {
  const msg = await getSiteSetting<WelcomeMessage>('welcome_message');
  return msg || DEFAULTS.welcome_message;
}

/**
 * イベントフォールバックメッセージを取得
 */
export async function getEventFallback(): Promise<EventFallback> {
  const fallback = await getSiteSetting<EventFallback>('event_fallback');
  return fallback || DEFAULTS.event_fallback;
}
