// Shared slug utilities - can be used by both server and client components

/**
 * Creates a URL-friendly slug from a title
 */
export function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
}

/**
 * Checks if a title matches a given slug
 */
export function matchesSlug(title: string, slug: string): boolean {
  return createSlug(title) === slug
}
