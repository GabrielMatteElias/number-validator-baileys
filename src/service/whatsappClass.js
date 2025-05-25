const {
    useMultiFileAuthState,
    makeWASocket,
    fetchLatestBaileysVersion,
    DisconnectReason,
    Browsers,
    isJidBroadcast
} = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');
const { default: pino } = require('pino');
const qrcode = require('qrcode-terminal'); // Gera QR Code no terminal

const sessionPath = path.resolve('auth_info/session');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ================ // Classe para acessar funções do WhatsApp com Baileys \\ ================ \\
class WhatsAppClient {
    constructor() {
        this.qr = '';
        this.client = null;
    }


    async inicializarClient() {
        fs.mkdirSync(sessionPath, { recursive: true });

        const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
        const { version } = await fetchLatestBaileysVersion();

        this.client = makeWASocket({
            logger: pino({ level: 'error' }),
            version,
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            shouldIgnoreJid: jid => isJidBroadcast(jid),
        });

        this.client.ev.on('creds.update', saveCreds);

        return new Promise((resolve, reject) => {
            const connectionTimeout = setTimeout(() => {
                cleanup();
                reject(new Error('Timeout ao estabelecer conexão'));
            }, 30000);

            const cleanup = () => {
                clearTimeout(connectionTimeout);
                this.client.ev.off('connection.update', connectionHandler);
            };

            const nonReconnectableReasons = [
                DisconnectReason.loggedOut,    // Usuário deslogou ou sessão inválida
                // Pode incluir outros como banned, badSession etc se desejar
            ];

            const connectionHandler = async (update) => {
                const { connection, qr, lastDisconnect } = update;

                if (qr) {
                    qrcode.generate(qr, { small: true });
                    this.qr = qr;
                }

                if (connection === 'open') {
                    cleanup();
                    console.log('Conexao concluida com sucesso!');
                    
                    resolve('conectado');
                }

                if (connection === 'close') {
                    cleanup();

                    const statusCode = lastDisconnect?.error?.output?.statusCode;
                    const reason = lastDisconnect?.error?.message || '';

                    if (nonReconnectableReasons.includes(statusCode)) {
                        console.log('Cliente desconectado permanentemente:', reason);

                        // Apaga a pasta de sessão se existir
                        if (fs.existsSync(sessionPath)) {
                            fs.rmSync(sessionPath, { recursive: true, force: true });
                            console.log('Pasta da sessão removida.');
                        }
                        reject(new Error(`Conexão fechada: ${reason}`));
                    } else {
                        console.log(`Conexão fechada temporariamente (${reason}), tentando reconectar em 5s...`);
                        await delay(5000);

                        // Reinicia a conexão recursivamente
                        this.inicializarClient()
                            .then(resolve)
                            .catch(reject);
                    }
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