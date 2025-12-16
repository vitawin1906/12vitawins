import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_SUPPORT_BOT_TOKEN;
const apiUrl = process.env.API_URL || 'http://app:5000';
const appUrl = process.env.APP_URL || 'https://vitawins.ru';
const supportAdmins = process.env.SUPPORT_ADMINS ? process.env.SUPPORT_ADMINS.split(',') : [];

if (!token) {
  console.error('❌ TELEGRAM_SUPPORT_BOT_TOKEN не установлен');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🆘 VitaWin бот поддержки запущен');

// Команда /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name;

  const welcomeMessage = `
🆘 Добро пожаловать в службу поддержки VitaWin!

Здравствуйте, ${firstName}! Я помогу вам с любыми вопросами.

❓ Выберите тему вашего вопроса:
  `;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🛒 Заказы и доставка', callback_data: 'orders' },
        { text: '💰 Реферальная программа', callback_data: 'referral' }
      ],
      [
        { text: '📱 Проблемы с приложением', callback_data: 'app_issues' },
        { text: '💳 Оплата', callback_data: 'payment' }
      ],
      [
        { text: '👤 Личный кабинет', callback_data: 'account' },
        { text: '🤝 Связаться с менеджером', callback_data: 'manager' }
      ]
    ]
  };

  await bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: keyboard
  });
});

// Обработка callback кнопок
bot.on('callback_query', async (callbackQuery) => {
  const { data, message } = callbackQuery;
  const chatId = message.chat.id;

  const responses = {
    orders: `
📦 ЗАКАЗЫ И ДОСТАВКА

• Статус заказа можно проверить в личном кабинете
• Доставка осуществляется в течение 3-7 рабочих дней
• Отслеживание посылки доступно после отправки

🔗 Проверить заказ: ${appUrl}/account
    `,
    
    referral: `
💰 РЕФЕРАЛЬНАЯ ПРОГРАММА

• За каждого приглашенного друга - бонус 20%
• Скидка приглашенному - 10%  
• Многоуровневая система вознаграждений

📊 Ваша статистика: ${appUrl}/account/referrals
    `,
    
    app_issues: `
📱 ПРОБЛЕМЫ С ПРИЛОЖЕНИЕМ

• Попробуйте обновить страницу
• Очистите кеш браузера
• Проверьте интернет-соединение

Если проблема не решилась - свяжитесь с менеджером
    `,
    
    payment: `
💳 ОПЛАТА

• Принимаем карты Visa, MasterCard, МИР
• Оплата через СБП
• Безопасные платежи через Тинькофф

Проблемы с оплатой? Напишите менеджеру!
    `,
    
    account: `
👤 ЛИЧНЫЙ КАБИНЕТ

• Вход через Telegram автоматический
• Все данные синхронизируются
• История заказов и бонусов

🔗 Открыть: ${appUrl}/account
    `,
    
    manager: `
🤝 СВЯЗЬ С МЕНЕДЖЕРОМ

Для решения сложных вопросов напишите сообщение ниже.
Менеджер ответит в течение 1-2 часов в рабочее время.

⏰ Рабочие часы: 9:00 - 18:00 (МСК)
    `
  };

  const response = responses[data];
  if (response) {
    await bot.sendMessage(chatId, response);
  }

  await bot.answerCallbackQuery(callbackQuery.id);
});

// Обработка текстовых сообщений для связи с менеджером
bot.on('message', async (msg) => {
  if (msg.text && !msg.text.startsWith('/')) {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    
    // Пересылаем сообщение администраторам
    const forwardMessage = `
💬 НОВОЕ СООБЩЕНИЕ ПОДДЕРЖКЕ

👤 От: ${firstName} (@${username})
💬 Сообщение: ${msg.text}

Ответить: /reply_${chatId}
    `;

    // Отправляем админам (если настроены)
    for (const adminId of supportAdmins) {
      try {
        await bot.sendMessage(adminId, forwardMessage);
      } catch (error) {
        console.error(`❌ Не удалось отправить админу ${adminId}:`, error.message);
      }
    }

    // Подтверждение пользователю
    await bot.sendMessage(chatId, 
      '✅ Ваше сообщение передано менеджеру. Ответ поступит в ближайшее время!'
    );
  }
});

// Обработка ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота поддержки:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Остановка бота поддержки...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, остановка бота...');
  bot.stopPolling();
  process.exit(0);
});