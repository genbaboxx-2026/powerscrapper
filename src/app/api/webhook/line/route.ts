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
      // 設定がない場合は何も送信しない
      if (welcomeMsg && welcomeMsg.message) {
        // 新構造: format, message, buttonLabel, buttonUrl, imageUrl
        const messages = createWelcomeMessageV2(welcomeMsg);
        await replyMessage(replyToken, messages);
      } else if (welcomeMsg && (welcomeMsg as unknown as { title?: string }).title) {
        // 旧構造: title, body, buttonLabel, buttonUrl, imageUrl
        await replyMessage(replyToken, [createDynamicWelcomeMessage(welcomeMsg as unknown as { title: string; body: string; imageUrl: string | null; buttonLabel: string; buttonUrl: string })]);
      } else {
        console.log('Welcome message not configured, skipping');
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
async function handleMessage(event: MessageEvent): Promise<void> {
  const { replyToken, message } = event;

  if (message.type !== 'text' || !message.text) {
    return;
  }

  const text = message.text.trim();

  switch (text) {
    case 'イベント案内': {
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
