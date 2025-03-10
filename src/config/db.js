const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect("mongodb://localhost:27017/furnitureBot", {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("✅ MongoDB подключена!");
    } catch (error) {
        console.error("❌ Ошибка подключения к MongoDB:", error);
        process.exit(1); // Завершаем процесс при ошибке
    }
};

module.exports = connectDB;
