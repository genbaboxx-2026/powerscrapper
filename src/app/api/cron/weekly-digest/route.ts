import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { multicastMessage, createWeeklyDigestMessage } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

/**
 * POST /api/cron/weekly-digest - 週次新着案件まとめ配信
 *
 * 毎週月曜9時（JST）にVercel Cronから呼び出される
 * 過去7日間で承認された案件をまとめて全会員に通知
 */
export async function POST(request: NextRequest) {
  try {
    // Cron認証
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // C-1: 週次まとめ配信の有効/無効チェック
    const isWeeklyDigestEnabled = await isNotificationEnabled('c_weekly_digest');
    if (!isWeeklyDigestEnabled) {
      console.log('Weekly digest is disabled, skipping');
      return NextResponse.json({
        success: true,
        message: 'Weekly digest is disabled',
      });
    }

    // 過去7日間で承認された案件を取得
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const projects = await prisma.project.findMany({
      where: {
        status: 'approved',
        reviewedAt: {
          gte: sevenDaysAgo,
        },
        deadline: {
          gt: new Date(), // まだ募集中のもの
        },
      },
      orderBy: {
        reviewedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        sitePrefecture: true,
        recruitmentType: true,
      },
    });

    // 0件なら何もしない
    if (projects.length === 0) {
      console.log('No new projects in the past 7 days, skipping digest');
      return NextResponse.json({
        success: true,
        projectCount: 0,
        notifiedCount: 0,
        message: 'No new projects to notify',
      });
    }

    // アクティブな会員を取得
    const members = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        lineUserId: true,
      },
    });

    if (members.length === 0) {
      console.log('No active members to notify');
      return NextResponse.json({
        success: true,
        projectCount: projects.length,
        notifiedCount: 0,
        message: 'No active members to notify',
      });
    }

    // 週次まとめメッセージを作成
    const digestMessage = createWeeklyDigestMessage(projects);

    // 100人ずつに分けて送信（LINE APIの制限）
    const chunkSize = 100;
    let notifiedCount = 0;

    for (let i = 0; i < members.length; i += chunkSize) {
      const chunk = members.slice(i, i + chunkSize);
      const userIds = chunk.map((m) => m.lineUserId);
      await multicastMessage(userIds, [digestMessage]);
      notifiedCount += userIds.length;
    }

    console.log(`Weekly digest sent: ${projects.length} projects to ${notifiedCount} members`);

    return NextResponse.json({
      success: true,
      projectCount: projects.length,
      notifiedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send weekly digest:', error);
    return NextResponse.json(
      { error: '週次配信の送信に失敗しました' },
      { status: 500 }
    );
  }
}

// GETも許可（デバッグ用/手動実行用）
export async function GET(request: NextRequest) {
  return POST(request);
}
