// backend/src/docs/openapi.ts
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
// если в swagger.config экспорт default — используйте: import swaggerSpec from '../swagger/swagger.config';
import { swaggerSpec } from '../swagger/swagger.config';
import { readFileSync } from 'node:fs';
// ✅ совместимо без esModuleInterop


const ROUTE_REGEX = /\.(?:get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
const enriched: any = {
    openapi: '3.1.0',
    ...swaggerSpec,
    info: {
        title: 'VitaWin API',
        version: '1.0.0',
        description: 'Документация REST API для Vitawin Backend',
        // ✅ добавили identifier, чтобы Redocly не ругался
        license: { name: 'Proprietary', identifier: 'LicenseRef-Proprietary' },
        ...(swaggerSpec.info || {}),
    },
    // Берём сервера из swaggerSpec, но выкидываем localhost, чтобы убрать варнинг
    servers: [
        { url: 'https://api.vitawin.kg', description: 'Production' },
        ...(process.env.OPENAPI_INCLUDE_LOCALHOST === 'true'
            ? [{ url: 'http://localhost:8000', description: 'Local Dev' }]
            : [])
    ],
    components: {
        ...(swaggerSpec.components || {}),
        securitySchemes: {
            ...(swaggerSpec.components?.securitySchemes || {}),
            BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        },
        schemas: {
            ...(swaggerSpec.components?.schemas || {}),
            // Оставляем только реально используемое — удалили неиспользуемые DateTime/Percent0to100/ImageItem/Pagination,
            // чтобы не было варнингов no-unused-components.
            UUID: { type: 'string', format: 'uuid', example: 'd290f1ee-6c54-4b01-90e6-d701748f0851' },
            MoneyString: { type: 'string', description: 'Денежная строка с двумя знаками после запятой', example: '1234.56' },
            SuccessEnvelope: {
                type: 'object',
                description: 'Единый успешный ответ.',
                properties: { success: { type: 'boolean', example: true }, data: { description: 'Полезная нагрузка' } },
                required: ['success'],
                additionalProperties: true,
            },
            ErrorResponse: {
                type: 'object',
                description: 'Унифицированная ошибка (см. AppErrorCode).',
                properties: {
                    success: { type: 'boolean', example: false },
                    code: { type: 'string', example: 'VALIDATION_ERROR' },
                    message: { type: 'string', example: 'Invalid input' },
                    status: { type: 'integer', example: 400 },
                    details: { description: 'Произвольные детали' },
                    traceId: { type: 'string', example: 'req-abc123' },
                },
                required: ['success', 'code', 'message', 'status'],
                additionalProperties: true,
            },
        },
    },
    tags: swaggerSpec.tags || [
        { name: 'Auth' }, { name: 'Users' }, { name: 'Products' }, { name: 'Orders' }, { name: 'Payments' },
        { name: 'Wallet' }, { name: 'Withdrawals' }, { name: 'Media' }, { name: 'Reviews' }, { name: 'MLM' },
        { name: 'Settings' }, { name: 'Categories' },
    ],
    paths: swaggerSpec.paths || {},
};

// --- автодобавление 4XX-ответов для всех операций (и 401/403 для защищённых) ---
type Method = 'get'|'post'|'put'|'patch'|'delete'|'options'|'head';
function ensure4xx(op: any) {
    op.responses = op.responses ?? {};
    const has4xx = Object.keys(op.responses).some((c) => c.startsWith('4'));
    const add = (code: string, description: string) => {
        op.responses[code] = op.responses[code] ?? {
            description,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
        };
    };
    if (!has4xx) add('400', 'Bad Request');
    const secured = Array.isArray(op.security) && op.security.length > 0;
    if (secured) { add('401', 'Unauthorized'); add('403', 'Forbidden'); }
}
if (enriched.paths) {
    for (const p of Object.keys(enriched.paths)) {
        const item = enriched.paths[p] as Record<Method, any>;
        (['get','post','put','patch','delete','options','head'] as Method[]).forEach((m) => {
            if (item?.[m]) ensure4xx(item[m]);
        });
    }
}

// --- записать в корень репо: openapi.json
const outPath = resolve(process.cwd(), 'openapi.json');
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(enriched, null, 2), 'utf8');
console.log('✅ OpenAPI spec generated at', outPath);
