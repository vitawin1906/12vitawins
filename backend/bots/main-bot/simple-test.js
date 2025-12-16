import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

const token = '8188630914:AAH4DUUSM9vIjwh1aJ3tyT6Q5EQxq_Dc-AY';

console.log('🤖 Простой тестовый бот запущен');

const bot = new TelegramBot(token, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  console.log('📱 Получено сообщение:', text);
  
  if (text === '/start auth') {
    bot.sendMessage(chatId, '🔐 Авторизация работает! Токен: test123');
    console.log('✅ Ответ отправлен');
  } else if (text === '/start') {
    bot.sendMessage(chatId, '👋 Бот работает!');
    console.log('✅ Приветствие отправлено');
  }
});

bot.on('error', (error) => {
  console.log('❌ Ошибка:', error.message);
});