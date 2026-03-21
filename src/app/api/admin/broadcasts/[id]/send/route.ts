import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { broadcastMessage, createBroadcastFlexMessage } from '@/lib/line';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/admin/broadcasts/[id]/send - 配信を即時送信
 */
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: '配信が見つかりません' }, { status: 404 });
    }

    // 既に送信済みの場合
    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: 'この配信は既に送信済みです' },
        { status: 400 }
      );
    }

    // アクティブな会員数を取得
    const memberCount = await prisma.user.count({
      where: { isActive: true },
    });

    // Flex Messageを作成
    const messages = createBroadcastFlexMessage({
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
    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount: memberCount,
      },
    });

    return NextResponse.json({
      message: '配信を送信しました',
      broadcast: updated,
      sentCount: memberCount,
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
