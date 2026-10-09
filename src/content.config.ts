import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';
import { ARTICLE_CATEGORIES } from './data/articleCategories';

// scripts/check-og-images.mjs も同じ対象（base 配下を再帰した **/*.md）を走査する。変えるときは両方を直す
const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(ARTICLE_CATEGORIES),
    draft: z.boolean().default(false),
  }),
});

export const collections = { articles };
