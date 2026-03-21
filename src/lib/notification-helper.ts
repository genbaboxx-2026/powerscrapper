import prisma from './prisma';

/**
 * 指定された通知キーが有効かどうかを確認
 * @param key 通知設定のキー
 * @returns 有効な場合はtrue、無効な場合はfalse
 */
export async function isNotificationEnabled(key: string): Promise<boolean> {
  try {
    const setting = await prisma.notificationSetting.findUnique({
      where: { key },
    });
    // 設定が見つからない場合はデフォルトでtrue（有効）
    return setting ? setting.enabled : true;
  } catch (error) {
    console.error('Failed to check notification setting:', error);
    // エラー時はデフォルトでtrue（有効）
    return true;
  }
}

/**
 * 通知設定を取得（カテゴリ別にグループ化）
 */
export async function getNotificationSettings() {
  const settings = await prisma.notificationSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  const grouped = {
    A: settings.filter((s) => s.category === 'A'),
    B: settings.filter((s) => s.category === 'B'),
    C: settings.filter((s) => s.category === 'C'),
  };

  return grouped;
}

/**
 * 通知設定を更新
 */
export async function updateNotificationSetting(
  key: string,
  enabled: boolean
): Promise<boolean> {
  try {
    await prisma.notificationSetting.update({
      where: { key },
      data: { enabled },
    });
    return true;
  } catch (error) {
    console.error('Failed to update notification setting:', error);
    return false;
  }
}
