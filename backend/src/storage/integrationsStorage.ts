import { db } from "#db/db";
import { integrationsConfig } from "#db/schema/integrations";
import { eq, sql } from "drizzle-orm";

export const integrationsStorage = {
    /**
     * Получить значение по имени колонки
     * Пример: get("telegramBotToken")
     */
    async get(key: keyof typeof integrationsConfig["$inferSelect"]) {
        const [row] = await db.select().from(integrationsConfig).limit(1);
        if (!row) return null;
        return (row as any)[key] ?? null;
    },

    /**
     * Установить значение в конкретную колонку
     * Пример: set("telegramBotToken", "XXX")
     */
    async set(key: keyof typeof integrationsConfig["$inferInsert"], value: any) {
        const [existing] = await db.select().from(integrationsConfig).limit(1);

        if (existing) {
            const [row] = await db
                .update(integrationsConfig)
                .set({
                    [key]: value,
                    updatedAt: new Date(),
                } as any)
                .where(eq(integrationsConfig.id, existing.id))
                .returning();

            return row;
        }

        // если таблица пустая — создаём единственную строку
        const [row] = await db
            .insert(integrationsConfig)
            .values({
                [key]: value,
            } as any)
            .returning();

        return row;
    },

    async list() {
        return db.select().from(integrationsConfig);
    }
};
