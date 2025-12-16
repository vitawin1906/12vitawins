import type { Request, Response } from 'express';
import { usersStorage } from '#storage/usersStorage';
import { generateJWT } from '../middleware/auth';

/** Типизированный ответ Telegram API */
type TelegramApiResponse<T = unknown> = {
    ok: boolean;
    result?: T;
    description?: string;
    error_code?: number;
};

interface TelegramUser {
    id: string;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

interface TelegramMessage {
    message_id: string;
    from: TelegramUser;
    chat: { id: string; type: string };
    date: number;
    text?: string;
}

interface TelegramUpdate {
    update_id: string;
    message?: TelegramMessage;
    callback_query?: {
        id: string;
        from: TelegramUser;
        message?: TelegramMessage;
        data?: string;
    };
}

/* ───────── helpers ───────── */

function asStr(x: unknown) { return x == null ? '' : String(x); }
function getFirstName(u: any) { return asStr(u?.first_name ?? u?.firstName ?? ''); }
function getUsername(u: any): string | null { return u?.username ?? null; }

function getTelegramId(u: any): string {
    if (u?.telegramId) return String(u.telegramId);
    if (u?.telegram_id) return String(u.telegram_id);
    if (typeof u?.id === 'number') return String(u.id);
    if (typeof u?.id === 'string' && /^\d+$/.test(u.id)) return u.id;
    return '';
}

async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: any) {
    try {
        const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, reply_markup: replyMarkup, parse_mode: 'HTML' }),
        });
        const result = (await response.json()) as TelegramApiResponse;
        if (!result.ok) console.error('Telegram API error:', result);
        return result;
    } catch (error) {
        console.error('Error sending telegram message:', error);
        return { ok: false, error } as unknown as TelegramApiResponse;
    }
}

function createKeyboard(user: any) {
    const firstName = encodeURIComponent(getFirstName(user));
    const username = getUsername(user) ? encodeURIComponent(getUsername(user)!) : '';
    const telegramId = getTelegramId(user);

    const baseUrl = 'https://vitawins.ru';
    return {
        inline_keyboard: [
            [{ text: '🛒 Открыть магазин', url: `${baseUrl}?tg_id=${telegramId}&first_name=${firstName}&username=${username}` }],
            [
                { text: '👤 Личный кабинет', url: `${baseUrl}/account?tg_id=${telegramId}&first_name=${firstName}&username=${username}` },
                { text: '📊 Рефералы',       url: `${baseUrl}/account?tg_id=${telegramId}&first_name=${firstName}&username=${username}#referrals` },
            ],
            [
                { text: '📞 Поддержка',    callback_data: 'support' },
                { text: 'ℹ️ О компании',   callback_data: 'about' },
            ],
        ],
    };
}

/* ───────── Controller ───────── */

class TelegramController {
    async webhook(req: Request, res: Response) {
        try {
            const update: TelegramUpdate = req.body;

            // Callback queries
            if (update.callback_query) {
                const { data, message } = update.callback_query;
                const chatId = message?.chat.id;
                if (!chatId) return res.status(200).json({ ok: true });

                switch (data) {
                    case 'support':
                        await sendTelegramMessage(chatId, `🤝 Обращение в службу поддержки:

Для получения помощи обратитесь к боту поддержки:
👨‍💼 @vitawin_support_bot

Или свяжитесь напрямую:
📱 Телефон: +7 (999) 123-45-67
📧 Email: support@vitawins.ru
💬 Telegram: @vitawin_manager

⏰ Время работы: ПН-ПТ 9:00-18:00 (МСК)`);
                        break;

                    case 'about':
                        await sendTelegramMessage(chatId, `ℹ️ О компании VitaWin:

🏢 VitaWin — производитель премиальных витаминов и БАДов.

🌟 Преимущества:
• Высокое качество
• Собственное производство
• Сертификация GMP
• Научная база

💰 Реферальная программа:
• 20% первый уровень
• 5% второй
• 1% третий

🚀 Присоединяйтесь!`);
                        break;

                    default:
                        await sendTelegramMessage(chatId, '❌ Неизвестная команда');
                }
                return res.status(200).json({ ok: true });
            }

            // Обычные сообщения
            const msg = update.message;
            if (!msg || !msg.text) return res.status(200).json({ ok: true });

            const tgUser = msg.from;
            const text = msg.text.trim();

            // /start
            if (text === '/start' || text.startsWith('/start ')) {
                try {
                    const telegramId = getTelegramId(tgUser);
                    if (!telegramId) {
                        await sendTelegramMessage(msg.chat.id, '❌ Не удалось определить ваш Telegram ID.');
                        return res.status(200).json({ ok: true });
                    }

                    let existingUser = await usersStorage.getUserByTelegramId(telegramId);

                    if (!existingUser) {
                        const referralCode = telegramId; // свой код = telegramId
                        await usersStorage.createUser({
                            telegramId,
                            firstName: tgUser.first_name ?? null,
                            username: tgUser.username ?? null,
                            referralCode,
                            referrerId: null,
                        });

                        const welcome = `🎉 Добро пожаловать в VitaWin, ${tgUser.first_name || ''}!

🎯 Ваш реферальный код: <code>${referralCode}</code>

💡 Делитесь кодом и получайте комиссию!

📱 Используйте кнопки ниже:`;
                        const kb = createKeyboard({ telegramId, first_name: tgUser.first_name, username: tgUser.username });
                        await sendTelegramMessage(msg.chat.id, welcome, kb);
                    } else {
                        const code = existingUser.referralCode || telegramId;
                        const kb = createKeyboard(existingUser);
                        const m = `👋 Добро пожаловать, ${existingUser.firstName || ''}!

🎯 Ваш реферальный код: <code>${code}</code>

📱 Выберите действие ниже:`;
                        await sendTelegramMessage(msg.chat.id, m, kb);
                    }
                } catch (err) {
                    console.error('Error handling /start:', err);
                    await sendTelegramMessage(msg.chat.id, '❌ Ошибка. Попробуйте позже.');
                }
            }

            // /menu
            if (text === '/menu') {
                try {
                    const telegramId = getTelegramId(tgUser);
                    const existingUser = telegramId ? await usersStorage.getUserByTelegramId(telegramId) : null;

                    if (!existingUser) {
                        await sendTelegramMessage(msg.chat.id, '❌ Сначала напишите /start боту @vitawin_bot');
                        return res.status(200).json({ ok: true });
                    }

                    const menu = `📋 Главное меню VitaWin:

🎯 Ваш реферальный код: <code>${existingUser.referralCode || telegramId}</code>

Выберите опцию:`;
                    const kb = createKeyboard(existingUser);
                    await sendTelegramMessage(msg.chat.id, menu, kb);
                } catch (err) {
                    console.error('Error handling /menu:', err);
                    await sendTelegramMessage(msg.chat.id, '❌ Ошибка. Попробуйте позже.');
                }
            }

            return res.status(200).json({ ok: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            return res.status(500).json({ ok: false, error: 'Internal server error' });
        }
    }

    // Авторизация через Telegram для веб-приложения
    async telegramAuth(req: Request, res: Response) {
        try {
            const { telegram_id } = req.body;
            if (!telegram_id) return res.status(400).json({ success: false, error: 'Telegram ID обязателен' });

            const user = await usersStorage.getUserByTelegramId(String(telegram_id));
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'Пользователь не найден. Сначала напишите /start боту @vitawin_bot',
                });
            }

            const token = generateJWT({ id: user.id, isAdmin: !!user.isAdmin });

            return res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    telegram_id: user.telegramId,
                    first_name: user.firstName,
                    username: user.username,
                    referral_code: user.referralCode,
                },
            });
        } catch (error) {
            console.error('Error in telegram auth:', error);
            return res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    }

    async setWebhook(_req: Request, res: Response) {
        try {
            const REPLIT_DOMAIN =
                process.env.REPLIT_DOMAINS ||
                '15b86ffd-8123-4786-9a33-4c6dce6c1a67-00-11b7k921y9q0c.picard.replit.dev';
            const webhookUrl = `https://${REPLIT_DOMAIN}/api/telegram/webhook`;

            const botInfoResponse = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`);
            const botInfo = (await botInfoResponse.json()) as TelegramApiResponse;
            if (!botInfo?.ok) return res.status(400).json({ success: false, error: 'Неверный токен бота' });

            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/setWebhook`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: webhookUrl, allowed_updates: ['message', 'callback_query'] }),
            });

            const result = (await response.json()) as TelegramApiResponse;
            if (result?.ok) {
                return res.json({ success: true, message: 'Webhook установлен успешно', webhook_url: webhookUrl, bot_info: botInfo.result });
            }
            return res.status(400).json({ success: false, error: result?.description || 'Ошибка при установке webhook' });
        } catch (error) {
            console.error('Error setting webhook:', error);
            return res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    }

    async deleteWebhook(_req: Request, res: Response) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/deleteWebhook`, { method: 'POST' });
            const result = (await response.json()) as TelegramApiResponse;
            if (result?.ok) return res.json({ success: true, message: 'Webhook удален успешно' });
            return res.status(400).json({ success: false, error: result?.description || 'Ошибка при удалении webhook' });
        } catch (error) {
            console.error('Error deleting webhook:', error);
            return res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    }

    async getWebhookInfo(_req: Request, res: Response) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getWebhookInfo`);
            const result = (await response.json()) as TelegramApiResponse;
            if (result?.ok) return res.json(result);
            return res.status(400).json({ success: false, error: result?.description || 'Ошибка при получении информации о webhook' });
        } catch (error) {
            console.error('Error getting webhook info:', error);
            return res.status(500).json({ success: false, error: 'Ошибка сервера' });
        }
    }

    async setupBot(_req: Request, res: Response) {
        return res.json({ success: true, message: 'Бот настроен' });
    }

    async startPolling(_req: Request, res: Response) {
        return res.json({ success: true, message: 'Polling запущен' });
    }
}

export const telegramController = new TelegramController();
