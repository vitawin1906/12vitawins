// Centralized RTK Query tag names to avoid string duplication across slices
// Keep in sync with server-side invalidation strategy
export const Tags = {
  Me: 'Me',
  Mlm: 'Mlm',
  Matrix: 'Matrix',
  Users: 'Users',
  Products: 'Products',
  Orders: 'Orders',
  Settings: 'Settings',
  Media: 'Media',
  Reviews: 'Reviews',
  Categories: 'Categories',
} as const;

export type TagName = typeof Tags[keyof typeof Tags];
