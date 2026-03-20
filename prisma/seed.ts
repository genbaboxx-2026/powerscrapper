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

  // テスト用の興味ありユーザーを作成
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

  // 最初の承認済み案件を取得
  const project = await prisma.project.findFirst({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
  });

  if (!project) {
    console.log('No approved project found. Please create and approve a project first.');
    return;
  }

  console.log(`Found project: ${project.title}`);

  // 入札を作成
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
  ];

  for (let i = 0; i < createdBidders.length; i++) {
    const bidder = createdBidders[i];
    const bidData = bidMessages[i];

    // 案件オーナー自身には入札させない
    if (bidder.id === project.userId) {
      console.log(`Skipping bid from project owner: ${bidder.lineDisplayName}`);
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
      console.log(`Bid from ${bidder.lineDisplayName} already exists, skipping...`);
      continue;
    }

    const bid = await prisma.bid.create({
      data: {
        projectId: project.id,
        userId: bidder.id,
        message: bidData.message,
        amount: bidData.amount,
        status: 'submitted',
      },
    });

    console.log(`Created bid from ${bidder.lineDisplayName} (${bidder.companyName})`);
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
