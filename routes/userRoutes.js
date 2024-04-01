const express = require('express');
const router = express.Router();
const userController = require("../controllers/userContoller.js");

router.post('/IoTApp/toggleLED', userController.toggleLED);

router.get('/IoTApp/getModel', userController.getLedModel);

router.post('/IoTApp/toggleFloorLight', userController.toggleFloorLight);

router.post('/IoTApp/signUp', userController.signup);

router.post('/IoTApp/signIn', userController.signin);

router.post('/IoTApp/routines', userController.scheduleRoutine);
module.exports = {
    router
};

//router.post('/IoTApp/toggleLED')
