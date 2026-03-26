import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { broadcastMessage, multicastMessage, createBroadcastMessage } from '@/lib/line';

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

    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: 'この配信は既に送信済みです' },
        { status: 400 }
      );
    }

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

    const targetAudience = broadcast.targetAudience || 'all';
    let sentCount = 0;

    if (targetAudience === 'all') {
      const memberCount = await prisma.user.count({
        where: { isActive: true, approvalStatus: 'approved' },
      });
      await broadcastMessage(messages);
      sentCount = memberCount;
    } else {
      const memberRankFilter = targetAudience === 'member' ? 'member' : 'guest';
      const targetUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          approvalStatus: 'approved',
          memberRank: memberRankFilter,
        },
        select: { lineUserId: true },
      });

      if (targetUsers.length > 0) {
        const lineUserIds = targetUsers.map(u => u.lineUserId);
        const chunkSize = 500;
        for (let i = 0; i < lineUserIds.length; i += chunkSize) {
          const chunk = lineUserIds.slice(i, i + chunkSize);
          await multicastMessage(chunk, messages);
        }
      }
      sentCount = targetUsers.length;
    }

    const updated = await prisma.broadcast.update({
      where: { id },
      data: {
        status: 'sent',
        sentAt: new Date(),
        sentCount,
      },
    });

    return NextResponse.json({
      message: '配信を送信しました',
      broadcast: updated,
      sentCount,
    });
  } catch (error) {
    console.error('Send broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
