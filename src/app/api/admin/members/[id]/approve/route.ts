import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';
import { pushMessage, createMemberApprovalNotification } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

/**
 * POST /api/admin/members/[id]/approve
 * 会員申請を承認
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
    const body = await req.json().catch(() => ({}));
    const memberRank = body.memberRank || 'guest';

    if (memberRank !== 'guest' && memberRank !== 'member') {
      return NextResponse.json({ error: '無効なランクです' }, { status: 400 });
    }

    // ユーザーを取得
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: '既に承認済みです' },
        { status: 400 }
      );
    }

    // 承認処理
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        approvedAt: new Date(),
        memberRank,
      },
    });

    // 承認通知を送信
    const isNotifyEnabled = await isNotificationEnabled('b_member_approved');
    if (isNotifyEnabled) {
      try {
        const notification = createMemberApprovalNotification();
        await pushMessage(user.lineUserId, [notification]);
      } catch (error) {
        console.error('Failed to send approval notification:', error);
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        approvalStatus: updatedUser.approvalStatus,
        memberRank: updatedUser.memberRank,
      },
    });
  } catch (error) {
    console.error('Approve member error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
