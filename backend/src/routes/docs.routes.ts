import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import * as fs from "node:fs";
import * as path from "node:path";

export const docsRouter = Router();

docsRouter.use("/docs", (req, res, next) => {
    const specPath = path.resolve(process.cwd(), "openapi.json");
    if (!fs.existsSync(specPath)) return res.status(500).send("openapi.json not built");
    const spec = JSON.parse(fs.readFileSync(specPath, "utf8"));
    return swaggerUi.serve(req, res, () => swaggerUi.setup(spec)(req, res, next));
});
