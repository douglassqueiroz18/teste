# 🚀 Deploy Rápido no Vercel

## Passos Rápidos

### 1. MongoDB Atlas (5 minutos)

1. Acesse: https://www.mongodb.com/cloud/atlas
2. Crie conta gratuita → Crie cluster M0 (grátis)
3. **Network Access:** Adicione `0.0.0.0/0`
4. **Database Access:** Crie usuário (username + password)
5. **Connect** → **Connect your application** → Copie a string de conexão
   - Substitua `<password>` pela sua senha
   - Exemplo: `mongodb+srv://user:password@cluster.mongodb.net/cartao-visita?retryWrites=true&w=majority`

### 2. Vercel (3 minutos)

**Opção A - Via GitHub (Recomendado):**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <SEU_REPO_GITHUB>
git push -u origin main
```
- Acesse vercel.com → Import Project → Selecione o repositório
- Adicione variável: `MONGODB_URI` = sua connection string
- Deploy!

**Opção B - Via CLI:**
```bash
npm i -g vercel
vercel login
vercel
vercel env add MONGODB_URI  # Cole a connection string
vercel --prod
```

### 3. Pronto! ✨

Acesse sua URL do Vercel e teste criando um cartão de visita.

## ⚠️ Importante

- Sem MongoDB = dados não persistem (perdidos ao reiniciar)
- Com MongoDB = dados salvos permanentemente

## 📚 Guia Completo

Veja [DEPLOY.md](./DEPLOY.md) para instruções detalhadas.

