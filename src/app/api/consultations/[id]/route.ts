import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/consultations/[id] - 相談詳細取得
 */
export async function GET(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            lineDisplayName: true,
            companyName: true,
            linePictureUrl: true,
          },
        },
        comments: {
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
          orderBy: { createdAt: 'asc' },
        },
        reactions: true,
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: '相談が見つかりません' }, { status: 404 });
    }

    // リアクション数を集計
    const likeCount = consultation.reactions.filter((r) => r.type === 'like').length;
    const goodCount = consultation.reactions.filter((r) => r.type === 'good').length;
    const userLiked = consultation.reactions.some((r) => r.userId === user.id && r.type === 'like');
    const userGooded = consultation.reactions.some((r) => r.userId === user.id && r.type === 'good');

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        category: consultation.category,
        title: consultation.title,
        body: consultation.body,
        images: consultation.images || [],
        status: consultation.status,
        createdAt: consultation.createdAt.toISOString(),
        user: {
          id: consultation.user.id,
          displayName: consultation.user.lineDisplayName,
          companyName: consultation.user.companyName,
          pictureUrl: consultation.user.linePictureUrl,
        },
        isOwner: consultation.userId === user.id,
        likeCount,
        goodCount,
        userLiked,
        userGooded,
        comments: consultation.comments.map((c) => ({
          id: c.id,
          body: c.body,
          createdAt: c.createdAt.toISOString(),
          user: {
            id: c.user.id,
            displayName: c.user.lineDisplayName,
            companyName: c.user.companyName,
            pictureUrl: c.user.linePictureUrl,
          },
          isOwner: c.userId === user.id,
        })),
      },
    });
  } catch (error) {
    console.error('Failed to fetch consultation:', error);
    return NextResponse.json(
      { error: '相談の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/consultations/[id] - 相談更新
 */
export async function PUT(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id },
    });

    if (!consultation) {
      return NextResponse.json({ error: '相談が見つかりません' }, { status: 404 });
    }

    // オーナーのみ編集可能
    if (consultation.userId !== user.id) {
      return NextResponse.json({ error: '編集権限がありません' }, { status: 403 });
    }

    const body = await request.json();
    const { category, title, body: consultationBody, images } = body;

    if (!category || !title?.trim() || !consultationBody?.trim()) {
      return NextResponse.json(
        { error: '全ての項目を入力してください' },
        { status: 400 }
      );
    }

    // 画像は最大3枚
    const validImages = Array.isArray(images) ? images.slice(0, 3) : [];

    const updatedConsultation = await prisma.consultation.update({
      where: { id },
      data: {
        category,
        title: title.trim(),
        body: consultationBody.trim(),
        images: validImages,
      },
    });

    return NextResponse.json({
      consultation: {
        id: updatedConsultation.id,
        category: updatedConsultation.category,
        title: updatedConsultation.title,
        body: updatedConsultation.body,
        images: updatedConsultation.images,
        status: updatedConsultation.status,
      },
    });
  } catch (error) {
    console.error('Failed to update consultation:', error);
    return NextResponse.json(
      { error: '相談の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/consultations/[id] - 相談削除
 */
export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    const { id } = await params;
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const consultation = await prisma.consultation.findUnique({
      where: { id },
    });

    if (!consultation) {
      return NextResponse.json({ error: '相談が見つかりません' }, { status: 404 });
    }

    // オーナーのみ削除可能
    if (consultation.userId !== user.id) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 });
    }

    // コメントも一緒に削除
    await prisma.consultationComment.deleteMany({
      where: { consultationId: id },
    });

    await prisma.consultation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete consultation:', error);
    return NextResponse.json(
      { error: '相談の削除に失敗しました' },
      { status: 500 }
    );
  }
}
