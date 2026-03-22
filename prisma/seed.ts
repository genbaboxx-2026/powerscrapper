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

  // 既存のテストデータを削除
  console.log('Deleting existing test data...');

  // テスト入札者のIDを取得
  const testBidderIds = [
    'test_bidder_001',
    'test_bidder_002',
    'test_bidder_003',
    'test_bidder_004',
    'test_bidder_005',
    'test_bidder_006',
    'test_bidder_007',
  ];

  const testUsers = await prisma.user.findMany({
    where: { lineUserId: { in: testBidderIds } },
  });

  if (testUsers.length > 0) {
    const userIds = testUsers.map(u => u.id);

    // マッチを削除
    await prisma.match.deleteMany({
      where: { bidderUserId: { in: userIds } },
    });
    console.log('  Deleted matches');

    // 入札を削除
    await prisma.bid.deleteMany({
      where: { userId: { in: userIds } },
    });
    console.log('  Deleted bids');
  }

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

  // テスト案件を作成
  console.log('\nCreating test projects...');

  const testProjects = [
    {
      title: 'RC造5階建てビル解体工事',
      recruitmentType: 'general',
      structureType: 'rc',
      floors: '地上5階・地下1階',
      totalArea: '1,200m²',
      siteAddress: '東京都渋谷区神宮前3-15-8',
      sitePrefecture: '東京都',
      periodStart: '2026年5月上旬',
      periodEnd: '2026年8月下旬',
      workTypes: ['building_demolition', 'waste_disposal'],
      description: '渋谷区神宮前のRC造ビル解体工事です。\n\n【物件概要】\n・構造：RC造5階建て（地下1階あり）\n・延床面積：約1,200m²\n・築年数：築45年\n\n【作業条件】\n・近隣住宅あり（騒音・振動対策必須）\n・アスベスト含有建材あり（事前調査済み）\n・駐車スペース：前面道路に2台分確保可能\n\n【求める業者】\n・アスベスト除去工事の実績がある業者\n・近隣対応の経験が豊富な業者\n\nまずは現地確認をお願いいたします。',
      isUrgent: false,
      notifyMembers: true,
      deadline: new Date('2026-04-30'),
      status: 'approved',
      userId: '', // 後で設定
    },
    {
      title: '【急募】木造2階建て住宅解体',
      recruitmentType: 'general',
      structureType: 'wood',
      floors: '地上2階',
      totalArea: '95m²',
      siteAddress: '神奈川県横浜市青葉区美しが丘2-1-5',
      sitePrefecture: '神奈川県',
      periodStart: '2026年4月中旬',
      periodEnd: '2026年4月下旬',
      workTypes: ['building_demolition'],
      description: '急ぎの案件です。木造2階建て住宅の解体工事をお願いします。\n\n【物件概要】\n・構造：木造2階建て\n・延床面積：約95m²\n・築年数：築38年\n\n【作業条件】\n・隣家との距離：約1.5m\n・前面道路幅員：4m\n・重機搬入：可能（小型重機推奨）\n\n【注意事項】\n・近隣への事前挨拶は当方で実施済み\n・残置物の処分も含めてお願いします\n\n早急に対応いただける業者様を探しています。',
      isUrgent: true,
      notifyMembers: true,
      deadline: new Date('2026-04-15'),
      status: 'approved',
      userId: '',
    },
    {
      title: 'S造倉庫解体工事（延床800m²）',
      recruitmentType: 'general',
      structureType: 'steel',
      floors: '平屋',
      totalArea: '800m²',
      siteAddress: '埼玉県川口市領家5-20-3',
      sitePrefecture: '埼玉県',
      periodStart: '2026年6月上旬',
      periodEnd: '2026年7月中旬',
      workTypes: ['building_demolition', 'waste_disposal'],
      description: '埼玉県川口市のS造倉庫解体工事です。\n\n【物件概要】\n・構造：S造平屋建て倉庫\n・延床面積：約800m²\n・築年数：築30年\n・用途：元物流倉庫\n\n【作業条件】\n・敷地内に十分な作業スペースあり\n・大型車両の進入可能\n・電気・水道は解体前に撤去予定\n\n【スケジュール】\n・6月上旬：着工\n・7月中旬：完了希望\n\n経験豊富な業者様のご応募をお待ちしております。',
      isUrgent: false,
      notifyMembers: true,
      deadline: new Date('2026-05-20'),
      status: 'approved',
      userId: '',
    },
    {
      title: '内装解体工事（テナントビル3フロア）',
      recruitmentType: 'general',
      structureType: 'rc',
      floors: '3フロア',
      totalArea: '450m²',
      siteAddress: '東京都新宿区西新宿1-8-12',
      sitePrefecture: '東京都',
      periodStart: '2026年5月中旬',
      periodEnd: '2026年6月上旬',
      workTypes: ['interior_demolition'],
      description: 'テナントビルの内装解体工事です。\n\n【工事概要】\n・対象：3階〜5階（各フロア約150m²）\n・内容：内装スケルトン解体\n・ビル営業中のため夜間作業あり\n\n【作業条件】\n・作業時間：20:00〜翌6:00（応相談）\n・エレベーター使用可能\n・搬出経路：地下駐車場から\n\n【注意事項】\n・静音作業必須\n・養生徹底\n・他テナントへの配慮をお願いします\n\n夜間作業に対応可能な業者様を募集しています。',
      isUrgent: false,
      notifyMembers: true,
      deadline: new Date('2026-05-10'),
      status: 'approved',
      userId: '',
    },
    {
      title: 'SRC造マンション建替えに伴う解体工事',
      recruitmentType: 'general',
      structureType: 'src',
      floors: '地上8階・地下2階',
      totalArea: '3,500m²',
      siteAddress: '東京都世田谷区三軒茶屋2-30-15',
      sitePrefecture: '東京都',
      periodStart: '2026年7月上旬',
      periodEnd: '2026年12月下旬',
      workTypes: ['building_demolition', 'waste_disposal', 'ground_leveling'],
      description: '世田谷区三軒茶屋のSRC造マンション解体工事です。\n建替え計画に伴う既存建物の解体となります。\n\n【物件概要】\n・構造：SRC造8階建て（地下2階）\n・延床面積：約3,500m²\n・築年数：築52年\n・住戸数：24戸（全戸退去済み）\n\n【工事内容】\n・既存建物の完全解体\n・地下躯体の撤去\n・整地工事\n・産廃処理\n\n【特記事項】\n・交通量の多い通り沿い\n・周辺にマンション・店舗多数\n・アスベスト含有建材あり（レベル1〜3）\n\n大規模解体の実績がある業者様のみご応募ください。',
      isUrgent: false,
      notifyMembers: true,
      deadline: new Date('2026-06-15'),
      status: 'approved',
      userId: '',
    },
  ];

  // テストユーザーに案件を割り当てて作成
  const projectUserAssignment = [0, 1, 2, 3, 4]; // bidder index
  const createdProjects = [];

  for (let i = 0; i < testProjects.length; i++) {
    const projectData = testProjects[i];
    const assignedBidder = createdBidders[projectUserAssignment[i]];

    // 既存の案件をチェック（タイトルとユーザーIDで）
    const existingProject = await prisma.project.findFirst({
      where: {
        title: projectData.title,
        userId: assignedBidder.id,
      },
    });

    if (existingProject) {
      console.log(`  Project "${projectData.title}" already exists, skipping...`);
      createdProjects.push(existingProject);
      continue;
    }

    const project = await prisma.project.create({
      data: {
        ...projectData,
        userId: assignedBidder.id,
      },
    });
    console.log(`  Created project: ${project.title} (by ${assignedBidder.companyName})`);
    createdProjects.push(project);
  }

  // テスト相談を作成
  console.log('\nCreating test consultations...');

  const testConsultations = [
    {
      category: 'technical',
      title: 'アスベスト含有建材の調査について',
      body: '皆様、いつもお世話になっております。\n\n来月着工予定の現場で、アスベスト含有建材の事前調査を行う予定です。\n\n調査会社の選定で迷っているのですが、皆様はどのような基準で調査会社を選んでいますか？\n\n・価格重視\n・実績重視\n・対応スピード重視\n\nなど、選定のポイントがあれば教えていただけると助かります。\n\nまた、おすすめの調査会社があれば教えていただけますと幸いです。\n\nよろしくお願いいたします。',
      status: 'open',
      userId: '',
    },
    {
      category: 'equipment',
      title: '狭小地での解体に適した重機について',
      body: '狭小地での解体工事を予定しています。\n\n前面道路が約3mしかなく、通常のバックホーでは作業が難しそうです。\n\n・ミニバックホー（0.8t〜1.5t）で対応可能でしょうか？\n・手壊しメインで進めるべきでしょうか？\n・レンタル費用の相場はどのくらいでしょうか？\n\n同様の現場経験がある方、アドバイスいただけると助かります。\n\n物件情報：\n- 木造2階建て\n- 延床面積：約60m²\n- 隣家との距離：約80cm\n\nよろしくお願いいたします。',
      status: 'open',
      userId: '',
    },
    {
      category: 'waste',
      title: '混合廃棄物の処理費用が高騰している件',
      body: '最近、混合廃棄物の処理費用がかなり上がっていませんか？\n\n当社が取引している処理場では、昨年比で約20%値上げされました。\n\n皆様の地域ではいかがでしょうか？\n\n・関東圏の相場感\n・値上げへの対策\n・分別の工夫\n\nなど、情報共有いただけると助かります。\n\n当社では分別の徹底を進めていますが、なかなか混合廃棄物を減らせず苦労しています。\n\n良い方法があれば教えてください。',
      status: 'open',
      userId: '',
    },
    {
      category: 'regulation',
      title: '建設リサイクル法の届出について質問',
      body: 'いつもお世話になっております。\n\n建設リサイクル法の届出について質問させてください。\n\n延床面積80m²以上の建築物解体は届出が必要ですが、\n以下のケースはどうなりますか？\n\n1. 母屋（70m²）と離れ（30m²）が別棟の場合\n   → 合算で100m²として届出必要？\n   → それぞれ80m²未満なので不要？\n\n2. 解体と新築が別発注の場合\n   → 解体のみで80m²以上なら届出必要？\n\n行政に確認するのが確実ですが、\n皆様の経験・見解をお聞かせいただければ幸いです。\n\nよろしくお願いいたします。',
      status: 'open',
      userId: '',
    },
    {
      category: 'question',
      title: '近隣からの騒音クレーム対応について',
      body: '先日の現場で近隣住民から騒音クレームを受けました。\n\n作業時間は法定内（8:00〜17:00）でしたが、\n「うるさくて仕事にならない」と苦情が入りました。\n\n皆様はこのようなクレームにどう対応されていますか？\n\n・事前の挨拶回りの範囲\n・防音シートの種類\n・作業時間の調整\n・補償の有無\n\nなど、具体的な対策があれば教えてください。\n\n今後のために参考にさせていただきたいです。',
      status: 'open',
      userId: '',
    },
    {
      category: 'announcement',
      title: '【告知】解体業者向け安全講習会のお知らせ',
      body: '解体業者向けの安全講習会を開催いたします。\n\n【日時】2026年5月15日（金）13:00〜17:00\n【場所】東京都建設会館 3階会議室\n【参加費】無料\n【定員】50名（先着順）\n\n【内容】\n・解体工事における労災事例と対策\n・アスベスト除去作業の安全管理\n・重機作業時の安全確保\n・熱中症対策\n\n【申込方法】\n下記連絡先までお電話またはメールにてお申し込みください。\n\n皆様のご参加をお待ちしております。',
      status: 'open',
      userId: '',
    },
  ];

  // 相談をユーザーに割り当てて作成
  const consultationUserAssignment = [0, 2, 3, 4, 5, 6]; // bidder index

  for (let i = 0; i < testConsultations.length; i++) {
    const consultationData = testConsultations[i];
    const assignedBidder = createdBidders[consultationUserAssignment[i]];

    // 既存の相談をチェック
    const existingConsultation = await prisma.consultation.findFirst({
      where: {
        title: consultationData.title,
        userId: assignedBidder.id,
      },
    });

    if (existingConsultation) {
      console.log(`  Consultation "${consultationData.title}" already exists, skipping...`);
      continue;
    }

    await prisma.consultation.create({
      data: {
        ...consultationData,
        userId: assignedBidder.id,
      },
    });
    console.log(`  Created consultation: ${consultationData.title} (by ${assignedBidder.companyName})`);
  }

  // すべての案件を取得（既存 + 新規作成分）
  const projects = await prisma.project.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
  });

  console.log(`\nFound ${projects.length} approved projects for bid seeding`);

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
