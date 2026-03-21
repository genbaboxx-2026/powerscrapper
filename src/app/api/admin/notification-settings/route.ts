import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/notification-settings - 全通知設定を取得
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await prisma.notificationSetting.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });

    // カテゴリ別にグループ化
    const grouped = {
      A: settings.filter((s) => s.category === 'A'),
      B: settings.filter((s) => s.category === 'B'),
      C: settings.filter((s) => s.category === 'C'),
    };

    return NextResponse.json({
      settings,
      grouped,
      categoryLabels: {
        A: 'ユーザー起点（Webhook応答）',
        B: 'システム自動通知',
        C: '運営配信・定期実行',
      },
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
