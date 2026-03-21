import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pushMessage, createSelectionNotification, createTextMessage } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/bids/[id]/select - 入札を選定（マッチング成立）
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: bidId } = await params;

    // 認証チェック
    const lineUserId = request.headers.get('x-line-userid');
    if (!lineUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 入札を取得
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        project: {
          include: {
            user: true,
          },
        },
        user: true,
        match: true,
      },
    });

    if (!bid) {
      return NextResponse.json({ error: '入札が見つかりません' }, { status: 404 });
    }

    // 案件オーナーチェック
    if (bid.project.userId !== user.id) {
      return NextResponse.json(
        { error: 'この入札を選定する権限がありません' },
        { status: 403 }
      );
    }

    // 既に選定済みかチェック
    if (bid.match) {
      return NextResponse.json(
        { error: 'この入札は既に選定されています' },
        { status: 400 }
      );
    }

    // この案件で他に選定済みの入札がないかチェック
    const existingMatch = await prisma.match.findFirst({
      where: { projectId: bid.projectId },
    });

    if (existingMatch) {
      return NextResponse.json(
        { error: 'この案件は既に他の入札者を選定しています' },
        { status: 400 }
      );
    }

    // トランザクションで選定処理
    const match = await prisma.$transaction(async (tx) => {
      // 入札ステータスを更新
      await tx.bid.update({
        where: { id: bidId },
        data: {
          status: 'selected',
          selectedAt: new Date(),
        },
      });

      // 他の入札を落選に
      await tx.bid.updateMany({
        where: {
          projectId: bid.projectId,
          id: { not: bidId },
        },
        data: {
          status: 'rejected',
        },
      });

      // 案件ステータスを更新
      await tx.project.update({
        where: { id: bid.projectId },
        data: {
          status: 'matched',
        },
      });

      // マッチを作成
      const newMatch = await tx.match.create({
        data: {
          projectId: bid.projectId,
          bidId: bid.id,
          posterUserId: bid.project.userId,
          bidderUserId: bid.userId,
        },
      });

      return newMatch;
    });

    // LINE通知を送信
    try {
      // B-2: 入札者（選定された人）に通知
      const isBidSelectedEnabled = await isNotificationEnabled('b_bid_selected');
      if (isBidSelectedEnabled) {
        const bidderNotification = createSelectionNotification(
          bid.project.title,
          true,
          bid.projectId
        );
        await pushMessage(bid.user.lineUserId, [bidderNotification]);
      }

      // B-3: 発注者（自分）に確認メッセージ
      const isBidSelectedOwnerEnabled = await isNotificationEnabled('b_bid_selected_owner');
      if (isBidSelectedOwnerEnabled) {
        await pushMessage(user.lineUserId, [
          createTextMessage(
            `「${bid.project.title}」で${bid.user.companyName || '企業'}を選定しました。\n\n相手の連絡先がマイページで確認できます。`
          ),
        ]);
      }

      // B-4: 落選者に通知
      const isBidRejectedEnabled = await isNotificationEnabled('b_bid_rejected');
      if (isBidRejectedEnabled) {
        const rejectedBids = await prisma.bid.findMany({
          where: {
            projectId: bid.projectId,
            status: 'rejected',
          },
          include: {
            user: true,
          },
        });

        for (const rejectedBid of rejectedBids) {
          const rejectedNotification = createSelectionNotification(
            bid.project.title,
            false,
            bid.projectId
          );
          await pushMessage(rejectedBid.user.lineUserId, [rejectedNotification]);
        }
      }
    } catch (notifyError) {
      // 通知失敗はログのみ
      console.error('Failed to send selection notifications:', notifyError);
    }

    return NextResponse.json({
      success: true,
      match: {
        id: match.id,
        projectId: match.projectId,
        bidId: match.bidId,
        createdAt: match.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to select bid:', error);
    return NextResponse.json(
      { error: '選定に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bids/[id]/select - 選定対象の入札情報を取得
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: bidId } = await params;

    // 認証チェック
    const lineUserId = request.headers.get('x-line-userid');
    if (!lineUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    // 入札を取得
    const bid = await prisma.bid.findUnique({
      where: { id: bidId },
      include: {
        project: true,
        user: {
          select: {
            id: true,
            companyName: true,
            businessType: true,
            representativeName: true,
            coverageAreas: true,
            licenses: true,
            companyDescription: true,
            linePictureUrl: true,
          },
        },
        match: true,
      },
    });

    if (!bid) {
      return NextResponse.json({ error: '入札が見つかりません' }, { status: 404 });
    }

    // 案件オーナーチェック
    if (bid.project.userId !== user.id) {
      return NextResponse.json(
        { error: 'この入札を閲覧する権限がありません' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      bid: {
        id: bid.id,
        amount: bid.amount,
        message: bid.message,
        status: bid.status,
        isMatched: !!bid.match,
        createdAt: bid.createdAt,
        bidder: {
          id: bid.user.id,
          companyName: bid.user.companyName,
          businessType: bid.user.businessType,
          representativeName: bid.user.representativeName,
          coverageAreas: bid.user.coverageAreas,
          licenses: bid.user.licenses,
          companyDescription: bid.user.companyDescription,
          pictureUrl: bid.user.linePictureUrl,
        },
      },
      project: {
        id: bid.project.id,
        title: bid.project.title,
        status: bid.project.status,
      },
    });
  } catch (error) {
    console.error('Failed to fetch bid:', error);
    return NextResponse.json(
      { error: '入札情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
