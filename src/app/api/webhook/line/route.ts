import { NextRequest, NextResponse } from 'next/server';
import {
  verifySignature,
  replyMessage,
  createTextMessage,
  createDynamicWelcomeMessage,
  createDynamicContactInfoMessage,
  createDynamicEventFallbackMessage,
  createBroadcastFlexMessage,
  createPostbackMessage,
  createEventWithEventMessage,
  createEventWithoutEventMessage,
  createContactInfoMessageV2,
  createWelcomeMessageV2,
  createApplicationWelcomeMessage,
  type WebhookEvent,
  type MessageEvent,
} from '@/lib/line';
import { prisma } from '@/lib/prisma';
import { isNotificationEnabled } from '@/lib/notification-helper';
import { getContactInfo, getWelcomeMessage, getEventFallback, getPostbackNotificationContent, getEventInfoSetting } from '@/lib/site-settings';

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
      await handleMessage(event, userId);
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
    // 既存ユーザーを確認
    const existingUser = await prisma.user.findUnique({
      where: { lineUserId: userId },
    });

    // ユーザーを作成または更新（isActive = true, approvalStatus設定）
    const user = await prisma.user.upsert({
      where: { lineUserId: userId },
      update: { isActive: true },
      create: {
        lineUserId: userId,
        isActive: true,
        role: 'member',
        approvalStatus: 'none',
      },
    });

    // ウェルカムメッセージのみ送信（イベント情報・PDFは送らない）
    const isWelcomeEnabled = await isNotificationEnabled('a_welcome');
    if (isWelcomeEnabled) {
      if (existingUser && existingUser.approvalStatus === 'approved') {
        // 承認済みユーザーの再フォロー: 通常のウェルカムメッセージのみ
        const welcomeMsg = await getWelcomeMessage();
        if (welcomeMsg && welcomeMsg.message) {
          await replyMessage(replyToken, createWelcomeMessageV2(welcomeMsg));
        } else if (welcomeMsg && (welcomeMsg as unknown as { title?: string }).title) {
          await replyMessage(replyToken, [createDynamicWelcomeMessage(welcomeMsg as unknown as { title: string; body: string; imageUrl: string | null; buttonLabel: string; buttonUrl: string })]);
        }
      } else {
        // 新規ユーザーまたは未承認ユーザー: 入会申請誘導のウェルカムメッセージ
        await replyMessage(replyToken, [createApplicationWelcomeMessage()]);
      }
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

  // データをパース（例: action=projects, action=register, action=mypage）
  const params = new URLSearchParams(data);
  const action = params.get('action');

  // アクションと通知キーのマッピング
  const actionToNotificationKey: Record<string, string> = {
    projects: 'a_postback_projects',
    register: 'a_postback_register',
    mypage: 'a_postback_mypage',
    profile: 'a_postback_profile',
  };

  const notificationKey = action ? actionToNotificationKey[action] : null;

  if (!notificationKey) {
    // 不明なアクション
    await replyMessage(replyToken, [
      createTextMessage('メニューから操作を選択してください。'),
    ]);
    return;
  }

  // 通知が有効かチェック
  const isEnabled = await isNotificationEnabled(notificationKey);
  if (!isEnabled) return;

  // SiteSettingsから通知内容を取得
  const content = await getPostbackNotificationContent(notificationKey);

  // 内容が設定されていない場合は何も送信しない
  if (!content || (!content.textMessage && !content.buttonLabel)) {
    console.log(`Postback notification content not configured for ${notificationKey}`);
    return;
  }

  // メッセージを作成して送信
  const message = createPostbackMessage(content);
  await replyMessage(replyToken, [message]);
}

/**
 * メッセージイベント処理
 */
async function handleMessage(event: MessageEvent, userId: string): Promise<void> {
  const { replyToken, message } = event;

  if (message.type !== 'text' || !message.text) {
    return;
  }

  const text = message.text.trim();

  switch (text) {
    case 'イベント案内': {
      // 未承認ユーザーには入会申請を促す
      const user = await prisma.user.findUnique({ where: { lineUserId: userId } });
      if (!user || user.approvalStatus !== 'approved') {
        await replyMessage(replyToken, [createApplicationWelcomeMessage()]);
        break;
      }

      // A-2: イベント案内応答（手動設定に基づいて表示）
      const isEventInfoEnabled = await isNotificationEnabled('a_event_info');
      if (isEventInfoEnabled) {
        // 設定を取得
        const eventInfoSetting = await getEventInfoSetting();

        if (!eventInfoSetting) {
          console.log('Event info setting not configured, skipping');
          break;
        }

        // hasEventフラグで表示を切り替え（デフォルトはfalse）
        const hasEvent = eventInfoSetting.hasEvent ?? false;

        if (hasEvent && eventInfoSetting.withEvent) {
          // イベントがある場合: withEvent設定とボタンURLを使用
          const messages = createEventWithEventMessage(
            {
              title: eventInfoSetting.withEvent.headerText || 'イベントのお知らせ',
              eventDate: null,
              eventVenue: null,
              formUrl: eventInfoSetting.withEvent.buttonUrl || null,
              imageUrl: eventInfoSetting.withEvent.imageUrl,
            },
            eventInfoSetting.withEvent
          );
          await replyMessage(replyToken, messages);
        } else if (eventInfoSetting.withoutEvent) {
          // イベントがない場合: withoutEvent設定を使用
          const messages = createEventWithoutEventMessage(eventInfoSetting.withoutEvent);
          await replyMessage(replyToken, messages);
        } else {
          console.log('Event info withoutEvent not configured, skipping');
        }
      }
      break;
    }

    case 'パワスク相談': {
      const consultUser = await prisma.user.findUnique({ where: { lineUserId: userId } });
      if (!consultUser || consultUser.approvalStatus !== 'approved') {
        // 未申請/審査待ち/却下 → 入会申請誘導
        await replyMessage(replyToken, [createApplicationWelcomeMessage()]);
      } else if (consultUser.memberRank !== 'member') {
        // ゲスト会員 → 準備中テキスト
        await replyMessage(replyToken, [createTextMessage('現在準備中です🙇\nご利用開始までしばらくお待ちください。')]);
      } else {
        // メンバー会員 → LIFFリンク
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2009511132-2ruFmQGp';
        await replyMessage(replyToken, [{
          type: 'template',
          altText: 'パワスク相談はこちら👇',
          template: {
            type: 'buttons',
            text: 'パワスク相談はこちら👇',
            actions: [
              {
                type: 'uri',
                label: 'パワスク相談を開く',
                uri: `https://liff.line.me/${liffId}/consultations`,
              },
            ],
          },
        }]);
      }
      break;
    }

    case 'お問い合わせ': {
      // A-3: お問い合わせ応答（SiteSettingsから動的取得）
      const isContactInfoEnabled = await isNotificationEnabled('a_contact_info');
      if (isContactInfoEnabled) {
        const contactInfo = await getContactInfo();
        // 設定がない場合は何も送信しない
        if (contactInfo && contactInfo.message) {
          // 新構造: format, message, buttonLabel, buttonUrl, imageUrl
          const messages = createContactInfoMessageV2(contactInfo);
          await replyMessage(replyToken, messages);
        } else if (contactInfo && ((contactInfo as unknown as { companyName?: string }).companyName || (contactInfo as unknown as { email?: string }).email || (contactInfo as unknown as { phone?: string }).phone)) {
          // 旧構造: companyName, personName, phone, email, lineId, note, imageUrl
          await replyMessage(replyToken, [createDynamicContactInfoMessage(contactInfo as unknown as { companyName: string; personName: string; phone: string; email: string; lineId: string; note: string; imageUrl: string | null })]);
        } else {
          console.log('Contact info not configured, skipping');
        }
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
