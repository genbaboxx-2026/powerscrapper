import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAdminFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/dashboard - 管理者ダッシュボード用統計データ
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 統計データを並列で取得
    const [
      totalUsers,
      newUsersThisWeek,
      totalProjects,
      activeProjects,
      pendingProjects,
      totalBids,
      bidsThisMonth,
      totalMatches,
      closedWonMatches,
      usersWithActivity,
      recentMatches,
      recentBids,
      recentProjects,
      recentConsultations,
    ] = await Promise.all([
      // 会員数（承認済みのみ）
      prisma.user.count({ where: { isActive: true, approvalStatus: 'approved' } }),
      // 今週の新規会員（承認済みのみ）
      prisma.user.count({ where: { approvalStatus: 'approved', createdAt: { gte: oneWeekAgo } } }),
      // 案件総数
      prisma.project.count(),
      // 公開中案件
      prisma.project.count({
        where: { status: 'approved', deadline: { gt: now } },
      }),
      // 審査待ち案件
      prisma.project.count({ where: { status: 'pending' } }),
      // 興味あり総数
      prisma.bid.count(),
      // 今月の興味あり
      prisma.bid.count({ where: { createdAt: { gte: startOfMonth } } }),
      // 連絡済み総数
      prisma.match.count(),
      // 成約数
      prisma.match.count({ where: { adminStatus: 'closed_won' } }),
      // 企業別活動状況
      prisma.user.findMany({
        where: { isActive: true, profileCompleted: true, approvalStatus: 'approved' },
        select: {
          id: true,
          companyName: true,
          projects: { select: { id: true } },
          bids: { select: { id: true } },
          matchesAsPoster: { select: { id: true, adminStatus: true } },
          matchesAsBidder: { select: { id: true, adminStatus: true } },
          consultations: { select: { id: true } },
        },
      }),
      // 最近のマッチング
      prisma.match.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { title: true } },
          posterUser: { select: { companyName: true } },
          bidderUser: { select: { companyName: true } },
        },
      }),
      // 最近の興味あり
      prisma.bid.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          project: { select: { title: true } },
          user: { select: { companyName: true } },
        },
      }),
      // 最近の案件
      prisma.project.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
          user: { select: { companyName: true } },
        },
      }),
      // 最近の相談
      prisma.consultation.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: { select: { companyName: true } },
        },
      }),
    ]);

    // 企業別活動状況の整形
    const companyActivity = usersWithActivity
      .map((user) => {
        const allMatches = [...user.matchesAsPoster, ...user.matchesAsBidder];
        return {
          companyName: user.companyName || '未設定',
          projectCount: user.projects.length,
          bidReceivedCount: user.bids.length,
          matchCount: allMatches.length,
          closedWonCount: allMatches.filter((m) => m.adminStatus === 'closed_won').length,
          consultationCount: user.consultations.length,
        };
      })
      .filter((c) => c.projectCount > 0 || c.matchCount > 0 || c.consultationCount > 0)
      .sort((a, b) => b.projectCount - a.projectCount)
      .slice(0, 20);

    // 最近のアクティビティを統合
    type Activity = {
      type: 'match' | 'bid' | 'project' | 'consultation';
      description: string;
      createdAt: Date;
    };

    const activities: Activity[] = [
      ...recentMatches.map((m) => ({
        type: 'match' as const,
        description: `${m.posterUser.companyName || '不明'} → ${m.bidderUser.companyName || '不明'}（${m.project.title}）`,
        createdAt: m.createdAt,
      })),
      ...recentBids.map((b) => ({
        type: 'bid' as const,
        description: `${b.user.companyName || '不明'} が「${b.project.title}」に興味あり`,
        createdAt: b.createdAt,
      })),
      ...recentProjects
        .filter((p) => p.status === 'pending')
        .map((p) => ({
          type: 'project' as const,
          description: `${p.user.companyName || '不明'} が「${p.title}」を投稿`,
          createdAt: p.createdAt,
        })),
      ...recentConsultations.map((c) => ({
        type: 'consultation' as const,
        description: `${c.user.companyName || '不明'} が「${c.title}」を相談`,
        createdAt: c.createdAt,
      })),
    ];

    const recentActivity = activities
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 20);

    return NextResponse.json({
      stats: {
        totalUsers,
        newUsersThisWeek,
        totalProjects,
        activeProjects,
        pendingProjects,
        totalBids,
        bidsThisMonth,
        totalMatches,
        closedWonMatches,
      },
      companyActivity,
      recentActivity,
    });
  } catch (error) {
    console.error('Admin dashboard GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
