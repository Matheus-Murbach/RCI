# Plano de Finalização — RCI

**Objetivo:** Remover a parte de gameplay e deixar o projeto finalizado com três fluxos funcionais: Login/Cadastro → Criação de Personagem → Seleção de Personagem.

---

## 1. Visão Geral do Estado Atual

O projeto possui 6 páginas e um backend Node.js/Express + SQLite. Os três primeiros fluxos (login, criação, seleção) estão funcionais porém com bugs e código morto. Os últimos dois (gamemode e game) devem ser completamente removidos.

**Fluxo atual:**
```
login.html → create.html → select.html → gamemode.html → game.html
```

**Fluxo alvo:**
```
login.html → create.html ↔ select.html (destino final)
```

---

## 2. Arquivos a Deletar (100% gameplay)

| Arquivo | Motivo |
|---------|--------|
| `pages/gamemode.html` | Tela de seleção de modo — gameplay |
| `pages/game.html` | Tela do jogo 3D — gameplay |
| `js/game.js` | Controller principal do jogo — gameplay |
| `js/gamemode.js` | Controller da seleção de modo — gameplay |
| `js/gameState.js` | Persistência de estado do jogo — gameplay e não é usado em lugar nenhum |
| `js/LODController.js` | Otimização de renderização distante — exclusivo gameplay |
| `js/cameraControllerGame.js` | Câmera do jogo — gameplay |
| `js/character/characterController.js` | Controle WASD + física + colisão — gameplay |
| `js/map/plainScene.js` | Cena de terreno plano — gameplay |
| `js/map/mapGenerator.js` | Gerador procedural de dungeons — gameplay |
| `js/map/mapCell.js` | Estrutura de célula do mapa — gameplay |
| `js/map/roomStructure.js` | Estrutura de sala/corredor — gameplay |
| `js/map/dungeonThemeManager.js` | Gerenciador de temas de dungeon — gameplay |
| `js/map/themes/scifiDungeonGenerator.js` | Gerador sci-fi de dungeon — gameplay |
| `css/game.css` | Estilos exclusivos da tela de jogo |

---

## 3. Bugs Críticos a Corrigir

### BUG 1 — Crash ao carregar personagens (CRÍTICO)
**Arquivo:** `js/database/database.js`, linha 314

```js
// ERRADO — 'string' minúsculo não é uma função em JS
faceExpression: string(char.faceExpression),

// CORRETO
faceExpression: String(char.faceExpression),
```

Este bug causa um `ReferenceError` ao tentar carregar personagens pela tela de seleção. O método `processCharacterResponse()` é chamado internamente e falha silenciosamente, mas representa um crash real caso o fluxo seja atingido.

> **Obs.:** O método `processCharacterResponse()` em si nunca é chamado pelo código atual — o `getCharactersByUserId()` retorna os dados direto sem passar por ele. O bug existe mas está em código morto. Ainda assim, deve ser corrigido antes de ser deixado no projeto.

---

### BUG 2 — Variável inexistente no encerramento do servidor (CRÍTICO)
**Arquivo:** `server/server.js`, linhas 618–620

```js
process.on('SIGTERM', () => {
    db?.close();
    dbChar?.close(); // ❌ dbChar nunca foi declarado — ReferenceError
    process.exit(0);
});
```

`dbChar` não existe. O servidor tem apenas `db`. Deve ser removido de ambos os handlers (`SIGTERM` e `SIGINT`).

---

### BUG 3 — Rota de character-refs usa nome de tabela errado
**Arquivo:** `server/server.js`, linha 471 e 486

```js
// ERRADO — tabela não existe com esse nome
db.get('SELECT * FROM character_refs WHERE id = ?', ...
db.run('DELETE FROM character_refs WHERE id = ?', ...

// A tabela criada no banco tem o nome:
// characterRefs (camelCase)
```

A rota `DELETE /api/character-refs/:refId` sempre retorna erro 500. Esta rota pode ser simplesmente deletada (a tabela `characterRefs` em si também não é usada em nenhum lugar do cliente).

---

### BUG 4 — Botão "Play" ainda redireciona para gamemode.html
**Arquivo:** `js/select.js`, linhas 213–218

```js
document.getElementById('playButton').addEventListener('click', () => {
    if (currentCharacter && authGuard.isUserActive()) {
        window.location.href = 'gamemode.html'; // ❌ página será deletada
    }
});
```

O botão "Jogar" da tela de seleção deve ser removido da interface, já que não há mais para onde navegar após selecionar o personagem.

---

### BUG 5 — Script tags inválidas no select.html
**Arquivo:** `pages/select.html`, linhas 59–61

```html
<script src="../js/LODController.js"></script>         <!-- será deletado -->
<script src="../js/gameState.js" type="module"></script> <!-- será deletado -->
```

Ambos os arquivos serão deletados. Carregar scripts inexistentes quebra o carregamento da página.

---

### BUG 6 — Modal de exclusão existe mas nunca é usado
**Arquivo:** `pages/select.html` (tem o `#deleteModal`), `js/select.js` linha 272

O HTML da select.html tem um modal completo de confirmação de exclusão (`#deleteModal` com input de digitação do nome). O JavaScript ignora esse modal e usa `confirm()` nativo do browser:

```js
// Código atual — usa confirm() nativo
showDeleteConfirmation(character) {
    const confirmed = confirm(`Tem certeza...`);
    if (confirmed) { this.deleteCharacter(character); }
}
```

O modal no HTML nunca é exibido. Deve-se conectar o código ao modal existente e remover o `confirm()`.

---

### BUG 7 — Path incorreto ao redirecionar para criar personagem
**Arquivo:** `js/select.js`, linha 207

```js
// ERRADO — '../pages/create.html' não existe a partir de pages/
window.location.href = '../pages/create.html';

// CORRETO — ambos estão em pages/
window.location.href = 'create.html';
```

---

### BUG 8 — Duplo redirecionamento no logout da criação
**Arquivo:** `js/create.js`, linhas 206–209

```js
document.getElementById('logoutButton').addEventListener('click', () => {
    authGuard.logout();               // já redireciona para /pages/login.html
    window.location.href = 'login.html'; // nunca é executado, mas é confuso
});
```

A segunda linha é código morto. `authGuard.logout()` já faz o redirect. Remover a linha extra.

---

## 4. Código Morto a Remover (em arquivos que ficam)

### `js/database/database.js`

| Método | Problema |
|--------|---------|
| `processCharacterResponse()` | Nunca chamado — `getCharactersByUserId()` retorna dados diretamente |
| `verifyUserCredentials()` | Nunca chamado — duplica lógica de `authGuard.login()` |
| `request()` | Só usado por `characterOperation()` que duplica `query()` |
| `characterOperation()` com `'get'` e `'delete'` | Nunca chamados pelo fluxo atual |
| Reconexão recursiva em `query()` (linha 143–145) | Chama `this.query()` novamente após falha — risco de loop infinito |

### `js/select.js`

| Método | Problema |
|--------|---------|
| `processCharacters()` | Definido mas nunca chamado |
| `checkDatabase()` | Definido mas nunca chamado |

### `js/create.js`

| Método | Problema |
|--------|---------|
| `animate()` | Definido mas nunca chamado — animação já roda via `renderSystem.animate()` |
| `setupResizeHandler()` | Definido mas nunca chamado — sem resize handling |
| `updateMaterials()` | Definido mas nunca chamado |
| `resetCharacterCreation()` | Definido mas nunca chamado (diferente de `resetCharacterForm()`) |
| Handler duplicado de `toggleOrbit` | Configurado duas vezes: linhas 116–133 e linhas 251–263 |

### `js/core/stateManager.js`

| Método | Problema |
|--------|---------|
| `getGameMode()` | Relacionado ao gameplay — pode ser removido |
| `setGameMode()` | Relacionado ao gameplay — pode ser removido |
| `settings.graphics` e `settings.controls` | Configurações de gameplay que não têm uso nas telas mantidas |

### `server/server.js`

| Rota/Código | Problema |
|-------------|---------|
| `DELETE /api/character-refs/:refId` | Tabela inexistente, rota nunca chamada pelo cliente |
| `GET /api/characters/:userId` (linha 396) | Usa `characterRefs` (nunca populada); conflita com `GET /api/characters?userId=` |
| `GET /api/verify-character/:id` | Não chamado pelo cliente em nenhum fluxo atual |
| `GET /api/character-exists/:id` | Não chamado pelo cliente em nenhum fluxo atual |
| `POST /api/users/exists` | Não chamado pelo cliente — `getUserByUsername` não usa essa rota |
| `POST /api/users` (linha 565) | Duplica `POST /api/users/register` — código morto |
| Criação de usuário `test/test` em `initDatabase()` | Risco de segurança — deve ser removido de produção |
| `CREATE TABLE IF NOT EXISTS characterRefs` | Tabela nunca usada — pode ser removida |
| `dbChar?.close()` em SIGTERM/SIGINT | `dbChar` não existe |

---

## 5. Problemas de Segurança (para corrigir no estado "finalizado")

Estes itens são necessários para um produto em estado publicável:

| # | Problema | Onde | Severidade |
|---|---------|------|-----------|
| 1 | Senhas armazenadas em **texto puro** | `server.js` — tabela `users` | **CRÍTICA** |
| 2 | Token previsível: `temp_token_{userId}` | `server.js` linhas 291, 334 | **Alta** |
| 3 | Sem verificação de autorização nas rotas de personagem | `DELETE /api/characters/:id` aceita qualquer ID sem validar se pertence ao usuário | **Alta** |
| 4 | Sem sanitização de inputs | `username`, `name`, `faceExpression` vão direto ao SQLite | **Média** |
| 5 | CORS `origin: '*'` | `server.js` linha 115 | **Baixa** (ambiente controlado) |
| 6 | Sem rate limiting nos endpoints de auth | `POST /api/users/login` | **Média** |

**Mínimo aceitável:** Corrigir itens 1, 2 e 3. Os demais são opcionais para uso interno.

---

## 6. Alterações de UX Necessárias

### 6.1 — Botão "Jogar" na tela de seleção
Com a remoção do gameplay, o botão "Jogar" não tem destino. **Solução recomendada:** remover o botão. A tela de seleção passa a ser o ponto final após o login — o usuário cria, visualiza e gerencia seus personagens ali.

### 6.2 — Confirmação de exclusão
Conectar o modal existente no HTML (`#deleteModal`) ao código JavaScript em vez de usar `confirm()`. O modal já tem input de confirmação por nome — muito mais seguro e consistente visualmente.

### 6.3 — Mensagem de boas-vindas na seleção
Após o login, a tela de seleção não mostra o nome do usuário logado em nenhum lugar. Considerar adicionar um `<span>` com `Bem-vindo, {username}` no header da lista de personagens.

---

## 7. Resumo — Contagem de Mudanças

| Categoria | Qtd |
|-----------|-----|
| Arquivos a deletar | 15 |
| Bugs críticos a corrigir | 8 |
| Blocos de código morto a remover | ~18 métodos/rotas |
| Problemas de segurança (mínimo) | 3 |
| Melhorias de UX | 3 |

---

## 8. Ordem Sugerida de Execução

1. **Deletar arquivos de gameplay** (sem risco, não afeta nada que fica)
2. **Corrigir `select.html`** — remover script tags de arquivos deletados, botão "Jogar" e conectar modal
3. **Corrigir `js/select.js`** — remover handler do Play, corrigir path, conectar modal, remover código morto
4. **Corrigir `js/create.js`** — remover métodos mortos, handler duplicado, fix do logout
5. **Corrigir `js/database/database.js`** — fix `String()`, remover métodos mortos, fix loop de reconexão
6. **Corrigir `server/server.js`** — remover rotas mortas, tabela não usada, fix SIGTERM/SIGINT, usuário test
7. **Corrigir `js/core/stateManager.js`** — remover métodos de gameMode
8. **Segurança** — hash de senhas (bcrypt), token UUID real, validação de ownership de personagem
