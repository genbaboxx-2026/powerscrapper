/**
 * 認証付きAPIクライアント
 * LINE User IDをヘッダーに付与してリクエストを送信
 */

type FetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

/**
 * 認証付きfetch
 */
export async function authFetch(
  url: string,
  userId: string | null,
  options: FetchOptions = {}
): Promise<Response> {
  const { method = 'GET', body, headers = {} } = options;

  const requestHeaders: Record<string, string> = {
    ...headers,
  };

  // LINE User IDをヘッダーに追加
  if (userId) {
    requestHeaders['x-line-userid'] = userId;
  }

  // POSTやPUTでbodyがある場合はContent-Typeを設定
  if (body && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * GETリクエスト
 */
export async function apiGet<T>(url: string, userId: string | null): Promise<T> {
  const res = await authFetch(url, userId);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

/**
 * POSTリクエスト
 */
export async function apiPost<T>(
  url: string,
  userId: string | null,
  body: unknown
): Promise<T> {
  const res = await authFetch(url, userId, { method: 'POST', body });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }
  return res.json();
}

/**
 * PUTリクエスト
 */
export async function apiPut<T>(
  url: string,
  userId: string | null,
  body: unknown
): Promise<T> {
  const res = await authFetch(url, userId, { method: 'PUT', body });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `API error: ${res.status}`);
  }
  return res.json();
}
