import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * 管理者セッションを検証
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!session?.value;
}

/**
 * GET /api/admin/projects - 管理者用案件一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者セッション認証
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
