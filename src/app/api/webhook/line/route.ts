import { NextRequest, NextResponse } from 'next/server';
import {
  verifySignature,
  replyMessage,
  createTextMessage,
  createWelcomeMessage,
  createDynamicWelcomeMessage,
  createDynamicContactInfoMessage,
  createDynamicEventFallbackMessage,
  createBroadcastFlexMessage,
  type WebhookEvent,
  type MessageEvent,
} from '@/lib/line';
import { prisma } from '@/lib/prisma';
import { isNotificationEnabled } from '@/lib/notification-helper';
import { getContactInfo, getWelcomeMessage, getEventFallback } from '@/lib/site-settings';

/**
 * LINE Webhook エンドポイント
 * Rich Menuタップ、友だち追加/解除、メッセージ受信を処理
 */
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body = await request.text();
    const signature = request.headers.get('x-line-signature');

    // 署名検証
    if (!signature || !verifySignature(body, signature)) {
      console.error('Invalid LINE signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // イベントを解析
    const payload = JSON.parse(body);
    const events: WebhookEvent[] = payload.events || [];

    // 各イベントを処理
    for (const event of events) {
      await handleEvent(event);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * イベントハンドラー
 */
async function handleEvent(event: WebhookEvent): Promise<void> {
  const userId = event.source.userId;

  switch (event.type) {
    case 'follow':
      await handleFollow(userId, event.replyToken);
      break;

    case 'unfollow':
      await handleUnfollow(userId);
      break;

    case 'postback':
      await handlePostback(userId, event.postback.data, event.replyToken);
      break;

    case 'message':
      await handleMessage(event);
      break;

    default:
      console.log('Unhandled event type:', (event as { type: string }).type);
  }
}

/**
 * 友だち追加時の処理
 */
async function handleFollow(userId: string, replyToken: string): Promise<void> {
  console.log('Follow event:', userId);

  try {
    // ユーザーを作成または更新（isActive = true）
    await prisma.user.upsert({
      where: { lineUserId: userId },
      update: { isActive: true },
      create: {
        lineUserId: userId,
        isActive: true,
        role: 'member',
      },
    });

    // A-1: ウェルカムメッセージを送信
    const isWelcomeEnabled = await isNotificationEnabled('a_welcome');
    if (isWelcomeEnabled) {
      // SiteSettingsからウェルカムメッセージを取得
      const welcomeMsg = await getWelcomeMessage();
      await replyMessage(replyToken, [createDynamicWelcomeMessage(welcomeMsg)]);
    }
  } catch (error) {
    console.error('Failed to handle follow:', error);
  }
}

/**
 * 友だち解除（ブロック）時の処理
 */
async function handleUnfollow(userId: string): Promise<void> {
  console.log('Unfollow event:', userId);

  try {
    // ユーザーを非アクティブ化
    await prisma.user.update({
      where: { lineUserId: userId },
      data: { isActive: false },
    });
  } catch (error) {
    // ユーザーが存在しない場合は無視
    console.log('User not found for unfollow:', userId);
  }
}

/**
 * Postbackイベント処理（リッチメニュータップ等）
 */
async function handlePostback(
  userId: string,
  data: string,
  replyToken: string
): Promise<void> {
  console.log('Postback event:', userId, data);

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '';

  // データをパース（例: action=projects, action=register, action=mypage）
  const params = new URLSearchParams(data);
  const action = params.get('action');

  switch (action) {
    case 'projects': {
      // A-4: 案件一覧への誘導
      const isProjectsEnabled = await isNotificationEnabled('a_postback_projects');
      if (!isProjectsEnabled) break;
      await replyMessage(replyToken, [
        {
          type: 'flex',
          altText: '案件一覧',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '案件一覧を確認する',
                  weight: 'bold',
                  size: 'md',
                },
                {
                  type: 'text',
                  text: '最新の案件をチェックしましょう。',
                  wrap: true,
                  size: 'sm',
                  color: '#73726C',
                  margin: 'md',
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '案件一覧を見る',
                    uri: `https://liff.line.me/${liffId}/projects`,
                  },
                  style: 'primary',
                  color: '#2563EB',
                },
              ],
            },
          },
        },
      ]);
      break;
    }

    case 'register': {
      // A-5: 案件登録への誘導
      const isRegisterEnabled = await isNotificationEnabled('a_postback_register');
      if (!isRegisterEnabled) break;
      await replyMessage(replyToken, [
        {
          type: 'flex',
          altText: '案件登録',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '案件を登録する',
                  weight: 'bold',
                  size: 'md',
                },
                {
                  type: 'text',
                  text: '新しい案件を登録して業者を募集しましょう。',
                  wrap: true,
                  size: 'sm',
                  color: '#73726C',
                  margin: 'md',
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: '案件を登録',
                    uri: `https://liff.line.me/${liffId}/projects/new`,
                  },
                  style: 'primary',
                  color: '#2563EB',
                },
              ],
            },
          },
        },
      ]);
      break;
    }

    case 'mypage': {
      // A-6: マイページへの誘導
      const isMypageEnabled = await isNotificationEnabled('a_postback_mypage');
      if (!isMypageEnabled) break;
      await replyMessage(replyToken, [
        {
          type: 'flex',
          altText: 'マイページ',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'マイページ',
                  weight: 'bold',
                  size: 'md',
                },
                {
                  type: 'text',
                  text: '登録案件、興味あり状況、成約済み案件を確認できます。',
                  wrap: true,
                  size: 'sm',
                  color: '#73726C',
                  margin: 'md',
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'マイページを開く',
                    uri: `https://liff.line.me/${liffId}/mypage`,
                  },
                  style: 'primary',
                  color: '#2563EB',
                },
              ],
            },
          },
        },
      ]);
      break;
    }

    case 'profile': {
      // A-7: プロフィール編集への誘導
      const isProfileEnabled = await isNotificationEnabled('a_postback_profile');
      if (!isProfileEnabled) break;
      await replyMessage(replyToken, [
        {
          type: 'flex',
          altText: 'プロフィール編集',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: '会社プロフィール',
                  weight: 'bold',
                  size: 'md',
                },
                {
                  type: 'text',
                  text: '会社情報を登録・編集できます。',
                  wrap: true,
                  size: 'sm',
                  color: '#73726C',
                  margin: 'md',
                },
              ],
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'button',
                  action: {
                    type: 'uri',
                    label: 'プロフィールを編集',
                    uri: `https://liff.line.me/${liffId}/profile/edit`,
                  },
                  style: 'primary',
                  color: '#2563EB',
                },
              ],
            },
          },
        },
      ]);
      break;
    }

    default:
      // 不明なアクション
      await replyMessage(replyToken, [
        createTextMessage('メニューから操作を選択してください。'),
      ]);
  }
}

/**
 * メッセージイベント処理
 */
async function handleMessage(event: MessageEvent): Promise<void> {
  const { replyToken, message } = event;

  if (message.type !== 'text' || !message.text) {
    return;
  }

  const text = message.text.trim();

  switch (text) {
    case 'イベント案内': {
      // A-2: イベント案内応答（Broadcastテーブルから動的取得）
      const isEventInfoEnabled = await isNotificationEnabled('a_event_info');
      if (isEventInfoEnabled) {
        // 最新のイベント配信を取得（送信済みまたは予約済み）
        const latestEvent = await prisma.broadcast.findFirst({
          where: {
            type: 'event',
            status: { in: ['sent', 'scheduled'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (latestEvent) {
          // Broadcastテーブルのイベント情報からFlex Messageを生成
          const messages = createBroadcastFlexMessage({
            type: latestEvent.type,
            title: latestEvent.title,
            body: latestEvent.body,
            eventDate: latestEvent.eventDate,
            eventVenue: latestEvent.eventVenue,
            formUrl: latestEvent.formUrl,
            imageUrl: latestEvent.imageUrl,
            pdfUrl: latestEvent.pdfUrl,
            youtubeUrl: latestEvent.youtubeUrl,
          });
          await replyMessage(replyToken, messages);
        } else {
          // イベントがない場合はSiteSettingsからフォールバックメッセージを取得
          const fallback = await getEventFallback();
          await replyMessage(replyToken, [createDynamicEventFallbackMessage(fallback)]);
        }
      }
      break;
    }

    case 'お問い合わせ': {
      // A-3: お問い合わせ応答（SiteSettingsから動的取得）
      const isContactInfoEnabled = await isNotificationEnabled('a_contact_info');
      if (isContactInfoEnabled) {
        const contactInfo = await getContactInfo();
        await replyMessage(replyToken, [createDynamicContactInfoMessage(contactInfo)]);
      }
      break;
    }

    default:
      // 対応していないメッセージは無視（または汎用応答）
      break;
  }
}

// GETリクエスト（疎通確認用）
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'LINE Webhook endpoint' });
}
