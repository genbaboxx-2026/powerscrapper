import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pushMessage, createMatchNotification } from '@/lib/line';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/bids/[id]/connect - 企業に連絡する（連絡先交換）
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
        { error: 'この入札に連絡する権限がありません' },
        { status: 403 }
      );
    }

    // 既に連絡済みかチェック
    if (bid.match) {
      return NextResponse.json(
        { error: 'この企業には既に連絡済みです' },
        { status: 400 }
      );
    }

    // トランザクションで連絡処理
    const match = await prisma.$transaction(async (tx) => {
      // 入札ステータスを更新
      await tx.bid.update({
        where: { id: bidId },
        data: {
          status: 'connected',
          selectedAt: new Date(),
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
      // Aさん（案件登録者）に相手企業の連絡先を送信
      const posterNotification = createMatchNotification(
        bid.project.title,
        bid.user.companyName || '未設定',
        bid.user.representativeName || null,
        bid.user.phone || null,
        bid.user.email || null,
        bid.user.lineDisplayName || null
      );
      await pushMessage(user.lineUserId, [posterNotification]);

      // Bさん（興味ありを送った側）に案件登録者の連絡先を送信
      const bidderNotification = createMatchNotification(
        bid.project.title,
        bid.project.user.companyName || '未設定',
        bid.project.user.representativeName || null,
        bid.project.user.phone || null,
        bid.project.user.email || null,
        bid.project.user.lineDisplayName || null
      );
      await pushMessage(bid.user.lineUserId, [bidderNotification]);

      // マッチの通知フラグを更新
      await prisma.match.update({
        where: { id: match.id },
        data: {
          posterNotified: true,
          bidderNotified: true,
        },
      });
    } catch (notifyError) {
      // 通知失敗はログのみ
      console.error('Failed to send match notifications:', notifyError);
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
    console.error('Failed to connect:', error);
    return NextResponse.json(
      { error: '連絡に失敗しました' },
      { status: 500 }
    );
  }
}
