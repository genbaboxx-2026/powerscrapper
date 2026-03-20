import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/consultations/[id]/reactions - リアクション追加/削除（トグル）
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: consultationId } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body;

    // type は "like" または "good" のみ許可
    if (!['like', 'good'].includes(type)) {
      return NextResponse.json(
        { error: '無効なリアクションタイプです' },
        { status: 400 }
      );
    }

    // 相談が存在するか確認
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
    });

    if (!consultation) {
      return NextResponse.json({ error: '相談が見つかりません' }, { status: 404 });
    }

    // 既存のリアクションをチェック
    const existingReaction = await prisma.consultationReaction.findUnique({
      where: {
        consultationId_userId_type: {
          consultationId,
          userId: user.id,
          type,
        },
      },
    });

    if (existingReaction) {
      // 既にリアクション済みなら削除（トグル）
      await prisma.consultationReaction.delete({
        where: { id: existingReaction.id },
      });

      // 現在のリアクション数を取得
      const [likeCount, goodCount] = await Promise.all([
        prisma.consultationReaction.count({
          where: { consultationId, type: 'like' },
        }),
        prisma.consultationReaction.count({
          where: { consultationId, type: 'good' },
        }),
      ]);

      return NextResponse.json({
        action: 'removed',
        type,
        likeCount,
        goodCount,
        userLiked: false,
        userGooded: type === 'good' ? false : await hasReaction(consultationId, user.id, 'good'),
      });
    } else {
      // 新規リアクション追加
      await prisma.consultationReaction.create({
        data: {
          consultationId,
          userId: user.id,
          type,
        },
      });

      // 現在のリアクション数を取得
      const [likeCount, goodCount] = await Promise.all([
        prisma.consultationReaction.count({
          where: { consultationId, type: 'like' },
        }),
        prisma.consultationReaction.count({
          where: { consultationId, type: 'good' },
        }),
      ]);

      return NextResponse.json({
        action: 'added',
        type,
        likeCount,
        goodCount,
        userLiked: type === 'like' ? true : await hasReaction(consultationId, user.id, 'like'),
        userGooded: type === 'good' ? true : await hasReaction(consultationId, user.id, 'good'),
      });
    }
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return NextResponse.json(
      { error: 'リアクションの処理に失敗しました' },
      { status: 500 }
    );
  }
}

async function hasReaction(consultationId: string, userId: string, type: string): Promise<boolean> {
  const reaction = await prisma.consultationReaction.findUnique({
    where: {
      consultationId_userId_type: {
        consultationId,
        userId,
        type,
      },
    },
  });
  return !!reaction;
}
