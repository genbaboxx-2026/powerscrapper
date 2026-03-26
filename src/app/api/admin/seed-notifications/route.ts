import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

const NOTIFICATION_SETTINGS = [
  // カテゴリA（ユーザー起点）
  { key: 'a_welcome', label: 'ウェルカムメッセージ', category: 'A', description: '友だち追加時のウェルカムメッセージ', enabled: true },
  { key: 'a_event_info', label: 'イベント案内応答', category: 'A', description: '「イベント案内」テキスト受信時の応答', enabled: true },
  { key: 'a_contact_info', label: 'お問い合わせ応答', category: 'A', description: '「お問い合わせ」テキスト受信時の応答', enabled: true },
  { key: 'a_postback_projects', label: '案件一覧への誘導', category: 'A', description: 'リッチメニュー「案件を探す」タップ時', enabled: true },
  { key: 'a_postback_register', label: '案件登録への誘導', category: 'A', description: 'リッチメニュー「案件を登録」タップ時', enabled: true },
  { key: 'a_postback_mypage', label: 'マイページへの誘導', category: 'A', description: 'リッチメニュー「マイページ」タップ時', enabled: true },
  { key: 'a_postback_profile', label: 'プロフィール編集への誘導', category: 'A', description: 'リッチメニュー「プロフィール」タップ時', enabled: true },

  // カテゴリB（システム自動通知）
  { key: 'b_bid_received', label: '興味あり受信通知', category: 'B', description: '案件に興味ありが届いた時、案件登録者に通知', enabled: true },
  { key: 'b_match_contact', label: '連絡先交換通知', category: 'B', description: '「連絡する」ボタン押下時、相手企業に連絡先を通知', enabled: true },
  { key: 'b_project_approved', label: '案件承認通知', category: 'B', description: '案件が承認された時、登録者に通知', enabled: true },
  { key: 'b_project_rejected', label: '案件却下通知', category: 'B', description: '案件が却下された時、登録者に通知', enabled: true },
  { key: 'b_new_project_admin', label: '新規案件（管理者向け）', category: 'B', description: '新規案件登録時、管理者に通知', enabled: true },
  { key: 'b_new_project_broadcast', label: '新着案件（全会員）', category: 'B', description: '案件承認時、全会員に通知（デフォルトOFF）', enabled: false },
  { key: 'b_member_application', label: '入会申請通知（管理者向け）', category: 'B', description: '入会申請時、管理者に通知', enabled: true },
  { key: 'b_member_approved', label: '入会承認通知', category: 'B', description: '入会が承認された時、申請者に通知', enabled: true },
  { key: 'b_member_rejected', label: '入会却下通知', category: 'B', description: '入会が却下された時、申請者に通知', enabled: true },

  // カテゴリC（運営配信・定期）
  { key: 'c_weekly_digest', label: '週次まとめ配信', category: 'C', description: '毎週月曜9時に全会員へ週次まとめを配信', enabled: true },
  { key: 'c_auto_close', label: '期限切れ自動クローズ', category: 'C', description: '期限切れ案件の自動クローズ処理', enabled: true },
];

/**
 * POST /api/admin/seed-notifications - 通知設定の初期データを投入
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 既存のデータをチェック
    const existingCount = await prisma.notificationSetting.count();
    if (existingCount > 0) {
      return NextResponse.json({
        message: '通知設定は既に初期化されています',
        count: existingCount,
      });
    }

    // 初期データを投入
    await prisma.notificationSetting.createMany({
      data: NOTIFICATION_SETTINGS,
    });

    return NextResponse.json({
      message: '通知設定の初期データを投入しました',
      count: NOTIFICATION_SETTINGS.length,
    });
  } catch (error) {
    console.error('Seed notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/admin/seed-notifications - 投入済みの通知設定数を確認
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.notificationSetting.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Check notifications error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
