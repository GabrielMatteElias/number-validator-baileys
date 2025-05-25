const express = require('express');
const bodyParser = require('body-parser');
const whatsappRoutes = require('./routes/whatsapp.routes');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

const app = express(); // Cria uma aplicação Express
const swaggerDocument = YAML.load('./swagger.yaml');
app.use(bodyParser.json()); // Configura o middleware Body-Parser para processar requisições com corpo em JSON

app.use('/whatsapp', whatsappRoutes); // Todas as rotas definidas em `whatsapp.routes` estarão disponíveis em "/whatsapp"
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


module.exports = app;
