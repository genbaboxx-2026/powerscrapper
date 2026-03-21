import { NextRequest, NextResponse } from 'next/server';
import { getAdminFromRequest } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

// Supabaseクライアントを初期化
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials are not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * POST /api/admin/upload - ファイルをアップロード
 *
 * Content-Type: multipart/form-data
 * - file: アップロードするファイル
 * - type: image | pdf (デフォルト: image)
 */
export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const fileType = (formData.get('type') as string) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'ファイルが選択されていません' }, { status: 400 });
    }

    // ファイルサイズ制限（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      );
    }

    // ファイルタイプ検証
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const allowedPdfTypes = ['application/pdf'];

    if (fileType === 'image' && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: '画像はJPEG, PNG, GIF, WebP形式のみ対応しています' },
        { status: 400 }
      );
    }

    if (fileType === 'pdf' && !allowedPdfTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDFファイルのみ対応しています' },
        { status: 400 }
      );
    }

    // ファイル名を生成（ユニークに）
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const fileName = `${fileType}/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

    // Supabase Storageにアップロード
    const supabase = getSupabaseClient();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const { data, error } = await supabase.storage
      .from('broadcasts')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      );
    }

    // 公開URLを取得
    const { data: publicData } = supabase.storage
      .from('broadcasts')
      .getPublicUrl(data.path);

    return NextResponse.json({
      message: 'アップロードしました',
      url: publicData.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
