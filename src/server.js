const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/furnitureBot', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("MongoDB подключен"))
    .catch(err => console.error(err));

app.use('/api/requests', require('./routes/request')); // Подключаем маршрут

app.listen(5000, () => console.log('Сервер запущен на порту 5000'));
