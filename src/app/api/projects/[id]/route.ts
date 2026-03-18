import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id] - 案件詳細取得
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: {
          select: { bids: true },
        },
        bids: {
          where: { userId: user.id },
          select: { id: true },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 公開済みの案件のみ閲覧可能（登録者自身は除く）
    if (project.status !== 'approved' && project.userId !== user.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const isOwner = project.userId === user.id;
    const hasBid = project.bids.length > 0;

    return NextResponse.json({
      id: project.id,
      title: project.title,
      recruitmentType: project.recruitmentType,
      structureType: project.structureType,
      floors: project.floors,
      totalArea: project.totalArea,
      siteAddress: isOwner ? project.siteAddress : null, // 登録者のみフル住所表示
      sitePrefecture: project.sitePrefecture,
      periodStart: project.periodStart,
      periodEnd: project.periodEnd,
      workTypes: project.workTypes,
      description: project.description,
      isUrgent: project.isUrgent,
      deadline: project.deadline,
      status: project.status,
      bidCount: project._count.bids,
      isOwner,
      hasBid,
      createdAt: project.createdAt,
    });
  } catch (error) {
    console.error('Project GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
