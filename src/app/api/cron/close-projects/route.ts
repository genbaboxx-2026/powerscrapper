import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/cron/close-projects - 期限切れ案件を自動クローズ
 *
 * Vercel Cronまたは外部cronサービスから定期的に呼び出す
 * セキュリティのためCRON_SECRETヘッダーで認証
 */
export async function POST(request: NextRequest) {
  try {
    // Cron認証（Vercel Cron または外部サービスからの呼び出し）
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // CRON_SECRETが設定されている場合は認証必須
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // 期限切れで、まだ募集中（approved）の案件をクローズ
    const result = await prisma.project.updateMany({
      where: {
        status: 'approved',
        deadline: {
          lt: now,
        },
      },
      data: {
        status: 'closed',
      },
    });

    console.log(`Closed ${result.count} expired projects`);

    return NextResponse.json({
      success: true,
      closedCount: result.count,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Failed to close projects:', error);
    return NextResponse.json(
      { error: '案件のクローズ処理に失敗しました' },
      { status: 500 }
    );
  }
}

// GETも許可（デバッグ用/手動実行用）
export async function GET(request: NextRequest) {
  return POST(request);
}
