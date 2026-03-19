/**
 * LINE Messaging API ユーティリティ
 */

import crypto from 'crypto';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

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
 * 案件通知用Flexメッセージを作成
 */
export function createProjectNotification(
  title: string,
  prefecture: string,
  periodStart: string,
  periodEnd: string,
  projectId: string,
  isUrgent: boolean = false
) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  return {
    type: 'flex',
    altText: `新着案件: ${title}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          ...(isUrgent
            ? [
                {
                  type: 'text',
                  text: '急募',
                  color: '#E24B4A',
                  size: 'xs',
                  weight: 'bold',
                },
              ]
            : []),
          {
            type: 'text',
            text: title,
            weight: 'bold',
            size: 'lg',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'lg',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: `エリア: ${prefecture || '未設定'}`,
                size: 'sm',
                color: '#73726C',
              },
              {
                type: 'text',
                text: `工期: ${periodStart}〜${periodEnd}`,
                size: 'sm',
                color: '#73726C',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細を見る',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}`,
            },
            style: 'primary',
            color: '#0F6E56',
          },
        ],
      },
    },
  };
}

/**
 * 入札通知メッセージを作成
 */
export function createBidNotification(
  projectTitle: string,
  bidderCompanyName: string,
  availableFrom: string,
  projectId: string
) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  const bodyContents = [
    {
      type: 'text',
      text: '新しい入札がありました',
      color: '#0F6E56',
      size: 'sm',
      weight: 'bold',
    },
    {
      type: 'text',
      text: projectTitle,
      weight: 'bold',
      size: 'lg',
      wrap: true,
      margin: 'md',
    },
    {
      type: 'box',
      layout: 'vertical',
      margin: 'lg',
      spacing: 'sm',
      contents: [
        {
          type: 'text',
          text: `入札者: ${bidderCompanyName}`,
          size: 'sm',
          color: '#2C2C2A',
        },
        ...(availableFrom
          ? [
              {
                type: 'text',
                text: `対応可能時期: ${availableFrom}`,
                size: 'sm',
                color: '#2C2C2A',
              },
            ]
          : []),
      ],
    },
  ];

  return {
    type: 'flex',
    altText: `新しい入札: ${projectTitle}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '入札一覧を確認',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}/bids`,
            },
            style: 'primary',
            color: '#0F6E56',
          },
        ],
      },
    },
  };
}

/**
 * 選定通知メッセージを作成
 */
export function createSelectionNotification(
  projectTitle: string,
  isSelected: boolean,
  _projectId: string
) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  if (isSelected) {
    return {
      type: 'flex',
      altText: `選定されました: ${projectTitle}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '選定されました',
              color: '#0F6E56',
              size: 'lg',
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
              text: '発注者の連絡先が開示されました。マイページからご確認ください。',
              size: 'sm',
              color: '#73726C',
              wrap: true,
              margin: 'lg',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '詳細を確認',
                uri: `https://liff.line.me/${liffId}/mypage/matches`,
              },
              style: 'primary',
              color: '#0F6E56',
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
          contents: [
            {
              type: 'text',
              text: '選定結果のお知らせ',
              color: '#73726C',
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
              color: '#73726C',
              wrap: true,
              margin: 'lg',
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              action: {
                type: 'uri',
                label: '他の案件を見る',
                uri: `https://liff.line.me/${liffId}/projects`,
              },
              style: 'secondary',
            },
          ],
        },
      },
    };
  }
}

/**
 * ウェルカムメッセージを作成（友だち追加時）
 */
export function createWelcomeMessage() {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  return {
    type: 'flex',
    altText: 'PowerScrapperへようこそ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'PowerScrapperへようこそ',
            weight: 'bold',
            size: 'lg',
            color: '#0F6E56',
          },
          {
            type: 'text',
            text: '解体業界の案件マッチングサービスです。\n\nまずは会社プロフィールを登録して、案件を探しましょう。',
            wrap: true,
            margin: 'lg',
            size: 'sm',
            color: '#2C2C2A',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: 'プロフィールを登録',
              uri: `https://liff.line.me/${liffId}/profile/edit`,
            },
            style: 'primary',
            color: '#0F6E56',
          },
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '案件を見る',
              uri: `https://liff.line.me/${liffId}/projects`,
            },
            style: 'secondary',
            margin: 'sm',
          },
        ],
      },
    },
  };
}
