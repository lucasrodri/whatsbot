const { MongoClient } = require('mongodb');

// Usando variáveis de ambiente para construir a string de conexão
const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASS;
const host = process.env.MONGO_HOST;
const port = process.env.MONGO_PORT;
const uri = `mongodb://${user}:${password}@${host}:${port}`;
const clientMongo = new MongoClient(uri);

let db;

async function createTTLIndex(database) {
    try {
        const sessions = database.collection("sessions");

        // Criar um índice TTL no campo 'createdAt' para expirar após 86400 segundos (24 horas)
        await sessions.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 86400 });

        console.log("Índice TTL criado com sucesso");
    } catch (e) {
        console.error(e);
    }
}

async function connectMongo() {
    if (db) {
        return db;
    }
    
    try {
        await clientMongo.connect();
        console.log("Connected to MongoDB");
        db = clientMongo.db('whatsapp');
        createTTLIndex(db).catch(console.error);
        return db;
    } catch (e) {
        console.error(e);
    }
}

module.exports = connectMongo;