// LPサービスの要約カード情報。トップページの「支援メニュー」と
// サービスページの「サービス詳細」で共用する正本。
import { ill } from './illustrations';

export interface ServiceCardData {
  href: string;
  image: { src: string; width: number; height: number };
  title: string;
  description: string;
}

export const services: ServiceCardData[] = [
  {
    href: '/device-management/',
    image: { src: '/images/ill-devicemgmt.png', width: 609, height: 470 },
    title: 'デバイス管理導入支援',
    description: 'Intune / Entra ID でPCの管理を仕組み化。キッティングの自動化から運用の引き継ぎまで支援します。',
  },
  {
    href: '/genai-adoption/',
    image: ill.growth,
    title: '生成AI活用支援',
    description: '効果の出る業務を見極めて、試作・現場評価から全社展開まで伴走します。',
  },
  {
    href: '/genai-governance/',
    image: ill.shieldpc,
    title: '生成AI・Claude Codeの社内統制支援',
    description: 'ガイドラインと設定による強制で、生成AIを安全に使える状態を作ります。',
  },
  {
    href: '/scs/',
    image: ill.document,
    title: 'SCS評価制度対応支援',
    description: '★3・★4の要求事項と現状のギャップ分析から、規程・台帳・設定の整備、評価への準備までを支援します。',
  },
  {
    href: '/it-support/',
    image: { src: '/images/ill-support.svg', width: 354, height: 273 },
    title: '情シス伴走支援「もうひとりの情シス」',
    description: '専任の情シスがいない会社のIT業務を、月額の顧問契約でまるごと支援します。',
  },
];
