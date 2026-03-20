// ユーザー業種タイプ
export type BusinessType =
  | 'general_contractor'  // 元請
  | 'subcontractor'       // 協力会社
  | 'craftsman'           // 職人
  | 'waste_disposal'      // 産廃業者
  | 'equipment';          // 重機業者

// 募集タイプ
export type RecruitmentType =
  | 'subcontractor_wanted'   // 協力会社募集
  | 'craftsman_wanted'       // 職人募集
  | 'operator_wanted'        // 重機オペ募集
  | 'waste_disposal_wanted'; // 産廃処理依頼

// 構造タイプ
export type StructureType =
  | 'wood'   // 木造 W
  | 'rc'     // RC造
  | 'steel'  // S造
  | 'src'    // SRC造
  | 'other'; // その他

// 作業内容タイプ
export type WorkType =
  | 'interior_demolition'    // 内装解体
  | 'structural_demolition'  // 躯体解体
  | 'foundation_demolition'  // 基礎解体
  | 'asbestos_removal'       // アスベスト除去
  | 'waste_disposal'         // 産廃処理
  | 'site_leveling';         // 整地

// 案件ステータス
export type ProjectStatus =
  | 'pending'   // 審査待ち
  | 'approved'  // 承認済み
  | 'rejected'  // 却下
  | 'closed';   // 終了

// 入札ステータス
export type BidStatus =
  | 'submitted'  // 提出済み
  | 'selected'   // 選定
  | 'rejected';  // 非選定

// ユーザーロール
export type UserRole = 'member' | 'admin';

// 対応エリア
export const COVERAGE_AREAS = [
  '東京',
  '神奈川',
  '埼玉',
  '千葉',
  '茨城',
  '栃木',
  '群馬',
  'その他',
] as const;

// 保有資格・許可
export const LICENSES = [
  '解体工事業登録',
  '建設業許可',
  '産廃収集運搬',
] as const;

// 募集タイプのラベル
export const RECRUITMENT_TYPE_LABELS: Record<RecruitmentType, string> = {
  subcontractor_wanted: '協力会社募集',
  craftsman_wanted: '職人募集',
  operator_wanted: '重機オペ募集',
  waste_disposal_wanted: '産廃処理依頼',
};

// 構造タイプのラベル
export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  wood: '木造 W',
  rc: 'RC造',
  steel: 'S造',
  src: 'SRC造',
  other: 'その他',
};

// 作業内容のラベル
export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  interior_demolition: '内装解体',
  structural_demolition: '躯体解体',
  foundation_demolition: '基礎解体',
  asbestos_removal: 'アスベスト除去',
  waste_disposal: '産廃処理',
  site_leveling: '整地',
};

// 業種タイプのラベル
export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  general_contractor: '元請',
  subcontractor: '協力会社',
  craftsman: '職人',
  waste_disposal: '産廃業者',
  equipment: '重機業者',
};

// 相談カテゴリータイプ
export type ConsultationCategory =
  | 'announcement'  // お知らせ
  | 'question'      // 質問
  | 'request'       // 依頼
  | 'general'       // 雑談
  | 'technical'     // 技術相談
  | 'equipment'     // 設備相談
  | 'waste'         // 産廃相談
  | 'regulation'    // 法規相談
  | 'other';        // その他

// 相談カテゴリーのラベル
export const CONSULTATION_CATEGORY_LABELS: Record<ConsultationCategory, string> = {
  announcement: 'お知らせ',
  question: '質問',
  request: '依頼',
  general: '雑談',
  technical: '技術相談',
  equipment: '設備相談',
  waste: '産廃相談',
  regulation: '法規相談',
  other: 'その他',
};
