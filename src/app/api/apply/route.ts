import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { pushMessage, createMemberApplicationNotification } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

/**
 * POST /api/apply
 * 入会申請を受け付ける
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 審査中または承認済みの場合はエラー（却下された場合は再申請可能）
    if (user.approvalStatus === 'pending' || user.approvalStatus === 'approved') {
      return NextResponse.json(
        { error: '既に申請済みです' },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      companyName,
      representativeName,
      jobTitle,
      phone,
      email,
      address,
      coverageAreas,
      licenses,
      websiteUrl,
      companyDescription,
      lineFriendLinkConsent,
      applicationNote,
      referrerName,
    } = body;

    // 必須項目チェック
    if (!companyName || !representativeName || !jobTitle || !phone || !referrerName) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      );
    }

    if (!lineFriendLinkConsent) {
      return NextResponse.json(
        { error: '情報共有に同意してください' },
        { status: 400 }
      );
    }

    // ユーザー情報を更新
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        companyName,
        representativeName,
        jobTitle,
        phone,
        email: email || null,
        address: address || null,
        coverageAreas: coverageAreas || [],
        licenses: licenses || [],
        websiteUrl: websiteUrl || null,
        companyDescription: companyDescription || null,
        lineFriendLinkConsent,
        applicationNote: applicationNote || null,
        referrerName,
        approvalStatus: 'pending',
        appliedAt: new Date(),
        profileCompleted: true,
      },
    });

    // 管理者に通知を送信
    const isNotifyEnabled = await isNotificationEnabled('b_member_application');
    if (isNotifyEnabled) {
      // 管理者を取得
      const admins = await prisma.user.findMany({
        where: { role: 'admin', isActive: true },
        select: { lineUserId: true },
      });

      const notification = createMemberApplicationNotification(
        representativeName,
        companyName,
        applicationNote,
        referrerName || null
      );

      // 各管理者に通知を送信
      for (const admin of admins) {
        try {
          await pushMessage(admin.lineUserId, [notification]);
        } catch (error) {
          console.error('Failed to send notification to admin:', admin.lineUserId, error);
        }
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
    console.error('Apply error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
