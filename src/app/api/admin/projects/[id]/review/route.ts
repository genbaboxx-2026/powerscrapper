import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import {
  pushMessage,
  broadcastMessage,
  createApprovalNotificationV2,
  createRejectionNotificationV2,
  createProjectNotification,
} from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';
import { getSystemNotificationContent } from '@/lib/site-settings';

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
        // B-7: 投稿者に承認通知
        const isApprovalEnabled = await isNotificationEnabled('b_project_approved');
        if (isApprovalEnabled) {
          // 設定を取得してフォーマットに応じたメッセージを作成
          const approvalSettings = await getSystemNotificationContent('b_project_approved');
          await pushMessage(project.user.lineUserId, [
            createApprovalNotificationV2(project.title, projectId, approvalSettings),
          ]);
        }

        // B-10: 全会員に新着案件通知
        // 管理者設定がON かつ 案件登録者が「公開時にLINEで会員に通知する」をチェックしている場合のみ送信
        const isBroadcastEnabled = await isNotificationEnabled('b_new_project_broadcast');
        if (isBroadcastEnabled && project.notifyMembers) {
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
        // B-8: 投稿者に却下通知
        const isRejectionEnabled = await isNotificationEnabled('b_project_rejected');
        if (isRejectionEnabled) {
          const reason = rejectionReason || '詳細はお問い合わせください。';
          // 設定を取得してフォーマットに応じたメッセージを作成
          const rejectionSettings = await getSystemNotificationContent('b_project_rejected');
          await pushMessage(project.user.lineUserId, [
            createRejectionNotificationV2(project.title, reason, rejectionSettings),
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
