// bot/storage.js - Vercel uchun
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const config = require('./config');

class Database {
    constructor() {
        // Vercel'da /tmp papkasidan foydalanish
        const dbPath = config.DATABASE_FILE.includes('/tmp/') 
            ? config.DATABASE_FILE 
            : `/tmp/${config.DATABASE_FILE}`;
        
        console.log(`📁 Database path: ${dbPath}`);
        this.db = new sqlite3.Database(dbPath);
    }
    
    // ... qolgan kodlar o'zgarishsiz
}
