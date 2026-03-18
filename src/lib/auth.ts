import { NextRequest } from 'next/server';
import prisma from './prisma';

/**
 * リクエストヘッダーからユーザーを取得
 * x-line-userid ヘッダーを使用してDBからユーザーを検索
 */
export async function getUserFromRequest(req: NextRequest) {
  const lineUserId = req.headers.get('x-line-userid');

  if (!lineUserId) {
    return null;
  }

  try {
    return await prisma.user.findUnique({
      where: { lineUserId },
    });
  } catch (error) {
    console.error('Failed to get user from request:', error);
    return null;
  }
}

/**
 * LINE User IDからユーザーを取得、なければ作成（upsert）
 */
export async function getOrCreateUser(
  lineUserId: string,
  lineDisplayName?: string,
  linePictureUrl?: string
) {
  const adminLineUserIds = (process.env.ADMIN_LINE_USER_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);

  const isAdmin = adminLineUserIds.includes(lineUserId);

  try {
    // upsertで作成または更新
    const user = await prisma.user.upsert({
      where: { lineUserId },
      update: {
        // プロフィール情報があれば更新
        ...(lineDisplayName && { lineDisplayName }),
        ...(linePictureUrl && { linePictureUrl }),
        // 再度友だちになった場合はアクティブに
        isActive: true,
        // 管理者リストに含まれていればadminに更新
        ...(isAdmin && { role: 'admin' }),
      },
      create: {
        lineUserId,
        lineDisplayName,
        linePictureUrl,
        role: isAdmin ? 'admin' : 'member',
        isActive: true,
      },
    });

    return user;
  } catch (error) {
    console.error('Failed to get or create user:', error);
    throw error;
  }
}

/**
 * ユーザーを非アクティブにする（ブロック時）
 */
export async function deactivateUser(lineUserId: string) {
  try {
    await prisma.user.update({
      where: { lineUserId },
      data: { isActive: false },
    });
  } catch (error) {
    console.error('Failed to deactivate user:', error);
  }
}

/**
 * ユーザーが管理者かどうか
 */
export function isAdmin(user: { role: string }): boolean {
  return user.role === 'admin';
}

/**
 * プロフィール登録が完了しているか
 */
export function isProfileCompleted(user: { profileCompleted: boolean }): boolean {
  return user.profileCompleted;
}
