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

console.log('🤖 VitaWin основной бот запущен');

// Команда /start
bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;
  const referralCode = match[1];

  console.log(`📱 Новый пользователь: ${firstName} (@${username})`);

  try {
    // Регистрируем пользователя через API
    const response = await axios.post(`${apiUrl}/api/auth/telegram`, {
      telegram_id: userId,
      username,
      first_name: firstName,
      last_name: lastName,
      referral_code: referralCode
    });

    const user = response.data.user;
    
    const welcomeMessage = `
🎉 Добро пожаловать в VitaWin, ${firstName}!

Ваш реферальный код: \`${user.referral_code}\`

🔗 Поделитесь своей ссылкой:
${appUrl}?ref=${user.referral_code}

💰 За каждого приглашенного друга вы получаете бонусы!
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

  } catch (error) {
    console.error('❌ Ошибка регистрации:', error.message);
    await bot.sendMessage(chatId, '❌ Произошла ошибка при регистрации. Попробуйте позже.');
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

  await bot.answerCallbackQuery(callbackQuery.id);
});

// Обработка ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Остановка основного бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Получен SIGTERM, остановка бота...');
  bot.stopPolling();
  process.exit(0);
});