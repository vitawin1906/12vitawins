// backend/src/services/tinkoff/tinkoffService.ts
import { TinkoffPaymentService } from '../tinkoffPaymentService';
import {
    TinkoffSettingsRepository,
    TinkoffPaymentTxRepository,
    TinkoffOrdersRepository,
} from './tinkoffRepositories';

// Get base URL from environment
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'https://vitawins.ru';

// Create repository instances
const settingsRepo = new TinkoffSettingsRepository();
const paymentTxRepo = new TinkoffPaymentTxRepository();
const ordersRepo = new TinkoffOrdersRepository();

// Create Tinkoff service instance
export const tinkoffService = new TinkoffPaymentService(
    paymentTxRepo,
    ordersRepo,
    settingsRepo,
    {
        test: 'https://rest-api-test.tinkoff.ru/v2/',
        prod: 'https://securepay.tinkoff.ru/v2/',
    },
    {
        notify: `${BASE_DOMAIN}/api/payments/tinkoff/notification`,
        success: `${BASE_DOMAIN}/checkout/success`,
        fail: `${BASE_DOMAIN}/checkout/fail`,
    }
);
