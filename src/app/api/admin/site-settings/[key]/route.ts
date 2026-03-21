import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

type Params = {
  params: Promise<{ key: string }>;
};

/**
 * 管理者セッションを検証
 */
async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  return !!session?.value;
}

// デフォルト値（SiteSettingにデータがない場合のフォールバック）
const DEFAULT_VALUES: Record<string, object> = {
  contact_info: {
    companyName: '株式会社GENBABOXX',
    personName: '担当者',
    phone: '',
    email: 'support@genbaboxx.co.jp',
    lineId: '@517yajzb',
    note: 'お気軽にご連絡ください',
    imageUrl: null,
  },
  welcome_message: {
    title: 'パワースクラッパーネットワークへようこそ！',
    body: '解体業界のコミュニティ＋マッチングプラットフォームです。まずは会社プロフィールを登録しましょう！',
    imageUrl: null,
    buttonLabel: 'プロフィールを登録',
    buttonUrl: `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID || ''}/profile/edit`,
  },
  event_fallback: {
    message: '現在予定されているイベントはありません。決まり次第お知らせします！',
    imageUrl: null,
  },
};

/**
 * GET /api/admin/site-settings/[key] - 特定の設定を取得
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { key } = await params;

    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const setting = await prisma.siteSetting.findUnique({
      where: { key },
    });

    if (setting) {
      return NextResponse.json({
        key: setting.key,
        value: JSON.parse(setting.value),
        updatedAt: setting.updatedAt,
      });
    }

    // 設定がない場合はデフォルト値を返す
    if (DEFAULT_VALUES[key]) {
      return NextResponse.json({
        key,
        value: DEFAULT_VALUES[key],
        updatedAt: null,
      });
    }

    return NextResponse.json({ error: '設定が見つかりません' }, { status: 404 });
  } catch (error) {
    console.error('Failed to fetch site setting:', error);
    return NextResponse.json(
      { error: '設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/site-settings/[key] - 設定を更新
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { key } = await params;

    const isAuthenticated = await verifyAdminSession();
    if (!isAuthenticated) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { value } = body;

    if (!value || typeof value !== 'object') {
      return NextResponse.json(
        { error: 'valueオブジェクトが必要です' },
        { status: 400 }
      );
    }

    // upsert で作成 or 更新
    const setting = await prisma.siteSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(value) },
      create: { key, value: JSON.stringify(value) },
    });

    return NextResponse.json({
      key: setting.key,
      value: JSON.parse(setting.value),
      updatedAt: setting.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update site setting:', error);
    return NextResponse.json(
      { error: '設定の更新に失敗しました' },
      { status: 500 }
    );
  }
}
