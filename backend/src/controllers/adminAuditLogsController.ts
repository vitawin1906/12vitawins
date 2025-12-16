import { db } from "#db/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { authMiddleware } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbacMiddleware";
import { asyncHandler } from "../middleware/errorHandler";
import {adminAuditLog} from "#db/schema";

const Query = z.object({
    adminId: z.string().uuid().optional(),
    event: z.string().optional(),
    limit: z.coerce.number().min(1).max(200).default(50),
    offset: z.coerce.number().min(0).default(0)
});

export const adminAuditLogsController = {
    list: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req, res) => {
            const q = Query.parse(req.query);

            const where = [];
            if (q.adminId) where.push(eq(adminAuditLog.id, q.adminId));
            if (q.event) where.push(eq(adminAuditLog.action, q.event));

            const rows = await db
                .select()
                .from(adminAuditLog)
                .where(where.length ? and(...where) : undefined)
                .orderBy(desc(adminAuditLog.createdAt))
                .limit(q.limit)
                .offset(q.offset);

            res.json({ success: true, logs: rows });
        })
    ]
};
