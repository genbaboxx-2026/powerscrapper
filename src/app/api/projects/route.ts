import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/auth';
import { multicastMessage, createNewProjectAdminNotification } from '@/lib/line';
import { isNotificationEnabled } from '@/lib/notification-helper';

/**
 * 住所から都道府県を抽出
 */
function extractPrefecture(address: string): string | null {
  const prefectures = [
    '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
    '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
    '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
    '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
    '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
    '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
    '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
  ];

  for (const pref of prefectures) {
    if (address.includes(pref)) {
      return pref;
    }
  }

  // 「東京」「大阪」などの省略形も対応
  const shortForms: Record<string, string> = {
    '東京': '東京都',
    '大阪': '大阪府',
    '京都': '京都府',
    '北海道': '北海道',
  };

  for (const [short, full] of Object.entries(shortForms)) {
    if (address.startsWith(short)) {
      return full;
    }
  }

  return null;
}

/**
 * GET /api/projects - 案件一覧取得
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const recruitmentType = searchParams.get('recruitmentType');
    const prefecture = searchParams.get('prefecture');
    const urgentOnly = searchParams.get('urgentOnly') === 'true';
    const excludeBidded = searchParams.get('excludeBidded') === 'true';
    const myProjects = searchParams.get('myProjects') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // 入札済み案件を除外する場合、ユーザーが入札した案件IDを取得
    let biddedProjectIds: string[] = [];
    if (excludeBidded) {
      const userBids = await prisma.bid.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });
      biddedProjectIds = userBids.map((b) => b.projectId);
    }

    const where = {
      // myProjectsの場合は自分の案件全て、それ以外は承認済みの公開案件のみ
      ...(myProjects
        ? { userId: user.id }
        : { status: 'approved', deadline: { gt: new Date() } }),
      ...(recruitmentType && { recruitmentType }),
      ...(prefecture && { sitePrefecture: prefecture }),
      ...(urgentOnly && { isUrgent: true }),
      ...(excludeBidded && biddedProjectIds.length > 0 && {
        id: { notIn: biddedProjectIds },
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: [{ isUrgent: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          _count: {
            select: { bids: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json({
      projects: projects.map((p) => ({
        id: p.id,
        title: p.title,
        recruitmentType: p.recruitmentType,
        structureType: p.structureType,
        floors: p.floors,
        totalArea: p.totalArea,
        sitePrefecture: p.sitePrefecture,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        workTypes: p.workTypes,
        isUrgent: p.isUrgent,
        deadline: p.deadline,
        bidCount: p._count.bids,
        createdAt: p.createdAt,
        isOwner: p.userId === user.id,
      })),
      total,
      page,
    });
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/projects - 案件登録
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.profileCompleted) {
      return NextResponse.json(
        { error: 'プロフィール登録が完了していません' },
        { status: 400 }
      );
    }

    const body = await req.json();

    const {
      title,
      recruitmentType,
      structureType,
      floors,
      totalArea,
      siteAddress,
      periodStart,
      periodEnd,
      workTypes,
      description,
      images,
      isUrgent,
      notifyMembers,
      deadline,
    } = body;

    // バリデーション
    const missingFields: string[] = [];
    if (!title) missingFields.push('案件名');
    if (!recruitmentType) missingFields.push('募集種別');
    if (!structureType) missingFields.push('構造種別');
    if (!siteAddress) missingFields.push('現場所在地');
    if (!periodStart) missingFields.push('工期開始');
    if (!periodEnd) missingFields.push('工期終了');
    if (!description) missingFields.push('案件詳細・条件');
    if (!deadline) missingFields.push('募集期限');

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `以下の必須項目が入力されていません：${missingFields.join('、')}` },
        { status: 400 }
      );
    }

    // 都道府県を抽出
    const sitePrefecture = extractPrefecture(siteAddress);

    const project = await prisma.project.create({
      data: {
        userId: user.id,
        title,
        recruitmentType,
        structureType,
        floors,
        totalArea,
        siteAddress,
        sitePrefecture,
        periodStart,
        periodEnd,
        workTypes,
        description,
        images: images || [],
        isUrgent: isUrgent || false,
        notifyMembers: notifyMembers !== false,
        deadline: new Date(deadline),
        status: 'pending',
      },
    });

    // B-9: 管理者に新規案件登録を通知
    try {
      const isAdminNotifyEnabled = await isNotificationEnabled('b_new_project_admin');
      if (isAdminNotifyEnabled) {
        // 管理者（role='admin'）のLINE userIdを取得
        const admins = await prisma.user.findMany({
          where: { role: 'admin', isActive: true },
          select: { lineUserId: true },
        });
        const adminLineUserIds = admins.map((a) => a.lineUserId);

        if (adminLineUserIds.length > 0) {
          await multicastMessage(adminLineUserIds, [
            createNewProjectAdminNotification(
              project.title,
              user.companyName || user.lineDisplayName || '未設定',
              project.id
            ),
          ]);
        }
      }
    } catch (notifyError) {
      console.error('Failed to send admin notification:', notifyError);
    }

    return NextResponse.json({
      id: project.id,
      title: project.title,
      status: project.status,
      message: '案件を登録しました。管理者の審査後に公開されます。',
    });
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
