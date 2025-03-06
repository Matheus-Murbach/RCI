import { DEFAULT_CHARACTER } from '../character/character.js';

export class Database {
    constructor() {
        this.apiUrl = null;
        this.maxRetries = 3;
        this.retryDelay = 1000;
        this.initializeApiUrl();
    }

    async initializeApiUrl() {
        try {
            console.log('🔄 Iniciando conexão com servidor...');
            
            const servers = [
                'http://localhost:3000',
                'https://75da-187-121-163-38.ngrok-free.app'
            ];

            for (const server of servers) {
                try {
                    console.log(`Testando servidor: ${server}`);
                    
                    // Usar health check em vez de login para teste
                    const response = await fetch(`${server}/api/health`, {
                        method: 'GET',
                        headers: { 
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });

                    const data = await response.json();
                    if (response.ok && data.status === 'ok') {
                        this.apiUrl = server;
                        console.log('✅ Servidor respondendo em:', this.apiUrl);
                        return true;
                    }
                } catch (e) {
                    console.warn(`⚠️ Servidor ${server} não respondeu:`, e.message);
                }
            }

            throw new Error('Nenhum servidor disponível');
        } catch (error) {
            const msg = `❌ Erro na conexão: ${error.message}`;
            console.error(msg);
            alert('Servidor não está respondendo. Tentando novamente...');
            
            // Tentar novamente após um delay
            await new Promise(r => setTimeout(r, this.retryDelay));
            return this.initializeApiUrl();
        }
    }

    async request(endpoint, options = {}) {
        await this.ensureApiUrl();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        };

        const token = localStorage.getItem('userToken');
        if (token) {
            defaultOptions.headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(
                `${this.apiUrl}/api/${endpoint}`,
                { ...defaultOptions, ...options }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            throw error;
        }
    }

    async query(endpoint, options = {}) {
        await this.ensureApiUrl();

        const url = `${this.apiUrl}/api/${endpoint}`;
        console.log('🔍 Fazendo requisição para:', url);

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    ...options.headers
                }
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Erro na resposta:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });
                throw new Error(`${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('📥 Resposta:', data);
            return data;

        } catch (error) {
            console.error('❌ Erro na requisição:', error);
            throw error;
        }
    }

    async createUser(userData) {
        if (!userData?.username || !userData?.password) {
            return { 
                success: false,
                error: 'Dados de usuário incompletos' 
            };
        }

        try {
            console.log('📝 Criando usuário:', userData.username);

            // Usar a rota correta com tratamento de erro adequado
            const result = await this.query('users/register', {
                method: 'POST',
                body: JSON.stringify(userData)
            }).catch(error => {
                console.error('Erro na requisição:', error);
                throw new Error(error.message || 'Erro ao criar usuário');
            });

            if (!result.success) {
                throw new Error(result.message || 'Falha ao criar usuário');
            }

            console.log('✅ Usuário criado:', result);
            return {
                success: true,
                user: result.user
            };

        } catch (error) {
            console.error('❌ Erro ao criar usuário:', error);
            return { 
                success: false,
                error: error.message || 'Erro ao criar usuário'
            };
        }
    }

    async getUserByUsername(username, password = null) {
        await this.ensureApiUrl();
        
        try {
            if (password !== null) {
                console.log('🔑 Login:', username);
                
                const response = await fetch(`${this.apiUrl}/api/users/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();
                console.log('📥 Resposta:', data);

                if (!response.ok) {
                    return { error: data.message || 'Erro na autenticação' };
                }

                return {
                    user: {
                        id: data.user.id,
                        username: data.user.username,
                        token: data.token || `temp_token_${data.user.id}`
                    }
                };
            }

            // Verificar existência
            const response = await fetch(`${this.apiUrl}/api/users/exists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });

            return {
                exists: response.ok
            };
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { error: 'Erro ao tentar fazer login' };
        }
    }

    async getCharactersByUserId(userId) {
        try {
            console.log('🔍 Buscando personagens no banco para usuário:', userId);
            
            const response = await this.query(`characters?userId=${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                }
            });

            console.log('📊 Resposta bruta do servidor:', response);

            const charactersData = response.data || response.characters || [];
            const characters = Array.isArray(charactersData) ? charactersData : [charactersData];
            
            const mappedCharacters = characters.map(char => {
                console.log('🔄 Processando dados brutos do personagem:', char);
                const mapped = {
                    id: char.id,
                    userId: char.userId || char.user_id,
                    name: char.name,
                    mainColor: char.mainColor || char.main_color,
                    skinColor: char.skinColor || char.skin_color,
                    accentColor: char.accentColor || char.accent_color,
                    topRadius: char.topRadius || char.top_radius,
                    bottomRadius: char.bottomRadius || char.bottom_radius,
                    faceExpression: char.faceExpression || char.face_expression,
           equipment: typeof char.equipment === 'string' ? 
                        JSON.parse(char.equipment) : 
                        (char.equipment || char.equipment_data)
                };
                console.log('✨ Dados do personagem mapeados:', mapped);
                return mapped;
            });

            console.log('✅ Total de personagens processados:', mappedCharacters.length);
            return mappedCharacters;

        } catch (error) {
            console.error('❌ Erro ao buscar personagens:', error);
            throw error;
        }
    }

    async saveCharacter(characterData) {
        console.log('💾 Salvando personagem:', characterData);

        if (!characterData?.userId) {
            const userId = this.getCurrentUser()?.id;
            if (!userId) {
                console.error('❌ ID do usuário não encontrado');
                return { success: false, error: 'ID do usuário não fornecido' };
            }
            characterData.userId = userId;
        }

        try {
            // Garantir que todos os dados necessários estão presentes
            const validatedData = {
                userId: characterData.userId,
                name: characterData.name || DEFAULT_CHARACTER.name,
                mainColor: characterData.mainColor || DEFAULT_CHARACTER.mainColor,
                skinColor: characterData.skinColor || DEFAULT_CHARACTER.skinColor,
                accentColor: characterData.accentColor || DEFAULT_CHARACTER.accentColor,
                topRadius: characterData.topRadius || DEFAULT_CHARACTER.topRadius,
                bottomRadius: characterData.bottomRadius || DEFAULT_CHARACTER.bottomRadius,
                faceExpression: characterData.faceExpression || DEFAULT_CHARACTER.faceExpression,
                equipment: characterData.equipment || DEFAULT_CHARACTER.equipment
            };

            console.log('📤 Enviando dados validados:', validatedData);

            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`
                },
                body: JSON.stringify(validatedData)
            };

            const result = await this.query('characters', options);

            if (!result.success || !result.character) {
                throw new Error('Resposta inválida do servidor');
            }

            console.log('✅ Resposta do servidor:', result);
            return result;

        } catch (error) {
            console.error('❌ Erro ao salvar personagem:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
    }

    async deleteCharacter(character) {
        console.log('🗑️ Iniciando deleção do personagem:', character);

        if (!character?.id) {
            console.error('❌ ID do personagem não fornecido:', character);
            return { error: 'ID do personagem não fornecido' };
        }

        try {
            // Deletar personagem diretamente
            const result = await this.query(`characters/${character.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('userToken')}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!result.success) {
                throw new Error('Falha ao deletar personagem');
            }

            console.log('✅ Personagem removido');
            return { success: true };

        } catch (error) {
            console.error('❌ Erro ao deletar personagem:', error);
            return { error: error.message };
        }
    }

    async characterOperation(operation, data) {
        const operations = {
            get: (id) => this.request(`characters/${id}`),
            create: (data) => this.request('characters', {
                method: 'POST',
                body: JSON.stringify(data)
            }),
            update: (id, data) => this.request(`characters/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            }),
            delete: (id) => this.request(`characters/${id}`, {
                method: 'DELETE'
            })
        };

        return operations[operation](data);
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                console.log('Dados do usuário recuperados do localStorage:', user);
                return user;
            }
            console.log('Nenhum dado de usuário encontrado no localStorage');
            return null;
        } catch (error) {
            console.error('Erro ao recuperar dados do usuário:', error);
            return null;
        }
    }

    setCurrentUser(user) {
        try {
            console.log('Salvando dados do usuário:', user);
            localStorage.setItem('currentUser', JSON.stringify(user));
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
        }
    }

    clearCurrentUser() {
        localStorage.removeItem('currentUser');
    }

    async verifyUserCredentials(username, password) {
        try {
            const options = {
                method: 'POST',
                body: JSON.stringify({ username, password })
            };

            const user = await this.query('login', options);

            if (user.error) {
                return { valid: false };
            }

            localStorage.setItem('userToken', `temp_token_${user.id}`);

            return {
                valid: true,
                userId: user.id,
                username: user.username
            };
        } catch (error) {
            console.error('Erro na verificação:', error);
            return { valid: false };
        }
    }

    async ensureApiUrl() {
        if (!this.apiUrl) {
            console.log('⚠️ Reconectando ao servidor...');
            let attempts = 0;
            while (attempts < this.maxRetries) {
                try {
                    const success = await this.initializeApiUrl();
                    if (success) {
                        console.log('✅ Reconexão bem sucedida');
                        return true;
                    }
                } catch (error) {
                    attempts++;
                    console.log(`Tentativa ${attempts} falhou:`, error);
                    await new Promise(r => setTimeout(r, this.retryDelay * attempts));
                }
            }
            throw new Error('Falha na conexão após várias tentativas');
        }
        return true;
    }
}
