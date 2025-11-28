# Guia de Deploy no Vercel

Este guia irá ajudá-lo a fazer o deploy do projeto Cartão de Visita Digital no Vercel.

## Pré-requisitos

1. Conta no [Vercel](https://vercel.com) (gratuita)
2. Conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratuita) - para armazenamento de dados

## Passo 1: Configurar MongoDB Atlas

1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie uma conta gratuita ou faça login
3. Crie um novo cluster (escolha o plano gratuito M0)
4. Configure o acesso:
   - Vá em **Network Access** e adicione `0.0.0.0/0` para permitir acesso de qualquer lugar
5. Crie um usuário do banco de dados:
   - Vá em **Database Access**
   - Clique em **Add New Database User**
   - Escolha **Password** como método de autenticação
   - Defina username e password (anote essas informações!)
6. Obtenha a string de conexão:
   - Vá em **Database** > **Connect**
   - Escolha **Connect your application**
   - Copie a connection string (parece com: `mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority`)
   - Substitua `<password>` pela senha que você criou
   - Substitua `<dbname>` por `cartao-visita` ou o nome que preferir

## Passo 2: Deploy no Vercel

### Opção A: Deploy via GitHub (Recomendado)

1. **Criar repositório no GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <URL_DO_SEU_REPOSITORIO>
   git push -u origin main
   ```

2. **Conectar ao Vercel:**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em **Add New Project**
   - Importe o repositório do GitHub
   - Configure o projeto:
     - **Framework Preset:** Other
     - **Root Directory:** ./
     - **Build Command:** (deixe vazio)
     - **Output Directory:** (deixe vazio)

3. **Configurar Variáveis de Ambiente:**
   - Na seção **Environment Variables**, adicione:
     - **Key:** `MONGODB_URI`
     - **Value:** Cole a connection string do MongoDB Atlas (a que você obteve no Passo 1)
   - Clique em **Add** e depois em **Deploy**

### Opção B: Deploy via CLI do Vercel

1. **Instalar Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Fazer login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Configurar variável de ambiente:**
   ```bash
   vercel env add MONGODB_URI
   ```
   - Cole a connection string do MongoDB quando solicitado

5. **Fazer deploy de produção:**
   ```bash
   vercel --prod
   ```

## Passo 3: Verificar o Deploy

1. Após o deploy, você receberá uma URL (ex: `seu-projeto.vercel.app`)
2. Acesse a URL no navegador
3. Teste criando um cartão de visita
4. Verifique se os dados estão sendo salvos no MongoDB Atlas

## Notas Importantes

- ⚠️ **Armazenamento em memória:** Se você não configurar o MongoDB, o aplicativo funcionará, mas os dados não serão persistidos (serão perdidos quando a função serverless reiniciar)
- 🔐 **Segurança:** Nunca compartilhe suas credenciais do MongoDB publicamente
- 📊 **MongoDB Atlas:** O plano gratuito permite até 512MB de armazenamento, suficiente para milhares de cartões de visita

## Troubleshooting

### Erro: "Cannot connect to MongoDB"
- Verifique se a connection string está correta
- Verifique se o IP `0.0.0.0/0` está liberado no Network Access do MongoDB Atlas
- Verifique se as credenciais do usuário estão corretas

### Erro: "Function timeout"
- O timeout padrão do Vercel é 10s para o plano gratuito
- O projeto está configurado para até 30s, mas pode ser necessário upgrade no plano

### Dados não persistem
- Certifique-se de que a variável `MONGODB_URI` está configurada no Vercel
- Verifique se o MongoDB Atlas está acessível

## Atualizações Futuras

Para atualizar o projeto após fazer mudanças:

1. Faça commit das mudanças:
   ```bash
   git add .
   git commit -m "Descrição das mudanças"
   git push
   ```

2. O Vercel fará deploy automático se estiver conectado ao GitHub, ou rode:
   ```bash
   vercel --prod
   ```

## Suporte

Se tiver problemas, verifique:
- [Documentação do Vercel](https://vercel.com/docs)
- [Documentação do MongoDB Atlas](https://docs.atlas.mongodb.com)

