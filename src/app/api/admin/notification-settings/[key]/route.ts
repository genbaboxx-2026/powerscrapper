import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

type Params = {
  params: Promise<{ key: string }>;
};

/**
 * GET /api/admin/notification-settings/[key] - 特定の通知設定を取得
 */
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;

    const setting = await prisma.notificationSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json({ error: '通知設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(setting);
  } catch (error) {
    console.error('Get notification setting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/admin/notification-settings/[key] - 通知設定のON/OFFを切り替え
 */
export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { key } = await params;
    const body = await req.json();
    const { enabled } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled は boolean である必要があります' }, { status: 400 });
    }

    const setting = await prisma.notificationSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return NextResponse.json({ error: '通知設定が見つかりません' }, { status: 404 });
    }

    const updated = await prisma.notificationSetting.update({
      where: { key },
      data: { enabled },
    });

    return NextResponse.json({
      message: `通知「${updated.label}」を${enabled ? '有効' : '無効'}にしました`,
      setting: updated,
    });
  } catch (error) {
    console.error('Update notification setting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
