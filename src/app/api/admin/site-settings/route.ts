import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

/**
 * 管理者セッションを検証
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!session?.value;
}

/**
 * GET /api/admin/site-settings - 全設定を取得
 */
export async function GET() {
  try {
    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const settings = await prisma.siteSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // JSONをパースして返す
    const parsed = settings.map((s) => ({
      ...s,
      value: JSON.parse(s.value),
    }));

    return NextResponse.json({ settings: parsed });
  } catch (error) {
    console.error('Failed to fetch site settings:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}
