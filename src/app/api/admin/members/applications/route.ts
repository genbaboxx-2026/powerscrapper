import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/members/applications
 * 会員申請一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';

    const applications = await prisma.user.findMany({
      where: {
        approvalStatus: status,
        isActive: true,
      },
      select: {
        id: true,
        lineUserId: true,
        lineDisplayName: true,
        linePictureUrl: true,
        companyName: true,
        representativeName: true,
        jobTitle: true,
        phone: true,
        email: true,
        address: true,
        coverageAreas: true,
        applicationNote: true,
        referrerName: true,
        approvalStatus: true,
        appliedAt: true,
        approvedAt: true,
        rejectedAt: true,
        rejectionReason: true,
        memberRank: true,
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    console.error('Get member applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
