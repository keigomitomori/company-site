import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['生成AI統制', 'デバイス管理', 'セキュリティ', '情シス運営']),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
