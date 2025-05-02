const app = require('./app');
const { getSessoes } = require('./service/sessionManager');
const { initializeSessions } = require('./service/sessionManager');

const PORT = process.env.PORT || 8000;

async function iniciarServidor() {
    try {
        // Inicializa sessões do WhatsApp
        //await initializeSessions();

        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
        });

    } catch (error) {
        process.exit(1);
    }
}

iniciarServidor();