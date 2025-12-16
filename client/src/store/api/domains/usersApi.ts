import { baseApi } from '../baseApi';

/* ======================== Types ======================== */

import type { User, UserNetworkStats } from '@/types/user';

export interface UsersResponse {
  success: boolean;
  users: User[];
  total?: number;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  isAdmin?: boolean;
  isPartner?: boolean;
  isActive?: boolean;
  phone?: string;
}

export interface UpdateMyProfileDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface UserStatsResponse {
  success: boolean;
  stats: UserNetworkStats;
}

/* ======================== API ======================== */

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User Queries ─────────── */

    /**
     * GET /api/users/me
     * Получить свой профиль (user)
     */
    getMyProfile: builder.query<User, void>({
      query: () => ({
        url: '/users/me',
        method: 'GET',
      }),
      transformResponse: (res: UserResponse) => res.user,
      providesTags: ['Me'],
    }),

    /**
     * GET /api/users/me/stats
     * Получить мою полную статистику по MLM сети (user)
     * Включает: personalVolume, groupVolume, network, earnings
     */
    getMyStats: builder.query<UserNetworkStats, void>({
      query: () => ({
        url: '/users/me/stats',
        method: 'GET',
      }),
      transformResponse: (res: UserStatsResponse) => res.stats,
      providesTags: ['Me'],
    }),

    /* ─────────── User Mutations ─────────── */

    /**
     * PUT /api/users/me
     * Обновить свой профиль (user)
     */
    updateMyProfile: builder.mutation<User, UpdateMyProfileDto>({
      query: (data) => ({
        url: '/users/me',
        method: 'PUT',
        data,
      }),
      transformResponse: (res: UserResponse) => res.user,
      invalidatesTags: ['Me'],
    }),

    /**
     * POST /api/users/me/change-password
     * Изменить пароль (user)
     */

    getAllUsers: builder.query<User[], void>({
      query: () => ({
        url: '/admin/users',
        method: 'GET',
      }),
      transformResponse: (res: UsersResponse) => res.users,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Users' as const, id })),
              { type: 'Users', id: 'ADMIN_LIST' },
            ]
          : [{ type: 'Users', id: 'ADMIN_LIST' }],
    }),

    /**
     * GET /api/admin/users/:id
     * Получить пользователя по ID (admin)
     */
    getUserById: builder.query<User, string>({
      query: (id) => ({
        url: `/admin/users/${id}`,
        method: 'GET',
      }),
      transformResponse: (res: UserResponse) => res.user,
      providesTags: (result, error, id) => [{ type: 'Users', id }],
    }),

    /* ─────────── Admin Mutations ─────────── */

    /**
     * PUT /api/admin/users/:id
     * Обновить пользователя (admin)
     */
    updateUser: builder.mutation<User, { id: string } & UpdateUserDto>({
      query: ({ id, ...data }) => ({
        url: `/admin/users/${id}`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: UserResponse) => res.user,
      invalidatesTags: (result, error, { id }) => [
        { type: 'Users', id },
        { type: 'Users', id: 'ADMIN_LIST' },
      ],
    }),

    /**
     * POST /api/admin/users/:id/upgrade-to-partner
     * Сделать пользователя партнёром (admin)
     */
    upgradeToPartner: builder.mutation<User, string>({
      query: (id) => ({
        url: `/admin/users/${id}/upgrade-to-partner`,
        method: 'POST',
      }),
      transformResponse: (res: UserResponse) => res.user,
      invalidatesTags: (result, error, id) => [
        { type: 'Users', id },
        { type: 'Users', id: 'ADMIN_LIST' },
      ],
    }),

    /**
     * POST /api/admin/users/:id/lock-referrer
     * Заблокировать реферера пользователя (admin)
     */
    lockReferrer: builder.mutation<User, string>({
      query: (id) => ({
        url: `/admin/users/${id}/lock-referrer`,
        method: 'POST',
      }),
      transformResponse: (res: UserResponse) => res.user,
      invalidatesTags: (result, error, id) => [
        { type: 'Users', id },
        { type: 'Users', id: 'ADMIN_LIST' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // User queries
  useGetMyProfileQuery,
  useLazyGetMyProfileQuery,
  useGetMyStatsQuery,
  useLazyGetMyStatsQuery,

  // User mutations
  useUpdateMyProfileMutation,

  // Admin queries
  useGetAllUsersQuery,
  useLazyGetAllUsersQuery,
  useGetUserByIdQuery,
  useLazyGetUserByIdQuery,

  // Admin mutations
  useUpdateUserMutation,
  useUpgradeToPartnerMutation,
  useLockReferrerMutation,
} = usersApi;
