const express = require('express');
const router = express.Router();
const Request = require('../models/Request'); // Подключаем модель

// POST /api/requests - создание заявки
router.post('/', async (req, res) => {
    try {
        const { userId, material, time, budget, room, photo } = req.body;

        if (!userId || !material || !time || !budget || !room || !photo) {
            return res.status(400).json({ message: 'Все поля должны быть заполнены' });
        }

        const newRequest = new Request({ userId, material, time, budget, room, photo });
        await newRequest.save();
        res.status(201).json(newRequest);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/requests - получение всех заявок
router.get('/', async (req, res) => {
    try {
        const requests = await Request.find();
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;