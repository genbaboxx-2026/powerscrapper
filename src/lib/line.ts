/**
 * LINE Messaging API ユーティリティ
 */

import crypto from 'crypto';

const LINE_API_BASE = 'https://api.line.me/v2/bot';

// ブランドカラー
const BRAND_COLOR = '#0F6E56'; // 深緑
const ACCENT_COLOR = '#BA7517'; // 琥珀
const DANGER_COLOR = '#E24B4A'; // 赤

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
        backgroundColor: BRAND_COLOR,
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
            color: '#2C2C2A',
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
                color: '#2C2C2A',
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
                color: '#2C2C2A',
              },
              {
                type: 'text',
                text: '・イベント・交流会のご案内',
                size: 'sm',
                color: '#2C2C2A',
                margin: 'sm',
              },
              {
                type: 'text',
                text: '・業界の最新情報',
                size: 'sm',
                color: '#2C2C2A',
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
                color: '#2C2C2A',
              },
              {
                type: 'text',
                text: '会社名や対応エリアなどを登録しておくと、今後のイベントや案件マッチングでスムーズにやりとりができます。',
                size: 'xs',
                color: '#73726C',
                wrap: true,
                margin: 'sm',
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
                text: '💡 案件マッチング機能もあります',
                weight: 'bold',
                size: 'xs',
                color: '#2C2C2A',
              },
              {
                type: 'text',
                text: '解体案件の募集・入札ができるマッチング機能も使えます。よかったら覗いてみてください！',
                size: 'xs',
                color: '#73726C',
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
        spacing: 'sm',
        paddingAll: '12px',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '会社情報を登録する',
              uri: `https://liff.line.me/${liffId}/profile/edit`,
            },
            style: 'primary',
            color: BRAND_COLOR,
            height: 'sm',
          },
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
      color: '#2C2C2A',
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
          color: '#73726C',
          flex: 0,
        },
        {
          type: 'text',
          text: bidderAreas.join('、'),
          size: 'sm',
          color: '#2C2C2A',
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
          color: '#73726C',
          flex: 0,
        },
        {
          type: 'text',
          text: bidderLicenses.join('、'),
          size: 'sm',
          color: '#2C2C2A',
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
          color: '#73726C',
          flex: 0,
        },
        {
          type: 'text',
          text: availability,
          size: 'sm',
          color: '#2C2C2A',
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
          color: '#73726C',
        },
        {
          type: 'text',
          text: bidMessage,
          size: 'sm',
          color: '#2C2C2A',
          wrap: true,
          margin: 'sm',
        },
      ],
    });
  }

  return {
    type: 'flex',
    altText: `新しい入札: ${projectTitle}`,
    contents: {
      type: 'bubble',
      hero: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: ACCENT_COLOR,
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: '新しい入札がありました',
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
            color: '#2C2C2A',
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
              label: '入札一覧を確認する',
              uri: `https://liff.line.me/${liffId}/projects/${projectId}/bids`,
            },
            style: 'primary',
            color: BRAND_COLOR,
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
        color: '#2C2C2A',
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
            color: '#73726C',
            flex: 2,
          },
          {
            type: 'text',
            text: partnerRepresentative,
            size: 'sm',
            color: '#2C2C2A',
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
            color: '#73726C',
            flex: 2,
          },
          {
            type: 'text',
            text: partnerPhone,
            size: 'sm',
            color: '#2C2C2A',
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
            color: '#73726C',
            flex: 2,
          },
          {
            type: 'text',
            text: partnerEmail,
            size: 'sm',
            color: '#2C2C2A',
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
            color: '#73726C',
            flex: 2,
          },
          {
            type: 'text',
            text: partnerAddress,
            size: 'sm',
            color: '#2C2C2A',
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
          backgroundColor: BRAND_COLOR,
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
              color: '#2C2C2A',
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
              color: '#73726C',
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
              color: BRAND_COLOR,
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
        backgroundColor: BRAND_COLOR,
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
            color: '#2C2C2A',
            wrap: true,
          },
          {
            type: 'text',
            text: '管理者の審査を通過し、案件一覧に掲載されました。入札が届いたらLINEで通知します。',
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
            color: BRAND_COLOR,
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
            color: '#2C2C2A',
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
            color: '#73726C',
            margin: 'lg',
          },
          {
            type: 'text',
            text: rejectionReason,
            size: 'sm',
            color: '#2C2C2A',
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
            color: BRAND_COLOR,
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

  const heroColor = isUrgent ? ACCENT_COLOR : BRAND_COLOR;
  const heroText = isUrgent ? '急募案件' : '新着案件';

  const bodyContents: unknown[] = [
    {
      type: 'text',
      text: title,
      weight: 'bold',
      size: 'lg',
      wrap: true,
      color: '#2C2C2A',
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
              color: '#73726C',
              flex: 2,
            },
            {
              type: 'text',
              text: prefecture || '未設定',
              size: 'sm',
              color: '#2C2C2A',
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
              color: '#73726C',
              flex: 2,
            },
            {
              type: 'text',
              text: `${periodStart} 〜 ${periodEnd}`,
              size: 'sm',
              color: '#2C2C2A',
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
          color: '#73726C',
          flex: 2,
        },
        {
          type: 'text',
          text: workContent,
          size: 'sm',
          color: '#2C2C2A',
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
            color: BRAND_COLOR,
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
        backgroundColor: BRAND_COLOR,
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
            color: '#2C2C2A',
            wrap: true,
          },
          {
            type: 'text',
            text: 'イベントが決まり次第、LINE通知でお知らせします。',
            size: 'sm',
            color: '#73726C',
            wrap: true,
            margin: 'lg',
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
        backgroundColor: BRAND_COLOR,
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
            color: '#2C2C2A',
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
                    color: '#73726C',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: 'support@powerscrapper.jp',
                    size: 'sm',
                    color: '#2C2C2A',
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
                    color: '#73726C',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: '平日 9:00〜18:00',
                    size: 'sm',
                    color: '#2C2C2A',
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
            color: '#73726C',
            wrap: true,
            margin: 'lg',
          },
        ],
      },
    },
  };
}
