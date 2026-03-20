import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/members - 会員一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const businessType = searchParams.get('businessType');
    const area = searchParams.get('area');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {
      profileCompleted: true,
      isActive: true,
    };

    if (businessType) {
      where.businessType = businessType;
    }

    if (area) {
      where.coverageAreas = {
        has: area,
      };
    }

    const [members, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          companyName: true,
          businessType: true,
          coverageAreas: true,
          licenses: true,
          companyDescription: true,
          linePictureUrl: true,
          // プライバシー保護のため以下は含めない
          // phone, email, address, representativeName
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      members: members.map((m) => ({
        id: m.id,
        companyName: m.companyName,
        businessType: m.businessType,
        coverageAreas: m.coverageAreas,
        licenses: m.licenses,
        companyDescription: m.companyDescription,
        pictureUrl: m.linePictureUrl,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: '会員一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
