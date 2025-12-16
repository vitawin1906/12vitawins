import TelegramBot from 'node-telegram-bot-api';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Загружаем переменные окружения
dotenv.config();

// Получаем токен бота из переменных окружения
console.log('🔍 Доступные переменные окружения:', Object.keys(process.env).filter(k => k.includes('TELEGRAM')));
const token = process.env.TELEGRAM_BOT_TOKEN;
console.log('🔑 Токен бота:', token ? `${token.substring(0, 10)}...` : 'НЕ НАЙДЕН');
const apiUrl = process.env.API_URL || 'http://localhost:5000';
const appUrl = process.env.APP_URL || 'https://vitawins.ru';

if (!token) {
  console.error('❌ TELEGRAM_BOT_TOKEN не установлен в переменных окружения');
  console.error('🔍 Проверьте переменные окружения Docker контейнера');
  process.exit(1);
}

const bot = new TelegramBot(token, { 
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
    }
  }
});

// Обработка ошибок бота
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error.message);
  if (error.message.includes('401')) {
    console.error('🚫 Токен бота недействителен или заблокирован');
    console.error('💡 Создайте новый бот через @BotFather');
  }
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

console.log('🤖 VitaWin основной бот запущен');

// Обработка команды /start
bot.onText(/\/start(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const user = msg.from;
  const param = match[1] ? match[1].trim() : '';
  
  console.log(`📱 Команда /start от пользователя: ${user.first_name} (${user.id}), параметр: "${param}"`);
  
  if (param === 'auth') {
    // Режим авторизации - генерируем JWT токен
    try {
      const response = await fetch(`${apiUrl}/api/auth/telegram-bot-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: user.id,
          first_name: user.first_name,
          username: user.username
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        bot.sendMessage(chatId, `🔐 *Авторизация VitaWin*\n\n👋 Привет, ${user.first_name}!\n💰 Баланс: ${data.user.balance}₽\n🔗 Реферальный код: ${data.user.referral_code}\n\n✅ Нажмите кнопку для входа:`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '🚀 Войти на сайт', url: `${appUrl}/auth?token=${data.authToken}` }
            ]]
          }
        });
      } else {
        bot.sendMessage(chatId, '❌ Ошибка авторизации. Попробуйте позже.');
      }
    } catch (error) {
      console.error('Ошибка API:', error);
      bot.sendMessage(chatId, '❌ Ошибка соединения с сервером.');
    }
  } else {
    // Обычная регистрация/приветствие
    bot.sendMessage(chatId, `🎉 *Добро пожаловать в VitaWin!*\n\n👋 Привет, ${user.first_name}!\n\n🌟 Ваш реферальный код: \`${user.id}\`\n💎 Поделитесь им с друзьями и получайте бонусы!\n\n🛍️ Перейдите на сайт для покупок:`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🛍️ Открыть магазин', url: appUrl }],
          [{ text: '👤 Личный кабинет', url: `${appUrl}/account` }],
          [{ text: '🆘 Поддержка', url: 'https://t.me/vitawin_support_bot' }]
        ]
      }
    });
  }
});

// Обработка callback запросов
bot.on('callback_query', async (query) => {
  const { id, data, from, message } = query;
  
  try {
    if (data === 'company_info') {
      bot.answerCallbackQuery(id, { text: 'Загружаю информацию о компании...' });
      bot.sendMessage(from.id, `🏢 *О компании VitaWin*\n\n🌱 Мы - ведущий поставщик качественных товаров для здоровья и красоты.\n\n💪 Наша миссия: помочь людям жить здоровой и активной жизнью.\n\n🔗 Сайт: ${appUrl}\n📧 Email: info@vitawins.ru`, {
        parse_mode: 'Markdown'
      });
    } else if (data === 'support') {
      bot.answerCallbackQuery(id, { text: 'Переключаю на поддержку...' });
      bot.sendMessage(from.id, '🆘 *Служба поддержки*\n\nПерейдите в наш бот поддержки для получения помощи:', {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🆘 Связаться с поддержкой', url: 'https://t.me/vitawin_support_bot' }
          ]]
        }
      });
    }
  } catch (error) {
    console.error('Ошибка callback:', error);
  }
});

// Обработка ошибок
bot.on('error', (error) => {
  console.error('❌ Ошибка бота:', error.message);
});

bot.on('polling_error', (error) => {
  console.error('❌ Ошибка polling:', error.message);
});

console.log('✅ Основной бот VitaWin готов к работе');