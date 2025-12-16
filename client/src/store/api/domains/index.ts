// Export all domain APIs
export * from './authApi';
export * from './productsApi';
export * from './categoriesApi';
export * from './ordersApi';
export * from './statsApi';
export * from './blogApi';
export * from './mediaApi';
export * from './withdrawalApi';
export * from './bonusApi';
export * from './mlmApi';
export * from './cartApi';
export * from './settingsApi';
export * from './usersApi';
export * from './ledgerApi';
export * from './addressesApi';
export * from './reviewsApi';
export * from './promoCodesApi';
export * from './freedomSharesApi';
export * from './networkFundApi';
export * from './partnerUpgradeApi';
export * from './paymentsApi';
export * from './gamificationApi';
export * from './ranksApi';
export * from './activationPackageApi';

// Matrix Placement API — экспортируем только то, что реально существует
export {
    matrixPlacementApi,
    useGetMyPlacementQuery,
    useLazyGetMyPlacementQuery,

    // ✅ корректные имена
    useGetMyDownlineQuery,
    useLazyGetMyDownlineQuery,

    useGetMyUplineQuery,
    useLazyGetMyUplineQuery,

    useGetUserPlacementQuery,
    useLazyGetUserPlacementQuery,
    usePlaceUserMutation,
    useUpdateLegVolumeMutation,
} from './matrixPlacementApi';
