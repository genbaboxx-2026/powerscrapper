/**
 * LINE Messaging API ユーティリティ
 */

import crypto from 'crypto';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// ブランドカラー（青系グラデーションテーマ）
const HERO_COLOR = '#1E3A8A'; // ディープブルー（hero背景）
const HERO_SUCCESS_COLOR = '#1E40AF'; // ブルー（成功/マッチング）
const HERO_URGENT_COLOR = '#92400E'; // ダークアンバー（警告/急募）
const DANGER_COLOR = '#991B1B'; // ダークレッド（エラー/却下）
const BUTTON_PRIMARY_COLOR = '#2563EB'; // ブルー（プライマリボタン）
const TEXT_PRIMARY_COLOR = '#1E293B'; // ダークスレート（メインテキスト）
const TEXT_SECONDARY_COLOR = '#64748B'; // スレートグレー（サブテキスト）
const TEXT_ACCENT_COLOR = '#2563EB'; // ブルー（アクセントテキスト）

// LIFF ID取得
const getLiffId = () => process.env.NEXT_PUBLIC_LIFF_ID || '';

// 環境変数取得
const getChannelSecret = () => process.env.LINE_MESSAGING_CHANNEL_SECRET || '';

/**
 * LINE Webhook署名を検証
 */
export function verifySignature(body: string, signature: string): boolean {
  const channelSecret = getChannelSecret();
  if (!channelSecret) {
    console.error('LINE_MESSAGING_CHANNEL_SECRET is not set');
    return false;
  }

  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64');

  return hash === signature;
}

type LineProfile = {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
};

/**
 * LINEプロフィール取得（友だちチェック）
 * Messaging API を使用して友だちかどうかを確認
 * @returns プロフィール情報 or null（友だちでない場合）
 */
export async function getProfile(userId: string): Promise<LineProfile | null> {
  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;

  if (!token) {
    console.error('LINE_MESSAGING_CHANNEL_TOKEN is not set');
    throw new Error('LINE configuration error');
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (res.status === 404) {
      // 友だちではない
      return null;
    }

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('LINE API error:', res.status, errorBody);
      throw new Error(`LINE API error: ${res.status}`);
    }

    return res.json();
  } catch (error) {
    console.error('Failed to get LINE profile:', error);
    throw error;
  }
}

/**
 * プッシュ通知送信
 */
export async function pushMessage(userId: string, messages: unknown[]) {
  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;

  if (!token) {
    console.error('LINE_MESSAGING_CHANNEL_TOKEN is not set');
    return { error: 'LINE configuration error' };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ to: userId, messages }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('LINE push message error:', res.status, errorBody);
    }

    return res.json();
  } catch (error) {
    console.error('Failed to send push message:', error);
    throw error;
  }
}

/**
 * ブロードキャスト通知送信（全会員向け）
 */
export async function broadcastMessage(messages: unknown[]) {
  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;

  if (!token) {
    console.error('LINE_MESSAGING_CHANNEL_TOKEN is not set');
    return { error: 'LINE configuration error' };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('LINE broadcast error:', res.status, errorBody);
    }

    return res.json();
  } catch (error) {
    console.error('Failed to broadcast message:', error);
    throw error;
  }
}

/**
 * リプライ送信（Webhook応答用）
 */
export async function replyMessage(replyToken: string, messages: unknown[]) {
  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;

  if (!token) {
    console.error('LINE_MESSAGING_CHANNEL_TOKEN is not set');
    return { error: 'LINE configuration error' };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ replyToken, messages }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('LINE reply error:', res.status, errorBody);
    }

    return res.json();
  } catch (error) {
    console.error('Failed to send reply:', error);
    throw error;
  }
}

/**
 * マルチキャストメッセージを送信（複数ユーザーに一斉送信）
 */
export async function multicastMessage(to: string[], messages: unknown[]) {
  if (to.length === 0) return;

  const token = process.env.LINE_MESSAGING_CHANNEL_TOKEN;

  if (!token) {
    console.error('LINE_MESSAGING_CHANNEL_TOKEN is not set');
    return { error: 'LINE configuration error' };
  }

  try {
    const res = await fetch(`${LINE_API_BASE}/message/multicast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ to, messages }),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      console.error('LINE multicast error:', res.status, errorBody);
    }

    return res.json();
  } catch (error) {
    console.error('Failed to multicast message:', error);
    throw error;
  }
}

// ==============================================
// Webhookイベント型定義
// ==============================================

export type WebhookEvent =
  | FollowEvent
  | UnfollowEvent
  | PostbackEvent
  | MessageEvent;

export type FollowEvent = {
  type: 'follow';
  timestamp: number;
  source: { type: 'user'; userId: string };
  replyToken: string;
};

export type UnfollowEvent = {
  type: 'unfollow';
  timestamp: number;
  source: { type: 'user'; userId: string };
};

export type PostbackEvent = {
  type: 'postback';
  timestamp: number;
  source: { type: 'user'; userId: string };
  replyToken: string;
  postback: { data: string; params?: Record<string, string> };
};

export type MessageEvent = {
  type: 'message';
  timestamp: number;
  source: { type: 'user'; userId: string };
  replyToken: string;
  message: { type: string; id: string; text?: string };
};

// ==============================================
// メッセージビルダー
// ==============================================

/**
 * テキストメッセージを作成
 */
export function createTextMessage(text: string) {
  return { type: 'text', text };
}

/**
 * ウェルカムメッセージを作成（友だち追加時）
 */
export function createWelcomeMessage() {
  const liffId = getLiffId();

  return {
    type: 'flex',
    altText: 'PowerScrapperの集いへようこそ',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'ようこそ！',
            color: '#FFFFFF',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: 'PowerScrapperの集い',
            color: '#FFFFFF',
            size: 'xxl',
            weight: 'bold',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '友だち追加ありがとうございます！',
            weight: 'bold',
            size: 'md',
            color: TEXT_PRIMARY_COLOR,
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: 'PowerScrapperは解体業界で働く仲間がつながるコミュニティです。',
                size: 'sm',
                color: TEXT_PRIMARY_COLOR,
                wrap: true,
              },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: [
              {
                type: 'text',
                text: '今後こんな情報をお届けします：',
                size: 'sm',
                color: TEXT_PRIMARY_COLOR,
              },
              {
                type: 'text',
                text: '・イベント・交流会のご案内',
                size: 'sm',
                color: TEXT_PRIMARY_COLOR,
                margin: 'sm',
              },
              {
                type: 'text',
                text: '・業界の最新情報',
                size: 'sm',
                color: TEXT_PRIMARY_COLOR,
                margin: 'xs',
              },
            ],
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            contents: [
              {
                type: 'text',
                text: '📋 会社情報を登録しませんか？',
                weight: 'bold',
                size: 'sm',
                color: TEXT_PRIMARY_COLOR,
              },
              {
                type: 'text',
                text: '会社名や対応エリアなどを登録しておくと、今後のイベントや案件マッチングでスムーズにやりとりができます。',
                size: 'xs',
                color: TEXT_SECONDARY_COLOR,
                wrap: true,
                margin: 'sm',
              },
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '会社情報を登録する',
                  uri: `https://liff.line.me/${liffId}/profile/edit`,
                },
                style: 'primary',
                color: BUTTON_PRIMARY_COLOR,
                height: 'sm',
                margin: 'lg',
              },
            ],
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'xl',
            contents: [
              {
                type: 'text',
                text: '💡 案件マッチング機能もあります',
                weight: 'bold',
                size: 'xs',
                color: TEXT_PRIMARY_COLOR,
              },
              {
                type: 'text',
                text: '解体案件の募集・入札ができるマッチング機能も使えます。よかったら覗いてみてください！',
                size: 'xs',
                color: TEXT_SECONDARY_COLOR,
                wrap: true,
                margin: 'sm',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '案件マッチングを見る',
              uri: `https://liff.line.me/${liffId}/projects`,
            },
            style: 'secondary',
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * 入札通知メッセージを作成（案件登録者向け）
 */
export function createBidNotification(
  projectTitle: string,
  bidderCompanyName: string,
  availableFrom: string,
  projectId: string,
  bidderBusinessType?: string,
  bidderAreas?: string[],
  bidderLicenses?: string[],
  bidMessage?: string,
  bidAvailability?: string
) {
  const liffId = getLiffId();

  const bidderInfoContents: unknown[] = [
    {
      type: 'text',
      text: bidderCompanyName,
      weight: 'bold',
      size: 'lg',
      color: TEXT_PRIMARY_COLOR,
    },
  ];

  if (bidderBusinessType) {
    bidderInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'vertical',
          backgroundColor: '#F0F0F0',
          cornerRadius: '4px',
          paddingAll: '4px',
          contents: [
            {
              type: 'text',
              text: bidderBusinessType,
              size: 'xxs',
              color: '#666666',
            },
          ],
        },
        { type: 'filler' },
      ],
    });
  }

  if (bidderAreas && bidderAreas.length > 0) {
    bidderInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      contents: [
        {
          type: 'text',
          text: '対応エリア',
          size: 'xs',
          color: TEXT_SECONDARY_COLOR,
          flex: 0,
        },
        {
          type: 'text',
          text: bidderAreas.join('、'),
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          flex: 1,
          wrap: true,
          margin: 'md',
        },
      ],
    });
  }

  if (bidderLicenses && bidderLicenses.length > 0) {
    bidderInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '保有資格',
          size: 'xs',
          color: TEXT_SECONDARY_COLOR,
          flex: 0,
        },
        {
          type: 'text',
          text: bidderLicenses.join('、'),
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          flex: 1,
          wrap: true,
          margin: 'md',
        },
      ],
    });
  }

  const availability = bidAvailability || availableFrom;
  if (availability) {
    bidderInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '対応可能時期',
          size: 'xs',
          color: TEXT_SECONDARY_COLOR,
          flex: 0,
        },
        {
          type: 'text',
          text: availability,
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          flex: 1,
          margin: 'md',
        },
      ],
    });
  }

  if (bidMessage) {
    bidderInfoContents.push({
      type: 'separator',
      margin: 'lg',
    });
    bidderInfoContents.push({
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      contents: [
        {
          type: 'text',
          text: 'アピールメッセージ',
          size: 'xs',
          color: TEXT_SECONDARY_COLOR,
        },
        {
          type: 'text',
          text: bidMessage,
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          wrap: true,
          margin: 'sm',
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `新しく興味ありが届きました: ${projectTitle}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '新しく興味ありが届きました',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: projectTitle,
            weight: 'bold',
            size: 'md',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            contents: bidderInfoContents,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '興味ありリスト',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}/bids`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * マッチング成立通知メッセージを作成（双方向け）
 */
export function createSelectionNotification(
  projectTitle: string,
  isSelected: boolean,
  projectId: string,
  partnerCompanyName?: string,
  partnerRepresentative?: string,
  partnerPhone?: string,
  partnerEmail?: string,
  partnerAddress?: string
) {
  const liffId = getLiffId();

  if (isSelected) {
    const partnerInfoContents: unknown[] = [];

    if (partnerCompanyName) {
      partnerInfoContents.push({
        type: 'text',
        text: partnerCompanyName,
        weight: 'bold',
        size: 'lg',
        color: TEXT_PRIMARY_COLOR,
      });
    }

    if (partnerRepresentative) {
      partnerInfoContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'lg',
        contents: [
          {
            type: 'text',
            text: '担当者',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            flex: 2,
          },
          {
            type: 'text',
            text: partnerRepresentative,
            size: 'sm',
            color: TEXT_PRIMARY_COLOR,
            flex: 5,
          },
        ],
      });
    }

    if (partnerPhone) {
      partnerInfoContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: '電話番号',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            flex: 2,
          },
          {
            type: 'text',
            text: partnerPhone,
            size: 'sm',
            color: TEXT_PRIMARY_COLOR,
            flex: 5,
          },
        ],
      });
    }

    if (partnerEmail) {
      partnerInfoContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: 'メール',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            flex: 2,
          },
          {
            type: 'text',
            text: partnerEmail,
            size: 'sm',
            color: TEXT_PRIMARY_COLOR,
            flex: 5,
            wrap: true,
          },
        ],
      });
    }

    if (partnerAddress) {
      partnerInfoContents.push({
        type: 'box',
        layout: 'horizontal',
        margin: 'sm',
        contents: [
          {
            type: 'text',
            text: '住所',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            flex: 2,
          },
          {
            type: 'text',
            text: partnerAddress,
            size: 'sm',
            color: TEXT_PRIMARY_COLOR,
            flex: 5,
            wrap: true,
          },
        ],
      });
    }

    return {
      type: 'flex',
      altText: `マッチング成立: ${projectTitle}`,
      contents: {
        type: 'bubble',
        hero: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: HERO_SUCCESS_COLOR,
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: 'マッチング成立',
              color: '#FFFFFF',
              size: 'xxl',
              weight: 'bold',
              align: 'center',
            },
          ],
        },
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: projectTitle,
              weight: 'bold',
              size: 'md',
              color: TEXT_PRIMARY_COLOR,
              wrap: true,
            },
            {
              type: 'separator',
              margin: 'lg',
            },
            {
              type: 'text',
              text: '相手企業の情報',
              size: 'xs',
              color: TEXT_SECONDARY_COLOR,
              margin: 'lg',
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'md',
              contents: partnerInfoContents,
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: 'マッチング詳細を見る',
                uri: `https://liff.line.me/${liffId}/mypage/matches`,
              },
              style: 'primary',
              color: BUTTON_PRIMARY_COLOR,
              height: 'sm',
            },
          ],
        },
      },
    };
  } else {
    return {
      type: 'flex',
      altText: `選定結果: ${projectTitle}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '20px',
          contents: [
            {
              type: 'text',
              text: '選定結果のお知らせ',
              color: TEXT_SECONDARY_COLOR,
              size: 'sm',
              weight: 'bold',
            },
            {
              type: 'text',
              text: projectTitle,
              weight: 'bold',
              size: 'md',
              wrap: true,
              margin: 'md',
            },
            {
              type: 'text',
              text: '残念ながら今回は選定されませんでした。引き続き案件をご確認ください。',
              size: 'sm',
              color: TEXT_SECONDARY_COLOR,
              wrap: true,
              margin: 'lg',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          paddingAll: '12px',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '他の案件を見る',
                uri: `https://liff.line.me/${liffId}/projects`,
              },
              style: 'secondary',
              height: 'sm',
            },
          ],
        },
      },
    };
  }
}

/**
 * 案件承認通知メッセージを作成
 */
export function createApprovalNotification(projectTitle: string, projectId: string) {
  const liffId = getLiffId();

  return {
    type: 'flex',
    altText: `案件が公開されました: ${projectTitle}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '案件が公開されました',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: projectTitle,
            weight: 'bold',
            size: 'lg',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'text',
            text: '管理者の審査を通過し、案件一覧に掲載されました。興味ありが届いたらLINEで通知します。',
            size: 'sm',
            color: TEXT_SECONDARY_COLOR,
            wrap: true,
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '案件を確認する',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * 案件却下通知メッセージを作成
 */
export function createRejectionNotification(projectTitle: string, rejectionReason: string) {
  const liffId = getLiffId();

  return {
    type: 'flex',
    altText: `案件が承認されませんでした: ${projectTitle}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: DANGER_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '案件が承認されませんでした',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: projectTitle,
            weight: 'bold',
            size: 'lg',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '却下理由',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            margin: 'lg',
          },
          {
            type: 'text',
            text: rejectionReason,
            size: 'sm',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
            margin: 'sm',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '修正して再投稿する',
              uri: `https://liff.line.me/${liffId}/projects/new`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * 案件通知用Flexメッセージを作成（全会員向け新着案件通知）
 */
export function createProjectNotification(
  title: string,
  prefecture: string,
  periodStart: string,
  periodEnd: string,
  projectId: string,
  isUrgent: boolean = false,
  workContent?: string
) {
  const liffId = getLiffId();

  const heroColor = isUrgent ? HERO_URGENT_COLOR : HERO_COLOR;
  const heroText = isUrgent ? '急募案件' : '新着案件';

  const bodyContents: unknown[] = [
    {
      type: 'text',
      text: title,
      weight: 'bold',
      size: 'lg',
      wrap: true,
      color: TEXT_PRIMARY_COLOR,
    },
    {
      type: 'separator',
      margin: 'lg',
    },
    {
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: 'エリア',
              size: 'xs',
              color: TEXT_SECONDARY_COLOR,
              flex: 2,
            },
            {
              type: 'text',
              text: prefecture || '未設定',
              size: 'sm',
              color: TEXT_PRIMARY_COLOR,
              flex: 5,
            },
          ],
        },
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '工期',
              size: 'xs',
              color: TEXT_SECONDARY_COLOR,
              flex: 2,
            },
            {
              type: 'text',
              text: `${periodStart} 〜 ${periodEnd}`,
              size: 'sm',
              color: TEXT_PRIMARY_COLOR,
              flex: 5,
            },
          ],
        },
      ],
    },
  ];

  if (workContent) {
    bodyContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'sm',
      contents: [
        {
          type: 'text',
          text: '作業内容',
          size: 'xs',
          color: TEXT_SECONDARY_COLOR,
          flex: 2,
        },
        {
          type: 'text',
          text: workContent,
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          flex: 5,
          wrap: true,
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `${heroText}: ${title}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: heroColor,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: heroText,
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細を見る',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * イベント案内メッセージを作成
 */
export function createEventInfoMessage() {
  return {
    type: 'flex',
    altText: 'イベント案内',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'イベント案内',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '現在予定されているイベントはありません',
            weight: 'bold',
            size: 'md',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'text',
            text: 'イベントが決まり次第、LINE通知でお知らせします。',
            size: 'sm',
            color: TEXT_SECONDARY_COLOR,
            wrap: true,
            margin: 'lg',
          },
        ],
      },
    },
  };
}

/**
 * 週次まとめ配信メッセージを作成
 */
export type WeeklyDigestProject = {
  id: string;
  title: string;
  sitePrefecture: string | null;
  recruitmentType: string;
};

export function createWeeklyDigestMessage(projects: WeeklyDigestProject[]) {
  const liffId = getLiffId();

  // 最大5件まで表示
  const displayProjects = projects.slice(0, 5);
  const hasMore = projects.length > 5;

  const projectCards: unknown[] = displayProjects.map((project) => ({
    type: 'box',
    layout: 'horizontal',
    paddingAll: '12px',
    backgroundColor: '#F9F9F7',
    cornerRadius: '8px',
    contents: [
      {
        type: 'box',
        layout: 'vertical',
        flex: 1,
        contents: [
          {
            type: 'text',
            text: project.title,
            size: 'sm',
            weight: 'bold',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
            maxLines: 2,
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'sm',
            contents: [
              {
                type: 'text',
                text: project.sitePrefecture || '未設定',
                size: 'xs',
                color: TEXT_SECONDARY_COLOR,
              },
              {
                type: 'text',
                text: '|',
                size: 'xs',
                color: '#D5D5D0',
                margin: 'sm',
              },
              {
                type: 'text',
                text: project.recruitmentType === 'subcontract' ? '元請け募集' : '協力会社募集',
                size: 'xs',
                color: TEXT_SECONDARY_COLOR,
                margin: 'sm',
              },
            ],
          },
        ],
      },
      {
        type: 'box',
        layout: 'vertical',
        width: '60px',
        alignItems: 'center',
        justifyContent: 'center',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細',
              uri: `https://liff.line.me/${liffId}/projects/${project.id}`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    ],
  }));

  // 各カード間にスペーサーを追加
  const bodyContents: unknown[] = [];
  projectCards.forEach((card, index) => {
    bodyContents.push(card);
    if (index < projectCards.length - 1) {
      bodyContents.push({
        type: 'box',
        layout: 'vertical',
        height: '8px',
        contents: [],
      });
    }
  });

  if (hasMore) {
    bodyContents.push({
      type: 'text',
      text: `他${projects.length - 5}件の案件があります`,
      size: 'xs',
      color: TEXT_SECONDARY_COLOR,
      align: 'center',
      margin: 'lg',
    });
  }

  return {
    type: 'flex',
    altText: `今週の新着案件（${projects.length}件）`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '今週の新着案件',
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            align: 'center',
          },
          {
            type: 'text',
            text: `${projects.length}件の案件が追加されました`,
            color: '#FFFFFF',
            size: 'sm',
            align: 'center',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '全ての案件を見る',
              uri: `https://liff.line.me/${liffId}/projects?tab=project`,
            },
            style: 'primary',
            color: BUTTON_PRIMARY_COLOR,
            height: 'sm',
          },
        ],
      },
    },
  };
}

/**
 * マッチング成立通知メッセージを作成（連絡先交換用）
 * 電話・メールはタップでアクション可能
 */
export function createMatchNotification(
  projectTitle: string,
  partnerCompanyName: string,
  partnerRepresentative: string | null,
  partnerPhone: string | null,
  partnerEmail: string | null,
  partnerLineDisplayName: string | null
) {
  const contactInfoContents: unknown[] = [];

  // 会社名
  contactInfoContents.push({
    type: 'text',
    text: partnerCompanyName,
    weight: 'bold',
    size: 'xl',
    color: TEXT_PRIMARY_COLOR,
  });

  // 担当者名
  if (partnerRepresentative) {
    contactInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'lg',
      contents: [
        {
          type: 'text',
          text: '担当者',
          size: 'sm',
          color: TEXT_SECONDARY_COLOR,
          flex: 2,
        },
        {
          type: 'text',
          text: partnerRepresentative,
          size: 'sm',
          color: TEXT_PRIMARY_COLOR,
          flex: 5,
          weight: 'bold',
        },
      ],
    });
  }

  // 電話番号（タップで発信）
  if (partnerPhone) {
    contactInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      action: {
        type: 'uri',
        uri: `tel:${partnerPhone}`,
      },
      contents: [
        {
          type: 'text',
          text: '電話番号',
          size: 'sm',
          color: TEXT_SECONDARY_COLOR,
          flex: 2,
        },
        {
          type: 'text',
          text: partnerPhone,
          size: 'sm',
          color: TEXT_ACCENT_COLOR,
          flex: 5,
          decoration: 'underline',
        },
      ],
    });
  }

  // メールアドレス（タップでメール起動）
  if (partnerEmail) {
    contactInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      action: {
        type: 'uri',
        uri: `mailto:${partnerEmail}`,
      },
      contents: [
        {
          type: 'text',
          text: 'メール',
          size: 'sm',
          color: TEXT_SECONDARY_COLOR,
          flex: 2,
        },
        {
          type: 'text',
          text: partnerEmail,
          size: 'sm',
          color: TEXT_ACCENT_COLOR,
          flex: 5,
          decoration: 'underline',
          wrap: true,
        },
      ],
    });
  }

  // LINE表示名（タップでコピー）
  if (partnerLineDisplayName) {
    contactInfoContents.push({
      type: 'box',
      layout: 'horizontal',
      margin: 'md',
      action: {
        type: 'clipboard',
        clipboardText: partnerLineDisplayName,
      },
      contents: [
        {
          type: 'text',
          text: 'LINE',
          size: 'sm',
          color: TEXT_SECONDARY_COLOR,
          flex: 2,
        },
        {
          type: 'box',
          layout: 'horizontal',
          flex: 5,
          contents: [
            {
              type: 'text',
              text: `「${partnerLineDisplayName}」`,
              size: 'sm',
              color: '#06C755',
              wrap: true,
            },
            {
              type: 'text',
              text: ' 📋',
              size: 'sm',
              color: '#06C755',
              flex: 0,
            },
          ],
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `案件の返答がありました: ${projectTitle}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_SUCCESS_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '案件の返答がありました',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: projectTitle,
            weight: 'bold',
            size: 'md',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '相手企業の連絡先',
            size: 'sm',
            color: TEXT_SECONDARY_COLOR,
            margin: 'lg',
            weight: 'bold',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: contactInfoContents,
          },
          {
            type: 'separator',
            margin: 'xl',
          },
          {
            type: 'text',
            text: '※ PowerScrapper公式からの自動送信です',
            size: 'xxs',
            color: TEXT_SECONDARY_COLOR,
            margin: 'lg',
            align: 'center',
          },
        ],
      },
    },
  };
}

/**
 * お問い合わせメッセージを作成
 */
export function createContactInfoMessage() {
  return {
    type: 'flex',
    altText: 'お問い合わせ',
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: HERO_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'お問い合わせ',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            align: 'center',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'PowerScrapperへのお問い合わせありがとうございます',
            weight: 'bold',
            size: 'md',
            color: TEXT_PRIMARY_COLOR,
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'メール',
                    size: 'xs',
                    color: TEXT_SECONDARY_COLOR,
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: 'support@powerscrapper.jp',
                    size: 'sm',
                    color: TEXT_PRIMARY_COLOR,
                    flex: 5,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '営業時間',
                    size: 'xs',
                    color: TEXT_SECONDARY_COLOR,
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: '平日 9:00〜18:00',
                    size: 'sm',
                    color: TEXT_PRIMARY_COLOR,
                    flex: 5,
                  },
                ],
              },
            ],
          },
          {
            type: 'text',
            text: 'お問い合わせ内容を上記メールアドレスまでお送りください。担当者より折り返しご連絡いたします。',
            size: 'xs',
            color: TEXT_SECONDARY_COLOR,
            wrap: true,
            margin: 'lg',
          },
        ],
      },
    },
  };
}
