// backend/src/controllers/ledgerController.ts
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { requireAdmin } from '../middleware/rbacMiddleware';
import { asyncHandler, AppError, AppErrorCode } from '../middleware/errorHandler';
import { ledgerStorage, type LedgerPostingView } from '#storage/ledgerStorage';

/* ───────────────── Validation Schemas ───────────────── */

const GetBalanceQuery = z.object({
    currency: z.enum(['RUB', 'VWC', 'PV']),
    type: z.enum(['cash_rub', 'pv', 'vwc', 'referral', 'reserve_special', 'network_fund']),
});

const ListTransactionsQuery = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

const UserIdParam = z.object({ userId: z.string().uuid() });
const TypeParam = z.object({ type: z.string().min(1) });

/* ───────────────── Ledger Controller ───────────────── */

export const ledgerController = {
    /** GET /api/ledger/my-accounts */
    getMyAccounts: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;

            const rubAcc = await ledgerStorage.ensureAccount(userId, 'RUB', 'cash_rub', 'user');
            const vwcAcc = await ledgerStorage.ensureAccount(userId, 'VWC', 'vwc', 'user');
            const pvAcc  = await ledgerStorage.ensureAccount(userId, 'PV',  'pv',  'user');

            const [rubBal, vwcBal, pvBal] = await Promise.all([
                ledgerStorage.getBalance(rubAcc.id),
                ledgerStorage.getBalance(vwcAcc.id),
                ledgerStorage.getBalance(pvAcc.id),
            ]);

            return res.json({
                success: true,
                accounts: [
                    { id: rubAcc.id, currency: 'RUB', type: 'cash_rub', balance: rubBal.toFixed(2) },
                    { id: vwcAcc.id, currency: 'VWC', type: 'vwc',     balance: vwcBal.toFixed(2) },
                    { id: pvAcc.id,  currency: 'PV',  type: 'pv',      balance: pvBal.toFixed(0) },
                ],
            });
        }),
    ],

    /** GET /api/ledger/my-accounts/:type/balance */
    getMyAccountBalance: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { type } = TypeParam.parse(req.params);
            const { currency, type: t } = GetBalanceQuery.parse({ ...req.query, type });

            const acc = await ledgerStorage.ensureAccount(userId, currency, t, 'user');
            const bal = await ledgerStorage.getBalance(acc.id);

            return res.json({
                success: true,
                account: {
                    id: acc.id,
                    currency,
                    type: t,
                    balance: currency === 'PV' ? bal.toFixed(0) : bal.toFixed(2),
                },
            });
        }),
    ],

    /** GET /api/ledger/my-transactions */
    getMyTransactions: [
        authMiddleware,
        asyncHandler(async (req: Request, res: Response) => {
            const userId = req.user!.id;
            const { limit, offset } = ListTransactionsQuery.parse(req.query);

            const transactions = await ledgerStorage.listUserTransactions(userId, { limit, offset });

            return res.json({
                success: true,
                transactions: transactions.map((t: LedgerPostingView) => ({
                    id: t.id,
                    opType: t.opType,
                    currency: t.currency,
                    amount: t.amount,
                    createdAt: t.createdAt,
                    memo: t.memo,
                    operationId: t.operationId,
                })),
                pagination: { limit, offset },
            });
        }),
    ],

    /* ───────────────── Admin Ledger ───────────────── */

    /** GET /api/admin/ledger/accounts */
    listAllAccounts: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { limit, offset } = ListTransactionsQuery.parse(req.query);

            const accounts = await ledgerStorage.listAllAccounts({ limit, offset });
            const accountsWithBalances = await Promise.all(
                accounts.map(async (acc) => {
                    const bal = await ledgerStorage.getBalance(acc.id);
                    return {
                        id: acc.id,
                        ownerId: acc.ownerId,
                        ownerType: acc.ownerType,
                        currency: acc.currency,
                        type: acc.type,
                        balance: bal.toFixed(2),
                    };
                }),
            );

            return res.json({ success: true, accounts: accountsWithBalances, pagination: { limit, offset } });
        }),
    ],

    /** GET /api/admin/ledger/accounts/:userId */
    getUserAccounts: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = UserIdParam.parse(req.params);

            const accounts = await ledgerStorage.listAccounts(userId);
            const withBalances = await Promise.all(
                accounts.map(async (a) => ({
                    id: a.id,
                    ownerType: a.ownerType,
                    ownerId: a.ownerId,
                    type: a.type,
                    currency: a.currency,
                    balance: await ledgerStorage.getBalance(a.id),
                })),
            );

            return res.json({ success: true, accounts: withBalances });
        }),
    ],

    /** GET /api/admin/ledger/transactions/:userId */
    getUserTransactions: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { userId } = UserIdParam.parse(req.params);
            const { limit, offset } = ListTransactionsQuery.parse(req.query);

            const items = await ledgerStorage.listUserTransactions(userId, { limit, offset });
            return res.json({
                success: true,
                items,
                pagination: { limit, offset },
            });
        }),
    ],

    /** GET /api/admin/ledger/transactions */
    listAllTransactions: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (req: Request, res: Response) => {
            const { limit, offset } = ListTransactionsQuery.parse(req.query);

            const transactions = await ledgerStorage.listAllTransactions({ limit, offset });

            return res.json({
                success: true,
                transactions: transactions.map((t: LedgerPostingView) => ({
                    id: t.id,
                    opType: t.opType,
                    currency: t.currency,
                    amount: t.amount,
                    createdAt: t.createdAt,
                    memo: t.memo,
                    operationId: t.operationId,
                })),
                pagination: { limit, offset },
            });
        }),
    ],

    /** POST /api/admin/ledger/manual-posting */
    createManualPosting: [
        authMiddleware,
        requireAdmin,
        asyncHandler(async (_req: Request, _res: Response) => {
            throw new AppError(
                AppErrorCode.VALIDATION_ERROR,
                'Manual posting not implemented for safety reasons',
                501,
            );
        }),
    ],
};

export default ledgerController;
