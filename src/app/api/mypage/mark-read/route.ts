import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/mypage/mark-read - タブを閲覧済みにする
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type } = body;

    // typeのバリデーション
    if (!['consultations', 'projects', 'bids'].includes(type)) {
      return NextResponse.json(
        { error: '無効なタイプです' },
        { status: 400 }
      );
    }

    // upsertで最終閲覧日時を更新
    await prisma.userReadStatus.upsert({
      where: {
        userId_type: {
          userId: user.id,
          type,
        },
      },
      update: {
        lastReadAt: new Date(),
      },
      create: {
        userId: user.id,
        type,
        lastReadAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
