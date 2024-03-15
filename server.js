const express = require('express');
const app = express();
const {router} = require('./routes/userRoutes.js');


app.use(express.json()); 

app.use(express.urlencoded({ extended: true }));


const PORT = 5000;

app.use('/', router);

app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    console.error(err.message, err.stack);
    res.status(statusCode).json({'message': err.message});

    return;
});

app.listen(PORT, () => {
    console.log('Server is running on PORT:' + PORT);
});
