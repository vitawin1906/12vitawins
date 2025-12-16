// src/services/telegramNotificationService.ts
import { usersStorage } from '#storage/usersStorage';

interface TelegramNotificationService {
    sendReferralNotification(referrerId: string, newReferral: { firstName?: string; username?: string } | null, level: number): Promise<void>;
    sendBonusNotification(userId: string, amount: number, sourceUserName: string, level: number): Promise<void>;
    // для совместимости с userService
    sendUpgradeNotification(userId: string, status: 'partner' | 'partner_pro'): Promise<void>;
    sendRankChangeNotification(userId: string, rank: 'member' | 'лидер' | 'создатель'): Promise<void>;
    send(userId: string, text: string): Promise<void>;
}

function escapeHtml(s: string) {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

class TelegramNotificationServiceImpl implements TelegramNotificationService {
    private botToken: string;
    private baseUrl: string;

    constructor() {
        this.botToken = process.env.TELEGRAM_BOT_TOKEN || '';
        this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    }

    /** Уведомление о новом реферале */
    async sendReferralNotification(referrerId: string, newReferral: { firstName?: string; username?: string } | null, level: number): Promise<void> {
        try {
            const referrer = await usersStorage.getUserById(referrerId);
            if (!referrer || !referrer.telegramId) {
                console.warn(`Не удалось найти Telegram ID для пользователя ${referrerId}`);
                return;
            }

            const levelText = level === 1 ? '1-го уровня' : level === 2 ? '2-го уровня' : `${level}-го уровня`;
            const bonusPercentage = level === 1 ? '20%' : level === 2 ? '5%' : '1%';

            const name = escapeHtml(newReferral?.firstName || newReferral?.username || 'Пользователь');
            const code = escapeHtml(referrer.referralCode ?? referrer.telegramId);

            const message =
                `🎉 <b>Новый реферал ${levelText}!</b>\n\n` +
                `👤 ${name} зарегистрировался по вашей ссылке\n` +
                `💰 Вы будете получать ${bonusPercentage} с каждой его покупки\n` +
                `🔗 Уровень: ${level}\n\n` +
                `💡 Ваш реферальный код: <code>${code}</code>\n` +
                `📊 Посмотреть статистику: /stats`;

            await this.sendMessage(String(referrer.telegramId), message);
            console.log(`✅ Referral уведомление => ${referrer.firstName ?? 'User'} (${referrer.telegramId})`);
        } catch (error) {
            console.error('Ошибка отправки уведомления о реферале:', error);
        }
    }

    /** Уведомление о начислении бонуса */
    async sendBonusNotification(userId: string, amount: number, sourceUserName: string, level: number): Promise<void> {
        try {
            const user = await usersStorage.getUserById(userId);
            if (!user || !user.telegramId) {
                console.warn(`Не удалось найти Telegram ID для пользователя ${userId}`);
                return;
            }

            const levelText = level === 1 ? '1-го уровня' : level === 2 ? '2-го уровня' : `${level}-го уровня`;
            const formattedAmount = amount.toFixed(2);
            const source = escapeHtml(sourceUserName);

            const message =
                `💰 <b>Начислен реферальный бонус!</b>\n\n` +
                `👤 От: ${source} (реферал ${levelText})\n` +
                `💵 Сумма: <b>${formattedAmount} ₽</b>\n` +
                `📈 Уровень: ${level}\n\n` +
                `💡 Бонус будет зачислен на ваш баланс после обработки\n` +
                `📊 Посмотреть все бонусы: /bonuses`;

            await this.sendMessage(String(user.telegramId), message);
            console.log(`✅ Bonus уведомление => ${user.firstName ?? 'User'} (${user.telegramId})`);
        } catch (error) {
            console.error('Ошибка отправки уведомления о бонусе:', error);
        }
    }

    /** Уведомление об апгрейде статуса (совместимость с userService) */
    async sendUpgradeNotification(userId: string, status: 'partner' | 'partner_pro'): Promise<void> {
        try {
            const user = await usersStorage.getUserById(userId);
            if (!user?.telegramId) return;

            const message =
                `🎉 <b>Апгрейд статуса</b>\n\n` +
                `Теперь вы: <b>${status === 'partner_pro' ? 'Partner PRO' : 'Partner'}</b>. ` +
                `Доступны новые бонусы и возможности.\n` +
                `📊 /stats`;

            await this.sendMessage(String(user.telegramId), message);
        } catch (e) {
            console.error('Ошибка отправки уведомления об апгрейде:', e);
        }
    }

    /** Уведомление о смене ранга (совместимость с userService) */
    async sendRankChangeNotification(userId: string, rank: 'member' | 'лидер' | 'создатель'): Promise<void> {
        try {
            const user = await usersStorage.getUserById(userId);
            if (!user?.telegramId) return;

            const message = `🏅 <b>Новый ранг:</b> <b>${escapeHtml(rank)}</b>\nПродолжайте в том же духе!`;
            await this.sendMessage(String(user.telegramId), message);
        } catch (e) {
            console.error('Ошибка отправки уведомления о ранге:', e);
        }
    }

    /** Универсальная отправка произвольного сообщения (fallback для сервисов) */
    async send(userId: string, text: string): Promise<void> {
        try {
            const user = await usersStorage.getUserById(userId);
            if (!user?.telegramId) return;
            await this.sendMessage(String(user.telegramId), text);
        } catch (e) {
            console.error('Ошибка универсальной отправки сообщения:', e);
        }
    }

    /** Низкоуровневая отправка сообщения пользователю */
    private async sendMessage(telegramId: string, text: string): Promise<void> {
        if (!this.botToken) {
            console.warn('Telegram бот не настроен — отсутствует TELEGRAM_BOT_TOKEN');
            return;
        }
        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: telegramId,
                    text,
                    parse_mode: 'HTML',
                    disable_web_page_preview: true,
                }),
            });

            if (!response.ok) {
                const errorData: any = await response.json().catch(() => ({}));
                console.error(`Ошибка Telegram API для пользователя ${telegramId}:`, errorData);

                const code = Number(errorData?.error_code);
                const desc = String(errorData?.description ?? '');

                if (code === 400 && desc.includes('chat not found')) {
                    console.log(`Пользователь ${telegramId} не начал диалог с ботом.`);
                } else if (code === 403) {
                    console.log(`Пользователь ${telegramId} заблокировал бота.`);
                }
            } else {
                console.log(`✅ Сообщение успешно отправлено пользователю ${telegramId}`);
            }
        } catch (error) {
            console.error('Ошибка при отправке сообщения в Telegram:', error);
        }
    }
}

export const telegramNotificationService: TelegramNotificationService = new TelegramNotificationServiceImpl();
