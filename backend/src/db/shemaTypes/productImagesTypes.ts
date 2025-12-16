import { z } from "zod";

// mediaId = Cloudinary public_id (строка, не URL и не UUID)
const mediaIdRegex = /^[a-zA-Z0-9\/_-]+$/;
export const MediaId = z
  .string()
  .min(1)
  .max(500)
  .regex(mediaIdRegex, { message: "Invalid mediaId format" });

export const ProductImageRole = z.enum(["main", "gallery"]);

const CloudinaryHttpsUrl = z
  .string()
  .url()
  .superRefine((value, ctx) => {
      try {
          const u = new URL(value);
          if (u.protocol !== 'https:') {
              ctx.addIssue({ code: 'custom', message: 'URL must be HTTPS' });
          }
          if (u.hostname !== 'res.cloudinary.com') {
              ctx.addIssue({ code: 'custom', message: 'URL host must be res.cloudinary.com' });
          }
      } catch {
          ctx.addIssue({ code: 'custom', message: 'Invalid URL' });
      }
  });

export const ProductImage = z.object({
    mediaId: MediaId,              // Cloudinary public_id
    url: CloudinaryHttpsUrl,       // Полный secure_url
    role: ProductImageRole,
    alt: z.string().max(300).optional().nullable(),
    sortOrder: z.number().int().min(0),
});

export const ProductImagesNonEmpty = z.array(ProductImage).nonempty().superRefine((arr, ctx) => {
    const ids = new Set<string>();
    for (const it of arr) {
        if (ids.has(it.mediaId)) ctx.addIssue({ code: "custom", message: "Duplicate mediaId in images" });
        ids.add(it.mediaId);
    }

    // sortOrder must be contiguous 0..N-1
    const sorted = [...arr].sort((a, b) => a.sortOrder - b.sortOrder).map(x => x.sortOrder);
    sorted.forEach((val, i) => { if (val !== i) ctx.addIssue({ code: "custom", message: "sortOrder must be 0..N-1" }); });

    // Enforce roles count constraints
    const mainCount = arr.filter(i => i.role === 'main').length;
    const galleryCount = arr.filter(i => i.role === 'gallery').length;
    if (mainCount > 1) ctx.addIssue({ code: 'custom', message: 'Only one main image is allowed' });
    if (galleryCount > 10) ctx.addIssue({ code: 'custom', message: 'Maximum 10 gallery images are allowed' });
});