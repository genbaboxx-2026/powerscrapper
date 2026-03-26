import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * POST /api/admin/members/[id]/rank
 * 会員ランクを変更
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
    const { memberRank } = body;

    if (memberRank !== 'guest' && memberRank !== 'member') {
      return NextResponse.json({ error: '無効なランクです' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.approvalStatus !== 'approved') {
      return NextResponse.json({ error: '承認済みユーザーのみランク変更可能です' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { memberRank },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        memberRank: updatedUser.memberRank,
      },
    });
  } catch (error) {
    console.error('Change rank error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
