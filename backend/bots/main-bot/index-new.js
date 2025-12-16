import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const apiUrl = process.env.API_URL || 'http://app:5000';
const appUrl = process.env.APP_URL || 'https://vitawins.ru';

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен');
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

console.log('🤖 VitaWin основной бот запущен (НОВАЯ ВЕРСИЯ)');

// Команда /start с поддержкой авторизации
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;
  const parameter = match[1];

  console.log(`📱 Пользователь: ${firstName} (@${username}), параметр: ${parameter}`);

  try {
    // Проверяем, если это запрос на авторизацию
    if (parameter === 'auth') {
      console.log('🔑 Запрос на авторизацию');
      
      // Генерируем JWT токен через новый API
      const authResponse = await axios.post(`${apiUrl}/api/auth/telegram-bot-login`, {
        telegram_id: userId,
        first_name: firstName,
        username: username
      });

      if (authResponse.data.success) {
        const { authToken, user } = authResponse.data;
        
        const authMessage = `
🔐 **Токен авторизации сгенерирован!**

👋 Привет, ${firstName}!
💰 Ваш баланс: ${user.balance}₽
🔗 Реферальный код: \`${user.referral_code}\`

🔑 **Ваш токен авторизации:**
\`${authToken}\`

⚠️ *Храните токен в безопасности*
        `;

        const authKeyboard = {
          inline_keyboard: [
            [
              { 
                text: '🚀 Авторизоваться на сайте', 
                url: `${appUrl}/auth?token=${encodeURIComponent(authToken)}` 
              }
            ],
            [
              { text: '🛒 Магазин', web_app: { url: `${appUrl}/store` } },
              { text: '👤 Личный кабинет', web_app: { url: `${appUrl}/account` } }
            ]
          ]
        };

        await bot.sendMessage(chatId, authMessage, {
          parse_mode: 'Markdown',
          reply_markup: authKeyboard
        });
      } else {
        await bot.sendMessage(chatId, '❌ Ошибка при генерации токена авторизации');
      }
      
      return;
    }

    // Обычный /start - регистрация и приветствие
    const response = await axios.post(`${apiUrl}/api/auth/telegram-bot-login`, {
      telegram_id: userId,
      first_name: firstName,
      username: username
    });

    if (response.data.success) {
      const user = response.data.user;
      
      const welcomeMessage = `
🎉 **Добро пожаловать в VitaWin, ${firstName}!**

💎 Премиальные витамины и БАДы для вашего здоровья

🔗 **Ваш реферальный код:** \`${user.referral_code}\`
💰 **Текущий баланс:** ${user.balance}₽

📈 **Реферальная программа:**
• 20% с первого уровня
• 5% со второго уровня  
• 1% с третьего уровня

🚀 Пригласите друзей и зарабатывайте!
      `;

      const keyboard = {
        inline_keyboard: [
          [
            { text: '🛒 Магазин', web_app: { url: `${appUrl}/store` } },
            { text: '👤 Личный кабинет', web_app: { url: `${appUrl}/account` } }
          ],
          [
            { text: '📞 Поддержка', callback_data: 'support' },
            { text: 'ℹ️ О компании', callback_data: 'about' }
          ]
        ]
      };

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      await bot.sendMessage(chatId, '❌ Произошла ошибка при регистрации. Попробуйте позже.');
    }

  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (callbackQuery) => {
  const { data, message } = callbackQuery;
  const chatId = message.chat.id;

  switch (data) {
    case 'support':
      await bot.sendMessage(chatId, 
        '📞 Для получения поддержки обратитесь к боту: @vitawin_support_bot'
      );
      break;
      
    case 'about':
      await bot.sendMessage(chatId, `
🏢 О компании VitaWin

Мы производим премиум продукты для здоровья и красоты.

🌟 Наши преимущества:
• Натуральные ингредиенты
• Сертифицированное качество  
• MLM партнерская программа
• Бонусы за рефералов

🌐 Сайт: ${appUrl}
      `);
      break;
  }

  // Отвечаем на callback query, чтобы убрать loading
  await bot.answerCallbackQuery(callbackQuery.id);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Останавливаем бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Останавливаем бота...');
  bot.stopPolling();
  process.exit(0);
});