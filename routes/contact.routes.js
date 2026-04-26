const express = require('express');
const router = express.Router();
const contactCtrl = require('../controllers/contact.controller');

router.post('/contact', contactCtrl.sendContactEmail);

module.exports = router;