# Remove o arquivo de bloqueio
Remove-Item -Force .git/index.lock

# Adiciona todas as alterações
git add .

# Faz o commit (substitua a mensagem conforme necessário)
git commit -m "refactor: alterações na estrutura do projeto e banco de dados"
