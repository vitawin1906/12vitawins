// src/routes/addresses.routes.ts
import { Router } from 'express';
import { addressController } from '../controllers/addressController';

const addressesRouter = Router();

/**
 * @openapi
 * /api/addresses:
 *   get:
 *     tags: [Users]
 *     summary: Список адресов доставки текущего пользователя
 *     operationId: addresses_list
 *     security: [ { BearerAuth: [] } ]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
addressesRouter.get('/', ...addressController.list);

/**
 * @openapi
 * /api/addresses/default:
 *   get:
 *     tags: [Users]
 *     summary: Адрес доставки по умолчанию
 *     operationId: addresses_getDefault
 *     security: [ { BearerAuth: [] } ]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not Found, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
addressesRouter.get('/default', ...addressController.getDefault);

/**
 * @openapi
 * /api/addresses:
 *   post:
 *     tags: [Users]
 *     summary: Создать адрес доставки
 *     operationId: addresses_create
 *     security: [ { BearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               address: { type: string, minLength: 5, maxLength: 500 }
 *               city: { type: string, minLength: 2, maxLength: 100 }
 *               state: { type: string, minLength: 2, maxLength: 100 }
 *               zip: { type: string }
 *               country: { type: string }
 *               type: { type: string, enum: [home, work] }
 *               isDefault: { type: boolean }
 *             required: [name, address, city, zip, type]
 *           examples:
 *             example:
 *               value: { name: "Дом", address: "ул. Пушкина, д. 1", city: "Москва", zip: "123456", country: "Россия", type: "home", isDefault: true }
 *     responses:
 *       201: { description: Created, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       400: { description: Bad Request, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
addressesRouter.post('/', ...addressController.create);

/**
 * @openapi
 * /api/addresses/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Обновить адрес доставки
 *     operationId: addresses_update
 *     security: [ { BearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, additionalProperties: true }
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       400: { description: Bad Request, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not Found,  content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *   delete:
 *     tags: [Users]
 *     summary: Удалить адрес доставки
 *     operationId: addresses_delete
 *     security: [ { BearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } } ]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not Found,  content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
addressesRouter.put('/:id', ...addressController.update);
addressesRouter.delete('/:id', ...addressController.remove);

/**
 * @openapi
 * /api/addresses/{id}/set-default:
 *   post:
 *     tags: [Users]
 *     summary: Сделать адрес адресом по умолчанию
 *     operationId: addresses_setDefault
 *     security: [ { BearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: integer, minimum: 1 } } ]
 *     responses:
 *       200: { description: OK, content: { application/json: { schema: { $ref: '#/components/schemas/SuccessEnvelope' } } } }
 *       401: { description: Unauthorized, content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 *       404: { description: Not Found,  content: { application/json: { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
 */
addressesRouter.post('/:id/set-default', ...addressController.setDefault);

export default addressesRouter;
