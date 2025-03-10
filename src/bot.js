require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

let userStates = {}; // Храним данные пользователя

bot.command("start", (ctx) => {
    const userId = ctx.from.id;
    delete userStates[userId]; // Очистка состояния
    ctx.reply("👋 Привет! Выберите команду:\n\n/register_company - Зарегистрировать компанию\n/request - Оставить заявку");
});

/* Регистрация компании */
bot.command("register_company", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = { step: "name", data: {} };
    ctx.reply("📛 Введите название вашей компании:");
});

// Обработчик сообщений для регистрации компании
bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return; // Игнорируем, если пользователь не в процессе регистрации

    const userStep = userStates[userId].step;
    const text = ctx.message.text ? ctx.message.text.trim() : null; // Проверяем, что это текстовое сообщение

    if (!text) {
        ctx.reply("❌ Пожалуйста, отправьте текстовое сообщение.");
        return;
    }

    switch (userStep) {
        case "name":
            userStates[userId].data.name = text;
            userStates[userId].step = "region";
            ctx.reply("📍 Введите ваш регион работы:");
            break;

        case "region":
            userStates[userId].data.region = text;
            userStates[userId].step = "channel";
            ctx.reply("🔗 Отправьте ID вашего канала (пример: `-1001234567890`):");
            break;

        case "channel":
            if (!text.startsWith("-100")) {
                ctx.reply("❌ Ошибка! Отправьте корректный ID канала (пример: `-1001234567890`).");
                return;
            }

            userStates[userId].data.channel = text;

            // Формируем объект компании
            const companyData = {
                userId: userId,
                name: userStates[userId].data.name,
                region: userStates[userId].data.region,
                channel: text
            };

            // Отправляем данные в API
            try {
                await axios.post("http://localhost:5000/api/companies", companyData);
                ctx.reply(`✅ Компания *${companyData.name}* зарегистрирована!`, { parse_mode: "Markdown" });
            } catch (error) {
                ctx.reply("❌ Ошибка при регистрации компании.");
                console.error(error);
            }

            // Очищаем состояние пользователя
            delete userStates[userId];
            break;
    }
});

bot.launch().then(() => console.log("🤖 Бот запущен и готов к работе!"));

bot.telegram.setMyCommands([
    { command: "start", description: "🚀 Запустить бота" },
    { command: "request", description: "📌 Оставить заявку на мебель" },
    { command: "register_company", description: "🏢 Зарегистрировать мебельную компанию" },
    { command: "my_company", description: "ℹ️ Информация о вашей компании" },
    { command: "help", description: "❓ Список команд и инструкция" }
]);

module.exports = bot;
