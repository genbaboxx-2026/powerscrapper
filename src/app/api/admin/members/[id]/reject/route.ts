import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { pushMessage, createMemberRejectionNotification } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

/**
 * POST /api/admin/members/[id]/reject
 * 会員申請を却下
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { rejectionReason } = body;

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.approvalStatus === 'rejected') {
      return NextResponse.json(
        { error: '既に却下済みです' },
        { status: 400 }
      );
    }

    // 却下処理
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: rejectionReason || null,
      },
    });

    // 却下通知を送信
    const isNotifyEnabled = await isNotificationEnabled('b_member_rejected');
    if (isNotifyEnabled) {
      try {
        const notification = createMemberRejectionNotification(rejectionReason || null);
        await pushMessage(user.lineUserId, [notification]);
      } catch (error) {
        console.error('Failed to send rejection notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        approvalStatus: updatedUser.approvalStatus,
      },
    });
  } catch (error) {
    console.error('Reject member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
