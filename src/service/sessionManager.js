const { instance } = require("../configAxios");
const { WhatsAppClient } = require("./whatsappClass.js");

// Função para inicializar uma sessão do WhatsApp
async function initializeSession(id) {
    try {
        console.log(`Inicializando sessão para o ID: ${id}`);

        const client = new WhatsAppClient();

        // Conectar usando o ID e verificar estado
        await client.conectarWhatsapp(id);

        // Adicionar cliente ao array global
        console.log(`Sessão para o ID: ${id} inicializada com sucesso.`);
    } catch (error) {
        console.error(`Erro ao inicializar sessão para o ID: ${id}:`, error.message);
    }
}

// Função principal para obter sessões
async function getSessoes() {
    const payload = {
        "codigo_usuario": 56457,
        "status_id": 1,
        "unidade": "XXX"
    };

    try {
        const response = await instance.post('/configuracao-buscar', payload);

        if (response && response.data) {
            const numerosAtivos = response.data;

            for (const { id } of numerosAtivos) {
                const idString = String(id)

                // Inicializa a sessão para novos usuários
                await initializeSession(idString);
            }

            console.log('Todas as sessões foram processadas.');
        }
    } catch (error) {
        console.error('Erro ao obter sessões do banco:', error.message);
    }
}

module.exports = {
    getSessoes,
};