import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/consultations - 相談一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const myPosts = searchParams.get('myPosts') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};

    if (category) {
      where.category = category;
    }

    if (myPosts) {
      where.userId = user.id;
    }

    const [consultations, total] = await Promise.all([
      prisma.consultation.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              lineDisplayName: true,
              companyName: true,
              linePictureUrl: true,
              representativeName: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
          reactions: {
            where: { type: 'like' },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.consultation.count({ where }),
    ]);

    return NextResponse.json({
      consultations: consultations.map((c) => ({
        id: c.id,
        category: c.category,
        title: c.title,
        body: c.body,
        status: c.status,
        createdAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          displayName: c.user.representativeName || c.user.lineDisplayName,
          companyName: c.user.companyName,
          pictureUrl: c.user.linePictureUrl,
        },
        commentCount: c._count.comments,
        likeCount: c.reactions.length,
        isOwner: c.userId === user.id,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Failed to fetch consultations:', error);
    return NextResponse.json(
      { error: '相談一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/consultations - 相談投稿
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { category, title, body: consultationBody, images } = body;

    // バリデーション
    if (!category || !title || !consultationBody) {
      return NextResponse.json(
        { error: 'カテゴリ、タイトル、相談内容は必須です' },
        { status: 400 }
      );
    }

    const validCategories = [
      'announcement', 'question', 'request',
      'general', 'technical', 'equipment', 'waste', 'regulation', 'other'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: '無効なカテゴリです' },
        { status: 400 }
      );
    }

    // 画像は最大3枚
    const validImages = Array.isArray(images) ? images.slice(0, 3) : [];

    const consultation = await prisma.consultation.create({
      data: {
        userId: user.id,
        category,
        title,
        body: consultationBody,
        images: validImages,
      },
    });

    return NextResponse.json({ consultation }, { status: 201 });
  } catch (error) {
    console.error('Failed to create consultation:', error);
    return NextResponse.json(
      { error: '相談の投稿に失敗しました' },
      { status: 500 }
    );
  }
}
