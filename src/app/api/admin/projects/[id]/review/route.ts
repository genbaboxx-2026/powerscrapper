import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  pushMessage,
  multicastMessage,
  createTextMessage,
  createProjectNotification,
} from '@/lib/line';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/projects/[id]/review - 案件詳細取得（管理者用）
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;

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

    // 案件を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: {
            id: true,
            companyName: true,
            businessType: true,
            representativeName: true,
            phone: true,
            email: true,
            address: true,
            lineDisplayName: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ project });
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: '案件の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/projects/[id]/review - 案件を承認/却下
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;

    // 認証チェック
    const lineUserId = request.headers.get('x-line-userid');
    if (!lineUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーを取得して管理者チェック
    const admin = await prisma.user.findUnique({
      where: { lineUserId },
    });

    if (!admin) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (admin.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディを解析
    const body = await request.json();
    const { action, rejectionReason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action は approve または reject を指定してください' },
        { status: 400 }
      );
    }

    // 案件を取得
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: '案件が見つかりません' }, { status: 404 });
    }

    if (project.status !== 'pending') {
      return NextResponse.json(
        { error: 'この案件は既に審査済みです' },
        { status: 400 }
      );
    }

    // ステータスを更新
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        status: newStatus,
        rejectionReason: action === 'reject' ? rejectionReason || null : null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    // LINE通知を送信
    try {
      if (action === 'approve') {
        // 投稿者に承認通知
        await pushMessage(project.user.lineUserId, [
          createTextMessage(
            `「${project.title}」が承認され、公開されました。\n入札を待ちましょう。`
          ),
        ]);

        // 会員に新着案件通知（notifyMembersがtrueの場合）
        if (project.notifyMembers) {
          const members = await prisma.user.findMany({
            where: {
              isActive: true,
              profileCompleted: true,
              id: { not: project.userId },
            },
            select: { lineUserId: true },
          });

          if (members.length > 0) {
            const notification = createProjectNotification(
              project.title,
              project.sitePrefecture || '',
              project.periodStart,
              project.periodEnd,
              project.id,
              project.isUrgent
            );

            // 100人ずつに分けて送信（LINE APIの制限）
            const chunkSize = 100;
            for (let i = 0; i < members.length; i += chunkSize) {
              const chunk = members.slice(i, i + chunkSize);
              const userIds = chunk.map((m) => m.lineUserId);
              await multicastMessage(userIds, [notification]);
            }
          }
        }
      } else {
        // 投稿者に却下通知
        await pushMessage(project.user.lineUserId, [
          createTextMessage(
            `「${project.title}」は審査の結果、掲載を見送らせていただきました。\n${rejectionReason ? `理由: ${rejectionReason}` : '詳細はお問い合わせください。'}`
          ),
        ]);
      }
    } catch (notifyError) {
      console.error('Failed to send review notification:', notifyError);
    }

    return NextResponse.json({
      success: true,
      project: {
        id: updatedProject.id,
        status: updatedProject.status,
        reviewedAt: updatedProject.reviewedAt,
      },
    });
  } catch (error) {
    console.error('Failed to review project:', error);
    return NextResponse.json(
      { error: '審査処理に失敗しました' },
      { status: 500 }
    );
  }
}
