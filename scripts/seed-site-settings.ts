import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SITE_SETTINGS_DEFAULTS: Record<string, unknown> = {
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
  notification_b_new_project_admin: {
    format: 'simple',
    headingText: '新規案件が投稿されました',
    supplementMessage: '審査をお願いします。',
    imageUrl: null,
  },
  notification_b_project_approved: {
    format: 'simple',
    headingText: '案件が公開されました',
    supplementMessage: '興味ありが届いたらLINEで通知します。',
    imageUrl: null,
  },
  notification_b_project_rejected: {
    format: 'simple',
    headingText: '案件が承認されませんでした',
    supplementMessage: '内容を修正して再投稿できます。',
    imageUrl: null,
  },
  notification_b_new_project_broadcast: {
    format: 'simple',
    headingText: '新着案件のお知らせ',
    supplementMessage: '気になる案件があればチェックしてみてください！',
    imageUrl: null,
  },
  notification_b_bid_received: {
    format: 'simple',
    headingText: '興味ありが届きました',
    supplementMessage: '詳細を確認して、気になる企業に連絡してみましょう！',
    imageUrl: null,
  },
  notification_b_bid_selected: {
    format: 'simple',
    headingText: '興味ありが採用されました',
    supplementMessage: '相手企業の連絡先を確認して、お早めにご連絡ください！',
    imageUrl: null,
  },
  notification_b_bid_selected_owner: {
    format: 'simple',
    headingText: '連絡先を共有しました',
    supplementMessage: '相手企業からの連絡をお待ちください。',
    imageUrl: null,
  },
  notification_b_bid_rejected: {
    format: 'simple',
    headingText: '案件の募集が終了しました',
    supplementMessage: '他にも案件がありますので、ぜひチェックしてみてください！',
    imageUrl: null,
  },
  notification_b_match_contact: {
    format: 'card',
    headingText: '案件の返答がありました',
    supplementMessage: 'お早めにご連絡ください！',
    imageUrl: null,
  },
  notification_c_weekly_digest: {
    format: 'simple',
    headingText: '今週の新着案件',
    supplementMessage: '気になる案件があればお早めにチェック！',
    imageUrl: null,
  },
};

async function main() {
  console.log('Seeding site settings...');

  for (const [key, value] of Object.entries(SITE_SETTINGS_DEFAULTS)) {
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });
    console.log('✅ Seeded:', key);
  }

  console.log(`\nDone! Total: ${Object.keys(SITE_SETTINGS_DEFAULTS).length} settings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
