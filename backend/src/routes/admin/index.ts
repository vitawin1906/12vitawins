import { Router } from 'express';
import { wrap } from '../../utils/response';
import { adminAuditLogsController } from '../../controllers/adminAuditLogsController';

type AnyRouter = unknown;

function stub(name: string): Router {
  const r = Router();
  r.get('/_ping', (_req, res) => res.json({ ok: true, module: name }));
  return r;
}

// Express Router — это вызовная функция с методом .use
function normalizeRouter(candidate: AnyRouter): Router | null {
  if (!candidate) return null;
  // default export как функция-роутер
  if (typeof candidate === 'function' && typeof (candidate as any).use === 'function') {
    return candidate as Router;
  }
  // модуль с default внутри
  const def = (candidate as any)?.default;
  if (typeof def === 'function' && typeof def.use === 'function') {
    return def as Router;
  }
  return null;
}

async function tryImport(path: string): Promise<Router | null> {
  try {
    const mod = await import(path);
    return normalizeRouter(mod) ?? null;
  } catch {
    return null;
  }
}

async function resolveModule(paths: string[], stubName: string): Promise<Router> {
  for (const p of paths) {
    const r = await tryImport(p);
    if (r) return r;
  }
  return stub(stubName);
}


export async function buildAdminRouter(): Promise<Router> {
    const adminRouter = Router();

    const categoriesRoutes = await resolveModule(
        ['../../modules/categories/routes'],
        'categories'
    );
    const ordersRoutes = await resolveModule(
        ['../../modules/orders/routes'],
        'orders'
    );
    const usersRoutes = await resolveModule(
        ['../../modules/admin/users/routes', '../../modules/users/routes'],
        'users'
    );
    const ledgerRoutes = await resolveModule(
        ['../../modules/ledger/routes'],
        'ledger'
    );
    const withdrawalsRoutes = await resolveModule(
        ['../../modules/withdrawals/routes'],
        'withdrawals'
    );
    const uploadsRoutes = await resolveModule(
        ['../../modules/uploads/routes'],
        'uploads'
    );
    const productsRoutes = await resolveModule(
        ['../../modules/products/routes'],
        'products'
    );

    adminRouter.get('/health', wrap(async (_req, res) =>
        res.json({ ok: true, scope: 'admin', ts: new Date().toISOString() })
    ));

    // Admin Audit Logs endpoint
    adminRouter.get('/audit-logs', ...adminAuditLogsController.list);

    adminRouter.use('/categories', categoriesRoutes);
    adminRouter.use('/orders', ordersRoutes);
    adminRouter.use('/users', usersRoutes);
    adminRouter.use('/ledger', ledgerRoutes);
    adminRouter.use('/withdrawals', withdrawalsRoutes);
    adminRouter.use('/uploads', uploadsRoutes);
    adminRouter.use('/products', productsRoutes);

    return adminRouter;
}

export default buildAdminRouter;
