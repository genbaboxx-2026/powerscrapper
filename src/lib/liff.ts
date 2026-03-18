import liff from '@line/liff';

let isInitialized = false;

/**
 * LIFF初期化
 */
export async function initLiff(): Promise<void> {
  if (isInitialized) return;

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  if (!liffId) {
    throw new Error('NEXT_PUBLIC_LIFF_ID is not defined');
  }

  await liff.init({ liffId });
  isInitialized = true;
}

/**
 * ログインチェック＆自動ログイン
 */
export function ensureLoggedIn(): void {
  if (!liff.isLoggedIn()) {
    liff.login();
  }
}

/**
 * プロフィール取得
 */
export async function getProfile() {
  return liff.getProfile();
}

/**
 * ログアウト
 */
export function logout(): void {
  liff.logout();
  window.location.reload();
}

/**
 * LIFF環境かどうか
 */
export function isInClient(): boolean {
  return liff.isInClient();
}

/**
 * LINEアプリを閉じる
 */
export function closeWindow(): void {
  liff.closeWindow();
}

export { liff };
