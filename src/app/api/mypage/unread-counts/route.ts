import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/mypage/unread-counts - 未読件数を取得
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 自分が送った興味ありで、ステータスが変わったもの
    const bidsWithStatusChange = await prisma.bid.findMany({
      where: {
        userId: user.id,
        status: { not: 'submitted' }, // submitted以外のステータス＝変更あり
      },
      select: { id: true, updatedAt: true },
    });

    // 既読情報を取得
    const bidItemReads = await prisma.userItemRead.findMany({
      where: {
        userId: user.id,
        itemType: 'bid',
        itemId: { in: bidsWithStatusChange.map((b) => b.id) },
      },
    });
    const bidReadMap = new Map(bidItemReads.map((r) => [r.itemId, r.readAt]));

    // 未読のbidをカウント（ステータス変更後に閲覧していないもの）
    const unreadBidUpdates = bidsWithStatusChange.filter((bid) => {
      const readAt = bidReadMap.get(bid.id);
      return !readAt || bid.updatedAt > readAt;
    }).length;

    // TODO: consultationsとprojectsも同様に個別既読管理に移行
    // 現時点では0を返す
    return NextResponse.json({
      consultations: 0,
      projects: 0,
      bids: unreadBidUpdates,
    });
  } catch (error) {
    console.error('Unread counts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
