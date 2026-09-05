import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './utils';

export type Post = CollectionEntry<'posts'>;
export type Project = CollectionEntry<'projects'>;

const isProd = import.meta.env.PROD;

/** All published posts, newest first. Drafts are excluded in production builds. */
export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection('posts', ({ data }) => (isProd ? !data.draft : true));
  return posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getRecentPosts(limit: number): Promise<Post[]> {
  return (await getPosts()).slice(0, limit);
}

/** All published projects: featured first, then by `order`, then by title. */
export async function getProjects(): Promise<Project[]> {
  const projects = await getCollection('projects', ({ data }) => (isProd ? !data.draft : true));
  return projects.sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    if (a.data.order !== b.data.order) return a.data.order - b.data.order;
    return a.data.title.localeCompare(b.data.title);
  });
}

export async function getFeaturedProjects(limit: number): Promise<Project[]> {
  const projects = await getProjects();
  const featured = projects.filter((p) => p.data.featured);
  return (featured.length > 0 ? featured : projects).slice(0, limit);
}

/** A project gets its own page only when it has body content. */
export function hasDetailPage(project: Project): boolean {
  return Boolean(project.body && project.body.trim().length > 0);
}

export interface TagInfo {
  tag: string;
  slug: string;
  count: number;
}

/** Unique tags across all posts with usage counts, most used first. */
export async function getAllTags(): Promise<TagInfo[]> {
  const posts = await getPosts();
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, slug: slugify(tag), count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export async function getPostsByTag(tagSlug: string): Promise<Post[]> {
  const posts = await getPosts();
  return posts.filter((p) => p.data.tags.some((t) => slugify(t) === tagSlug));
}

/** Previous (older) and next (newer) posts relative to the given post. */
export async function getAdjacentPosts(
  post: Post,
): Promise<{ prev: Post | null; next: Post | null }> {
  const posts = await getPosts();
  const index = posts.findIndex((p) => p.id === post.id);
  return {
    next: index > 0 ? (posts[index - 1] ?? null) : null,
    prev: index >= 0 && index < posts.length - 1 ? (posts[index + 1] ?? null) : null,
  };
}

/** All posts in the same series, oldest first (reading order). */
export async function getSeriesPosts(post: Post): Promise<Post[]> {
  if (!post.data.series) return [];
  const posts = await getPosts();
  return posts
    .filter((p) => p.data.series === post.data.series)
    .sort((a, b) => a.data.date.valueOf() - b.data.date.valueOf());
}
