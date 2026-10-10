import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE_NAME } from '../config/site';
import { getPublishedArticles } from '../utils/articles';

export async function GET(context: APIContext) {
  const articles = await getPublishedArticles();
  const selfUrl = new URL('/rss.xml', context.site).href;
  return rss({
    title: `${SITE_NAME} コラム`,
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
      `<language>ja</language><atom:link href="${selfUrl}" rel="self" type="application/rss+xml"/>`,
  });
}
