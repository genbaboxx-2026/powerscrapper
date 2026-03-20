import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/consultations/[id]/comments - コメント投稿
 */
export async function POST(request: NextRequest, { params }: Props) {
  try {
    const { id: consultationId } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { body: commentBody } = body;

    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: 'コメント内容は必須です' },
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

    const comment = await prisma.consultationComment.create({
      data: {
        consultationId,
        userId: user.id,
        body: commentBody.trim(),
      },
      include: {
        user: {
          select: {
            id: true,
            lineDisplayName: true,
            companyName: true,
            linePictureUrl: true,
          },
        },
      },
    });

    return NextResponse.json({
      comment: {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        user: {
          id: comment.user.id,
          displayName: comment.user.lineDisplayName,
          companyName: comment.user.companyName,
          pictureUrl: comment.user.linePictureUrl,
        },
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return NextResponse.json(
      { error: 'コメントの投稿に失敗しました' },
      { status: 500 }
    );
  }
}
