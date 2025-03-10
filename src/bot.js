require("dotenv").config();
const { Telegraf, Scenes, session } = require('telegraf');
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

let userStates = {}; // Храним данные пользователя



bot.command("start", (ctx) => {
    const userId = ctx.from.id;
    delete userStates[userId]; // Очистка состояния
    ctx.reply("👋 Привет! Выберите команду:\n\n/register_company - Зарегистрировать компанию\n/request - Оставить заявку");
});


/*User request for order*/
bot.command("request", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = {step: "material", data: {}};
    ctx.reply("Введите материал (ЛДСП/МДФ):");
});

bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return; // Если нет активного запроса — игнорируем

    const userStep = userStates[userId].step;
    const text = ctx.message.text;
    const photo = ctx.message.photo;


    switch (userStep) {
        case "material":
            userStates[userId].data.material = text;
            userStates[userId].step = "time";
            ctx.reply("Введите срок (в днях):")
            break;

        case "time":
            userStates[userId].data.time = text;
            userStates[userId].step = "budget";
            ctx.reply("Введите бюджет (в тенге):");
            break;

        case "budget":
            userStates[userId].data.budget = text;
            userStates[userId].step = "room";
            ctx.reply("Введите помещение (спальня, кухня, балкон и т.д.):");
            break;

        case "room":
            userStates[userId].data.room = text;
            userStates[userId].step = "photo";
            ctx.reply("Прикрепите фото планировки.");
            break;

        case "photo":
            if (!photo) {
                ctx.reply("Пожалуйста, отправьте фото.");
                return;
            }

            // Получаем file_id фото
            const fileId = photo[photo.length - 1].file_id;
            userStates[userId].data.photo = fileId;

            // Формируем объект заявки
            const requestData = {
                userId: userId,
                material: userStates[userId].data.material,
                time: userStates[userId].data.time,
                budget: userStates[userId].data.budget,
                room: userStates[userId].data.room,
                photo: fileId
            };

            // Отправляем данные в API
            try {
                await axios.post("http://localhost:5000/api/requests", requestData);
                ctx.reply("Заявка сохранена! Мы передадим ее мебельным компаниям.");
            } catch (error) {
                ctx.reply("Ошибка при сохранении заявки.");
                console.error(error);
            }

            // Очищаем состояние пользователя
            delete userStates[userId];
            break;
    }
})
/*User request for order*/


/*Registration company*/
bot.command("register_company", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = { step: "name", data: {} };
    ctx.reply("📛 Введите название вашей компании:");
});

bot.on("text", async (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return; // Если нет активного запроса — игнорируем

    const userStep = userStates[userId].step;
    const text = ctx.message.text.trim(); // Убираем пробелы

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
                ctx.reply("❌ Ошибка! Отправьте корректный ID канала.");
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
    { command: 'start', description: '🚀 Запустить бота' },
    { command: 'leave_request', description: '📌 Оставить заявку на мебель' },
    { command: 'register_company', description: '🏢 Зарегистрировать мебельную компанию' },
    { command: 'my_company', description: 'ℹ️ Информация о вашей компании' },
    { command: 'help', description: '❓ Список команд и инструкция' }
]);

module.exports = bot;
