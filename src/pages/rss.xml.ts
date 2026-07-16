import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = (await getCollection('articles', ({ data }) => !data.draft)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );
  return rss({
    title: 'NEXT Bridge コラム',
    description: '情シス運営・デバイス管理・生成AI統制の実務コラム（株式会社ネクストブリッジ）',
    site: context.site!,
    items: articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      pubDate: a.data.pubDate,
      link: `/articles/${a.id}/`,
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData:
      '<language>ja</language><atom:link href="https://nextb.net/rss.xml" rel="self" type="application/rss+xml"/>',
  });
}
