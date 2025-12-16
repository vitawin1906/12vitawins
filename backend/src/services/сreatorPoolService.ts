// src/services/creatorPoolService.ts
import { randomInt } from 'crypto';
import { usersStorage } from '#storage/usersStorage';
import { settingsStorage } from '#storage/settingsStorage';
import { attachChildToParent } from '#storage/mlmStorage';

class CreatorPoolService {
    private readonly envPool: string[];
    private lastIndex = 0;

    constructor() {
        const envRaw = process.env.CREATOR_POOL_IDS ?? '';
        this.envPool = envRaw.split(',').map(s => s.trim()).filter(Boolean);
    }

    async getPool(): Promise<string[]> {
        try {
            const dbValue = await settingsStorage.getActiveValue<string[]>('creator_pool');
            if (Array.isArray(dbValue) && dbValue.length > 0) return dbValue;
        } catch {}
        return this.envPool;
    }

    private pickRandomFrom(pool: string[]): string {
        const idx = randomInt(pool.length);
        return pool[idx]!;
    }

    /** 👉 Теперь можно получить просто ID создателя */
    async pickCreatorId(): Promise<string> {
        const pool = await this.getPool();
        if (!pool.length) throw new Error('Creator pool is empty');
        return this.pickRandomFrom(pool);
    }
}

export const creatorPoolService = new CreatorPoolService();
