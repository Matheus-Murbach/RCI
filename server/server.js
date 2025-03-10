const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Configuração simplificada
const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, '..', 'js', 'database', 'database.sqlite');

// Função para log de queries SQL
function logQuery(query, params = []) {
    console.log('\n📝 [SQL] Executando query:');
    console.log('   Query:', query);
    console.log('   Params:', params);
}

// Função para log de resultados
function logQueryResult(operation, result) {
    console.log('\n✅ [SQL] Resultado da operação:', operation);
    console.log('   Dados:', result);
    console.log('   Timestamp:', new Date().toISOString());
}

// Função para log de erros
function logQueryError(operation, error) {
    console.error('\n❌ [SQL] Erro na operação:', operation);
    console.error('   Erro:', error);
    console.error('   Timestamp:', new Date().toISOString());
}

// Função para inicializar banco de dados
function initDatabase() {
    console.log('Inicializando banco de dados único...');
    
    db.serialize(() => {
        db.run(`PRAGMA foreign_keys = ON`);

        // Tabela de usuários sem alteração
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabela de personagens atualizada para camelCase
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

        // Criar nova tabela em camelCase
        db.run(`CREATE TABLE IF NOT EXISTS characterRefs (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            characterId TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(characterId) REFERENCES characters(id) ON DELETE CASCADE
        )`);

        // Verificar integridade
        db.get("PRAGMA foreign_key_check", (err, result) => {
            if (err || result) {
                console.error('Problemas de integridade:', err || result);
                process.exit(1);
            }
            console.log('✅ Banco de dados inicializado com sucesso');
        });

        // Criar usuário de teste
        const testUser = {
            id: crypto.randomUUID(),
            username: 'test',
            password: 'test'
        };

        db.run('INSERT OR IGNORE INTO users (id, username, password) VALUES (?, ?, ?)',
            [testUser.id, testUser.username, testUser.password]
        );
    });
}

// Inicializar banco de dados
let db;
try {
    if (!fs.existsSync(DB_PATH)) {
        console.log('Criando novo banco de dados...');
        fs.writeFileSync(DB_PATH, '');
    }
    
    db = new sqlite3.Database(DB_PATH);
    initDatabase();
    
} catch (error) {
    console.error('Erro fatal no banco:', error);
    process.exit(1);
}

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS', 'PUT'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization',
        'ngrok-skip-browser-warning' // Adicionar o header do ngrok
    ],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Middleware melhorado para tratamento de erros SQL
const handleSqlError = (res, err, operation = 'unknown') => {
    logQueryError(operation, err);
    if (err.code === 'SQLITE_CORRUPT') {
        res.status(500).json({
            success: false,
            message: 'Erro no banco de dados. Tentando recuperar...'
        });
        // Tentar reinicializar o banco
        initDatabase();
    } else {
        res.status(500).json({
            success: false,
            message: 'Erro interno no servidor'
        });
    }
};

// Iniciar servidor
async function startServer() {
    // Iniciar servidor express
    app.listen(PORT, async () => {
        console.log(`Servidor local rodando em http://localhost:${PORT}`);
    });
}

// Rota raiz
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Rotas da API - Ordem é importante!

// IMPORTANTE: Colocar estas rotas ANTES de qualquer rota com parâmetros dinâmicos
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Nova rota de verificação com path mais específico
app.get('/api/character-exists/:id', (req, res) => {
    const characterId = req.params.id;
    console.log('🔍 Verificando existência do personagem:', characterId);

    db.serialize(() => {
        Promise.all([
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM characters WHERE id = ?', 
                    [characterId], 
                    (err, row) => err ? reject(err) : resolve(row.count > 0)
                );
            }),
            new Promise((resolve, reject) => {
                db.get('SELECT COUNT(*) as count FROM characterRefs WHERE characterId = ?', 
                    [characterId], 
                    (err, row) => err ? reject(err) : resolve(row.count > 0)
                );
            })
        ])
        .then(([charExists, refExists]) => {
            const result = {
                success: true,
                exists: {
                    character: charExists,
                    reference: refExists
                },
                debug: {
                    characterId,
                    timestamp: new Date().toISOString()
                }
            };
            console.log('✅ Resultado da verificação:', result);
            res.json(result);
        })
        .catch(err => handleSqlError(res, err));
    });
});

// Rota de verificação (DEVE VIR ANTES das rotas de personagens)
app.get('/api/verify-character/:id', (req, res) => {
    const characterId = req.params.id;
    console.log('🔍 [CONSULTA] Verificando existência do personagem:', characterId);

    db.serialize(() => {
        const result = { exists: { character: false, reference: false } };
        
        // Verificar em characters
        db.get('SELECT COUNT(*) as count FROM characters WHERE id = ?', [characterId], (err, row) => {
            console.log('📊 [CONSULTA] Resultado da verificação:', {
                exists: row ? row.count > 0 : false,
                count: row ? row.count : 0
            });
            if (err) {
                console.error('❌ Erro ao verificar characters:', err);
                return handleSqlError(res, err);
            }
            result.exists.character = row.count > 0;

            // Atualizar: character_refs para characterRefs
            db.get('SELECT COUNT(*) as count FROM characterRefs WHERE characterId = ?', [characterId], (err, row) => {
                if (err) {
                    console.error('❌ Erro ao verificar character_refs:', err);
                    return handleSqlError(res, err);
                }
                result.exists.reference = row.count > 0;

                console.log('✅ Resultado da verificação:', result);
                res.json({
                    success: true,
                    exists: result.exists,
                    debug: {
                        characterId,
                        timestamp: new Date().toISOString()
                    }
                });
            });
        });
    });
});

// Rota de registro - deve vir antes das outras rotas de usuário
app.post('/api/users/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username e password são obrigatórios'
        });
    }

    const id = crypto.randomUUID();
    console.log('📝 Tentativa de registro:', { username, id });

    db.serialize(() => {
        // Verificar se usuário já existe
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, existing) => {
            if (err) {
                console.error('❌ Erro ao verificar usuário:', err);
                return handleSqlError(res, err);
            }

            if (existing) {
                console.log('⚠️ Usuário já existe:', username);
                return res.status(400).json({
                    success: false,
                    message: 'Nome de usuário já está em uso'
                });
            }

            // Criar novo usuário
            db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
                [id, username, password],
                (err) => {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err);
                        return handleSqlError(res, err);
                    }

                    console.log('✅ Usuário criado com sucesso:', { id, username });
                    res.json({
                        success: true,
                        user: {
                            id,
                            username,
                            token: `temp_token_${id}`
                        }
                    });
                }
            );
        });
    });
});

// Rota de login
app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
    
    logQuery(query, [username, '****']);
    
    db.get(query, [username, password], (err, user) => {
        if (err) {
            return handleSqlError(res, err, 'user_login');
        }
        logQueryResult('user_login', {
            success: !!user,
            username: username
        });
        console.log('📊 [CONSULTA] Dados encontrados:', user ? { 
            id: user.id, 
            username: user.username,
            created_at: user.created_at 
        } : 'Nenhum usuário encontrado');
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Credenciais inválidas'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                token: `temp_token_${user.id}`
            }
        });
    });
});

// Atualizar rota de personagens
app.get('/api/characters', (req, res) => {
    const userId = req.query.userId;
    console.log('🔍 [CONSULTA] Buscando personagens para usuário:', userId);
    
    db.all(`
        SELECT 
            id,
            userId,
            name,
            mainColor,
            skinColor,
            accentColor,
            topRadius,
            bottomRadius,
            faceExpression,
            equipment,
            createdAt
        FROM characters 
        WHERE userId = ?
        ORDER BY createdAt DESC
    `, [userId], (err, characters) => {
        if (err) {
            console.error('❌ [CONSULTA] Erro ao buscar personagens:', err);
            return handleSqlError(res, err);
        }
        console.log('📊 [CONSULTA] Personagens encontrados:', characters.map(char => ({
            char: char,
            createdAt: char.createdAt
        })));
        // Processar os personagens para garantir o formato correto
        const processedCharacters = characters.map(char => ({
            ...char,
            equipment: JSON.parse(char.equipment || '{}'),
            mainColor: char.mainColor,
            skinColor: char.skinColor,
            accentColor: char.accentColor,
            topRadius: char.topRadius ,
            bottomRadius: char.bottomRadius,
            faceExpression: char.faceExpression

        }));

        console.log(`✅ ${processedCharacters.length} personagens encontrados`);

        res.json({
            success: true,
            characters: processedCharacters,
            debug: {
                userId,
                totalFound: processedCharacters.length,
                timestamp: new Date().toISOString()
            }
        });
    });
});

// Corrigir rota de listagem de personagens
app.get('/api/characters/:userId', (req, res) => {
    const userId = req.params.userId;
    const query = 'SELECT * FROM characterRefs WHERE userId = ?';
    
    logQuery(query, [userId]);
    
    db.all(query, [userId], (err, characters) => {
        if (err) {
            return handleSqlError(res, err, 'get_characters');
        }
        logQueryResult('get_characters', {
            count: characters?.length || 0,
            characters: characters
        });
        console.log('✅ Personagens encontrados:', characters?.length || 0);
        res.json({ 
            success: true, 
            characters: characters || [] 
        });
    });
});

// Modificar rota de criação de personagem
app.post('/api/characters', (req, res) => {
    console.log('📝 Recebendo dados:', req.body);
    
    const characterData = {
        id: crypto.randomUUID(),
        ...req.body,
        equipment: JSON.stringify(req.body.equipment || {})
    };

    console.log('🔄 Dados para inserção:', characterData);

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
        if (err) {
            console.error('❌ Erro ao criar personagem:', err);
            return handleSqlError(res, err);
        }

        console.log('✅ Personagem criado com sucesso:', characterData);
        res.json({
            success: true,
            character: {
                ...characterData,
                equipment: JSON.parse(characterData.equipment)
            }
        });
    });
});

// Rota para deletar referência de personagem
app.delete('/api/character-refs/:refId', (req, res) => {
    const refId = parseInt(req.params.refId, 10); // Converter para número pois é INTEGER na tabela
    console.log('🗑️ Deletando referência ID:', refId);

    db.serialize(() => {
        // Primeiro verificar se existe
        db.get('SELECT * FROM character_refs WHERE id = ?', [refId], (err, ref) => {
            if (err) {
                console.error('❌ Erro ao verificar referência:', err);
                return handleSqlError(res, err);
            }

            if (!ref) {
                console.log('⚠️ Referência não encontrada:', refId);
                return res.status(404).json({
                    success: false,
                    message: 'Referência não encontrada'
                });
            }

            // Deletar a referência
            db.run('DELETE FROM character_refs WHERE id = ?', [refId], function(err) {
                if (err) {
                    console.error('❌ Erro ao deletar referência:', err);
                    return handleSqlError(res, err);
                }

                console.log('✅ Referência deletada:', this.changes);
                res.json({
                    success: true,
                    debug: {
                        refId,
                        deleted: this.changes > 0,
                        timestamp: new Date().toISOString()
                    }
                });
            });
        });
    });
});

// Rota de deleção simplificada
app.delete('/api/characters/:id', (req, res) => {
    const characterId = req.params.id;
    const query = 'DELETE FROM characters WHERE id = ?';
    
    logQuery(query, [characterId]);
    
    db.run(query, [characterId], function(err) {
        if (err) {
            return handleSqlError(res, err, 'delete_character');
        }
        logQueryResult('delete_character', {
            id: characterId,
            rowsAffected: this.changes
        });
        res.json({
            success: true,
            debug: {
                characterId,
                deleted: this.changes > 0,
                timestamp: new Date().toISOString()
            }
        });
    });
});

// Adicionar antes das outras rotas de usuário
app.post('/api/users/exists', (req, res) => {
    const { username } = req.body;
    console.log('🔍 [CONSULTA] Verificando existência do usuário:', username);

    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Nome de usuário não fornecido'
        });
    }

    console.log('🔍 Verificando existência do usuário:', username);

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        console.log('📊 [CONSULTA] Resultado da verificação:', {
            exists: !!user,
            timestamp: new Date().toISOString()
        });
        if (err) {
            console.error('❌ Erro ao verificar usuário:', err);
            return handleSqlError(res, err);
        }

        res.json({
            success: true,
            exists: !!user,
            debug: { username, timestamp: new Date().toISOString() }
        });
    });
});

// Adicionar antes das outras rotas
app.post('/api/users', async (req, res) => {
    const { username, password } = req.body;
    const id = crypto.randomUUID();

    console.log('📝 Criando novo usuário:', { username, id });

    db.serialize(() => {
        // Primeiro verificar se o usuário já existe
        db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
            if (err) {
                console.error('❌ Erro ao verificar usuário:', err);
                return handleSqlError(res, err);
            }

            if (user) {
                console.log('⚠️ Usuário já existe:', username);
                return res.status(400).json({
                    success: false,
                    message: 'Nome de usuário já está em uso'
                });
            }

            // Criar novo usuário
            db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', 
                [id, username, password], 
                function(err) {
                    if (err) {
                        console.error('❌ Erro ao criar usuário:', err);
                        return handleSqlError(res, err);
                    }

                    console.log('✅ Usuário criado com sucesso:', { id, username });
                    res.json({
                        success: true,
                        user: {
                            id,
                            username,
                            token: `temp_token_${id}`
                        }
                    });
                }
            );
        });
    });
});

// Iniciar o servidor
startServer();

// Tratamento de encerramento mais robusto
process.on('SIGTERM', () => {
    console.log('Encerrando servidor...');
    db?.close();
    dbChar?.close();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Encerrando servidor...');
    db?.close();
    dbChar?.close();
    process.exit(0);
});
