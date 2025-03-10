require("dotenv").config();
const {Telegraf} = require("telegraf");
const axios = require("axios");

const bot = new Telegraf(process.env.BOT_TOKEN);

let userStates = {}; // Храним данные пользователя

bot.start((ctx) => {
    ctx.reply("Привет! Я помогу вам найти мебельную компанию. Чтобы оставить заявку, используйте команду /request");
});

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
                await axios.post("http://localhost:3000/requests", requestData);
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

bot.launch().then(() => console.log("🤖 Бот запущен и готов к работе!"));

module.exports = bot;
