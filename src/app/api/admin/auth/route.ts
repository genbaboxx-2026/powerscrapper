import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/auth - 管理者ログイン
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPassword) {
      console.error('Admin credentials not configured');
      return NextResponse.json(
        { error: 'サーバー設定エラー' },
        { status: 500 }
      );
    }

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json(
        { error: 'ユーザー名またはパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // セッショントークン生成（シンプルにタイムスタンプベース）
    const sessionToken = Buffer.from(
      `admin:${Date.now()}:${Math.random().toString(36).slice(2)}`
    ).toString('base64');

    const response = NextResponse.json({ success: true });

    // HttpOnly cookieをセット（24時間有効）
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24時間
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'ログインに失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth - 管理者ログアウト
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  // cookieを削除
  response.cookies.set('admin_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });

  return response;
}
