require("dotenv").config();
const {Telegraf, Markup} = require("telegraf");
const axios = require("axios");
const {MongoClient} = require("mongodb");

const bot = new Telegraf(process.env.BOT_TOKEN);
const client = new MongoClient(process.env.MONGO_URI);

let companiesCollection;
let userStates = {}; // Храним данные пользователя
let db;

client.connect()
    .then(() => {
        db = client.db("furnitureBot"); // Замените на имя вашей базы данных
        companiesCollection = db.collection("companies");
        console.log("Подключение к базе данных успешно!");
    })

// Обработчик команды /start
bot.command("start", (ctx) => {
    const userId = ctx.from.id;
    delete userStates[userId]; // Очистка состояния
    ctx.reply("👋 Привет! Выберите команду:\n\n/register_company - Зарегистрировать компанию\n/request - Оставить заявку");
});

// Обработчик команды /register_company (для регистрации компании)
bot.command("register_company", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = {step: "name", data: {}};
    ctx.reply("📛 Введите название вашей компании:");
});

// Обработчик команды /request (для оставления заявки на мебель)
bot.command("request", (ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = {step: "material", data: {}};
    // Отправляем кнопки с вариантами материала
    ctx.reply("Выберите материал:", Markup.keyboard([["МДФ", "ЛДСП"]]).oneTime().resize());
});

// Обработчик всех сообщений (для обработки шагов заявки и регистрации)
// bot.on("message", async (ctx) => {
//     const userId = ctx.from.id;
//     if (!userStates[userId]) return; // Если нет активного запроса — игнорируем
//
//     const userStep = userStates[userId].step;
//     const text = ctx.message.text ? ctx.message.text.trim() : null;
//
//     if (!text) {
//         ctx.reply("❌ Пожалуйста, отправьте текстовое сообщение.");
//         return;
//     }
//
//     switch (userStep) {
//         // Регистрация компании
//         case "name":
//             userStates[userId].data.name = text;
//             userStates[userId].step = "region";
//             ctx.reply("📍 Введите ваш регион работы:");
//             break;
//
//         case "region":
//             userStates[userId].data.region = text;
//             userStates[userId].step = "channel";
//             ctx.reply("🔗 Отправьте ID вашего канала (пример: `-1001234567890`):");
//             break;
//
//         case "channel":
//             if (!text.startsWith("-100")) {
//                 ctx.reply("❌ Ошибка! Отправьте корректный ID канала (пример: `-1001234567890`).");
//                 return;
//             }
//
//             userStates[userId].data.channel = text;
//
//             const companyData = {
//                 userId: userId,
//                 name: userStates[userId].data.name,
//                 region: userStates[userId].data.region,
//                 channel: text
//             };
//
//             try {
//                 await axios.post("http://localhost:5000/api/companies", companyData);
//                 ctx.reply(`✅ Компания *${companyData.name}* зарегистрирована!`, {parse_mode: "Markdown"});
//             } catch (error) {
//                 ctx.reply("❌ Ошибка при регистрации компании.");
//                 console.error(error);
//             }
//
//             delete userStates[userId];
//             break;
//
//
//     }
// });

bot.on("message", async (ctx) => {
    const userId = ctx.from.id;
    if (!userStates[userId]) return; // Если нет активного запроса — игнорируем

    const userStep = userStates[userId].step;
    const text = ctx.message.text ? ctx.message.text.trim() : null;

    if (!text) {
        ctx.reply("❌ Пожалуйста, отправьте текстовое сообщение.");
        return;
    }

    switch (userStep) {
        // Заявка на мебель
        case "material":
            if (text === "МДФ" || text === "ЛДСП") {
                userStates[userId].data.material = text;
                userStates[userId].step = "region";
                ctx.reply("Выберите ваш регион:", Markup.keyboard([["Астана", "Алматы"]]).oneTime().resize());
            } else {
                ctx.reply("❌ Пожалуйста, выберите материал: *МДФ* или *ЛДСП*.");
            }
            break;

        case "region":
            if (text === "Астана" || text === "Алматы") {
                userStates[userId].data.region = text;
                userStates[userId].step = "time";
                ctx.reply("Введите срок (в днях):");
            } else {
                ctx.reply("❌ Пожалуйста, выберите регион из предложенных вариантов: *Астана* или *Алматы*.");
            }
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


            const requestData = {
                userId: userId,
                material: userStates[userId].data.material,
                region: userStates[userId].data.region,
                time: userStates[userId].data.time,
                budget: userStates[userId].data.budget,
                room: userStates[userId].data.room,
                userChatId: ctx.chat.id, // ID чата пользователя
            };

            try {
                await axios.post("http://localhost:5000/api/requests", requestData);
                ctx.reply("✅ Заявка сохранена! Мы передадим ее мебельным компаниям.");
            } catch (error) {
                ctx.reply("❌ Ошибка при сохранении заявки.");
                console.error(error);
            }

            // Обработка отправки заявки компаниям
            await sendRequestToCompanies(requestData.region, requestData, ctx);

            // Очищаем состояние пользователя
            delete userStates[userId];
            break;


    }
});

// Функция для отправки заявки компаниям
async function sendRequestToCompanies(region, requestData, ctx) {
    const { Markup } = require("telegraf");

    try {
        const companies = await companiesCollection.find({ region: region }).toArray();
        if (companies.length > 0) {
            for (const company of companies) {
                const companyChannelId = company.channel; // ID канала компании
                const userId = requestData.userChatId;
                const username = ctx.from.username ? `[@${ctx.from.username}](https://t.me/${ctx.from.username})` : `[Профиль пользователя](https://t.me/${userId})`;

                const messageText = encodeURIComponent(
                    `Здравствуйте! Мы по поводу вашей заявки на мебель:\n\n` +
                    `📌 Материал: ${requestData.material}\n` +
                    `📌 Регион: ${requestData.region}\n` +
                    `📌 Срок: ${requestData.time} дней\n` +
                    `📌 Бюджет: ${requestData.budget} тенге\n` +
                    `📌 Помещение: ${requestData.room}\n\n` +
                    `Расскажите, пожалуйста, подробнее о вашем заказе.`
                );

                const contactUrl = `https://t.me/${userId}?text=${messageText}`;

                const message = `📌 *Новая заявка от пользователя!*\n\n` +
                    `👤 *Клиент:* ${username}\n\n` +
                    `📌 *Материал:* ${requestData.material}\n` +
                    `📌 *Регион:* ${requestData.region}\n` +
                    `📌 *Срок:* ${requestData.time} дней\n` +
                    `📌 *Бюджет:* ${requestData.budget} тенге\n` +
                    `📌 *Помещение:* ${requestData.room}\n\n` +
                    `📞 *Свяжитесь с клиентом!*`;

                const contactButton = Markup.inlineKeyboard([
                    [Markup.button.url("💬 Связаться", contactUrl)]
                ]);

                await bot.telegram.sendMessage(companyChannelId, message, {
                    parse_mode: "Markdown",
                    ...contactButton
                });
            }
        } else {
            console.log("Нет компаний для выбранного региона.");
        }
    } catch (error) {
        console.error("Ошибка при отправке заявки компаниям:", error);
    }
}

bot.launch().then(() => console.log("🤖 Бот запущен и готов к работе!"));

bot.telegram.setMyCommands([
    {command: "start", description: "🚀 Запустить бота"},
    {command: "request", description: "📌 Оставить заявку на мебель"},
    {command: "register_company", description: "🏢 Зарегистрировать мебельную компанию"},
    {command: "my_company", description: "ℹ️ Информация о вашей компании"},
    {command: "help", description: "❓ Список команд и инструкция"}
]);

module.exports = bot;
