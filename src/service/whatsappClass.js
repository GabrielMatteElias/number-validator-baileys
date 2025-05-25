const { useMultiFileAuthState, DisconnectReason, Browsers, makeWASocket } = require('baileys');
const fs = require('fs');
const path = require('path');
const { default: pino } = require('pino');

// ================ // Classe para acessar funções do WhatsApp com Baileys \\ ================ \\
class WhatsAppClient {
    constructor() {
        this.qr = '';
        this.client = null;
    }

    // Inicializa o cliente do WhatsApp
    async inicializarClient() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    this.client = makeWASocket({
        logger: pino({ level: 'error' }),
        printQRInTerminal: true,
        auth: state,
        browser: Browsers.ubuntu('Chrome'),
    });

    return new Promise((resolve, reject) => {
        const connectionTimeout = setTimeout(() => {
            reject(new Error('Timeout ao estabelecer conexão'));
        }, 30000); // 30 segundos de timeout

        // Limpa timeout e resolve quando conectado
        const cleanUp = () => {
            clearTimeout(connectionTimeout);
            this.client.ev.off('connection.update', connectionHandler);
        };

        const connectionHandler = (update) => {
            const { connection, qr } = update;

            if (qr) {
                cleanUp();
                resolve(qr);
            }

            if (connection === 'open') {
                cleanUp();
                // Adiciona listener para salvar credenciais
                this.client.ev.on('creds.update', saveCreds);
                resolve(conectado);
            }

            if (connection === 'close') {
                cleanUp();
                reject(new Error('Conexão fechada durante a inicialização'));
            }
        };

        this.client.ev.on('connection.update', connectionHandler);
    });
}


    // Conecta um cliente ao WhatsApp
    async conectarWhatsapp() {
        console.log('-----------------------------------');
        console.log(`Iniciando conexão`);

        try {
            const res = await this.inicializarClient();
            return res;
        } catch (error) {
            console.error(`Erro ao inicializar cliente`, error.message);
            return { status: 'erro', mensagem: 'Falha ao inicializar cliente.' };
        }
    }

    // Valida se o número tem WhatsApp
    async validarWhatsapp(telefone) {
        console.log('-----------------------------------')
        console.log(`Validando WhatsApp para o Telefone: ${telefone}`)

        try {
            if (!this.client) {
                console.log('❌ Cliente não está inicializado')
                return 'sem conexao'
            }

            const jid = telefone.includes('@s.whatsapp.net') ? telefone : `${telefone}@s.whatsapp.net`
            const result = await this.client.onWhatsApp(jid)

            if (result && result.length > 0 && result[0]?.exists) {
                console.log(`✅ Número ${telefone} possui WhatsApp.`)
                return true
            } else {
                console.log(`❌ Número ${telefone} NÃO possui WhatsApp.`)
                return false
            }
        } catch (error) {
            console.error('🚫 Erro ao validar número no WhatsApp:', error?.message || error)
            return false
        }
    }
}

module.exports = { WhatsAppClient };