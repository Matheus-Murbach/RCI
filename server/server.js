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

// Função para inicializar banco de dados
function initDatabase() {
    console.log('Inicializando banco de dados único...');
    
    db.serialize(() => {
        // Criar tabelas com foreign keys
        db.run(`PRAGMA foreign_keys = ON`);

        // Tabela de usuários
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Tabela de personagens com referência direta ao usuário
        db.run(`CREATE TABLE IF NOT EXISTS characters (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            main_color TEXT NOT NULL DEFAULT '#FF0000',
            skin_color TEXT NOT NULL DEFAULT '#FFA07A',
            accent_color TEXT NOT NULL DEFAULT '#0000FF',
            top_radius REAL NOT NULL DEFAULT 0.75,
            bottom_radius REAL NOT NULL DEFAULT 0.75,
            equipment_data TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
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
    origin: '*', // Em produção, especifique os domínios permitidos
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Middleware melhorado para tratamento de erros SQL
const handleSqlError = (res, err) => {
    console.error('Erro SQL:', err);
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

// Função para iniciar o ngrok
async function startNgrok() {
    try {
        const ngrok = require('ngrok');
        const url = await ngrok.connect({
            addr: PORT,
            authtoken: '2tdQ2asZorL71Db1AyFVTzBkY4N_7p5b3fVkj5vyUW4Qf5hDa'
        });
        console.log('Túnel ngrok disponível em:', url);
        return url;
    } catch (err) {
        console.error('Erro ao iniciar ngrok (não crítico):', err.message);
        return null;
    }
}

// Iniciar servidor
async function startServer() {
    // Iniciar servidor express
    app.listen(PORT, async () => {
        console.log(`Servidor local rodando em http://localhost:${PORT}`);
        
        // Tentar iniciar ngrok
        try {
            const ngrokUrl = await startNgrok();
            if (ngrokUrl) {
                app.locals.ngrokUrl = ngrokUrl;
                app.get('/api/server-url', (req, res) => {
                    res.json({ url: app.locals.ngrokUrl });
                });
            }
        } catch (error) {
            console.log('Servidor rodando apenas localmente');
        }
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
                db.get('SELECT COUNT(*) as count FROM character_refs WHERE character_id = ?', 
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
    console.log('🔍 Verificando existência do personagem:', characterId);

    db.serialize(() => {
        const result = { exists: { character: false, reference: false } };
        
        // Verificar em characters
        db.get('SELECT COUNT(*) as count FROM characters WHERE id = ?', [characterId], (err, row) => {
            if (err) {
                console.error('❌ Erro ao verificar characters:', err);
                return handleSqlError(res, err);
            }
            result.exists.character = row.count > 0;

            // Verificar em character_refs
            db.get('SELECT COUNT(*) as count FROM character_refs WHERE character_id = ?', [characterId], (err, row) => {
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

// Rotas da API
app.post('/api/users/register', (req, res) => {
    const { username, password } = req.body;
    const id = crypto.randomUUID();

    db.run('INSERT INTO users (id, username, password) VALUES (?, ?, ?)', 
        [id, username, password], 
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    res.status(400).json({ success: false, message: 'Usuário já existe' });
                } else {
                    res.status(500).json({ success: false, message: 'Erro no servidor' });
                }
                return;
            }
            res.json({ success: true, user: { id, username } });
        }
    );
});

app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    
    // Validar dados
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username e password são obrigatórios' 
        });
    }

    // Query com tratamento de erro
    db.get(
        'SELECT id, username FROM users WHERE username = ? AND password = ?', 
        [username, password], 
        (err, user) => {
            if (err) {
                return handleSqlError(res, err);
            }

            if (user) {
                return res.json({ 
                    success: true, 
                    user: {
                        id: user.id,
                        username: user.username,
                        token: `temp_token_${user.id}`
                    }
                });
            }

            return res.status(401).json({ 
                success: false, 
                message: 'Credenciais inválidas' 
            });
        }
    );
});

// Atualizar rota de personagens
app.get('/api/characters', (req, res) => {
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ 
            success: false, 
            message: 'ID do usuário não fornecido' 
        });
    }

    db.all(`
        SELECT 
            id,
            user_id as userId,
            name,
            main_color as mainColor,
            skin_color as skinColor,
            accent_color as accentColor,
            top_radius as topRadius,
            bottom_radius as bottomRadius,
            equipment_data as equipment,
            created_at as createdAt
        FROM characters 
        WHERE user_id = ?
        ORDER BY created_at DESC
    `, [userId], (err, characters) => {
        if (err) {
            console.error('Erro ao buscar personagens:', err);
            return handleSqlError(res, err);
        }

        // Processar os personagens para garantir o formato correto
        const processedCharacters = characters.map(char => ({
            ...char,
            equipment: JSON.parse(char.equipment || '{}'),
            mainColor: char.mainColor || '#FF0000',
            skinColor: char.skinColor || '#FFA07A',
            accentColor: char.accentColor || '#0000FF',
            topRadius: char.topRadius || 0.75,
            bottomRadius: char.bottomRadius || 0.75
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
    console.log('📝 Requisição para buscar personagens do usuário:', req.params.userId);
    
    db.all('SELECT * FROM character_refs WHERE user_id = ?', 
        [req.params.userId], 
        (err, characters) => {
            if (err) {
                console.error('❌ Erro SQL:', err);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao buscar personagens'
                });
            }

            console.log('✅ Personagens encontrados:', characters?.length || 0);
            res.json({ 
                success: true, 
                characters: characters || [] 
            });
        }
    );
});

// Modificar rota de criação de personagem
app.post('/api/characters', (req, res) => {
    const {
        userId,
        name,
        mainColor,
        skinColor,
        accentColor,
        topRadius,
        bottomRadius,
        equipment
    } = req.body;

    console.log('📝 Dados recebidos:', req.body);
    
    if (!userId || !name) {
        return res.status(400).json({
            success: false,
            message: 'ID do usuário e nome são obrigatórios'
        });
    }

    const characterId = crypto.randomUUID();
    
    db.serialize(() => {
        db.run(`
            INSERT INTO characters (
                id,
                user_id,
                name,
                main_color,
                skin_color,
                accent_color,
                top_radius,
                bottom_radius,
                equipment_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            characterId,
            userId,
            name,
            mainColor || '#FF0000',
            skinColor || '#FFA07A',
            accentColor || '#0000FF',
            topRadius || 0.75,
            bottomRadius || 0.75,
            JSON.stringify(equipment || {})
        ], function(err) {
            if (err) {
                console.error('❌ Erro ao criar personagem:', err);
                return handleSqlError(res, err);
            }

            console.log('✅ Personagem criado:', {
                id: characterId,
                userId,
                name
            });

            res.json({
                success: true,
                character: {
                    id: characterId,
                    userId,
                    name,
                    mainColor: mainColor || '#FF0000',
                    skinColor: skinColor || '#FFA07A',
                    accentColor: accentColor || '#0000FF',
                    topRadius: topRadius || 0.75,
                    bottomRadius: bottomRadius || 0.75,
                    equipment: equipment || {
                        head: null,
                        leftHand: null,
                        rightHand: null,
                        back: null
                    }
                }
            });
        });
    });
});

// Rota para deletar referência de personagem
app.delete('/api/character-refs/:id', (req, res) => {
    const refId = req.params.id;
    console.log('🗑️ Deletando referência de personagem:', refId);

    db.run('DELETE FROM character_refs WHERE id = ?', [refId], function(err) {
        if (err) {
            console.error('❌ Erro ao deletar referência:', err);
            return handleSqlError(res, err);
        }

        console.log('✅ Referência deletada:', this.changes);
        res.json({
            success: true,
            debug: { refId, deleted: this.changes > 0 }
        });
    });
});

// Adicionar antes das outras rotas de characters
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
    
    db.run('DELETE FROM characters WHERE id = ?', [characterId], function(err) {
        if (err) {
            console.error('Erro ao deletar:', err);
            return handleSqlError(res, err);
        }

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

// Adicionar rota de teste/health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

// Atualizar rota de login para usar a nova estrutura
app.post('/api/users/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username e password são obrigatórios' 
        });
    }

    db.get('SELECT * FROM users WHERE username = ? AND password = ?', 
        [username, password], 
        (err, user) => {
            if (err) {
                return handleSqlError(res, err);
            }

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
        }
    );
});

// Adicionar rota para verificar existência de usuário
app.post('/api/users/exists', (req, res) => {
    const { username } = req.body;
    
    if (!username) {
        return res.status(400).json({
            success: false,
            message: 'Nome de usuário não fornecido'
        });
    }

    db.get('SELECT id FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return handleSqlError(res, err);
        }

        res.json({
            success: true,
            exists: !!user
        });
    });
});

// Iniciar o servidor
startServer();

// Tratamento de encerramento mais robusto
process.on('SIGTERM', async () => {
    console.log('Encerrando servidor...');
    db?.close();
    dbChar?.close();
    try {
        const ngrok = require('ngrok');
        await ngrok.kill();
    } catch (error) {
        console.log('Ngrok já encerrado ou não iniciado');
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Encerrando servidor...');
    db?.close();
    dbChar?.close();
    try {
        const ngrok = require('ngrok');
        await ngrok.kill();
    } catch (error) {
        console.log('Ngrok já encerrado ou não iniciado');
    }
    process.exit(0);
});
