const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PWD,
    server: process.env.DB_SERVER, 
    database: process.env.DB_NAME,
    port: 1433,           
    options: {
        encrypt: false, // false for localhost
        trustServerCertificate: true ,
        instanceName: process.env.DB_INSTANCE
    }
};

const connectDB = async () => {
    try {
        const pool = await sql.connect(dbConfig);
        console.log("MSSQL Database Connected Successfully! 🚀");
        return pool;
    } catch (error) {
        console.error("Database Connection Failed! ❌", error);
        process.exit(1);
    }
};


module.exports = { sql, connectDB };