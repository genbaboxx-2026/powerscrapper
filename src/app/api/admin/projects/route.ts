import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/projects - 管理者用案件一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const lineUserId = request.headers.get('x-line-userid');
    if (!lineUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーを取得して管理者チェック
    const user = await prisma.user.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    // 案件一覧を取得
    const projects = await prisma.project.findMany({
      where: {
        status,
      },
      include: {
        user: {
          select: {
            id: true,
            companyName: true,
            businessType: true,
            lineDisplayName: true,
          },
        },
        _count: {
          select: {
            bids: true,
          },
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
      createdAt: project.createdAt,
      owner: {
        id: project.user.id,
        companyName: project.user.companyName,
        businessType: project.user.businessType,
        displayName: project.user.lineDisplayName,
      },
    }));

    return NextResponse.json({ projects: formattedProjects });
  } catch (error) {
    console.error('Failed to fetch admin projects:', error);
    return NextResponse.json(
      { error: '案件一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
