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

    // ユーザーの最終閲覧日時を取得
    const readStatuses = await prisma.userReadStatus.findMany({
      where: { userId: user.id },
    });

    const getLastReadAt = (type: string) => {
      const status = readStatuses.find((s) => s.type === type);
      return status?.lastReadAt || new Date(0); // 未設定の場合は最古の日時
    };

    const consultationsLastRead = getLastReadAt('consultations');
    const projectsLastRead = getLastReadAt('projects');
    const bidsLastRead = getLastReadAt('bids');

    // 自分の相談への新しいコメント数（自分のコメント以外）
    const unreadConsultationComments = await prisma.consultationComment.count({
      where: {
        consultation: {
          userId: user.id,
        },
        userId: { not: user.id }, // 自分のコメントは除外
        createdAt: { gt: consultationsLastRead },
      },
    });

    // 自分の案件への新しい興味あり数
    const unreadProjectBids = await prisma.bid.count({
      where: {
        project: {
          userId: user.id,
        },
        createdAt: { gt: projectsLastRead },
      },
    });

    // 自分が送った興味ありのステータス変更数
    const unreadBidUpdates = await prisma.bid.count({
      where: {
        userId: user.id,
        status: { not: 'submitted' }, // submitted以外のステータス＝変更あり
        updatedAt: { gt: bidsLastRead },
      },
    });

    return NextResponse.json({
      consultations: unreadConsultationComments,
      projects: unreadProjectBids,
      bids: unreadBidUpdates,
    });
  } catch (error) {
    console.error('Unread counts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
