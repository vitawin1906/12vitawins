import { baseApi } from '../baseApi';
import { Tags } from '../tags';

/* ======================== Types ======================== */

export type MatrixPosition = 'left' | 'right';

export interface MatrixPlacement {
    id: string;
    userId?: string;
    position: MatrixPosition;
    level: number;
    leftLegVolume: string;
    rightLegVolume: string;
    leftLegCount: number;
    rightLegCount: number;
    parentId: string | null;
    sponsorId: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
}

export interface MatrixChild {
    userId: string;
    position: MatrixPosition;
    level: number;
}

export interface MyPlacementResponse {
    success: boolean;
    placement: MatrixPlacement | null;
    children: MatrixChild[];
    message?: string;
}

export interface DownlineResponse {
    success: boolean;
    downline: Array<{
        userId: string;
        position: MatrixPosition;
        level: number;
        parentId: string | null;
    }>;
    count: number;
}

export interface UplineResponse {
    success: boolean;
    upline: Array<{
        userId: string;
        position: MatrixPosition;
        level: number;
    }>;
    count: number;
}

export interface PlaceUserRequest {
    userId: string;
    sponsorId: string;
    preferredPosition?: MatrixPosition;
}

export interface PlaceUserResponse {
    success: boolean;
    message: string;
    result: {
        userId: string;
        parentId: string;
        position: MatrixPosition;
        level: number;
    };
}

export interface UpdateVolumeRequest {
    userId: string;
    leg: MatrixPosition;
    volumeToAdd: number;
}

/* ======================== API ======================== */

export const matrixPlacementApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        /* ─────────── User Queries ─────────── */

        getMyPlacement: builder.query<MyPlacementResponse, void>({
            query: () => ({
                url: '/matrix/my-placement',
                method: 'GET',
            }),
            providesTags: [Tags.Mlm],
        }),

        /**
         * ⚠️ Переименовано, чтобы не конфликтовать с mlmApi
         */
        getMyMatrixDownline: builder.query<DownlineResponse, { maxDepth?: number }>({
            query: (params) => ({
                url: '/matrix/my-downline',
                method: 'GET',
                params: {
                    maxDepth: params?.maxDepth ?? 5,
                },
            }),
            providesTags: [Tags.Mlm],
        }),

        getMyUpline: builder.query<UplineResponse, void>({
            query: () => ({
                url: '/matrix/my-upline',
                method: 'GET',
            }),
            providesTags: [Tags.Mlm],
        }),

        /* ─────────── Admin Queries ─────────── */

        getUserPlacement: builder.query<MyPlacementResponse, string>({
            query: (userId) => ({
                url: `/admin/matrix/user/${userId}`,
                method: 'GET',
            }),
            providesTags: (result, error, userId) => [
                { type: 'Matrix', id: userId },
            ],
        }),

        /* ─────────── Admin Mutations ─────────── */

        placeUser: builder.mutation<PlaceUserResponse, PlaceUserRequest>({
            query: (body) => ({
                url: '/admin/matrix/place-user',
                method: 'POST',
                data: body,
            }),
            invalidatesTags: [Tags.Matrix, Tags.Users],
        }),

        updateLegVolume: builder.mutation<
            { success: boolean; message: string },
            UpdateVolumeRequest
        >({
            query: (body) => ({
                url: '/admin/matrix/update-volume',
                method: 'POST',
                data: body,
            }),
            invalidatesTags: [Tags.Matrix],
        }),
    }),
});

/* ======================== Hooks ======================== */

export const {
    // User
    useGetMyPlacementQuery,
    useLazyGetMyPlacementQuery,

    /**
     * ⚠️ Эти переименованы наружу как старые имена,
     * чтобы остальной код не ломался
     */
    useGetMyMatrixDownlineQuery: useGetMyDownlineQuery,
    useLazyGetMyMatrixDownlineQuery: useLazyGetMyDownlineQuery,

    useGetMyUplineQuery,
    useLazyGetMyUplineQuery,

    // Admin
    useGetUserPlacementQuery,
    useLazyGetUserPlacementQuery,
    usePlaceUserMutation,
    useUpdateLegVolumeMutation,
} = matrixPlacementApi;
