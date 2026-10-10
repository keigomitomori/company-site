// コラムのカテゴリの正本。content.config.ts の enum と ArticleLayout のカテゴリ別CTA
// （Record<ArticleCategory, ...>）がここを参照するため、追加したときに CTA の定義漏れは型エラーになる。
export const ARTICLE_CATEGORIES = ['生成AI統制', 'デバイス管理', 'セキュリティ', '情シス運営'] as const;

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];
