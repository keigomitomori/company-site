// サービス分類（3グループ×5サービス）の正本。ヘッダー・フッター・トップ・サービス・支援事例・
// LP の誘導バナーと関連コラム・お問い合わせフォームの選択肢・コラム末尾のCTAがここから導出する。
// 並び順はこの配列の順（グループの順 → グループ内の順）がそのまま表示順になる。
import type { ArticleCategory } from './articleCategories';
import { ill, type Illustration } from './illustrations';

export const SERVICE_GROUPS = [
  { id: 'it-ops', name: '情シス業務' },
  { id: 'pc-security', name: 'PC・セキュリティ' },
  { id: 'genai', name: '生成AI' },
] as const;

export type ServiceGroupId = (typeof SERVICE_GROUPS)[number]['id'];
export type ServiceGroup = (typeof SERVICE_GROUPS)[number];

export type ServiceSlug = 'it-support' | 'device-management' | 'scs' | 'genai-adoption' | 'genai-governance';

export interface Service {
  /** LP のディレクトリ名。お問い合わせフォームの ?service= の値にも使う */
  slug: ServiceSlug;
  group: ServiceGroupId;
  /** サービス名（カード・ナビ・フォームの選択肢・構造化データ Service の name） */
  title: string;
  /** 事例タグ・表など幅の狭い箇所で使う短い名前 */
  shortTitle: string;
  href: string;
  /** カードの説明文（トップ・サービスページ） */
  description: string;
  image: Illustration;
  /** 関連コラムのカテゴリ（LP の「関連するコラム」・コラム末尾の LP への導線）。無いサービスもある */
  articleCategory?: ArticleCategory;
}

export const services: Service[] = [
  {
    slug: 'it-support',
    group: 'it-ops',
    title: '情シス伴走支援「もうひとりの情シス」',
    shortTitle: '情シス伴走支援',
    href: '/it-support/',
    description: '専任の情シスがいない会社のIT業務を、月額の顧問契約でまるごと支援します。',
    image: { src: '/images/ill-support.svg', width: 354, height: 273 },
    articleCategory: '情シス運営',
  },
  {
    slug: 'device-management',
    group: 'pc-security',
    title: 'デバイス管理導入支援',
    shortTitle: 'デバイス管理導入支援',
    href: '/device-management/',
    description: 'Intune / Entra ID でPCの管理を仕組み化。キッティングの自動化から運用の引き継ぎまで支援します。',
    image: { src: '/images/ill-devicemgmt.webp', width: 609, height: 470 },
    articleCategory: 'デバイス管理',
  },
  {
    slug: 'scs',
    group: 'pc-security',
    title: 'SCS評価制度対応支援',
    shortTitle: 'SCS評価制度対応支援',
    href: '/scs/',
    description: '★3・★4の要求事項と現状のギャップ分析から、規程・台帳・設定の整備、評価への準備までを支援します。',
    image: ill.document,
    articleCategory: 'セキュリティ',
  },
  {
    slug: 'genai-adoption',
    group: 'genai',
    title: '生成AI活用支援',
    shortTitle: '生成AI活用支援',
    href: '/genai-adoption/',
    description: '効果の出る業務を見極めて、試作・現場評価から全社展開まで伴走します。',
    image: ill.growth,
  },
  {
    slug: 'genai-governance',
    group: 'genai',
    title: '生成AI・Claude Codeの社内統制支援',
    shortTitle: '生成AI・Claude Codeの社内統制支援',
    href: '/genai-governance/',
    description: 'ガイドラインと設定による強制で、生成AIを安全に使える状態を作ります。',
    image: ill.shieldpc,
    articleCategory: '生成AI統制',
  },
];

/** slug からサービスを引く（LP の構造化データ・誘導バナー・CTA の href に使う） */
export const getService = (slug: ServiceSlug): Service => {
  const service = services.find((s) => s.slug === slug);
  if (!service) throw new Error(`services.ts に ${slug} のサービスがありません`);
  return service;
};

/** グループに属するサービス（表示順） */
export const servicesInGroup = (group: ServiceGroupId): Service[] => services.filter((s) => s.group === group);

/** グループとその所属サービスの組（表示順）。ナビ・フッター・カード一覧で使う */
export const serviceGroupsWithServices = (): { group: ServiceGroup; services: Service[] }[] =>
  SERVICE_GROUPS.map((group) => ({ group, services: servicesInGroup(group.id) }));

/** コラムのカテゴリに対応するサービス（無ければ undefined） */
export const serviceForArticleCategory = (category: ArticleCategory): Service | undefined =>
  services.find((s) => s.articleCategory === category);

/** サービスを選択済みにしたお問い合わせフォームの URL */
export const contactHref = (slug: ServiceSlug) => `/contact/?service=${slug}`;

/** 現在のパスがサービス一覧または LP か（ヘッダーで「サービス」を現在地として示す） */
export const isServicePath = (path: string) => path === '/services/' || services.some((s) => s.href === path);
