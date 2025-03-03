import { Database } from '../database/database.js';

class AuthGuard {
    constructor() {
        this.db = new Database();
        this.activeUserId = null;
    }

    setActiveUser(userId) {
        this.activeUserId = userId;
        localStorage.setItem('activeUserId', userId);
        console.log('ID do usuário ativo definido:', userId);
    }

    clearActiveUser() {
        this.activeUserId = null;
        localStorage.removeItem('activeUserId');
        localStorage.removeItem('userToken');
    }

    isUserActive() {
        const authData = {
            activeId: localStorage.getItem('activeUserId'),
            token: localStorage.getItem('userToken'),
            currentUser: localStorage.getItem('currentUser')
        };

        if (!authData.token && authData.currentUser) {
            try {
                const userData = JSON.parse(authData.currentUser);
                if (userData.token) {
                    localStorage.setItem('userToken', userData.token);
                    return true;
                }
            } catch (error) {
                console.error('❌ Erro ao parsear dados:', error);
            }
        }

        return !!(authData.activeId && authData.token);
    }

    getActiveUserId() {
        const id = localStorage.getItem('activeUserId');
        console.log('Obtendo ID do usuário ativo:', {
            storedId: id,
            memoryId: this.activeUserId
        });
        return id;
    }

    async verifyCredentials(username, password) {
        try {
            const result = await this.db.verifyUserCredentials(username, password);
            console.log('Verificação de credenciais:', result);

            if (result.valid && result.userId) {
                this.setActiveUser(result.userId);
                // Garantir que o token foi salvo
                if (!localStorage.getItem('userToken')) {
                    console.error('Token não encontrado após verificação');
                    return false;
                }
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro na verificação:', error);
            return false;
        }
    }

    async authenticate(credentials, isRegister = false) {
        try {
            const endpoint = isRegister ? 'register' : 'login';
            const result = await this.db.query(`users/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (result.success) {
                this.setActiveUser(result.user.id);
                localStorage.setItem('userToken', result.user.token);
                this.db.setCurrentUser(result.user);
                return { success: true, user: result.user };
            }
            return { success: false, message: result.error };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async register(formData) {
        try {
            console.log('🔄 Iniciando registro:', formData.username);
            
            // Verificar se usuário já existe
            const existingUser = await this.db.getUserByUsername(formData.username);
            if (existingUser.exists) {
                return {
                    success: false,
                    message: 'Este nome de usuário já está em uso'
                };
            }
            
            const result = await this.db.createUser(formData);
            console.log('📝 Resultado do registro:', result);

            if (result.success && result.user) {
                // Salvar dados da sessão
                this.setActiveUser(result.user.id);
                localStorage.setItem('userToken', `temp_token_${result.user.id}`);
                this.db.setCurrentUser(result.user);

                return {
                    success: true,
                    message: 'Conta criada com sucesso!',
                    user: result.user
                };
            }

            return {
                success: false,
                message: result.error || 'Erro ao criar conta'
            };

        } catch (error) {
            console.error('❌ Erro no registro:', error);
            const errorMessage = error.message.includes('já existe') 
                ? 'Este nome de usuário já está em uso'
                : 'Erro ao criar conta. Tente novamente.';
                
            return {
                success: false,
                message: errorMessage
            };
        }
    }

    async login(username, password) {
        try {
            // Primeiro limpar dados antigos
            this.clearActiveUser();
            
            const loginResult = await this.db.getUserByUsername(username, password);
            console.log('Resultado do login:', loginResult);

            if (loginResult.error) {
                return {
                    success: false,
                    message: loginResult.error
                };
            }

            if (loginResult.user?.id) {
                // Salvar dados do usuário
                const userData = {
                    id: loginResult.user.id,
                    username: loginResult.user.username
                };

                // Salvar dados da sessão
                this.setActiveUser(userData.id);
                localStorage.setItem('userToken', loginResult.user.token);
                this.db.setCurrentUser(userData);

                console.log('Dados salvos após login:', {
                    userId: userData.id,
                    username: userData.username,
                    hasToken: !!loginResult.user.token,
                    storedToken: localStorage.getItem('userToken')
                });

                return {
                    success: true,
                    message: 'Login realizado com sucesso!',
                    user: userData
                };
            }

            return {
                success: false,
                message: 'Dados de login inválidos'
            };
        } catch (error) {
            console.error('Erro no login:', error);
            return {
                success: false,
                message: 'Erro ao fazer login'
            };
        }
    }

    logout() {
        this.clearActiveUser();
        window.location.href = '/pages/login.html';
    }
}

export const authGuard = new AuthGuard();
