// backend/src/storage/matrixPlacementStorage.ts
import { db } from '#db/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { matrixPlacement, type MatrixPlacement, type NewMatrixPlacement } from '#db/schema/matrixPlacement';

/**
 * ✅ C-1: Matrix Placement Storage Layer
 *
 * Централизованный storage для работы с бинарной матрицей размещения.
 * Решает проблему прямых DB queries в matrixPlacementService.
 */

export const matrixPlacementStorage = {
    /**
     * Создать запись размещения в матрице
     */
    async create(data: NewMatrixPlacement): Promise<MatrixPlacement> {
        const [placement] = await db
            .insert(matrixPlacement)
            .values(data)
            .returning();
        if (!placement) {
            throw new Error('Failed to create matrix placement');
        }
        return placement;
    },

    /**
     * Получить размещение пользователя
     */
    async getByUserId(userId: string): Promise<MatrixPlacement | null> {
        const [placement] = await db
            .select()
            .from(matrixPlacement)
            .where(eq(matrixPlacement.userId, userId))
            .limit(1);
        return placement ?? null;
    },

    /**
     * Получить размещение по parent и position
     */
    async getByParentAndPosition(
        parentId: string,
        position: 'left' | 'right'
    ): Promise<MatrixPlacement | null> {
        const [placement] = await db
            .select()
            .from(matrixPlacement)
            .where(
                and(
                    eq(matrixPlacement.parentId, parentId),
                    eq(matrixPlacement.position, position)
                )
            )
            .limit(1);
        return placement ?? null;
    },

    /**
     * Получить всех детей пользователя
     */
    async getChildren(userId: string): Promise<{ left: MatrixPlacement | null; right: MatrixPlacement | null }> {
        const children = await db
            .select()
            .from(matrixPlacement)
            .where(eq(matrixPlacement.parentId, userId));

        const left = children.find(c => c.position === 'left') ?? null;
        const right = children.find(c => c.position === 'right') ?? null;

        return { left, right };
    },

    /**
     * Обновить volume счётчики
     */
    async updateVolumes(
        userId: string,
        updates: {
            leftLegVolume?: string;
            rightLegVolume?: string;
            leftLegCount?: number;
            rightLegCount?: number;
        }
    ): Promise<void> {
        await db
            .update(matrixPlacement)
            .set({
                ...updates,
                updatedAt: new Date(),
            })
            .where(eq(matrixPlacement.userId, userId));
    },

    /**
     * Инкрементировать volume и count для ноги
     */
    async incrementLeg(
        userId: string,
        leg: 'left' | 'right',
        volumeIncrement: string,
        countIncrement: number = 1
    ): Promise<void> {
        if (leg === 'left') {
            await db
                .update(matrixPlacement)
                .set({
                    leftLegVolume: sql`COALESCE(${matrixPlacement.leftLegVolume}, '0')::numeric + ${volumeIncrement}::numeric`,
                    leftLegCount: sql`COALESCE(${matrixPlacement.leftLegCount}, 0) + ${countIncrement}`,
                    updatedAt: new Date(),
                })
                .where(eq(matrixPlacement.userId, userId));
        } else {
            await db
                .update(matrixPlacement)
                .set({
                    rightLegVolume: sql`COALESCE(${matrixPlacement.rightLegVolume}, '0')::numeric + ${volumeIncrement}::numeric`,
                    rightLegCount: sql`COALESCE(${matrixPlacement.rightLegCount}, 0) + ${countIncrement}`,
                    updatedAt: new Date(),
                })
                .where(eq(matrixPlacement.userId, userId));
        }
    },

    /**
     * Получить поддерево (downline) пользователя
     * @param userId - ID корневого пользователя
     * @param maxDepth - максимальная глубина (по умолчанию 5)
     */
    async getSubtree(userId: string, maxDepth: number = 5): Promise<MatrixPlacement[]> {
        // Рекурсивный CTE для эффективного получения поддерева
        const result = await db.execute<MatrixPlacement>(sql`
            WITH RECURSIVE subtree AS (
                -- Начальная запись
                SELECT *,  0 as depth
                FROM ${matrixPlacement}
                WHERE ${matrixPlacement.userId} = ${userId}

                UNION ALL

                -- Рекурсивно добавляем детей
                SELECT m.*, s.depth + 1
                FROM ${matrixPlacement} m
                JOIN subtree s ON m.parent_id = s.user_id
                WHERE s.depth < ${maxDepth}
            )
            SELECT * FROM subtree
            ORDER BY depth, position
        `);

        return result.rows as MatrixPlacement[];
    },

    /**
     * Получить цепочку вверх до root (upline)
     */
    async getUpline(userId: string): Promise<MatrixPlacement[]> {
        const result = await db.execute<MatrixPlacement>(sql`
            WITH RECURSIVE upline AS (
                SELECT *, 0 as level
                FROM ${matrixPlacement}
                WHERE ${matrixPlacement.userId} = ${userId}

                UNION ALL

                SELECT m.*, u.level + 1
                FROM ${matrixPlacement} m
                JOIN upline u ON m.user_id = u.parent_id
                WHERE u.level < 100 -- safety limit
            )
            SELECT * FROM upline
            ORDER BY level DESC
        `);

        return result.rows as MatrixPlacement[];
    },

    /**
     * Найти первую свободную позицию в поддереве (BFS)
     * Используется для spillover алгоритма
     */
    async findFirstAvailablePosition(rootUserId: string): Promise<{
        parentId: string;
        position: 'left' | 'right';
        level: number;
    } | null> {
        // BFS поиск через recursive CTE
        const result = await db.execute(sql`
            WITH RECURSIVE bfs AS (
                -- Начальная запись
                SELECT
                    user_id,
                    parent_id,
                    position,
                    level,
                    0 as depth
                FROM ${matrixPlacement}
                WHERE user_id = ${rootUserId}

                UNION ALL

                -- Добавляем детей
                SELECT
                    m.user_id,
                    m.parent_id,
                    m.position,
                    m.level,
                    b.depth + 1
                FROM ${matrixPlacement} m
                JOIN bfs b ON m.parent_id = b.user_id
                WHERE b.depth < 10 -- ограничение глубины поиска
            ),
            available_positions AS (
                -- Найти узлы, у которых есть свободные позиции
                SELECT
                    b.user_id as parent_id,
                    b.level,
                    b.depth,
                    CASE
                        WHEN NOT EXISTS (
                            SELECT 1 FROM ${matrixPlacement}
                            WHERE parent_id = b.user_id AND position = 'left'
                        ) THEN 'left'
                        WHEN NOT EXISTS (
                            SELECT 1 FROM ${matrixPlacement}
                            WHERE parent_id = b.user_id AND position = 'right'
                        ) THEN 'right'
                        ELSE NULL
                    END as available_position
                FROM bfs b
            )
            SELECT parent_id, available_position as position, level
            FROM available_positions
            WHERE available_position IS NOT NULL
            ORDER BY depth, parent_id
            LIMIT 1
        `);

        const row = result.rows[0] as any;
        if (!row) return null;

        return {
            parentId: row.parent_id,
            position: row.position as 'left' | 'right',
            level: row.level + 1,
        };
    },

    /**
     * Проверить, создаст ли размещение цикл в дереве
     */
    async wouldCreateCycle(parentId: string, childId: string): Promise<boolean> {
        // Эффективная проверка цикла через recursive CTE
        const result = await db.execute(sql`
            WITH RECURSIVE upline AS (
                SELECT parent_id, 0 as depth
                FROM ${matrixPlacement}
                WHERE user_id = ${parentId}

                UNION ALL

                SELECT m.parent_id, u.depth + 1
                FROM ${matrixPlacement} m
                JOIN upline u ON m.user_id = u.parent_id
                WHERE u.depth < 100 -- safety limit
            )
            SELECT 1
            FROM upline
            WHERE parent_id = ${childId}
            LIMIT 1
        `);

        return result.rows.length > 0;
    },

    /**
     * Получить статистику пользователя в матрице
     */
    async getUserStats(userId: string): Promise<{
        totalDownline: number;
        leftLegCount: number;
        rightLegCount: number;
        leftLegVolume: string;
        rightLegVolume: string;
        maxDepth: number;
    } | null> {
        const placement = await this.getByUserId(userId);
        if (!placement) return null;

        const subtree = await this.getSubtree(userId, 20);

        return {
            totalDownline: subtree.length - 1, // exclude self
            leftLegCount: Number(placement.leftLegCount ?? 0),
            rightLegCount: Number(placement.rightLegCount ?? 0),
            leftLegVolume: placement.leftLegVolume ?? '0',
            rightLegVolume: placement.rightLegVolume ?? '0',
            maxDepth: Math.max(...subtree.map(n => n.level)),
        };
    },

    /**
     * Список всех размещений (для админки)
     */
    async list(params: {
        limit?: number;
        offset?: number;
        orderBy?: 'createdAt' | 'level';
        orderDir?: 'asc' | 'desc';
    } = {}): Promise<MatrixPlacement[]> {
        const { limit = 50, offset = 0, orderBy = 'createdAt', orderDir = 'desc' } = params;

        // Явный shape — идеально типобезопасно
        const baseQuery = db
            .select({
                id: matrixPlacement.id,
                userId: matrixPlacement.userId,
                parentId: matrixPlacement.parentId,
                position: matrixPlacement.position,
                sponsorId: matrixPlacement.sponsorId,
                level: matrixPlacement.level,
                leftLegVolume: matrixPlacement.leftLegVolume,
                rightLegVolume: matrixPlacement.rightLegVolume,
                leftLegCount: matrixPlacement.leftLegCount,
                rightLegCount: matrixPlacement.rightLegCount,
                isActive: matrixPlacement.isActive,
                createdAt: matrixPlacement.createdAt,
                updatedAt: matrixPlacement.updatedAt,
            })
            .from(matrixPlacement);

        // Сортировка — создаём НОВЫЙ query, а не мутируем существующий
        let sortedQuery;

        if (orderBy === 'createdAt') {
            sortedQuery = orderDir === 'desc'
                ? baseQuery.orderBy(desc(matrixPlacement.createdAt))
                : baseQuery.orderBy(matrixPlacement.createdAt);
        } else {
            sortedQuery = orderDir === 'desc'
                ? baseQuery.orderBy(desc(matrixPlacement.level))
                : baseQuery.orderBy(matrixPlacement.level);
        }

        // Drizzle требует помещать limit/offset только после полной сборки запроса
        return sortedQuery.limit(limit).offset(offset);
    }

,

    /**
     * Удалить размещение (для тестов / админки)
     */
    async delete(userId: string): Promise<boolean> {
        const result = await db
            .delete(matrixPlacement)
            .where(eq(matrixPlacement.userId, userId));
        return result.rowCount! > 0;
    },
};

export default matrixPlacementStorage;
