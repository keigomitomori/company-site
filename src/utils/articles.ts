import { getCollection, type CollectionEntry } from 'astro:content';

/** 公開コラム（draft を除く）を公開日の新しい順で返す。一覧・お知らせ・記事ページ・RSS の共通の入口 */
export const getPublishedArticles = async (): Promise<CollectionEntry<'articles'>[]> =>
  (await getCollection('articles', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
