import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/broadcasts - 配信一覧取得
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const broadcasts = await prisma.broadcast.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ broadcasts });
  } catch (error) {
    console.error('Get broadcasts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/broadcasts - 配信作成
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      type,
      format,
      title,
      body: bodyText,
      eventDate,
      eventVenue,
      formUrl,
      imageUrl,
      pdfUrl,
      youtubeUrl,
      scheduledAt,
      targetAudience,
    } = body;

    // バリデーション
    if (!type || !['event', 'news', 'article'].includes(type)) {
      return NextResponse.json(
        { error: 'type は event, news, article のいずれかを指定してください' },
        { status: 400 }
      );
    }

    // クリエイティブフォーマットは画像と詳細URL必須
    if (format === 'creative') {
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'クリエイティブフォーマットでは画像が必須です' },
          { status: 400 }
        );
      }
      if (!formUrl) {
        return NextResponse.json(
          { error: 'クリエイティブフォーマットでは詳細URLが必須です' },
          { status: 400 }
        );
      }
    }

    // シンプル・カードはタイトル必須
    if ((format === 'simple' || format === 'card' || !format) && !title) {
      return NextResponse.json({ error: 'タイトルは必須です' }, { status: 400 });
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        type,
        format: format || 'card',
        title,
        body: bodyText || null,
        eventDate: eventDate || null,
        eventVenue: eventVenue || null,
        formUrl: formUrl || null,
        imageUrl: imageUrl || null,
        pdfUrl: pdfUrl || null,
        youtubeUrl: youtubeUrl || null,
        targetAudience: targetAudience || 'all',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        status: scheduledAt ? 'scheduled' : 'draft',
      },
    });

    return NextResponse.json({
      message: '配信を作成しました',
      broadcast,
    });
  } catch (error) {
    console.error('Create broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
