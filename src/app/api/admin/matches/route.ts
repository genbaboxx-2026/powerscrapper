import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/matches - マッチング管理用データ（案件単位でグループ化）
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'all';

    // マッチングがある案件を取得
    const projectsWithMatches = await prisma.project.findMany({
      where: {
        matches: {
          some: statusFilter === 'all' ? {} : { adminStatus: statusFilter },
        },
      },
      include: {
        user: {
          select: {
            companyName: true,
          },
        },
        matches: {
          include: {
            bidderUser: {
              select: {
                companyName: true,
                representativeName: true,
                coverageAreas: true,
                lineDisplayName: true,
                linePictureUrl: true,
              },
            },
          },
          orderBy: { contactedAt: 'desc' },
        },
        bids: {
          where: {
            match: null, // マッチングされていない興味あり
          },
          include: {
            user: {
              select: {
                companyName: true,
                representativeName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            bids: true,
            matches: true,
          },
        },
      },
      orderBy: {
        matches: {
          _count: 'desc',
        },
      },
    });

    // ステータス別の件数を取得
    const statusCounts = await prisma.match.groupBy({
      by: ['adminStatus'],
      _count: true,
    });

    const counts = {
      all: await prisma.match.count(),
      contacted: 0,
      negotiating: 0,
      closed_won: 0,
      closed_lost: 0,
    };

    statusCounts.forEach((s) => {
      if (s.adminStatus in counts) {
        counts[s.adminStatus as keyof typeof counts] = s._count;
      }
    });

    // レスポンス整形
    const projects = projectsWithMatches.map((project) => ({
      id: project.id,
      title: project.title,
      ownerCompanyName: project.user.companyName || '未設定',
      location: project.sitePrefecture || '未設定',
      totalBids: project._count.bids,
      totalMatches: project._count.matches,
      matches: project.matches.map((match) => ({
        id: match.id,
        bidder: {
          companyName: match.bidderUser.companyName || '未設定',
          representativeName: match.bidderUser.representativeName || '',
          coverageAreas: match.bidderUser.coverageAreas || [],
          lineDisplayName: match.bidderUser.lineDisplayName || '',
          linePictureUrl: match.bidderUser.linePictureUrl || null,
        },
        adminStatus: match.adminStatus,
        adminMemo: match.adminMemo,
        contactedAt: match.contactedAt,
        closedAt: match.closedAt,
      })),
      pendingBids: project.bids.map((bid) => ({
        bidderCompanyName: bid.user.companyName || '未設定',
        bidderName: bid.user.representativeName || '',
        createdAt: bid.createdAt,
      })),
    }));

    // 最新のマッチング日時でソート
    projects.sort((a, b) => {
      const aLatest = a.matches[0]?.contactedAt || new Date(0);
      const bLatest = b.matches[0]?.contactedAt || new Date(0);
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });

    return NextResponse.json({
      projects,
      counts,
    });
  } catch (error) {
    console.error('Admin matches GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
