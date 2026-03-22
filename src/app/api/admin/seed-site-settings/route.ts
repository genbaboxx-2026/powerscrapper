import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

// 全ての通知内容の初期値
const SITE_SETTINGS_DEFAULTS: Record<string, unknown> = {
  // ウェルカムメッセージ (a_welcome)
  welcome_message: {
    format: 'simple',
    message: `パワスクへようこそ！🔨

解体業界の仲間とつながるコミュニティ＋案件マッチングプラットフォームです。

【パワスクでできること】
✅ 業界の相談・情報交換（パワスク相談）
✅ 解体案件の受発注マッチング
✅ 定期オフ会「パワスクの集い」

まずは会社プロフィールを登録して、仲間とつながりましょう！👇`,
    buttonLabel: 'プロフィールを登録する',
    buttonUrl: '',
    imageUrl: null,
  },

  // イベント案内 (a_event_info)
  event_fallback: {
    hasEvent: false,
    withEvent: {
      format: 'simple',
      headerText: 'イベントのお知らせ',
      supplementText: '皆様のご参加をお待ちしております！',
      imageUrl: null,
      buttonLabel: '申し込む',
      buttonUrl: '',
    },
    withoutEvent: {
      format: 'simple',
      message: `現在予定されているイベントはありません。

次回イベントが決まり次第、LINE通知でお知らせします！`,
      imageUrl: null,
    },
  },

  // お問い合わせ (a_contact_info)
  contact_info: {
    format: 'simple',
    message: `パワスクへのお問い合わせ

ご質問・ご相談はお気軽にどうぞ！

📧 メール
support@genbaboxx.co.jp

📞 電話
03-XXXX-XXXX（平日 10:00〜18:00）

運営: 株式会社GENBABOXX`,
    buttonLabel: '',
    buttonUrl: '',
    imageUrl: null,
  },

  // 新規案件通知 - 管理者へ (b_new_project_admin)
  notification_b_new_project_admin: {
    format: 'card',
    headingText: '新規案件が投稿されました',
    supplementMessage: '審査をお願いします。',
    imageUrl: null,
  },

  // 承認通知 (b_project_approved)
  notification_b_project_approved: {
    format: 'card',
    headingText: '案件が公開されました',
    supplementMessage: '興味ありが届いたらLINEで通知します。',
    imageUrl: null,
  },

  // 却下通知 (b_project_rejected)
  notification_b_project_rejected: {
    format: 'card',
    headingText: '案件が承認されませんでした',
    supplementMessage: '内容を修正して再投稿できます。',
    imageUrl: null,
  },

  // 新着案件通知 - 全会員へ (b_new_project_broadcast)
  notification_b_new_project_broadcast: {
    format: 'card',
    headingText: '新着案件のお知らせ',
    supplementMessage: '気になる案件があればチェックしてみてください！',
    imageUrl: null,
  },

  // 興味あり受信通知 (b_bid_received)
  notification_b_bid_received: {
    format: 'card',
    headingText: '興味ありが届きました',
    supplementMessage: '詳細を確認して、気になる企業に連絡してみましょう！',
    imageUrl: null,
  },

  // 採用通知 (b_bid_selected)
  notification_b_bid_selected: {
    format: 'card',
    headingText: '興味ありが採用されました',
    supplementMessage: '相手企業の連絡先を確認して、お早めにご連絡ください！',
    imageUrl: null,
  },

  // 採用確認 (b_bid_selected_owner)
  notification_b_bid_selected_owner: {
    format: 'card',
    headingText: '連絡先を共有しました',
    supplementMessage: '相手企業からの連絡をお待ちください。',
    imageUrl: null,
  },

  // 不採用通知 (b_bid_rejected)
  notification_b_bid_rejected: {
    format: 'card',
    headingText: '案件の募集が終了しました',
    supplementMessage: '他にも案件がありますので、ぜひチェックしてみてください！',
    imageUrl: null,
  },

  // 連絡先交換通知 (b_match_contact) - 常にカード形式で送信
  notification_b_match_contact: {
    format: 'card',
    headingText: '案件の返答がありました',
    supplementMessage: 'お早めにご連絡ください！',
    imageUrl: null,
  },

  // 週次まとめ配信 (c_weekly_digest)
  notification_c_weekly_digest: {
    format: 'card',
    headingText: '今週の新着案件',
    supplementMessage: '気になる案件があればお早めにチェック！',
    imageUrl: null,
  },
};

/**
 * 管理者セッションを検証
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!session?.value;
}

/**
 * POST /api/admin/seed-site-settings - 通知内容の初期データを投入
 */
export async function POST() {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const results: Array<{ key: string; status: string }> = [];

    // 各設定を upsert
    for (const [key, value] of Object.entries(SITE_SETTINGS_DEFAULTS)) {
      try {
        await prisma.siteSetting.upsert({
          where: { key },
          update: { value: JSON.stringify(value) },
          create: { key, value: JSON.stringify(value) },
        });
        results.push({ key, status: 'success' });
      } catch (err) {
        console.error(`Failed to upsert ${key}:`, err);
        results.push({ key, status: 'error' });
      }
    }

    const successCount = results.filter((r) => r.status === 'success').length;

    return NextResponse.json({
      message: `通知内容の初期データを投入しました`,
      successCount,
      totalCount: results.length,
      results,
    });
  } catch (error) {
    console.error('Seed site settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/seed-site-settings - 投入済みの設定数を確認
 */
export async function GET() {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const settings = await prisma.siteSetting.findMany({
      select: { key: true },
    });

    return NextResponse.json({
      count: settings.length,
      keys: settings.map((s) => s.key),
    });
  } catch (error) {
    console.error('Check site settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
