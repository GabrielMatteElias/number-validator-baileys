const { WhatsAppClient } = require('../service/whatsappClass');

const client = new WhatsAppClient()


exports.conectarClient = async (req, res) => {
    try {

        const response = await client.conectarWhatsapp();

        if (response.status === 'erro') return res.status(500).json({ error: response.mensagem });

        if (response === 'conectado') return res.status(200).json({ res: response, message: 'Cliente ja conectado' });

        return res.status(200).json({ res: response });

    } catch (error) {
        return res.status(500).json({ error: 'Erro interno ao conectar cliente.', details: error.message });
    }
};

exports.validarWhatsApp = async (req, res) => {
    try {
        const { telefone } = req.body;

        if (!telefone) return res.status(400).json({ error: 'O campo telefone é obrigatório.' });

        const response = await client.validarWhatsapp(telefone);

        if (response === 'sem conexao') return res.status(403).json({ error: 'Sessão não conectada' });

        return res.status(200).json({ res: response, msg: response ? 'Telefone possui whatsapp' : 'Telefone não possui whatsapp' });

    } catch (error) {
        return res.status(500).json({ error: 'Erro interno ao validar número.', details: error.message });
    }
};
