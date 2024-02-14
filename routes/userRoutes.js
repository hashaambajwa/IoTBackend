const express = require('express');
const router = express.Router();
const userController = require("../controllers/userContoller.js");

router.post('/IoTApp/toggleLED', userController.toggleLED);

router.get('/IoTApp/getModel', userController.getLedModel);

module.exports = {
    router
};

//router.post('/IoTApp/toggleLED')