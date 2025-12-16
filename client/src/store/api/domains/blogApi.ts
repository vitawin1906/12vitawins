import { baseApi } from "../baseApi";

/* ======================== Types ======================== */

export interface BlogImageItem {
    mediaId: string;
    role: "main" | "gallery";
    alt?: string | null;
    sortOrder: number;
}

export interface BlogPost {
    id: string;
    title: string;
    excerpt: string;
    author: string;
    publishDate: string;
    categorySlug: string | null;
    customUrl: string;
    keywords?: string | null;
    status: "draft" | "published";
    readTime?: number | null;
    heroMediaId?: string | null;
    content?: string | null;

    images: BlogImageItem[];

    createdAt?: string;
    updatedAt?: string;
}

export interface BlogResponse {
    success: boolean;
    posts: BlogPost[];
    total?: number;
}

export interface BlogPostResponse {
    success: boolean;
    post: BlogPost;
}

export interface CreateBlogPostDto {
    title: string;
    excerpt: string;
    author: string;
    publishDate?: string | Date;
    categorySlug?: string | null;
    customUrl: string;
    keywords?: string;
    status?: "draft" | "published";
    readTime?: number;
    heroMediaId?: string | null;
    content?: string | null;

    images?: BlogImageItem[];
}

export interface UpdateBlogPostDto {
    title?: string;
    excerpt?: string;
    author?: string;
    publishDate?: string | Date;
    categorySlug?: string | null;
    customUrl?: string;
    keywords?: string;
    status?: "draft" | "published";
    readTime?: number;
    heroMediaId?: string | null;
    content?: string | null;

    images?: BlogImageItem[];
}

/* ======================== Helpers ======================== */

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizePublishDate(input?: string | Date): string | undefined {
    if (!input) return;

    if (input instanceof Date) return input.toISOString();

    if (typeof input === "string") {
        const s = input.trim();
        if (!s) return undefined;

        if (YMD_RE.test(s)) return new Date(s + "T00:00:00Z").toISOString();

        const d = new Date(s);
        if (!isNaN(d.getTime())) return d.toISOString();
    }

    return undefined;
}

function omitUndefined<T extends Record<string, any>>(obj: T): T {
    const out: any = {};
    for (const k in obj) {
        if (obj[k] !== undefined) out[k] = obj[k];
    }
    return out;
}

/* ======================== API ======================== */

export const blogApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({

        /* ---------- PUBLIC ---------- */

        getPublishedPosts: builder.query<BlogPost[], void>({
            query: () => ({ url: "/blog", method: "GET" }),
            transformResponse: (res: BlogResponse) => res.posts,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((p) => ({ type: "Blog" as const, id: p.id })),
                        { type: "Blog", id: "PUBLIC_LIST" },
                    ]
                    : [{ type: "Blog", id: "PUBLIC_LIST" }],
        }),

        getPostByUrlOrId: builder.query<BlogPost, string>({
            query: (urlOrId) => ({ url: `/blog/${urlOrId}`, method: "GET" }),
            transformResponse: (res: BlogPostResponse) => res.post,
            providesTags: (result) =>
                result ? [{ type: "Blog", id: result.id }] : [],
        }),

        /* ---------- ADMIN ---------- */

        getAllPosts: builder.query<BlogPost[], void>({
            query: () => ({ url: "/admin/blog", method: "GET" }),
            transformResponse: (res: BlogResponse) => res.posts,
            providesTags: (result) =>
                result
                    ? [
                        ...result.map((p) => ({ type: "Blog" as const, id: p.id })),
                        { type: "Blog", id: "ADMIN_LIST" },
                    ]
                    : [{ type: "Blog", id: "ADMIN_LIST" }],
        }),

        getPostById: builder.query<BlogPost, string>({
            query: (id) => ({ url: `/admin/blog/${id}`, method: "GET" }),
            transformResponse: (res: BlogPostResponse) => res.post,
            providesTags: (result) =>
                result ? [{ type: "Blog", id: result.id }] : [],
        }),

        /* ---------- MUTATIONS ---------- */

        createPost: builder.mutation<BlogPost, CreateBlogPostDto>({
            query: (data) => ({
                url: "/admin/blog",
                method: "POST",
                data: omitUndefined({
                    ...data,
                    publishDate: normalizePublishDate(data.publishDate),
                }),
            }),
            transformResponse: (res: BlogPostResponse) => res.post,
            invalidatesTags: [
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),

        updatePost: builder.mutation<
            BlogPost,
            { id: string } & UpdateBlogPostDto
        >({
            query: ({ id, ...data }) => ({
                url: `/admin/blog/${id}`,
                method: "PUT",
                data: omitUndefined({
                    ...data,
                    publishDate: normalizePublishDate(data.publishDate),
                }),
            }),
            transformResponse: (res: BlogPostResponse) => res.post,
            invalidatesTags: (result, error, { id }) => [
                { type: "Blog", id },
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),

        deletePost: builder.mutation<void, string>({
            query: (id) => ({
                url: `/admin/blog/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: (result, error, id) => [
                { type: "Blog", id },
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),

        publishPost: builder.mutation<BlogPost, string>({
            query: (id) => ({
                url: `/admin/blog/${id}/publish`,
                method: "POST",
            }),
            transformResponse: (res: BlogPostResponse) => res.post,
            invalidatesTags: (r, e, id) => [
                { type: "Blog", id },
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),

        unpublishPost: builder.mutation<BlogPost, string>({
            query: (id) => ({
                url: `/admin/blog/${id}/unpublish`,
                method: "POST",
            }),
            transformResponse: (res: BlogPostResponse) => res.post,
            invalidatesTags: (r, e, id) => [
                { type: "Blog", id },
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),

        setHeroImage: builder.mutation<
            BlogPost,
            { id: string; heroMediaId: string | null }
        >({
            query: ({ id, heroMediaId }) => ({
                url: `/admin/blog/${id}/hero-image`,
                method: "PUT",
                data: { heroMediaId },
            }),
            transformResponse: (res: BlogPostResponse) => res.post,
            invalidatesTags: (r, e, { id }) => [
                { type: "Blog", id },
                { type: "Blog", id: "ADMIN_LIST" },
                { type: "Blog", id: "PUBLIC_LIST" },
            ],
        }),
    }),
});

/* ======================== Hooks ======================== */

export const {
    useGetPublishedPostsQuery,
    useLazyGetPublishedPostsQuery,
    useGetPostByUrlOrIdQuery,
    useLazyGetPostByUrlOrIdQuery,

    useGetAllPostsQuery,
    useLazyGetAllPostsQuery,
    useGetPostByIdQuery,
    useLazyGetPostByIdQuery,

    useCreatePostMutation,
    useUpdatePostMutation,
    useDeletePostMutation,
    usePublishPostMutation,
    useUnpublishPostMutation,
    useSetHeroImageMutation,
} = blogApi;
