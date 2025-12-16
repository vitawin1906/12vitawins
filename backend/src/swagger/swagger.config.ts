import swaggerJSDoc from 'swagger-jsdoc';

const swaggerOptions = {
    definition: {
        openapi: '3.1.0',
        info: {
            title: 'VitaWin API',
            version: '1.0.0',
            description: 'Документация REST API для Vitawin Backend',
        },
        servers: [
            { url: 'http://localhost:8000', description: 'Local Dev Server' },
        ],
    },
    apis: [
        'src/routes/**/*.ts',
        'src/controllers/**/*.ts',
        'src/**/routes/**/*.ts',
        'src/**/controllers/**/*.ts',
    ],
} as const; // 👈 добавили as const — чтобы TS не ругался на типизацию

export const swaggerSpec = swaggerJSDoc(swaggerOptions as any); // 👈 привели к any
