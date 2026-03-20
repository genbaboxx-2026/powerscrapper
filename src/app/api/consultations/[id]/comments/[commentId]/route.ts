import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string; commentId: string }>;
};

/**
 * PUT /api/consultations/[id]/comments/[commentId] - コメント更新
 */
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { commentId } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const comment = await prisma.consultationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません' }, { status: 404 });
    }

    // オーナーのみ編集可能
    if (comment.userId !== user.id) {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { body: commentBody } = body;

    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: 'コメント内容は必須です' },
        { status: 400 }
      );
    }

    const updatedComment = await prisma.consultationComment.update({
      where: { id: commentId },
      data: {
        body: commentBody.trim(),
      },
    });

    return NextResponse.json({
      comment: {
        id: updatedComment.id,
        body: updatedComment.body,
        updatedAt: updatedComment.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Failed to update comment:', error);
    return NextResponse.json(
      { error: 'コメントの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/consultations/[id]/comments/[commentId] - コメント削除
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { commentId } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const comment = await prisma.consultationComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: 'コメントが見つかりません' }, { status: 404 });
    }

    // オーナーのみ削除可能
    if (comment.userId !== user.id) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    await prisma.consultationComment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return NextResponse.json(
      { error: 'コメントの削除に失敗しました' },
      { status: 500 }
    );
  }
}
