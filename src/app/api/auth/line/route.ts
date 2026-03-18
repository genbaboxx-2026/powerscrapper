import { NextRequest, NextResponse } from 'next/server';
import { getProfile } from '@/lib/line';
import { getOrCreateUser } from '@/lib/auth';

/**
 * POST /api/auth/line
 * LIFF認証後のユーザー登録・友だちチェック
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, displayName, pictureUrl } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // LINE公式アカウントの友だちチェック
    // Messaging API getProfile で 404 が返る = 友だちではない
    const lineProfile = await getProfile(userId);
    const isFriend = lineProfile !== null;

    if (!isFriend) {
      // 友だちではない場合、ユーザー登録せずに返す
      return NextResponse.json({
        isFriend: false,
        user: null,
      });
    }

    // 友だちの場合、ユーザーを取得または作成
    const user = await getOrCreateUser(
      userId,
      displayName || lineProfile.displayName,
      pictureUrl || lineProfile.pictureUrl
    );

    return NextResponse.json({
      isFriend: true,
      user: {
        id: user.id,
        lineDisplayName: user.lineDisplayName,
        linePictureUrl: user.linePictureUrl,
        profileCompleted: user.profileCompleted,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    console.error('LINE auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
