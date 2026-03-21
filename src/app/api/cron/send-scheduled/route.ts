import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { broadcastMessage, createBroadcastMessage } from '@/lib/line';

/**
 * POST /api/cron/send-scheduled - スケジュールされた配信を送信
 *
 * Vercel Cron または外部cronサービスから定期的に呼び出す
 * 1分〜5分間隔での実行を推奨
 */
export async function POST(request: NextRequest) {
  try {
    // Cron認証
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // スケジュール済みで、送信時刻を過ぎた配信を取得
    const scheduledBroadcasts = await prisma.broadcast.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lte: now,
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    if (scheduledBroadcasts.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: 'No scheduled broadcasts to send',
      });
    }

    // アクティブな会員数を取得
    const memberCount = await prisma.user.count({
      where: { isActive: true },
    });

    const results: Array<{ id: string; title: string; success: boolean; error?: string }> = [];

    // 各配信を送信
    for (const broadcast of scheduledBroadcasts) {
      try {
        // フォーマットに応じたメッセージを作成
        const messages = createBroadcastMessage({
          format: broadcast.format || 'card',
          type: broadcast.type,
          title: broadcast.title,
          body: broadcast.body,
          eventDate: broadcast.eventDate,
          eventVenue: broadcast.eventVenue,
          formUrl: broadcast.formUrl,
          imageUrl: broadcast.imageUrl,
          pdfUrl: broadcast.pdfUrl,
          youtubeUrl: broadcast.youtubeUrl,
        });

        // 配信を送信
        await broadcastMessage(messages);

        // ステータスを更新
        await prisma.broadcast.update({
          where: { id: broadcast.id },
          data: {
            status: 'sent',
            sentAt: new Date(),
            sentCount: memberCount,
          },
        });

        results.push({
          id: broadcast.id,
          title: broadcast.title,
          success: true,
        });

        console.log(`Sent scheduled broadcast: ${broadcast.id} - ${broadcast.title}`);
      } catch (error) {
        console.error(`Failed to send broadcast ${broadcast.id}:`, error);
        results.push({
          id: broadcast.id,
          title: broadcast.title,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: true,
      sentCount: successCount,
      failedCount: failCount,
      results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error('Failed to process scheduled broadcasts:', error);
    return NextResponse.json(
      { error: 'スケジュール配信の処理に失敗しました' },
      { status: 500 }
    );
  }
}

// GETも許可（デバッグ用/手動実行用）
export async function GET(request: NextRequest) {
  return POST(request);
}
