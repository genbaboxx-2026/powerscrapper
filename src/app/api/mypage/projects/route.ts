import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mypage/projects - 自分が登録した案件一覧を取得
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

    // 自分が登録した案件を取得
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { bids: true },
        },
        matches: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // レスポンス形式に変換
    const formattedProjects = projects.map((project) => ({
      id: project.id,
      title: project.title,
      recruitmentType: project.recruitmentType,
      structureType: project.structureType,
      sitePrefecture: project.sitePrefecture,
      periodStart: project.periodStart,
      periodEnd: project.periodEnd,
      isUrgent: project.isUrgent,
      deadline: project.deadline,
      status: project.status,
      bidCount: project._count.bids,
      isMatched: project.matches.length > 0,
      createdAt: project.createdAt,
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Failed to fetch mypage projects:', error);
    return NextResponse.json(
      { error: '案件一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
