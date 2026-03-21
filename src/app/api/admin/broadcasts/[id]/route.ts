import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

type Params = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/broadcasts/[id] - 配信詳細取得
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: '配信が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ broadcast });
  } catch (error) {
    console.error('Get broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/broadcasts/[id] - 配信更新
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: '配信が見つかりません' }, { status: 404 });
    }

    // 既に送信済みの場合は編集不可
    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: '送信済みの配信は編集できません' },
        { status: 400 }
      );
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
      status,
    } = body;

    // ステータス遷移のバリデーション
    if (status && !['draft', 'scheduled'].includes(status)) {
      return NextResponse.json(
        { error: 'ステータスは draft または scheduled のみ指定可能です' },
        { status: 400 }
      );
    }

    // クリエイティブフォーマットは画像と詳細URL必須
    const effectiveFormat = format !== undefined ? format : broadcast.format;
    const effectiveImageUrl = imageUrl !== undefined ? imageUrl : broadcast.imageUrl;
    const effectiveFormUrl = formUrl !== undefined ? formUrl : broadcast.formUrl;
    if (effectiveFormat === 'creative') {
      if (!effectiveImageUrl) {
        return NextResponse.json(
          { error: 'クリエイティブフォーマットでは画像が必須です' },
          { status: 400 }
        );
      }
      if (!effectiveFormUrl) {
        return NextResponse.json(
          { error: 'クリエイティブフォーマットでは詳細URLが必須です' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (format !== undefined) updateData.format = format;
    if (title !== undefined) updateData.title = title;
    if (bodyText !== undefined) updateData.body = bodyText;
    if (eventDate !== undefined) updateData.eventDate = eventDate;
    if (eventVenue !== undefined) updateData.eventVenue = eventVenue;
    if (formUrl !== undefined) updateData.formUrl = formUrl;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (pdfUrl !== undefined) updateData.pdfUrl = pdfUrl;
    if (youtubeUrl !== undefined) updateData.youtubeUrl = youtubeUrl;
    if (scheduledAt !== undefined) {
      updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
      // スケジュール設定時は自動的にscheduledステータスに
      if (scheduledAt && !status) {
        updateData.status = 'scheduled';
      }
    }
    if (status !== undefined) updateData.status = status;

    const updated = await prisma.broadcast.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: '配信を更新しました',
      broadcast: updated,
    });
  } catch (error) {
    console.error('Update broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/broadcasts/[id] - 配信削除
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const broadcast = await prisma.broadcast.findUnique({
      where: { id },
    });

    if (!broadcast) {
      return NextResponse.json({ error: '配信が見つかりません' }, { status: 404 });
    }

    // 送信済みの配信は削除不可
    if (broadcast.status === 'sent') {
      return NextResponse.json(
        { error: '送信済みの配信は削除できません' },
        { status: 400 }
      );
    }

    await prisma.broadcast.delete({
      where: { id },
    });

    return NextResponse.json({ message: '配信を削除しました' });
  } catch (error) {
    console.error('Delete broadcast error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
