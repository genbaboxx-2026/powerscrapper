import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mypage/consultations - 自分が投稿した相談一覧を取得
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

    // 自分の相談一覧を取得（最新コメント情報付き）
    const consultations = await prisma.consultation.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { comments: true },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              select: {
                representativeName: true,
                lineDisplayName: true,
                companyName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // レスポンス形式に変換
    const formattedConsultations = consultations.map((c) => {
      const latestComment = c.comments[0] || null;
      return {
        id: c.id,
        category: c.category,
        title: c.title,
        status: c.status,
        commentCount: c._count.comments,
        createdAt: c.createdAt.toISOString(),
        latestComment: latestComment
          ? {
              userName: latestComment.user.representativeName || latestComment.user.lineDisplayName || '匿名',
              companyName: latestComment.user.companyName,
              createdAt: latestComment.createdAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({ consultations: formattedConsultations });
  } catch (error) {
    console.error('Failed to fetch mypage consultations:', error);
    return NextResponse.json(
      { error: '相談一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
