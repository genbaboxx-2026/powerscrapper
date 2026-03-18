import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/bids - 案件の入札一覧を取得（オーナーのみ）
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;

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

    // プロジェクトを取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        userId: true,
        title: true,
        status: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 });
    }

    // オーナーチェック
    if (project.userId !== user.id) {
      return NextResponse.json(
        { error: 'この案件の入札一覧を閲覧する権限がありません' },
        { status: 403 }
      );
    }

    // 入札一覧を取得
    const bids = await prisma.bid.findMany({
      where: { projectId },
      include: {
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
        match: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // レスポンス形式に変換
    const formattedBids = bids.map((bid) => ({
      id: bid.id,
      amount: bid.amount,
      message: bid.message,
      status: bid.status,
      isMatched: !!bid.match,
      selectedAt: bid.selectedAt,
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
    }));

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        status: project.status,
      },
      bids: formattedBids,
    });
  } catch (error) {
    console.error('Failed to fetch bids:', error);
    return NextResponse.json(
      { error: '入札一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
