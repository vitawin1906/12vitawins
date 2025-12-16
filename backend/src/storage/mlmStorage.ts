// src/storage/mlmStorage.ts
import { db } from '#db/db';
import { networkEdge, appUser } from '#db/schema';
import {and, asc, eq, inArray, sql} from 'drizzle-orm';

/** Строка из network_edge */
export type NetworkEdgeRow = typeof networkEdge.$inferSelect;

/** Один шаг аплайна с вычисленным уровнем */
export type UplineHop = {
    level: number;            // 1 = прямой родитель, 2 = «дед», ...
    parentId: string;
    childId: string;
    createdAt: Date | null;
};

const MAX_DEPTH = 64;

/* ─────────────────────────────────────────────
   Low-level helpers
───────────────────────────────────────────── */

/** Прямой родитель (если есть) */
export async function getImmediateParent(childId: string): Promise<NetworkEdgeRow | null> {
    const [row] = await db
        .select()
        .from(networkEdge)
        .where(eq(networkEdge.childId, childId))
        .limit(1);
    return row ?? null;
}

/** Проверка цикла: нельзя сделать ребёнка предком своего родителя */
async function wouldCreateCycle(parentId: string, childId: string): Promise<boolean> {
    // если совпадают — мгновенный цикл
    if (parentId === childId) return true;

    const result = await db.execute(sql`
        WITH RECURSIVE up AS (
            SELECT ne.parent_id, ne.child_id
            FROM network_edge ne
            WHERE ne.child_id = ${parentId}

            UNION ALL

            SELECT ne.parent_id, ne.child_id
            FROM network_edge ne
            JOIN up ON ne.child_id = up.parent_id
        )
        SELECT 1
        FROM up
        WHERE parent_id = ${childId}
        LIMIT 1;
    `);

    // если вернулась строка → цикл найден
    return result.rows.length > 0;
}

/** Оба пользователя существуют и активны */
async function assertUsersExist(...userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    const rows = await db
        .select({ id: appUser.id })
        .from(appUser)
        .where(and(inArray(appUser.id, userIds), eq(appUser.isActive, true)));

    const ok = new Set(rows.map((r) => r.id));
    for (const id of userIds) {
        if (!ok.has(id)) throw new Error(`User ${id} not found or inactive`);
    }
}

/** У ребёнка не заблокирована смена реферера */
async function assertChildNotLocked(childId: string): Promise<void> {
    const [row] = await db
        .select({ locked: appUser.referrerLocked })
        .from(appUser)
        .where(eq(appUser.id, childId))
        .limit(1);
    if (row?.locked) throw new Error('Referrer is locked for this user');
}

/* ─────────────────────────────────────────────
   Network queries
───────────────────────────────────────────── */

/** Аплайн: child → parent → ... ; массив шагов с level */
export async function getUpline(childId: string, limitLevels = 16): Promise<UplineHop[]> {
    const res: UplineHop[] = [];
    let currentChild = childId;
    let level = 1;

    while (level <= limitLevels) {
        const edge = await getImmediateParent(currentChild);
        if (!edge) break;
        res.push({
            level,
            parentId: edge.parentId,
            childId: edge.childId,
            createdAt: edge.createdAt ?? null,
        });
        currentChild = edge.parentId;
        level += 1;
    }
    return res;
}

/** Все прямые дети (первая линия) */
export async function listFirstLine(parentId: string): Promise<NetworkEdgeRow[]> {
    return db
        .select()
        .from(networkEdge)
        .where(eq(networkEdge.parentId, parentId))
        .orderBy(asc(networkEdge.createdAt));
}

/* ─────────────────────────────────────────────
   Mutations
───────────────────────────────────────────── */

/**
 * Даунлайн: parent → children → ... ; массив {childId, level}
 * Выполняется итеративно по уровням (BFS) с батч-запросами на каждый уровень.
 */
export async function getDownline(parentId: string, maxDepth: number = 16): Promise<Array<{ childId: string; level: number }>> {
    const result: Array<{ childId: string; level: number }> = [];
    if (!parentId || maxDepth <= 0) return result;

    // Текущий фронт уровня — массив parentIds, начинаем с исходного parent
    let frontier: string[] = [parentId];
    const seenChildren = new Set<string>(); // защитимся от случайных циклов

    for (let level = 1; level <= maxDepth; level++) {
        if (frontier.length === 0) break;

        // Получаем всех детей для текущего набора родителей
        const rows = await db
            .select()
            .from(networkEdge)
            .where(inArray(networkEdge.parentId, frontier as any));

        const nextFrontier: string[] = [];
        for (const r of rows) {
            if (!seenChildren.has(r.childId)) {
                seenChildren.add(r.childId);
                result.push({ childId: r.childId, level });
                nextFrontier.push(r.childId);
            }
        }
        frontier = nextFrontier;
    }

    return result;
}

/**
 * Привязать child к parent (идемпотентно: заменяем текущего родителя, если есть).
 * Условия схемы:
 *  - ровно один родитель на ребёнка (UNIQUE по child_id)
 *  - запрет самоссылок
 *  - запрет циклов
 *  - у ребёнка не должен быть referrerLocked
 */
export async function attachChildToParent(params: { parentId: string; childId: string }): Promise<void> {
    const { parentId, childId } = params;
    if (parentId === childId) throw new Error('Нельзя привязать пользователя к самому себе.');

    await assertUsersExist(parentId, childId);
    await assertChildNotLocked(childId);

    if (await wouldCreateCycle(parentId, childId)) {
        throw new Error('Нельзя создавать циклы в структуре (child уже является предком parent).');
    }

    await db.transaction(async (tx) => {
        await tx.delete(networkEdge).where(eq(networkEdge.childId, childId));
        await tx.insert(networkEdge).values({ parentId, childId });
    });
}

/** Полностью отвязать child от сети (удаляет ребро для этого child) */
export async function detachChild(childId: string): Promise<void> {
    await db.delete(networkEdge).where(eq(networkEdge.childId, childId));
}

/** Перепривязать ребёнка к новому родителю (с проверкой цикла и блокировки) */
export async function reattachChild(childId: string, newParentId: string): Promise<void> {
    if (childId === newParentId) throw new Error('Нельзя привязать пользователя к самому себе.');

    await assertUsersExist(childId, newParentId);
    await assertChildNotLocked(childId);

    if (await wouldCreateCycle(newParentId, childId)) {
        throw new Error('Нельзя создавать циклы в структуре.');
    }

    await db.transaction(async (tx) => {
        await tx.delete(networkEdge).where(eq(networkEdge.childId, childId));
        await tx.insert(networkEdge).values({ parentId: newParentId, childId });
    });
}

/** Получить всех активных пользователей для администрирования MLM сети */
export async function getAllNetworkUsers(): Promise<Array<{ id: string; firstName: string | null; lastName: string | null; email: string | null }>> {
    const users = await db
        .select({
            id: appUser.id,
            firstName: appUser.firstName,
            lastName: appUser.lastName,
            email: appUser.email,
        })
        .from(appUser)
        .where(eq(appUser.isActive, true))
        .orderBy(asc(appUser.createdAt));

    return users;
}
