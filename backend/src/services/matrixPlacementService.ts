// backend/src/services/matrixPlacementService.ts
import { db } from '#db/db';
import { matrixPlacement, type MatrixPlacement } from '#db/schema/matrixPlacement';
import { appUser } from '#db/schema/users';
import { eq, sql, and, isNull, or } from 'drizzle-orm';

/**
 * Matrix Placement Service
 * Управление бинарной матрицей MLM
 *
 * Бинарное дерево:
 * - Каждый узел имеет максимум 2 дочерних узла (left, right)
 * - При переполнении (spillover) новые пользователи размещаются глубже
 * - Используется для расчёта бинарных бонусов
 */

export type MatrixPosition = 'left' | 'right';

export interface PlacementResult {
    placement: MatrixPlacement;
    parentId: string;
    position: MatrixPosition;
    level: number;
}

export class MatrixPlacementService {
    /**
     * Разместить нового пользователя в матрице
     *
     * @param userId - ID нового пользователя
     * @param sponsorId - ID спонсора (кто пригласил)
     * @param preferredPosition - предпочитаемая позиция ('left' или 'right')
     * @returns Информация о размещении
     */
    async placeUser(
        userId: string,
        sponsorId: string,
        preferredPosition?: MatrixPosition
    ): Promise<PlacementResult> {
        return db.transaction(async (tx) => {
            // 1. Проверить что пользователь ещё не размещён
            const [existing] = await tx
                .select()
                .from(matrixPlacement)
                .where(eq(matrixPlacement.userId, userId))
                .limit(1);

            if (existing) {
                throw new Error(`User ${userId} already placed in matrix`);
            }

            // 2. Найти позицию для размещения
            const placementInfo = await this.findAvailablePosition(
                tx,
                sponsorId,
                preferredPosition
            );

            // 3. Создать запись в матрице
            const [placement] = await tx
                .insert(matrixPlacement)
                .values({
                    userId,
                    parentId: placementInfo.parentId,
                    position: placementInfo.position,
                    sponsorId,
                    level: placementInfo.level,
                    leftLegVolume: '0',
                    rightLegVolume: '0',
                    leftLegCount: 0,
                    rightLegCount: 0,
                    isActive: 'true',
                })
                .returning();

            // >>> FIX: гарантируем MatrixPlacement, а не undefined
            if (!placement) {
                throw new Error('Failed to create matrix placement');
            }

            // 4. Обновить счётчик у родителя
            if (placementInfo.parentId) {
                const countField =
                    placementInfo.position === 'left'
                        ? matrixPlacement.leftLegCount
                        : matrixPlacement.rightLegCount;

                await tx
                    .update(matrixPlacement)
                    .set({
                        [placementInfo.position === 'left' ? 'leftLegCount' : 'rightLegCount']:
                            sql`${countField} + 1`,
                        updatedAt: new Date(),
                    })
                    .where(eq(matrixPlacement.userId, placementInfo.parentId));
            }

            return {
                placement,                       // теперь строго MatrixPlacement
                parentId: placementInfo.parentId,
                position: placementInfo.position,
                level: placementInfo.level,
            };
        });
    }

    /**
     * Найти доступную позицию для размещения
     * Использует алгоритм spillover (переполнения)
     */
    private async findAvailablePosition(
        tx: any,
        sponsorId: string,
        preferredPosition?: MatrixPosition
    ): Promise<{ parentId: string; position: MatrixPosition; level: number }> {
        // 1. Получить placement спонсора
        const [sponsorPlacement] = await tx
            .select()
            .from(matrixPlacement)
            .where(eq(matrixPlacement.userId, sponsorId))
            .limit(1);

        // Если спонсор не размещён, размещаем как root
        if (!sponsorPlacement) {
            return {
                parentId: sponsorId,
                position: preferredPosition ?? 'left',
                level: 1,
            };
        }

        // 2. Проверить есть ли свободное место у спонсора
        const availablePosition = await this.checkAvailablePosition(tx, sponsorId);
        if (availablePosition) {
            return {
                parentId: sponsorId,
                position: preferredPosition ?? availablePosition,
                level: sponsorPlacement.level + 1,
            };
        }

        // 3. Spillover: найти первое свободное место в downline спонсора
        const freeSpot = await this.findFirstAvailableSpot(tx, sponsorId, preferredPosition);
        return freeSpot;
    }

    /**
     * Проверить есть ли свободная позиция у пользователя
     */
    private async checkAvailablePosition(
        tx: any,
        userId: string
    ): Promise<MatrixPosition | null> {
        // Получить детей пользователя
        const children = await tx
            .select({ position: matrixPlacement.position })
            .from(matrixPlacement)
            .where(eq(matrixPlacement.parentId, userId));

        const positions = new Set(children.map((c: any) => c.position));

        if (!positions.has('left')) return 'left';
        if (!positions.has('right')) return 'right';
        return null;
    }

    /**
     * Найти первое свободное место в дереве (BFS)
     */
    private async findFirstAvailableSpot(
        tx: any,
        rootId: string,
        preferredPosition?: MatrixPosition
    ): Promise<{ parentId: string; position: MatrixPosition; level: number }> {
        // BFS поиск первого свободного места
        const queue: string[] = [rootId];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            // Проверить есть ли свободное место
            const availablePosition = await this.checkAvailablePosition(tx, currentId);
            if (availablePosition) {
                const [currentPlacement] = await tx
                    .select({ level: matrixPlacement.level })
                    .from(matrixPlacement)
                    .where(eq(matrixPlacement.userId, currentId))
                    .limit(1);

                return {
                    parentId: currentId,
                    position: preferredPosition ?? availablePosition,
                    level: (currentPlacement?.level ?? 0) + 1,
                };
            }

            // Добавить детей в очередь
            const children = await tx
                .select({ userId: matrixPlacement.userId })
                .from(matrixPlacement)
                .where(eq(matrixPlacement.parentId, currentId));

            for (const child of children) {
                queue.push(child.userId);
            }
        }

        // Fallback: если не нашли, размещаем под root
        const [rootPlacement] = await tx
            .select({ level: matrixPlacement.level })
            .from(matrixPlacement)
            .where(eq(matrixPlacement.userId, rootId))
            .limit(1);

        return {
            parentId: rootId,
            position: preferredPosition ?? 'left',
            level: (rootPlacement?.level ?? 0) + 1,
        };
    }

    /**
     * Обновить объём ноги (для бинарных бонусов)
     */
    async updateLegVolume(
        userId: string,
        leg: MatrixPosition,
        volumeToAdd: number
    ): Promise<void> {
        await db.transaction(async (tx) => {
            const volumeField =
                leg === 'left' ? matrixPlacement.leftLegVolume : matrixPlacement.rightLegVolume;

            await tx
                .update(matrixPlacement)
                .set({
                    [leg === 'left' ? 'leftLegVolume' : 'rightLegVolume']: sql`${volumeField} + ${volumeToAdd}`,
                    updatedAt: new Date(),
                })
                .where(eq(matrixPlacement.userId, userId));
        });
    }

    /**
     * Получить placement пользователя
     */
    async getUserPlacement(userId: string): Promise<MatrixPlacement | null> {
        const [placement] = await db
            .select()
            .from(matrixPlacement)
            .where(eq(matrixPlacement.userId, userId))
            .limit(1);

        return placement ?? null;
    }

    /**
     * Получить прямых детей в матрице
     */
    async getChildren(userId: string): Promise<MatrixPlacement[]> {
        return db
            .select()
            .from(matrixPlacement)
            .where(eq(matrixPlacement.parentId, userId))
            .orderBy(matrixPlacement.createdAt);
    }

    /**
     * Получить дерево downline (рекурсивно)
     */
    async getDownline(userId: string, maxDepth = 10): Promise<MatrixPlacement[]> {
        const result: MatrixPlacement[] = [];
        const queue: Array<{ id: string; depth: number }> = [{ id: userId, depth: 0 }];

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;
            if (depth >= maxDepth) continue;

            const children = await this.getChildren(id);
            result.push(...children);

            for (const child of children) {
                queue.push({ id: child.userId, depth: depth + 1 });
            }
        }

        return result;
    }

    /**
     * Получить путь от root до пользователя
     */
    async getUpline(userId: string): Promise<MatrixPlacement[]> {
        const upline: MatrixPlacement[] = [];
        let currentId: string | null = userId;

        while (currentId) {
            const [placement] = await db
                .select()
                .from(matrixPlacement)
                .where(eq(matrixPlacement.userId, currentId))
                .limit(1);

            if (!placement) break;

            upline.push(placement);
            currentId = placement.parentId;
        }

        return upline.reverse(); // От root к пользователю
    }
}

// Singleton экземпляр
export const matrixPlacementService = new MatrixPlacementService();
