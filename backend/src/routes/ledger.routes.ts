// backend/src/routes/ledger.routes.ts
import { Router, type RequestHandler } from 'express';
import { ledgerController } from '../controllers/ledgerController';

const toHandlers = (h: RequestHandler | RequestHandler[]): RequestHandler[] =>
    Array.isArray(h) ? h : [h];

/* ───────────────── User Ledger Routes ───────────────── */
export const ledgerRouter = Router();

ledgerRouter.get('/my-accounts', ...toHandlers(ledgerController.getMyAccounts));
ledgerRouter.get('/my-transactions', ...toHandlers(ledgerController.getMyTransactions));

/* ───────────────── Admin Routes ───────────────── */
export const adminLedgerRouter = Router();

adminLedgerRouter.get('/accounts', ...toHandlers(ledgerController.listAllAccounts));
adminLedgerRouter.get('/accounts/:userId', ...toHandlers(ledgerController.getUserAccounts));
adminLedgerRouter.get('/transactions/:userId', ...toHandlers(ledgerController.getUserTransactions));

export default ledgerRouter;
