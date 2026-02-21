require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const app = express();
const router = require('./routers/router');
const apiRouter = require('./routers/apirouter')
const connectDB = require('./db.js');
const PORT = process.env.PORT;

connectDB();

app.use(cors());
app.use(express.urlencoded({ extended: true })); // form HTML
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/', router);
app.use('/api',apiRouter);

app.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
})
