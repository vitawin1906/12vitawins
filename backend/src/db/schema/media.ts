import {
    pgTable,
    uuid,
    text,
    integer,
    jsonb,
    index,
    uniqueIndex,
    check,
} from "drizzle-orm/pg-core";

import { sql } from "drizzle-orm";
import { createdAtCol, updatedAtCol } from "./_common";
import { appUser } from "./users";  // ✔ импорт безопасен — цикл не возникает

export const uploadedMedia = pgTable(
    "uploaded_media",
    {
        id: uuid("id").primaryKey().defaultRandom(),

        userId: uuid("user_id")
            .references((): any => appUser.id, { onDelete: "set null" }),

        url: text("url").notNull(),
        publicId: text("public_id"),

        format: text("format"),
        width: integer("width"),
        height: integer("height"),
        bytes: integer("bytes"),

        meta: jsonb("meta"),

        createdAt: createdAtCol(),
        updatedAt: updatedAtCol(),
    },
    (t) => ({
        ixUrl: index("ix_uploaded_media_url").on(t.url),
        ixUser: index("ix_uploaded_media_user").on(t.userId),

        uxPublicId: uniqueIndex("ux_uploaded_media_public").on(t.publicId),

        chkPositive: check(
            "chk_uploaded_media_positive",
            sql`COALESCE(${t.width}, 0) >= 0
            AND COALESCE(${t.height}, 0) >= 0
            AND COALESCE(${t.bytes}, 0) >= 0`
        ),
    }),
);

export type UploadedMedia = typeof uploadedMedia.$inferSelect;
export type NewUploadedMedia = typeof uploadedMedia.$inferInsert;
