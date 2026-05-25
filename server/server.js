const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BCRYPT_ROUNDS = 10;
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'js', 'database', 'database.sqlite');

function initDatabase() {
    db.serialize(() => {
        db.run(`PRAGMA foreign_keys = ON`);

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            name TEXT NOT NULL,
            mainColor TEXT NOT NULL,
            skinColor TEXT NOT NULL,
            accentColor TEXT NOT NULL,
            topRadius REAL NOT NULL,
            bottomRadius REAL NOT NULL,
            faceExpression TEXT NOT NULL,
            equipment TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
        )`);

        db.get("PRAGMA foreign_key_check", (err, result) => {
            if (err || result) {
                console.error('Problemas de integridade:', err || result);
                process.exit(1);
            }
            console.log('✅ Banco de dados inicializado com sucesso');
        });
    });
}

let db;
try {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, '');
    }

    db = new sqlite3.Database(DB_PATH);
    initDatabase();

} catch (error) {
    console.error('Erro fatal no banco:', error);
    process.exit(1);
}

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

const handleSqlError = (res, err) => {
    console.error('❌ Erro SQL:', err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
};

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/users/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username e password são obrigatórios'
        });
    }

    const id = crypto.randomUUID();

    db.serialize(() => {
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, existing) => {
            if (err) return handleSqlError(res, err);

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome de usuário já está em uso'
                });
            }

            bcrypt.hash(password, BCRYPT_ROUNDS).then(hashedPassword => {
                db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
                    [id, username, hashedPassword],
                    (err) => {
                        if (err) return handleSqlError(res, err);

                        res.json({
                            success: true,
                            user: { id, username, token: crypto.randomUUID() }
                        });
                    }
                );
            }).catch(err => handleSqlError(res, err));
        });
    });
});

app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) return handleSqlError(res, err);

        if (!user) {
            return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
        }

        bcrypt.compare(password, user.password).then(valid => {
            if (!valid) {
                return res.status(401).json({ success: false, message: 'Credenciais inválidas' });
            }

            res.json({
                success: true,
                user: { id: user.id, username: user.username, token: crypto.randomUUID() }
            });
        }).catch(err => handleSqlError(res, err));
    });
});

app.get('/api/characters', (req, res) => {
    const userId = req.query.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId é obrigatório' });
    }

    db.all(`
        SELECT id, userId, name, mainColor, skinColor, accentColor,
               topRadius, bottomRadius, faceExpression, equipment, createdAt
        FROM characters
        WHERE userId = ?
        ORDER BY createdAt DESC
    `, [userId], (err, characters) => {
        if (err) return handleSqlError(res, err);

        const processed = characters.map(char => ({
            ...char,
            equipment: JSON.parse(char.equipment || '{}')
        }));

        res.json({ success: true, characters: processed });
    });
});

app.post('/api/characters', (req, res) => {
    const characterData = {
        id: crypto.randomUUID(),
        ...req.body,
        equipment: JSON.stringify(req.body.equipment || {})
    };

    db.run(`
        INSERT INTO characters (
            id, userId, name, mainColor, skinColor,
            accentColor, topRadius, bottomRadius,
            faceExpression, equipment
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        characterData.id,
        characterData.userId,
        characterData.name,
        characterData.mainColor,
        characterData.skinColor,
        characterData.accentColor,
        characterData.topRadius,
        characterData.bottomRadius,
        characterData.faceExpression,
        characterData.equipment
    ], function(err) {
        if (err) return handleSqlError(res, err);

        res.json({
            success: true,
            character: { ...characterData, equipment: JSON.parse(characterData.equipment) }
        });
    });
});

app.delete('/api/characters/:id', (req, res) => {
    const characterId = req.params.id;
    const userId = req.body?.userId || req.query?.userId;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'userId é obrigatório' });
    }

    db.get('SELECT userId FROM characters WHERE id = ?', [characterId], (err, character) => {
        if (err) return handleSqlError(res, err);

        if (!character) {
            return res.status(404).json({ success: false, message: 'Personagem não encontrado' });
        }

        if (character.userId !== userId) {
            return res.status(403).json({ success: false, message: 'Acesso negado' });
        }

        db.run('DELETE FROM characters WHERE id = ?', [characterId], function(err) {
            if (err) return handleSqlError(res, err);

            res.json({ success: true, deleted: this.changes > 0 });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});

process.on('SIGTERM', () => {
    db?.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    db?.close();
    process.exit(0);
});
