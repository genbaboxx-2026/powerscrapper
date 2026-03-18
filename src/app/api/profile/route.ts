import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/profile - プロフィール取得
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      lineDisplayName: user.lineDisplayName,
      linePictureUrl: user.linePictureUrl,
      companyName: user.companyName,
      businessType: user.businessType,
      representativeName: user.representativeName,
      phone: user.phone,
      email: user.email,
      address: user.address,
      coverageAreas: user.coverageAreas,
      licenses: user.licenses,
      companyDescription: user.companyDescription,
      lineFriendLinkConsent: user.lineFriendLinkConsent,
      profileCompleted: user.profileCompleted,
      role: user.role,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/profile - プロフィール更新
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    const {
      companyName,
      businessType,
      representativeName,
      phone,
      email,
      address,
      coverageAreas,
      licenses,
      companyDescription,
      lineFriendLinkConsent,
    } = body;

    // バリデーション
    if (!companyName || !businessType || !representativeName || !phone) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        companyName,
        businessType,
        representativeName,
        phone,
        email,
        address,
        coverageAreas: coverageAreas || [],
        licenses: licenses || [],
        companyDescription,
        lineFriendLinkConsent: lineFriendLinkConsent || false,
        profileCompleted: true,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      companyName: updatedUser.companyName,
      businessType: updatedUser.businessType,
      representativeName: updatedUser.representativeName,
      phone: updatedUser.phone,
      email: updatedUser.email,
      address: updatedUser.address,
      coverageAreas: updatedUser.coverageAreas,
      licenses: updatedUser.licenses,
      companyDescription: updatedUser.companyDescription,
      lineFriendLinkConsent: updatedUser.lineFriendLinkConsent,
      profileCompleted: updatedUser.profileCompleted,
    });
  } catch (error) {
    console.error('Profile PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
