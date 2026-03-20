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

/**
 * PUT /api/projects/[id] - 案件更新
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // オーナーのみ編集可能
    if (project.userId !== user.id) {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      recruitmentType,
      structureType,
      floors,
      totalArea,
      siteAddress,
      periodStart,
      periodEnd,
      workTypes,
      description,
      isUrgent,
      deadline,
    } = body;

    // バリデーション
    if (
      !title ||
      !recruitmentType ||
      !structureType ||
      !siteAddress ||
      !periodStart ||
      !periodEnd ||
      !workTypes?.length ||
      !description ||
      !deadline
    ) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // 都道府県を抽出
    const prefectureMatch = siteAddress.match(/^(.{2,3}[都道府県])/);
    const sitePrefecture = prefectureMatch ? prefectureMatch[1] : null;

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        title,
        recruitmentType,
        structureType,
        floors: floors || null,
        totalArea: totalArea || null,
        siteAddress,
        sitePrefecture,
        periodStart,
        periodEnd,
        workTypes,
        description,
        isUrgent: isUrgent || false,
        deadline: new Date(deadline),
        // 編集後は再審査が必要（pending に戻す）
        status: 'pending',
        reviewedById: null,
        reviewedAt: null,
      },
    });

    return NextResponse.json({
      id: updatedProject.id,
      title: updatedProject.title,
      status: updatedProject.status,
    });
  } catch (error) {
    console.error('Project PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id] - 案件削除
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        bids: true,
        matches: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // オーナーのみ削除可能
    if (project.userId !== user.id) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    // マッチ済みの場合は削除不可
    if (project.matches.length > 0) {
      return NextResponse.json(
        { error: 'マッチング成立済みの案件は削除できません' },
        { status: 400 }
      );
    }

    // 関連する入札を削除
    await prisma.bid.deleteMany({
      where: { projectId: id },
    });

    // 案件を削除
    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Project DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/projects/[id] - 案件ステータス更新（停止など）
 */
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // オーナーのみ変更可能
    if (project.userId !== user.id) {
      return NextResponse.json({ error: '変更権限がありません' }, { status: 403 });
    }

    const body = await req.json();
    const { status } = body;

    // 許可されたステータス変更のみ
    if (status !== 'closed') {
      return NextResponse.json(
        { error: '無効なステータスです' },
        { status: 400 }
      );
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      id: updatedProject.id,
      status: updatedProject.status,
    });
  } catch (error) {
    console.error('Project PATCH error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
