import { db } from "#db/db";
import { eq } from "drizzle-orm";
import {levelsMatrixVersions} from "#db/schema";

export const levelsMatrixStorage = {
    async getActive() {
        const [row] = await db
            .select()
            .from(levelsMatrixVersions)
            .where(eq(levelsMatrixVersions.isActive, true));
        return row ?? null;
    },

    async list() {
        return db.select().from(levelsMatrixVersions).orderBy(levelsMatrixVersions.createdAt);
    },

    async createNew(versionNote: string, levels: string[], fastLevels: string[]) {
        await db.update(levelsMatrixVersions)
            .set({ isActive: false });

        const [row] = await db
            .insert(levelsMatrixVersions)
            .values({ versionNote, levels, fastLevels, isActive: true })
            .returning();
        return row;
    }
};
