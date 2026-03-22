import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { pushMessage, createBidNotificationV2 } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';
import { getSystemNotificationContent } from '@/lib/site-settings';

/**
 * POST /api/bids - 入札を作成
 */
export async function POST(request: NextRequest) {
  try {
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

    // プロフィール完了チェック
    if (!user.profileCompleted) {
      return NextResponse.json(
        { error: '入札するには会社プロフィールの登録が必要です' },
        { status: 400 }
      );
    }

    // リクエストボディを解析
    const body = await request.json();
    const { projectId, availableFrom, message } = body;

    if (!projectId || !message) {
      return NextResponse.json(
        { error: 'プロジェクトIDとメッセージは必須です' },
        { status: 400 }
      );
    }

    // プロジェクトを取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 });
    }

    // 自分の案件には入札できない
    if (project.userId === user.id) {
      return NextResponse.json(
        { error: '自分の案件には入札できません' },
        { status: 400 }
      );
    }

    // ステータスチェック（承認済みのみ入札可能）
    if (project.status !== 'approved') {
      return NextResponse.json(
        { error: 'この案件は現在入札を受け付けていません' },
        { status: 400 }
      );
    }

    // 締切チェック
    if (new Date(project.deadline) < new Date()) {
      return NextResponse.json(
        { error: 'この案件は募集期限を過ぎています' },
        { status: 400 }
      );
    }

    // 既に入札していないかチェック
    const existingBid = await prisma.bid.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });

    if (existingBid) {
      return NextResponse.json(
        { error: '既にこの案件に入札しています' },
        { status: 400 }
      );
    }

    // 入札を作成（amountカラムをavailableFromとして使用）
    const bid = await prisma.bid.create({
      data: {
        projectId,
        userId: user.id,
        amount: availableFrom || null,
        message,
        status: 'submitted',
      },
    });

    // B-1: 案件オーナーにLINE通知を送信（興味あり受信通知）
    try {
      const isBidNotifyEnabled = await isNotificationEnabled('b_bid_received');
      if (isBidNotifyEnabled) {
        // 設定を取得
        const settings = await getSystemNotificationContent('b_bid_received');
        const notification = createBidNotificationV2(
          project.title,
          user.companyName || '未設定',
          availableFrom || '',
          project.id,
          user.businessType || undefined,
          user.coverageAreas || undefined,
          user.licenses || undefined,
          message,
          availableFrom || undefined,
          settings ? {
            headingText: settings.headingText,
            supplementMessage: settings.supplementMessage,
            buttonLabel: settings.buttonLabel,
            buttonUrl: settings.buttonUrl,
          } : undefined
        );
        await pushMessage(project.user.lineUserId, [notification]);
      }
    } catch (notifyError) {
      // 通知失敗はログのみ、入札自体は成功させる
      console.error('Failed to send bid notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      bid: {
        id: bid.id,
        projectId: bid.projectId,
        status: bid.status,
        createdAt: bid.createdAt,
      },
    });
  } catch (error) {
    console.error('Failed to create bid:', error);
    return NextResponse.json(
      { error: '入札の作成に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bids - 自分の入札一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
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

    // 自分の入札一覧を取得
    const bids = await prisma.bid.findMany({
      where: { userId: user.id },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            recruitmentType: true,
            sitePrefecture: true,
            periodStart: true,
            periodEnd: true,
            status: true,
            deadline: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 既読情報を取得
    const itemReads = await prisma.userItemRead.findMany({
      where: {
        userId: user.id,
        itemType: 'bid',
        itemId: { in: bids.map((b) => b.id) },
      },
    });
    const readMap = new Map(itemReads.map((r) => [r.itemId, r.readAt]));

    // isNewフラグを追加（ステータスが変わったもので未読のもの）
    const bidsWithNew = bids.map((bid) => {
      const readAt = readMap.get(bid.id);
      // submitted以外のステータス＝返答あり、かつ未読または更新後に読んでいない
      const isNew = bid.status !== 'submitted' && (!readAt || bid.updatedAt > readAt);
      return { ...bid, isNew };
    });

    return NextResponse.json({ bids: bidsWithNew });
  } catch (error) {
    console.error('Failed to fetch bids:', error);
    return NextResponse.json(
      { error: '入札一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
