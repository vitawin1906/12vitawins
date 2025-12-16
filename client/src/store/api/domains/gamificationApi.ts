/**
 * Gamification API
 * Управление достижениями и airdrop задачами
 */

import { baseApi } from '../baseApi';

/* ==================== Types ==================== */

export interface AirdropTask {
  id: number;
  title: string;
  description: string;
  reward: number;
  type: 'social' | 'referral' | 'purchase' | 'other';
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserAirdropAction {
  id: number;
  userId: string;
  taskId: number;
  status: 'pending' | 'verified' | 'rejected';
  proof?: string;
  rewardAmount: number;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
  task?: AirdropTask;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon?: string;
  badge?: string;
  type: 'sales' | 'referral' | 'rank' | 'special';
  requirement: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAchievement {
  id: number;
  userId: string;
  achievementId: number;
  earnedAt: string;
  achievement?: Achievement;
}

export interface CreateAirdropTaskRequest {
  title: string;
  description: string;
  reward: number;
  type: 'social' | 'referral' | 'purchase' | 'other';
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface CreateAirdropActionRequest {
  taskId: number;
  proof?: string;
}

export interface CreateAchievementRequest {
  name: string;
  description: string;
  icon?: string;
  badge?: string;
  type: 'sales' | 'referral' | 'rank' | 'special';
  requirement: Record<string, any>;
  isActive?: boolean;
}

export interface GrantAchievementRequest {
  userId: string;
  achievementId: number;
}

/* ==================== API ==================== */

export const gamificationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ==================== Airdrop Tasks - Public ==================== */

    /**
     * Получить список активных задач
     * GET /api/gamification/airdrop/tasks
     */
    listAirdropTasks: builder.query<AirdropTask[], void>({
      query: () => '/gamification/airdrop/tasks',
      providesTags: ['Gamification'],
    }),

    /**
     * Получить задачу по ID
     * GET /api/gamification/airdrop/tasks/:id
     */
    getAirdropTask: builder.query<AirdropTask, number>({
      query: (id) => `/gamification/airdrop/tasks/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Gamification', id }],
    }),

    /* ==================== Airdrop Actions - User ==================== */

    /**
     * Получить мои действия по airdrop
     * GET /api/gamification/airdrop/my-actions
     */
    getMyAirdropActions: builder.query<UserAirdropAction[], void>({
      query: () => '/gamification/airdrop/my-actions',
      providesTags: ['Gamification'],
    }),

    /**
     * Создать/обновить действие по задаче
     * POST /api/gamification/airdrop/actions
     */
    upsertAirdropAction: builder.mutation<UserAirdropAction, CreateAirdropActionRequest>({
      query: (data) => ({
        url: '/gamification/airdrop/actions',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),

    /* ==================== Achievements - Public ==================== */

    /**
     * Получить список достижений
     * GET /api/gamification/achievements
     */
    listAchievements: builder.query<Achievement[], void>({
      query: () => '/gamification/achievements',
      providesTags: ['Gamification'],
    }),

    /**
     * Получить достижение по ID
     * GET /api/gamification/achievements/:id
     */
    getAchievement: builder.query<Achievement, number>({
      query: (id) => `/gamification/achievements/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Gamification', id }],
    }),

    /* ==================== Achievements - User ==================== */

    /**
     * Получить мои достижения
     * GET /api/gamification/achievements/my
     */
    getMyAchievements: builder.query<UserAchievement[], void>({
      query: () => '/gamification/achievements/my',
      providesTags: ['Gamification'],
    }),

    /* ==================== Admin - Airdrop Tasks ==================== */

    /**
     * Получить все задачи (админ)
     * GET /api/admin/gamification/airdrop/tasks
     */
    listAllAirdropTasks: builder.query<AirdropTask[], void>({
      query: () => '/admin/gamification/airdrop/tasks',
      providesTags: ['Gamification'],
    }),

    /**
     * Создать задачу (админ)
     * POST /api/admin/gamification/airdrop/tasks
     */
    createAirdropTask: builder.mutation<AirdropTask, CreateAirdropTaskRequest>({
      query: (data) => ({
        url: '/admin/gamification/airdrop/tasks',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Обновить задачу (админ)
     * PUT /api/admin/gamification/airdrop/tasks/:id
     */
    updateAirdropTask: builder.mutation<AirdropTask, { id: number; data: Partial<CreateAirdropTaskRequest> }>({
      query: ({ id, data }) => ({
        url: `/admin/gamification/airdrop/tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Удалить задачу (админ)
     * DELETE /api/admin/gamification/airdrop/tasks/:id
     */
    deleteAirdropTask: builder.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/admin/gamification/airdrop/tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Верифицировать действие пользователя (админ)
     * POST /api/admin/gamification/airdrop/actions/:actionId/verify
     */
    verifyUserAction: builder.mutation<UserAirdropAction, { actionId: number; status: 'verified' | 'rejected' }>({
      query: ({ actionId, status }) => ({
        url: `/admin/gamification/airdrop/actions/${actionId}/verify`,
        method: 'POST',
        body: { status },
      }),
      invalidatesTags: ['Gamification'],
    }),

    /* ==================== Admin - Achievements ==================== */

    /**
     * Получить все достижения (админ)
     * GET /api/admin/gamification/achievements
     */
    listAllAchievements: builder.query<Achievement[], void>({
      query: () => '/admin/gamification/achievements',
      providesTags: ['Gamification'],
    }),

    /**
     * Создать достижение (админ)
     * POST /api/admin/gamification/achievements
     */
    createAchievement: builder.mutation<Achievement, CreateAchievementRequest>({
      query: (data) => ({
        url: '/admin/gamification/achievements',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Обновить достижение (админ)
     * PUT /api/admin/gamification/achievements/:id
     */
    updateAchievement: builder.mutation<Achievement, { id: number; data: Partial<CreateAchievementRequest> }>({
      query: ({ id, data }) => ({
        url: `/admin/gamification/achievements/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Удалить достижение (админ)
     * DELETE /api/admin/gamification/achievements/:id
     */
    deleteAchievement: builder.mutation<{ success: boolean }, number>({
      query: (id) => ({
        url: `/admin/gamification/achievements/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Gamification'],
    }),

    /**
     * Выдать достижение пользователю (админ)
     * POST /api/admin/gamification/achievements/grant
     */
    grantAchievement: builder.mutation<UserAchievement, GrantAchievementRequest>({
      query: (data) => ({
        url: '/admin/gamification/achievements/grant',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Gamification'],
    }),
  }),
});

export const {
  // Airdrop Tasks - Public
  useListAirdropTasksQuery,
  useGetAirdropTaskQuery,

  // Airdrop Actions - User
  useGetMyAirdropActionsQuery,
  useUpsertAirdropActionMutation,

  // Achievements - Public
  useListAchievementsQuery,
  useGetAchievementQuery,

  // Achievements - User
  useGetMyAchievementsQuery,

  // Admin - Airdrop Tasks
  useListAllAirdropTasksQuery,
  useCreateAirdropTaskMutation,
  useUpdateAirdropTaskMutation,
  useDeleteAirdropTaskMutation,
  useVerifyUserActionMutation,

  // Admin - Achievements
  useListAllAchievementsQuery,
  useCreateAchievementMutation,
  useUpdateAchievementMutation,
  useDeleteAchievementMutation,
  useGrantAchievementMutation,
} = gamificationApi;
