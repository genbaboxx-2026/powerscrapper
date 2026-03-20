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
      },
    });

    if (!consultation) {
      return NextResponse.json({ error: '相談が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      consultation: {
        id: consultation.id,
        category: consultation.category,
        title: consultation.title,
        body: consultation.body,
        status: consultation.status,
        createdAt: consultation.createdAt.toISOString(),
        user: {
          id: consultation.user.id,
          displayName: consultation.user.lineDisplayName,
          companyName: consultation.user.companyName,
          pictureUrl: consultation.user.linePictureUrl,
        },
        isOwner: consultation.userId === user.id,
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
