const { useMultiFileAuthState, isJidBroadcast, delay, DisconnectReason, fetchLatestBaileysVersion, Browsers, makeWASocket, downloadContentFromMessage } = require('baileys');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const { gravarDesconexao, gravarConexao, gravarMensagem } = require('./api.service');

const clients = {};

// ================ // Classe para acessar funções do WhatsApp com Baileys \\ ================ \\
class WhatsAppClient {
    constructor(id) {
        this.id = id;
        this.qr = '';
        this.status = 'disconnected';
    }

    // Inicializa o cliente do WhatsApp
    async inicializarClient(id, telefone) {
        console.log(`Iniciando cliente para ID: ${id}`);

        const { state, saveCreds } = await useMultiFileAuthState(`../sessions/${id}`);

        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Usando versão ${version.join('.')} do WhatsApp, é a mais recente? ${isLatest}`);

        this.client = makeWASocket({
            version,
            printQRInTerminal: true,
            auth: state,
            browser: Browsers.ubuntu('Chrome'),
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            shouldIgnoreJid: jid => isJidBroadcast(jid),
        });

        this._attachProcessHandlers();
        await this._eventoControlarSessao(id, telefone);
        this._eventoRegistrarMensagens();

        // Salva credenciais quando mudarem
        this.client.ev.on('creds.update', saveCreds);

        clients[id] = this.client;
        return { qr: this.qr };
    }

    // Obtém um cliente específico pelo ID
    getClientPorId(id) {
        console.log('LISTA CLIENTS CONECTADOS: ', clients);
        console.log('ID RECEBIDO: ', typeof id);

        return clients[id];
    }

    // Conecta um cliente ao WhatsApp
    async conectarWhatsapp(id, telefone) {
        console.log('-----------------------------------');
        console.log(`Tentando conectar cliente ID: ${id}`);

        const clientAlvo = this.getClientPorId(id);

        if (clientAlvo) {
            console.log(`Client com ID ${id} já POSSUI sessão.`);
            return `Id conectado`;
        }

        try {
            const res = await this.inicializarClient(id, telefone);
            return res.qr;
        } catch (error) {
            console.error(`Erro ao inicializar cliente ${id}:`, error.message);
            return { status: 'erro', mensagem: 'Falha ao inicializar cliente.' };
        }
    }

    // Configura eventos para controle de sessão
    async _eventoControlarSessao(id, telefone) {
        this.client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                this.qr = qr;
            }

            if (connection === 'connecting') {
                this.status = 'connecting';
                console.log(`Cliente ${id} conectando...`);
            }

            if (connection === 'open') {
                this.status = 'connected';
                console.log(`Cliente ${id} conectado com sucesso!`);

                // // Verifica número do WhatsApp
                // const user = this.client.user;
                // const telefoneLeituraQrcode = user.id.split(':')[0];
                // const telefoneLeituraQrcodeSemDDI = telefoneLeituraQrcode.startsWith("55")
                //     ? telefoneLeituraQrcode.slice(2)
                //     : telefoneLeituraQrcode;

                // const telefoneSemNove = telefone.length === telefoneLeituraQrcodeSemDDI.length + 1 && telefone[2] === "9"
                //     ? telefone.slice(0, 2) + telefone.slice(3)
                //     : telefone;

                // if (telefoneLeituraQrcodeSemDDI !== telefoneSemNove) {
                //     console.log('Número usado para ler QR code diferente do número cadastrado.');
                //     await this.client.logout();
                //     delete clients[id];
                //     //gravarDesconexao(id, true);
                //     return;
                // }

                //gravarConexao(id);
            }

            if (connection === 'close') {
                this.status = 'disconnected';
                const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode
                    !== DisconnectReason.loggedOut;

                console.log(`Conexão fechada, ${shouldReconnect ? 'reconectando...' : 'deslogado.'}`);

                if (!shouldReconnect) {
                    delete clients[id];
                    // gravarDesconexao(id);
                }

                // Reconecta após 5 segundos
                if (shouldReconnect) {
                    await delay(5000);
                    this.inicializarClient(id, telefone);
                }
            }
        });
    }

    // Configura evento para registrar mensagens recebidas
    async _eventoRegistrarMensagens() {
        this.client.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log('EVENTO MENSAGEM');

            if (type !== 'notify') return;

            for (const message of messages) {
                const fromMe = message.key.fromMe;
                const remetente = message.key.remoteJid.split('@')[0];
                const destinatario = message.key.participant?.split('@')[0] || message.key.remoteJid.split('@')[0];
                const mensagem = message.message?.conversation || '';

                if (message.message?.imageMessage || message.message?.videoMessage || message.message?.documentMessage) {
                    const mediaType = message.message.imageMessage ? 'image' :
                        message.message.videoMessage ? 'video' : 'document';
                    const mediaData = await this.downloadMedia(message);

                    gravarMensagem(remetente, destinatario, mensagem, fromMe, mediaData);
                } else {
                    gravarMensagem(remetente, destinatario, mensagem, fromMe);
                }
            }
        });
    }

    // Baixa mídia das mensagens
    async downloadMedia(message) {
        try {
            const stream = await downloadContentFromMessage(
                message.message?.imageMessage ||
                message.message?.videoMessage ||
                message.message?.documentMessage,
                message.message?.imageMessage ? 'image' :
                    message.message?.videoMessage ? 'video' : 'document'
            );

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            return buffer.toString('base64');
        } catch (error) {
            console.error('Erro ao baixar mídia:', error);
            return null;
        }
    }

    // Envia mensagem e mídia (boleto)
    async enviarMensagem(id, telefone, mensagem, nomeBoleto, boleto) {
        console.log('-----------------------------------');
        console.log('ENVIO MENSAGEM');
        console.log(`ID do Cliente: ${id}`);
        console.log(`Telefone devedor: ${telefone}`);

        const clientAlvo = this.getClientPorId(id);

        if (!clientAlvo) {
            console.log(`Client ${id} NÃO POSSUI sessão ativa`);
            return { envio: false, msg: 'Número desconectado' };
        }

        try {
            const jid = `${telefone}@s.whatsapp.net`;
            const isRegistered = await this.validarWhatsapp(id, telefone);

            if (!isRegistered) {
                console.log('Whatsapp inválido');
                return { envio: false, msg: 'Whatsapp inválido' };
            }

            if (nomeBoleto && boleto) {
                const boletoBuffer = Buffer.from(boleto, 'base64');
                await clientAlvo.sendMessage(jid, {
                    document: boletoBuffer,
                    fileName: nomeBoleto,
                    mimetype: 'application/pdf'
                });
            }

            await clientAlvo.sendMessage(jid, { text: mensagem });
            console.log('Envio finalizado!');

            return { envio: true, msg: 'Enviado com sucesso' };
        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            return { envio: false, msg: error.message };
        }
    }

    // Valida se o número tem WhatsApp
    async validarWhatsapp(id, telefone) {
        console.log('-----------------------------------');
        console.log(`Validando WhatsApp para o ID: ${id}, Telefone: ${telefone}`);

        const clientAlvo = this.getClientPorId(id);

        if (!clientAlvo) {
            console.warn(`Cliente com ID ${id} não encontrado ou sem conexão.`);
            return 'sem conexao';
        }

        try {
            const jid = `${telefone}@s.whatsapp.net`;
            const [result] = await clientAlvo.onWhatsApp(jid);

            console.log(`Número ${telefone} ${result ? 'possui' : 'não possui'} WhatsApp.`, !!result);
            return !!result;
        } catch (error) {
            console.error('Erro ao validar número no WhatsApp:', error.message);
            return false;
        }
    }

    // Verifica se a sessão está ativa
    async verificarSessao(id) {
        console.log('-----------------------------------');
        console.log(`Verificando sessão para o ID: ${id}`);

        const clientAlvo = this.getClientPorId(id);

        if (!clientAlvo) {
            console.warn(`Cliente com ID ${id} não encontrado ou sem conexão.`);
            return false;
        }

        try {
            const user = clientAlvo.user;
            return !!user;
        } catch (error) {
            console.error(`Erro ao verificar sessão do cliente ${id}:`, error.message);
            return false;
        }
    }

    // Trata erros inesperados
    _attachProcessHandlers() {
        process.on('unhandledRejection', async () => {
            await this._handleClientError();
        });

        process.on('uncaughtException', async () => {
            await this._handleClientError();
        });
    }

    // Remove sessão após desconexão
    async _handleClientError() {
        try {
            if (this.client) {
                await this.client.end();
            }
            // Limpa a sessão se necessário
            const sessionPath = path.join(__dirname, `./sessions/${this.id}`);
            if (fs.existsSync(sessionPath)) {
                fs.rmSync(sessionPath, { recursive: true });
            }
        } catch (err) {
            console.error('Erro ao lidar com erro do cliente:', err.message);
        }
    }
}

module.exports = { WhatsAppClient };