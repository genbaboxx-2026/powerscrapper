import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/events - イベント一覧を取得
 */
export async function GET() {
  try {
    // 今後のイベントのみ取得（過去のイベントは除外）
    const events = await prisma.event.findMany({
      where: {
        eventDate: {
          gte: new Date(),
        },
      },
      orderBy: { eventDate: 'asc' },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Failed to fetch events:', error);
    return NextResponse.json(
      { error: 'イベント一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events - イベントを作成（管理者のみ）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const lineUserId = request.headers.get('x-line-userid');
    if (!lineUserId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // ユーザーを取得して管理者チェック
    const user = await prisma.user.findUnique({
      where: { lineUserId },
    });

    if (!user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 });
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディを解析
    const body = await request.json();
    const { title, description, eventDate, location, capacity, fee, registrationUrl } = body;

    if (!title || !eventDate) {
      return NextResponse.json(
        { error: 'タイトルと日時は必須です' },
        { status: 400 }
      );
    }

    // イベントを作成
    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        eventDate: new Date(eventDate),
        location: location || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
        fee: fee ? parseInt(fee, 10) : null,
        registrationUrl: registrationUrl || null,
      },
    });

    return NextResponse.json({ event });
  } catch (error) {
    console.error('Failed to create event:', error);
    return NextResponse.json(
      { error: 'イベントの作成に失敗しました' },
      { status: 500 }
    );
  }
}
