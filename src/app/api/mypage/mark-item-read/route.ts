import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * POST /api/mypage/mark-item-read - 個別アイテムを既読にする
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { itemType, itemId } = body;

    // バリデーション
    if (!['bid', 'project', 'consultation'].includes(itemType)) {
      return NextResponse.json(
        { error: '無効なアイテムタイプです' },
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: 'アイテムIDが必要です' },
        { status: 400 }
      );
    }

    // upsertで既読を記録
    await prisma.userItemRead.upsert({
      where: {
        userId_itemType_itemId: {
          userId: user.id,
          itemType,
          itemId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        userId: user.id,
        itemType,
        itemId,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark item read POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
