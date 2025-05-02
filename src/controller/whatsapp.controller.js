const { WhatsAppClient } = require('../service/whatsappClass');

exports.conectarClient = async (req, res) => {
    try {
        const { id, telefone } = req.body;

        if (!id || !telefone) {
            return res.status(400).json({
                error: 'Os campos id e telefone são obrigatórios.'
            });
        }

        const client = new WhatsAppClient();
        const resultado = await client.conectarWhatsapp(id, telefone);

        if (resultado.status === 'erro') {
            return res.status(500).json({ error: resultado.mensagem });
        }

        if (resultado === 'Id conectado') {
            return res.status(200).json({
                status: 'connected',
                message: 'Cliente já conectado'
            });
        }

        return res.status(200).json({
            status: 'qr_generated',
            qr: resultado,
            message: 'Escaneie o QR Code para conectar'
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Erro interno ao conectar cliente.',
            details: error.message
        });
    }
};

exports.enviarMensagem = async (req, res) => {
    try {
        const { id, telefone, mensagem, nomeBoleto, boleto } = req.body;

        if (!id || !telefone || !mensagem) {
            return res.status(400).json({
                error: 'Os campos id, telefone e mensagem são obrigatórios.'
            });
        }

        const client = new WhatsAppClient();
        const resultado = await client.enviarMensagem(
            id,
            telefone,
            mensagem,
            nomeBoleto,
            boleto
        );

        if (!resultado.envio) {
            return res.status(400).json({
                error: resultado.msg
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Mensagem enviada com sucesso'
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Erro interno ao enviar mensagem.',
            details: error.message
        });
    }
};

exports.validarWhatsApp = async (req, res) => {
    try {
        const { id, telefone } = req.body;

        if (!id || !telefone) {
            return res.status(400).json({
                error: 'Os campos id e telefone são obrigatórios.'
            });
        }

        const client = new WhatsAppClient();
        const resultado = await client.validarWhatsapp(id, telefone);

        if (resultado === 'sem conexao') {
            return res.status(403).json({
                error: 'Sessão não conectada',
                solution: 'Conecte a sessão primeiro'
            });
        }

        return res.status(200).json({
            valid: resultado,
            number: telefone
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Erro interno ao validar número.',
            details: error.message
        });
    }
};

exports.verificarSessao = async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({
                error: 'O campo id é obrigatório.'
            });
        }

        const client = new WhatsAppClient();
        const conectado = await client.verificarSessao(id);

        return res.status(200).json({
            connected: conectado,
            sessionId: id
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Erro interno ao verificar sessão.',
            details: error.message
        });
    }
};