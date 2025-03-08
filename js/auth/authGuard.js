import { Database } from '../database/database.js';
import { StateManager } from '../core/stateManager.js';

class AuthGuard {
    constructor() {
        this.db = new Database();
        this.stateManager = StateManager.getInstance();
    }

    isUserActive() {
        const user = this.stateManager.getUser();
        const isActive = !!(user && user.id && user.token && user.username);
        console.log('🔐 Verificando autenticação:', { 
            user,
            isActive,
            hasToken: !!user?.token,
            hasId: !!user?.id
        });
        return isActive;
    }

    getActiveUserId() {
        return this.stateManager.getUser().id;
    }

    async authenticate(credentials, isRegister = false) {
        try {
            const endpoint = isRegister ? 'register' : 'login';
            const result = await this.db.query(`users/${endpoint}`, {
                method: 'POST',
                body: JSON.stringify(credentials)
            });

            if (result.success) {
                this.stateManager.setUser({
                    id: result.user.id,
                    username: result.user.username,
                    token: result.user.token
                });
                return { success: true, user: result.user };
            }
            return { success: false, message: result.error };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async login(username, password) {
        try {
            const result = await this.db.getUserByUsername(username, password);
            if (result.error) {
                return { success: false, message: result.error };
            }
            if (result.user) {
                // Salvar usuário no StateManager
                const userData = {
                    id: result.user.id,
                    username: result.user.username,
                    token: result.user.token
                };
                this.stateManager.setUser(userData);
                console.log('👤 Usuário autenticado:', userData);
                return { success: true, user: result.user };
            }
            return { success: false, message: 'Credenciais inválidas' };
        } catch (error) {
            console.error('❌ Erro no login:', error);
            return { success: false, message: error.message };
        }
    }

    async register(userData) {
        try {
            const result = await this.db.createUser(userData);
            if (!result.success) {
                return { success: false, message: result.error };
            }
            return { success: true, message: 'Conta criada com sucesso!' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    logout() {
        this.stateManager.clearState();
        window.location.href = '/pages/login.html';
    }
}

export const authGuard = new AuthGuard();
