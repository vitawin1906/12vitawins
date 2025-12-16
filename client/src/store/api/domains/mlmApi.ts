import { baseApi } from '../baseApi';
import { Tags } from '../tags';
import { pickData, pickDataArray } from '../transformers';

/* ======================== Types ======================== */

export interface MLMUser {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  telegramId?: string;
  referrerId?: string;
  mlmStatus?: string;
  rank?: string;
  createdAt: string;
}

export interface MLMNetworkNode {
  user: MLMUser;
  children?: MLMNetworkNode[];
  depth: number;
}

export interface MLMNetworkResponse {
  success: boolean;
  data: MLMNetworkNode | MLMNetworkNode[];
}

export interface MLMUsersListResponse {
  success: boolean;
  data: MLMUser[];
  total?: number;
}

export interface AttachToNetworkDto {
  userId: string;
  referrerId: string;
}

export interface MoveInNetworkDto {
  userId: string;
  newReferrerId: string;
}

/* ======================== API ======================== */

export const mlmApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User MLM Queries ─────────── */

    /**
     * GET /api/mlm/my-network
     * Получить мою MLM сеть
     */
    getMyNetwork: builder.query<MLMUser[], void>({
      query: () => ({
        url: '/mlm/my-network',
        method: 'GET',
      }),
      transformResponse: (res: MLMUsersListResponse) => pickDataArray<MLMUser, MLMUsersListResponse>(res),
      providesTags: [Tags.Me, Tags.Mlm],
    }),

    /**
     * GET /api/mlm/my-network/tree
     * Получить мою MLM сеть в виде дерева
     */
    getMyNetworkTree: builder.query<MLMNetworkNode, void>({
      query: () => ({
        url: '/mlm/my-network/tree',
        method: 'GET',
      }),
      transformResponse: (res: MLMNetworkResponse) => pickData<MLMNetworkNode | MLMNetworkNode[], MLMNetworkResponse>(res) as MLMNetworkNode,
      providesTags: [Tags.Me, Tags.Mlm],
    }),

    /**
     * GET /api/mlm/my-upline
     * Получить мою восходящую линию (спонсоров)
     */
    getMyUpline: builder.query<MLMUser[], void>({
      query: () => ({
        url: '/mlm/my-upline',
        method: 'GET',
      }),
      transformResponse: (res: MLMUsersListResponse) => pickDataArray<MLMUser, MLMUsersListResponse>(res),
      providesTags: [Tags.Me, Tags.Mlm],
    }),

    /**
     * GET /api/mlm/my-downline
     * Получить мою нисходящую линию (рефералов)
     */
    getMyDownline: builder.query<MLMUser[], void>({
      query: () => ({
        url: '/mlm/my-downline',
        method: 'GET',
      }),
      transformResponse: (res: MLMUsersListResponse) => pickDataArray<MLMUser, MLMUsersListResponse>(res),
      providesTags: [Tags.Me, Tags.Mlm],
    }),

    /* ─────────── Admin MLM Queries ─────────── */

    /**
     * GET /api/admin/mlm/network/users
     * Получить всех пользователей в MLM сети (ADMIN)
     */
    getAdminNetworkUsers: builder.query<MLMUser[], void>({
      query: () => ({
        url: '/admin/mlm/network/users',
        method: 'GET',
      }),
      transformResponse: (res: MLMUsersListResponse) => pickDataArray<MLMUser, MLMUsersListResponse>(res),
      providesTags: [Tags.Mlm],
    }),

    /**
     * GET /api/admin/mlm/network/user/:userId/tree
     * Получить дерево MLM сети пользователя (ADMIN)
     */
    getAdminUserNetworkTree: builder.query<MLMNetworkNode, string>({
      query: (userId) => ({
        url: `/admin/mlm/network/user/${userId}/tree`,
        method: 'GET',
      }),
      transformResponse: (res: MLMNetworkResponse) => pickData<MLMNetworkNode | MLMNetworkNode[], MLMNetworkResponse>(res) as MLMNetworkNode,
      providesTags: (result, error, userId) => [{ type: Tags.Mlm as any, id: userId }],
    }),

    /**
     * GET /api/admin/mlm/orphans
     * Получить пользователей без реферера (ADMIN)
     */
    getAdminOrphans: builder.query<MLMUser[], void>({
      query: () => ({
        url: '/admin/mlm/orphans',
        method: 'GET',
      }),
      transformResponse: (res: MLMUsersListResponse) => pickDataArray<MLMUser, MLMUsersListResponse>(res),
      providesTags: [Tags.Mlm],
    }),

    /* ─────────── Admin MLM Mutations ─────────── */

    /**
     * POST /api/admin/mlm/attach
     * Присоединить пользователя к реферу (ADMIN)
     */
    adminAttachToNetwork: builder.mutation<void, AttachToNetworkDto>({
      query: (data) => ({
        url: '/admin/mlm/attach',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Mlm'],
    }),

    /**
     * POST /api/admin/mlm/move
     * Переместить пользователя к новому реферу (ADMIN)
     */
    adminMoveInNetwork: builder.mutation<void, MoveInNetworkDto>({
      query: (data) => ({
        url: '/admin/mlm/move',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Mlm'],
    }),
  }),
});

export const {
  useGetMyNetworkQuery,
  useLazyGetMyNetworkQuery,
  useGetMyNetworkTreeQuery,
  useLazyGetMyNetworkTreeQuery,
  useGetMyUplineQuery,
  useLazyGetMyUplineQuery,
  useGetMyDownlineQuery,
  useLazyGetMyDownlineQuery,
  useGetAdminNetworkUsersQuery,
  useLazyGetAdminNetworkUsersQuery,
  useGetAdminUserNetworkTreeQuery,
  useLazyGetAdminUserNetworkTreeQuery,
  useGetAdminOrphansQuery,
  useLazyGetAdminOrphansQuery,
  useAdminAttachToNetworkMutation,
  useAdminMoveInNetworkMutation,
} = mlmApi;
