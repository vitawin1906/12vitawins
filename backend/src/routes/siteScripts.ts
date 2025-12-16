import { Router } from 'express';
import { ok, wrap } from '../utils/response';

const siteScriptsRouter = Router();

siteScriptsRouter.get('/api/site-scripts', wrap(async (_req, res) => {
  // Minimal config payload for client-side dynamic scripts/configs
  res.json(ok({ scripts: [] }));
}));

export default siteScriptsRouter;
