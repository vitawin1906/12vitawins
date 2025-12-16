import { baseApi } from '../baseApi';
import type {
  Address,
  CreateAddressDto,
  UpdateAddressDto,
  AddressesResponse,
  AddressResponse,
} from '@/types/address';
import { normalizeAddressFromApi, normalizeAddressesFromApi } from '@/utils/address/normalize';

/* ======================== API ======================== */

/**
 * Addresses API
 *
 * Управление адресами доставки пользователя.
 *
 * Особенности:
 * - Один адрес может быть "по умолчанию" (isDefault=true)
 * - БД гарантирует уникальность через UNIQUE INDEX на (userId, isDefault=true)
 * - При установке нового адреса по умолчанию, старый автоматически сбрасывается
 */
export const addressesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /* ─────────── User Address Queries ─────────── */

    /**
     * GET /api/addresses
     * Получить все адреса текущего пользователя
     */
    getMyAddresses: builder.query<Address[], void>({
      query: () => ({
        url: '/addresses',
        method: 'GET',
      }),
      transformResponse: (res: AddressesResponse) => {
        const rawAddresses = res.addresses || [];
        return normalizeAddressesFromApi(rawAddresses);
      },
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Address' as const, id })),
              { type: 'Address', id: 'LIST' },
            ]
          : [{ type: 'Address', id: 'LIST' }],
    }),

    /**
     * GET /api/addresses/default
     * Получить адрес по умолчанию
     *
     * Возвращает 404 если нет адреса по умолчанию
     */
    getDefaultAddress: builder.query<Address | null, void>({
      query: () => ({
        url: '/addresses/default',
        method: 'GET',
      }),
      transformResponse: (res: AddressResponse) => {
        if (!res.address) return null;
        return normalizeAddressFromApi(res.address);
      },
      providesTags: [{ type: 'Address', id: 'DEFAULT' }],
    }),

    /* ─────────── User Address Mutations ─────────── */

    /**
     * POST /api/addresses
     * Создать новый адрес доставки
     *
     * Если isDefault=true, автоматически сбрасывает isDefault у других адресов
     */
    createAddress: builder.mutation<Address, CreateAddressDto>({
      query: (data) => ({
        url: '/addresses',
        method: 'POST',
        data,
      }),
      transformResponse: (res: AddressResponse) => {
        return normalizeAddressFromApi(res.address);
      },
      invalidatesTags: [
        { type: 'Address', id: 'LIST' },
        { type: 'Address', id: 'DEFAULT' },
      ],
    }),

    /**
     * PUT /api/addresses/:id
     * Обновить адрес доставки
     */
    updateAddress: builder.mutation<Address, { id: string } & UpdateAddressDto>({
      query: ({ id, ...data }) => ({
        url: `/addresses/${id}`,
        method: 'PUT',
        data,
      }),
      transformResponse: (res: AddressResponse) => {
        return normalizeAddressFromApi(res.address);
      },
      invalidatesTags: (result, error, { id }) => [
        { type: 'Address', id },
        { type: 'Address', id: 'LIST' },
        { type: 'Address', id: 'DEFAULT' },
      ],
    }),

    /**
     * DELETE /api/addresses/:id
     * Удалить адрес доставки
     *
     * Нельзя удалить последний адрес если он используется в активных заказах
     */
    deleteAddress: builder.mutation<void, string>({
      query: (id) => ({
        url: `/addresses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Address', id },
        { type: 'Address', id: 'LIST' },
        { type: 'Address', id: 'DEFAULT' },
      ],
    }),

    /**
     * POST /api/addresses/:id/set-default
     * Установить адрес как адрес по умолчанию
     *
     * Автоматически сбрасывает isDefault у других адресов пользователя
     */
    setDefaultAddress: builder.mutation<void, string>({
      query: (id) => ({
        url: `/addresses/${id}/set-default`,
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Address', id: 'LIST' },
        { type: 'Address', id: 'DEFAULT' },
      ],
    }),
  }),
});

/* ======================== Hooks ======================== */

export const {
  // Queries
  useGetMyAddressesQuery,
  useLazyGetMyAddressesQuery,
  useGetDefaultAddressQuery,
  useLazyGetDefaultAddressQuery,

  // Mutations
  useCreateAddressMutation,
  useUpdateAddressMutation,
  useDeleteAddressMutation,
  useSetDefaultAddressMutation,
} = addressesApi;
