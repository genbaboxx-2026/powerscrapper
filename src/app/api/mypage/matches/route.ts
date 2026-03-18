import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mypage/matches - 自分の成約一覧を取得
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

    // 自分が関わる成約を取得（発注者または入札者として）
    const matches = await prisma.match.findMany({
      where: {
        OR: [{ posterUserId: user.id }, { bidderUserId: user.id }],
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            recruitmentType: true,
            sitePrefecture: true,
            periodStart: true,
            periodEnd: true,
          },
        },
        bid: {
          select: {
            id: true,
            amount: true,
            message: true,
          },
        },
        posterUser: {
          select: {
            id: true,
            companyName: true,
            businessType: true,
            representativeName: true,
            phone: true,
            email: true,
            address: true,
            linePictureUrl: true,
          },
        },
        bidderUser: {
          select: {
            id: true,
            companyName: true,
            businessType: true,
            representativeName: true,
            phone: true,
            email: true,
            address: true,
            linePictureUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // レスポンス形式に変換
    const formattedMatches = matches.map((match) => {
      const isPoster = match.posterUserId === user.id;
      const counterpart = isPoster ? match.bidderUser : match.posterUser;

      return {
        id: match.id,
        role: isPoster ? 'poster' : 'bidder',
        project: {
          id: match.project.id,
          title: match.project.title,
          recruitmentType: match.project.recruitmentType,
          sitePrefecture: match.project.sitePrefecture,
          periodStart: match.project.periodStart,
          periodEnd: match.project.periodEnd,
        },
        bid: {
          id: match.bid.id,
          amount: match.bid.amount,
        },
        counterpart: {
          id: counterpart.id,
          companyName: counterpart.companyName,
          businessType: counterpart.businessType,
          representativeName: counterpart.representativeName,
          phone: counterpart.phone,
          email: counterpart.email,
          address: counterpart.address,
          pictureUrl: counterpart.linePictureUrl,
        },
        createdAt: match.createdAt,
      };
    });

    return NextResponse.json({ matches: formattedMatches });
  } catch (error) {
    console.error('Failed to fetch mypage matches:', error);
    return NextResponse.json(
      { error: '成約一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
