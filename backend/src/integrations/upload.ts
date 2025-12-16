// src/integrations/upload.ts — server-side uploads removed
// Keeping a minimal helper for optional server-side transformations if ever needed (not used by current flows)
import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

export async function uploadBufferToCloudinary(
    buffer: Buffer,
    opts: { folder?: string; width?: number; publicId?: string } = {},
): Promise<{ public_id: string; secure_url: string }> {

    const options: UploadApiOptions = {
        folder: opts.folder ?? 'products',
        resource_type: 'image',
        ...(opts.publicId ? { public_id: opts.publicId } : {}),
        ...(opts.width
            ? { transformation: [{ width: opts.width, crop: 'scale' }] }
            : {}),
    };

    const res = await cloudinary.uploader.upload(
        `data:image/jpeg;base64,${buffer.toString('base64')}`,
        options
    );

    return {
        public_id: res.public_id,
        secure_url: res.secure_url,
    };
}
