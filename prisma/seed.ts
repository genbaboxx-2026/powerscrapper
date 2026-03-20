import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma';
import { config } from 'dotenv';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const { Pool } = pg;

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
  });
}

const prisma = createPrismaClient();

async function main() {
  console.log('Seeding database...');

  // テスト用の興味ありユーザーを作成（7者）
  const bidders = [
    {
      lineUserId: 'test_bidder_001',
      lineDisplayName: '田中太郎',
      companyName: '田中解体工業株式会社',
      businessType: 'subcontractor',
      representativeName: '田中太郎',
      phone: '03-1234-5678',
      email: 'tanaka@example.com',
      coverageAreas: ['東京都', '神奈川県', '埼玉県'],
      licenses: ['解体工事業登録', '建設業許可'],
      companyDescription: '創業30年の実績。安全第一をモットーに、丁寧な施工を心がけています。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_002',
      lineDisplayName: '山田花子',
      companyName: '株式会社山田建設',
      businessType: 'general_contractor',
      representativeName: '山田花子',
      phone: '03-9876-5432',
      email: 'yamada@example.com',
      coverageAreas: ['東京都', '千葉県'],
      licenses: ['解体工事業登録', '建設業許可', '産廃収集運搬'],
      companyDescription: '大規模解体から小規模解体まで幅広く対応。迅速な対応が自慢です。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_003',
      lineDisplayName: '佐藤次郎',
      companyName: '佐藤重機サービス',
      businessType: 'equipment',
      representativeName: '佐藤次郎',
      phone: '090-1111-2222',
      email: 'sato@example.com',
      coverageAreas: ['東京都', '神奈川県'],
      licenses: ['建設業許可'],
      companyDescription: '重機オペレーター歴20年。どんな現場でも対応可能です。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_004',
      lineDisplayName: '鈴木一郎',
      companyName: '鈴木産業株式会社',
      businessType: 'waste_disposal',
      representativeName: '鈴木一郎',
      phone: '03-5555-6666',
      email: 'suzuki@example.com',
      coverageAreas: ['東京都', '埼玉県', '千葉県'],
      licenses: ['産廃収集運搬', '産廃処分業'],
      companyDescription: '産業廃棄物の処理なら当社にお任せください。適正処理を徹底しています。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_005',
      lineDisplayName: '高橋美咲',
      companyName: '高橋建設工業',
      businessType: 'subcontractor',
      representativeName: '高橋美咲',
      phone: '03-7777-8888',
      email: 'takahashi@example.com',
      coverageAreas: ['神奈川県', '静岡県'],
      licenses: ['解体工事業登録', '建設業許可'],
      companyDescription: '女性経営者ならではの細やかな対応。近隣配慮も徹底しています。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_006',
      lineDisplayName: '伊藤健太',
      companyName: '伊藤解体',
      businessType: 'subcontractor',
      representativeName: '伊藤健太',
      phone: '080-3333-4444',
      email: 'ito@example.com',
      coverageAreas: ['東京都'],
      licenses: ['解体工事業登録'],
      companyDescription: '小規模解体専門。住宅解体ならお任せください。',
      profileCompleted: true,
    },
    {
      lineUserId: 'test_bidder_007',
      lineDisplayName: '渡辺大輔',
      companyName: '株式会社渡辺組',
      businessType: 'general_contractor',
      representativeName: '渡辺大輔',
      phone: '03-2222-3333',
      email: 'watanabe@example.com',
      coverageAreas: ['東京都', '神奈川県', '千葉県', '埼玉県'],
      licenses: ['解体工事業登録', '建設業許可', '産廃収集運搬', '宅建'],
      companyDescription: '総合建設会社として50年の歴史。大規模プロジェクトの実績多数。',
      profileCompleted: true,
    },
  ];

  // ユーザーを作成（既存の場合はスキップ）
  const createdBidders = [];
  for (const bidderData of bidders) {
    const existingUser = await prisma.user.findUnique({
      where: { lineUserId: bidderData.lineUserId },
    });

    if (existingUser) {
      console.log(`User ${bidderData.lineDisplayName} already exists, skipping...`);
      createdBidders.push(existingUser);
    } else {
      const user = await prisma.user.create({
        data: bidderData,
      });
      console.log(`Created user: ${user.lineDisplayName}`);
      createdBidders.push(user);
    }
  }

  // すべての承認済み案件を取得
  const projects = await prisma.project.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
  });

  if (projects.length === 0) {
    console.log('No approved project found. Please create and approve a project first.');
    return;
  }

  console.log(`Found ${projects.length} approved projects`);

  // 入札メッセージ（7件）
  const bidMessages = [
    {
      message: '御社の案件に大変興味があります。弊社は30年の実績があり、安全で確実な施工をお約束します。ぜひご検討ください。',
      amount: '2025年4月上旬',
    },
    {
      message: '迅速な対応が可能です。大規模案件の経験も豊富ですので、お任せください。お見積りは現地調査後にご提示いたします。',
      amount: '2025年4月中旬',
    },
    {
      message: '重機のオペレーターとして20年の経験があります。どのような現場でも安全に作業を進めます。よろしくお願いいたします。',
      amount: '即対応可能',
    },
    {
      message: '産廃処理の専門業者です。適正処理と迅速な対応をお約束します。マニフェスト管理も徹底しております。',
      amount: '2025年4月下旬',
    },
    {
      message: '近隣対応に自信があります。騒音・振動・粉塵対策を徹底し、クレームゼロを目指しています。',
      amount: '2025年5月上旬',
    },
    {
      message: '小規模解体のスペシャリストです。狭小地や密集地での作業経験が豊富です。お気軽にご相談ください。',
      amount: '即対応可能',
    },
    {
      message: '総合建設会社として大規模プロジェクトを多数手掛けてきました。予算・工期・品質すべてにおいてご満足いただける仕事をお約束します。',
      amount: '2025年4月〜',
    },
  ];

  // 各案件に入札を追加
  for (const project of projects) {
    console.log(`\nProcessing project: ${project.title}`);

    for (let i = 0; i < createdBidders.length; i++) {
      const bidder = createdBidders[i];
      const bidData = bidMessages[i];

      // 案件オーナー自身には入札させない
      if (bidder.id === project.userId) {
        console.log(`  Skipping bid from project owner: ${bidder.lineDisplayName}`);
        continue;
      }

      // 既存の入札をチェック
      const existingBid = await prisma.bid.findUnique({
        where: {
          projectId_userId: {
            projectId: project.id,
            userId: bidder.id,
          },
        },
      });

      if (existingBid) {
        console.log(`  Bid from ${bidder.lineDisplayName} already exists, skipping...`);
        continue;
      }

      await prisma.bid.create({
        data: {
          projectId: project.id,
          userId: bidder.id,
          message: bidData.message,
          amount: bidData.amount,
          status: 'submitted',
        },
      });

      console.log(`  Created bid from ${bidder.lineDisplayName} (${bidder.companyName})`);
    }
  }

  // 連絡済み（マッチ）を作成（4件）
  console.log('\nCreating connected matches...');

  const allBids = await prisma.bid.findMany({
    where: {
      match: null, // まだマッチがないもの
    },
    include: {
      project: true,
    },
    take: 4,
  });

  for (const bid of allBids) {
    // 入札ステータスを更新
    await prisma.bid.update({
      where: { id: bid.id },
      data: {
        status: 'connected',
        selectedAt: new Date(),
      },
    });

    // マッチを作成
    await prisma.match.create({
      data: {
        projectId: bid.projectId,
        bidId: bid.id,
        posterUserId: bid.project.userId,
        bidderUserId: bid.userId,
        posterNotified: true,
        bidderNotified: true,
      },
    });

    console.log(`  Connected bid for project: ${bid.project.title}`);
  }

  console.log(`\nCreated ${allBids.length} connected matches!`);
  console.log('\nSeeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
