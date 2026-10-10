// 構造化データ（JSON-LD）の組み立ての正本。各ページはここの関数で作ったオブジェクトを
// <JsonLd slot="head" data={...} /> で <head> に出力する。
// 絶対URLはすべて呼び出し側から渡す site（= Astro.site）を基準に導出する。
// 書いてよいのはページ上に既にある事実だけ（料金・実績・評価などを構造化データ用に創作しない）。
import { COMPANY_NAME, LOGO_PATH, SITE_NAME } from '../config/site';

type JsonLdObject = Record<string, unknown>;

const abs = (path: string, site: URL) => new URL(path, site).href;

/** 組織を一意に指す @id（トップページの Organization と各所の参照を結ぶ） */
export const organizationId = (site: URL) => `${abs('/', site)}#organization`;

/** 参照用の最小の Organization（Article の author / publisher、Service の provider に使う） */
const organizationRef = (site: URL, { withLogo = false } = {}): JsonLdObject => ({
  '@type': 'Organization',
  name: COMPANY_NAME,
  url: abs('/', site),
  ...(withLogo ? { logo: { '@type': 'ImageObject', url: abs(LOGO_PATH, site) } } : {}),
});

/** 会社の Organization（トップページ用） */
export const organizationJsonLd = (site: URL): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': organizationId(site),
  name: COMPANY_NAME,
  alternateName: SITE_NAME,
  url: abs('/', site),
  logo: abs(LOGO_PATH, site),
  address: {
    '@type': 'PostalAddress',
    postalCode: '104-0061',
    addressRegion: '東京都',
    addressLocality: '中央区',
    streetAddress: '銀座1-12-4 N&E BLD.7階',
    addressCountry: 'JP',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    url: abs('/contact/', site),
    availableLanguage: 'ja',
  },
});

/** サイト全体の WebSite（トップページ用） */
export const webSiteJsonLd = (site: URL): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  alternateName: COMPANY_NAME,
  url: abs('/', site),
  inLanguage: 'ja',
  publisher: { '@id': organizationId(site) },
});

export interface Crumb {
  name: string;
  /** サイトルートからのパス。末尾（現在のページ）は省略できる */
  path?: string;
}

/** パンくずの BreadcrumbList。先頭のホームは自動で付ける */
export const breadcrumbJsonLd = (site: URL, crumbs: Crumb[]): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ name: 'ホーム', path: '/' }, ...crumbs].map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    ...(c.path !== undefined ? { item: abs(c.path, site) } : {}),
  })),
});

/** コラム記事の Article */
export const articleJsonLd = (
  site: URL,
  a: {
    title: string;
    description: string;
    path: string;
    image: string;
    datePublished: string;
    dateModified: string;
  },
): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: a.title,
  description: a.description,
  image: [abs(a.image, site)],
  datePublished: a.datePublished,
  dateModified: a.dateModified,
  author: organizationRef(site),
  publisher: organizationRef(site, { withLogo: true }),
  mainEntityOfPage: abs(a.path, site),
});

/** サービスLPの Service。name はサービス名、description はそのページの meta description */
export const serviceJsonLd = (
  site: URL,
  s: { name: string; description: string; path: string },
): JsonLdObject => ({
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: s.name,
  description: s.description,
  url: abs(s.path, site),
  provider: { '@id': organizationId(site), ...organizationRef(site) },
  areaServed: { '@type': 'Country', name: 'JP' },
});

/** <script type="application/ld+json"> に埋め込む文字列（</script> を閉じさせないよう < をエスケープ） */
export const serializeJsonLd = (data: JsonLdObject | JsonLdObject[]) =>
  JSON.stringify(data).replace(/</g, '\\u003c');
