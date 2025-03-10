const express = require('express');
const router = express.Router();
const Company = require('../models/Company'); // Подключаем модель

// POST /api/companies - регистрация компании
router.post('/', async (req, res) => {
    try {
        const { userId, name, region, channel } = req.body;

        if (!userId || !name || !region || !channel) {
            return res.status(400).json({ message: 'Все поля должны быть заполнены' });
        }

        const newCompany = new Company({ userId, name, region, channel });
        await newCompany.save();
        res.status(201).json(newCompany);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/companies - получение списка всех компаний
router.get('/', async (req, res) => {
    try {
        const companies = await Company.find();
        res.json(companies);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/companies/:userId - получение информации о компании по userId
router.get('/:userId', async (req, res) => {
    try {
        const company = await Company.findOne({ userId: req.params.userId });

        if (!company) {
            return res.status(404).json({ message: 'Компания не найдена' });
        }

        res.json(company);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
