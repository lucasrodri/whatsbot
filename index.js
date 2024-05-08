const { Client, LocalAuth, MessageMedia, Buttons  } = require('whatsapp-web.js');
const connectMongo = require('./mongo');

// Número do Interop
const InteropNumber = process.env.INTEROP_NUMBER + '@c.us';

// Grupo de envio de mensagens
const InteropGroup = process.env.INTEROP_GROUP + '@g.us';

const client = new Client({
    webVersion: '2.2409.2',
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2409.2.html'
    },
    authStrategy: new LocalAuth({
        dataPath: './wwebjs_auth_sessions'
    })
  });


// When the client is ready, run this code (only once)
client.once('ready', () => {
    console.log('Client is ready!');
});

// When the client received QR-Code
client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    const qrcode = require('qrcode-terminal');
    qrcode.generate(qr, { small: true })
});

// Criando uma função para enviar mensagens
async function sendMessage(from, message) {
    // Descomentar esta linha para ver as mensagens enviadas no console
    console.log("To: ", from, "Message: ", message);
    const chat = await client.getChatById(from);
    chat.sendStateTyping();
    let delay = Math.floor(Math.random() * (12000 - 4000 + 1)) + 4000;
    await new Promise(resolve => setTimeout(resolve, delay));
    client.sendMessage(from, message);
}

//Despedida do usuário
async function despedida(from, sessionsCollection) {
    await sessionsCollection.deleteOne({ from: from });
    sendMessage(from, "Obrigado por entrar em contato conosco. Até a próxima!");
}

// Enviar mensagem para o Interop
async function sendMessageInterop(from ,opcao, instituicao, nome, mensagem) {
    const remetente = from.split('@')[0];
    const message = `*Chamado da Associação GigaCandanga:*\n\n${opcao}:\n\nNova mensagem de *${nome}* (${remetente}) da instituição *${instituicao}*:\n\n*Descrição:* ${mensagem}`;
    sendMessage(InteropNumber, message);
}

// Enviar mensagem para o Grupo de Interop
async function sendMessageGroupInterop(from ,opcao, instituicao, nome, mensagem) {
    const remetente = from.split('@')[0];
    const message = `*Chamado da Associação GigaCandanga:*\n\n${opcao}:\n\nNova mensagem de *${nome}* (${remetente}) da instituição *${instituicao}*:\n\n*Descrição:* ${mensagem}`;
    sendMessage(InteropGroup, message);
}

client.on('message_create', async message => {
    // Ignorar mensagens enviadas pelo próprio bot
    if (message.fromMe) return;
    // Obter o chat relacionado à mensagem
    const chat = await message.getChat();
    // Ignorar mensagens vindas de grupos
    if (chat.isGroup) {
        // Descomentar linhas para ver as mensagens no console e descobrir o id do chat
        const from = message.from;
        console.log("From: ", from, "Message: ", message.body);
        return;
    }

    const db = await connectMongo();
    const sessionsCollection = db.collection('sessions'); 
    const logCollection = db.collection('logs');
    const from = message.from;
    const session = await sessionsCollection.findOne({ from: from });

    // Descomentar esta linha para ver as mensagens no console e descobrir o numero do usuário
    console.log("From: ", from, "Message: ", message.body);

    if (!session) {
        // Se não existe sessão para esse usuário, criar uma e enviar mensagem de boas-vindas
        await sessionsCollection.insertOne({ from: from, step: "identificacao" });
        sendMessage(from, "Olá, bem vindo ao suporte da Associação GigaCandanga.\n\n*Digite uma das opções:*\n\n1 - Chamados Emergenciais (24x7);\n2 - Chamados Normais (8x5);\n3 - Solicitar Informações;\n\nDigite \"*sair*\" para sair do atendimento.");
    } else {
        // Lógica para tratar as mensagens com base no passo da conversa
        //console.log("From: ", from, "Message: ", message.body);
        switch(session.step) {
            case "identificacao":
                // Se a mensagem for "sair", remover a sessão e enviar mensagem de despedida
                if (message.body === "sair" || message.body === "Sair" || message.body === "SAIR") {
                    await despedida(from, sessionsCollection);
                    break;
                }
                if (message.body === "1") {
                    sendMessage(from, "Você escolheu a opção de Chamados Emergenciais (24x7).\nPor favor, informe o nome da sua instituição.");
                    await sessionsCollection.updateOne({ from: from }, { $set: { step: "quemFala", opcao: "Chamados Emergenciais (24x7)"}});
                }
                else if (message.body === "2") {
                    sendMessage(from, "Você escolheu a opção de Chamados Normais (8x5).\nPor favor, informe o nome da sua instituição.");
                    await sessionsCollection.updateOne({ from: from }, { $set: { step: "quemFala", opcao: "Chamados Normais (8x5)"}});
                }
                else if (message.body === "3") {
                    sendMessage(from, "Você escolheu a opção de Solicitar Informações.\nPor favor, informe o nome da sua instituição.");
                    await sessionsCollection.updateOne({ from: from }, { $set: { step: "quemFala", opcao: "Solicitar Informações"}});
                }
                else {
                    sendMessage(from, "Opção inválida!!!\n\n*Por favor, digite uma das seguintes opções:*\n\n\"*1*\" - Chamados Emergenciais (24x7);\n\"*2*\" - Chamados Normais (8x5);\n\"*3*\" - Solicitar Informações.\n\nDigite \"*sair*\" para sair do atendimento.");
                }
                break;
            case "quemFala":
                if (message.body === "sair" || message.body === "Sair" || message.body === "SAIR") {
                    await despedida(from, sessionsCollection);
                    break;
                }
                await sessionsCollection.updateOne({ from: from }, { $set: { step: "mensagem", instituicao: message.body }});
                sendMessage(from, `Você está representando a Instituição: *${message.body}*\n\nPor favor, informe o seu nome para dar continuidade ao atendimento.`);
                break;
            case "mensagem":
                if (message.body === "sair" || message.body === "Sair" || message.body === "SAIR") {
                    await despedida(from, sessionsCollection);
                    break;
                }
                await sessionsCollection.updateOne({ from: from }, { $set: { step: "final", nome: message.body }});
                sendMessage(from, `Olá, *${message.body}*! Descreva o motivo do seu contato.`);
                break;
            case "final":
                if (message.body === "sair" || message.body === "Sair" || message.body === "SAIR") {
                    await despedida(from, sessionsCollection);
                    break;
                }
                await sessionsCollection.updateOne({ from: from }, { $set: { step: "aguarde", mensagem: message.body }});
                sendMessage(from, "Obrigado pelo seu contato. Em breve entraremos em contato com você.");
                // Enviar mensagem para o Interop
                sendMessageInterop(session.from, session.opcao, session.instituicao, session.nome, message.body);
                // Enviar mensagem para o Grupo de Interop
                sendMessageGroupInterop(session.from, session.opcao, session.instituicao, session.nome, message.body);
                // Registrar log
                await logCollection.insertOne({ from: session.from, opcao: session.opcao, instituicao: session.instituicao, nome: session.nome, mensagem: message.body });
                break;
            case "aguarde":
                if (message.body === "sair" || message.body === "Sair" || message.body === "SAIR") {
                    await despedida(from, sessionsCollection);
                    break;
                }
                sendMessage(from, "Aguarde, em breve entraremos em contato com você.\n\nDigite \"*sair*\" para caso deseje sair do atendimento.");
                break;
        }
    }
}); 



// Start your client
client.initialize();
