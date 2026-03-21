import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  pushMessage,
  broadcastMessage,
  createApprovalNotification,
  createRejectionNotification,
  createProjectNotification,
} from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * 管理者セッションを検証
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!session?.value;
}

/**
 * GET /api/admin/projects/[id]/review - 案件詳細取得（管理者用）
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id: projectId } = await params;

    // 管理者セッション認証
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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

    // 管理者セッション認証
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
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
        reviewedAt: new Date(),
      },
    });

    // LINE通知を送信
    try {
      if (action === 'approve') {
        // B-7: 投稿者に承認通知（Flex Message）
        const isApprovalEnabled = await isNotificationEnabled('b_project_approved');
        if (isApprovalEnabled) {
          await pushMessage(project.user.lineUserId, [
            createApprovalNotification(project.title, projectId),
          ]);
        }

        // B-10: 全会員に新着案件通知（デフォルトOFF）
        const isBroadcastEnabled = await isNotificationEnabled('b_new_project_broadcast');
        if (isBroadcastEnabled) {
          await broadcastMessage([
            createProjectNotification(
              project.title,
              project.sitePrefecture || '',
              project.periodStart || '',
              project.periodEnd || '',
              projectId,
              project.isUrgent || false,
              project.description || undefined
            ),
          ]);
        }
      } else {
        // B-8: 投稿者に却下通知（Flex Message）
        const isRejectionEnabled = await isNotificationEnabled('b_project_rejected');
        if (isRejectionEnabled) {
          const reason = rejectionReason || '詳細はお問い合わせください。';
          await pushMessage(project.user.lineUserId, [
            createRejectionNotification(project.title, reason),
          ]);
        }
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
