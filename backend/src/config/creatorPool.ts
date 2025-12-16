export const creatorPool = process.env.CREATOR_POOL_IDS?.split(',') ?? [];

export function pickRandomCreatorId(): string {
    if (creatorPool.length === 0) {
        throw new Error('Creator pool is empty');
    }
    const index = Math.floor(Math.random() * creatorPool.length);
    return creatorPool[index]!;
}
