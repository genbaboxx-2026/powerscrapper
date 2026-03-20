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
      jobTitle: user.jobTitle,
      phone: user.phone,
      email: user.email,
      address: user.address,
      websiteUrl: user.websiteUrl,
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
      representativeName,
      jobTitle,
      phone,
      email,
      address,
      websiteUrl,
      coverageAreas,
      licenses,
      companyDescription,
      lineFriendLinkConsent,
    } = body;

    // バリデーション
    if (!companyName || !representativeName || !jobTitle || !phone) {
      return NextResponse.json(
        { error: '必須項目が入力されていません' },
        { status: 400 }
      );
    }

    // LINE友だち追加リンク送付同意の確認
    if (!lineFriendLinkConsent) {
      return NextResponse.json(
        { error: 'LINE友だち追加リンク送付への同意が必要です' },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        companyName,
        representativeName,
        jobTitle,
        phone,
        email,
        address,
        websiteUrl,
        coverageAreas: coverageAreas || [],
        licenses: licenses || [],
        companyDescription,
        lineFriendLinkConsent: true,
        profileCompleted: true,
      },
    });

    return NextResponse.json({
      id: updatedUser.id,
      companyName: updatedUser.companyName,
      representativeName: updatedUser.representativeName,
      jobTitle: updatedUser.jobTitle,
      phone: updatedUser.phone,
      email: updatedUser.email,
      address: updatedUser.address,
      websiteUrl: updatedUser.websiteUrl,
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
