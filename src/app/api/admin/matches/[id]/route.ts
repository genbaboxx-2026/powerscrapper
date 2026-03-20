import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/admin/matches/[id] - マッチングのステータス・メモを更新
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const match = await prisma.match.findUnique({
      where: { id },
    });

    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const body = await req.json();
    const { adminStatus, adminMemo } = body;

    // 更新データを構築
    const updateData: {
      adminStatus?: string;
      adminMemo?: string | null;
      closedAt?: Date | null;
    } = {};

    if (adminStatus !== undefined) {
      const validStatuses = ['contacted', 'negotiating', 'closed_won', 'closed_lost'];
      if (!validStatuses.includes(adminStatus)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 });
      }
      updateData.adminStatus = adminStatus;

      // closedAt の自動設定
      if (adminStatus === 'closed_won' || adminStatus === 'closed_lost') {
        // 成約または不成立の場合、closedAtを現在時刻に設定
        updateData.closedAt = new Date();
      } else {
        // それ以外の場合、closedAtをnullにリセット
        updateData.closedAt = null;
      }
    }

    if (adminMemo !== undefined) {
      updateData.adminMemo = adminMemo;
    }

    const updatedMatch = await prisma.match.update({
      where: { id },
      data: updateData,
      include: {
        bidderUser: {
          select: {
            companyName: true,
            representativeName: true,
            coverageAreas: true,
            lineDisplayName: true,
            linePictureUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedMatch.id,
      bidder: {
        companyName: updatedMatch.bidderUser.companyName || '未設定',
        representativeName: updatedMatch.bidderUser.representativeName || '',
        coverageAreas: updatedMatch.bidderUser.coverageAreas || [],
        lineDisplayName: updatedMatch.bidderUser.lineDisplayName || '',
        linePictureUrl: updatedMatch.bidderUser.linePictureUrl || null,
      },
      adminStatus: updatedMatch.adminStatus,
      adminMemo: updatedMatch.adminMemo,
      contactedAt: updatedMatch.contactedAt,
      closedAt: updatedMatch.closedAt,
    });
  } catch (error) {
    console.error('Admin match PUT error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
