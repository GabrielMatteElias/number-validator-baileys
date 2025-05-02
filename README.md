# API WhatsApp com Baileys

Esta API Node.js utiliza a biblioteca `@whiskeysockets/baileys` para fornecer funcionalidades do WhatsApp, focando em gerenciamento eficiente de múltiplas conexões, envio de mensagens (texto e PDF) e validação de números.

## Funcionalidades Principais

- **Gerenciamento de Múltiplas Conexões:** Suporta múltiplas instâncias de clientes WhatsApp simultaneamente (testado para escalabilidade, mas o limite prático depende dos recursos do servidor).
- **Armazenamento de Sessão:** Cada conexão salva sua sessão em um diretório separado dentro de `/sessions`, permitindo persistência e reconexão automática.
- **Reconexão Automática:** Tenta reconectar automaticamente em caso de desconexões inesperadas (exceto logout).
- **Envio de Mensagens:** Suporta envio de mensagens de texto e documentos PDF (via base64).
- **Validação de Número:** Verifica se um número de telefone está registrado no WhatsApp.
- **Validação de Login:** Verifica se o número que fez login corresponde ao número esperado (opcionalmente fornecido na inicialização).
- **Status da Conexão:** Permite verificar o status de cada conexão (conectado, desconectado, aguardando QR code).
- **Captura de Mensagens:** Loga mensagens recebidas e enviadas (requer configuração do logger para nível `debug` ou `info` para ver detalhes).
- **Limpeza de Recursos:** Inclui mecanismos para logout e limpeza de arquivos de sessão.
- **Health Check:** Endpoint `/health` para monitoramento básico.
- **Otimização:** Usa a conexão nativa do Baileys, eliminando a necessidade do Puppeteer, resultando em menor consumo de recursos.

## Estrutura do Projeto

```
whatsapp-baileys-api/
├── node_modules/
├── sessions/          # Diretório para armazenar arquivos de sessão (criado automaticamente)
├── src/
│   ├── WhatsAppBaileysClient.js  # Classe principal do cliente Baileys
│   └── ConnectionManager.js    # Gerenciador de múltiplas conexões (singleton)
├── package.json
├── package-lock.json
├── server.js          # Servidor Express API
└── README.md          # Este arquivo
```

## Instalação

1.  Certifique-se de ter o Node.js (v18 ou superior recomendado) e npm instalados.
2.  Clone ou baixe este projeto.
3.  Navegue até o diretório do projeto:
    ```bash
    cd whatsapp-baileys-api
    ```
4.  Instale as dependências:
    ```bash
    npm install
    ```

## Execução

Para iniciar o servidor da API:

```bash
npm start
# ou
node server.js
```

O servidor iniciará por padrão na porta 3000 (ou a porta definida na variável de ambiente `PORT`). Logs serão exibidos no console.

## Endpoints da API

**Base URL:** `http://localhost:3000` (ou o endereço do seu servidor)

**ID do Cliente:** Todas as rotas que operam sobre uma conexão específica usam um `:id` no path. Este `id` é um identificador único que você define para cada conexão/sessão (ex: `instancia01`, `cliente_empresa_x`, `5511999998888`).

1.  **Inicializar/Obter Cliente:** `POST /clients/:id/init`
    - Inicia uma nova conexão ou obtém o status de uma existente. Se a sessão existir e estiver válida, reconecta. Se não, gera um QR code para escanear.
    - **Body (JSON):**
      ```json
      {
        "telefoneEsperado": "5511999998888" // Opcional: Número esperado para validar o login
      }
      ```
    - **Resposta Sucesso (200 OK):**
      - Se aguardando QR:
        ```json
        {
          "success": true,
          "status": "qr",
          "qr": "BASE64_QR_CODE_STRING", // Exibir este QR para o usuário escanear
          "id": "instancia01",
          "user": null
        }
        ```
      - Se conectado:
        ```json
        {
          "success": true,
          "status": "connected",
          "qr": "",
          "id": "instancia01",
          "user": "5511999998888@s.whatsapp.net" // JID do usuário conectado
        }
        ```
    - **Resposta Erro (Ex: 409 Conflict - Número errado, 500 Internal Server Error):**
      ```json
      {
        "success": false,
        "message": "Número logado (5511988887777) não corresponde ao esperado (5511999998888)",
        "id": "instancia01"
      }
      ```

2.  **Verificar Status do Cliente:** `GET /clients/:id/status`
    - Retorna o status atual de uma conexão específica.
    - **Resposta Sucesso (200 OK):** (Formato igual ao de sucesso da inicialização)
    - **Resposta Erro (404 Not Found):**
      ```json
      {
        "success": false,
        "message": "Cliente não encontrado.",
        "id": "instancia_invalida"
      }
      ```

3.  **Listar Status de Todos os Clientes:** `GET /clients`
    - Retorna uma lista com o status de todas as conexões ativas e inativas (com sessões salvas).
    - **Resposta Sucesso (200 OK):**
      ```json
      {
        "success": true,
        "clients": [
          { "status": "connected", "qr": "", "id": "instancia01", "user": "5511999998888@s.whatsapp.net" },
          { "status": "qr", "qr": "BASE64_QR...", "id": "instancia02", "user": null },
          { "status": "inactive", "qr": "", "id": "instancia03", "user": null } // Sessão existe, mas cliente não está ativo na memória
        ]
      }
      ```

4.  **Enviar Mensagem:** `POST /clients/:id/send`
    - Envia uma mensagem de texto ou um documento PDF.
    - **Body (JSON):**
      ```json
      {
        "telefone": "5521987654321", // Número do destinatário (sem @s.whatsapp.net)
        "mensagem": "Olá! Esta é uma mensagem de texto.",
        // Para enviar PDF:
        "nomeBoleto": "fatura_maio.pdf", // Nome do arquivo
        "boletoBase64": "JVBERi0xLjQKJe..." // Conteúdo do PDF em Base64
      }
      ```
    - **Resposta Sucesso (200 OK):**
      ```json
      {
        "success": true,
        "messageId": "ABCDEFG12345", // ID da mensagem enviada
        "message": "Mensagem enviada com sucesso."
      }
      ```
    - **Resposta Erro (Ex: 400 Bad Request, 409 Conflict - Não conectado, 500 Internal Server Error):**
      ```json
      {
        "success": false,
        "message": "Cliente não conectado.",
        "id": "instancia01"
      }
      ```

5.  **Validar Número WhatsApp:** `POST /clients/:id/validate`
    - Verifica se um número existe no WhatsApp.
    - **Body (JSON):**
      ```json
      {
        "telefone": "5521987654321" // Número a validar
      }
      ```
    - **Resposta Sucesso (200 OK):**
      - Se válido:
        ```json
        {
          "success": true,
          "exists": true,
          "jid": "5521987654321@s.whatsapp.net",
          "message": "Número válido."
        }
        ```
      - Se inválido:
        ```json
        {
          "success": false,
          "exists": false,
          "jid": "5521987654321@s.whatsapp.net",
          "message": "Número inválido ou não encontrado."
        }
        ```
    - **Resposta Erro (Ex: 409 Conflict - Não conectado, 500 Internal Server Error):**
      ```json
      {
        "success": false,
        "message": "Erro ao validar número: Cliente não conectado.",
        "id": "instancia01"
      }
      ```

6.  **Desconectar e Remover Cliente:** `DELETE /clients/:id`
    - Faz logout da conexão, remove a instância da memória e apaga os arquivos de sessão.
    - **Resposta Sucesso (200 OK):**
      ```json
      {
        "success": true,
        "message": "Cliente desconectado e removido com sucesso.",
        "id": "instancia01"
      }
      ```
      ou
      ```json
      {
          "success": true,
          "message": "Cliente não estava ativo ou já foi removido.",
          "id": "instancia_ja_removida"
      }
      ```

7.  **Health Check:** `GET /health`
    - Endpoint simples para verificar se a API está rodando.
    - **Resposta Sucesso (200 OK):**
      ```json
      {
        "status": "ok",
        "timestamp": "2025-05-01T17:24:00.000Z"
      }
      ```

## Considerações

- **Gerenciamento de Sessões:** O diretório `sessions` contém dados sensíveis. Proteja o acesso a ele.
- **Escalabilidade:** Para 80+ conexões, monitore o consumo de CPU e memória do servidor. Pode ser necessário aumentar os recursos ou distribuir as instâncias.
- **Limpeza de Sessões:** A limpeza automática de sessões inativas está desabilitada por padrão no `ConnectionManager.js` (`startCleanupTask`). Habilite e ajuste o `inactiveTimeout` se necessário, mas use com cuidado para não remover sessões que ainda são desejadas.
- **Logging:** O nível de log padrão é `info`. Para depuração detalhada (ver mensagens recebidas/enviadas, eventos Baileys), altere o nível para `debug` ou `trace` nos arquivos `server.js`, `ConnectionManager.js` e `WhatsAppBaileysClient.js`.
- **Biblioteca Baileys:** Mantenha a biblioteca `@whiskeysockets/baileys` atualizada (ou migre para o pacote `baileys` recomendado) para correções e novas funcionalidades. Esteja ciente de que mudanças na API do WhatsApp podem exigir atualizações na biblioteca.

