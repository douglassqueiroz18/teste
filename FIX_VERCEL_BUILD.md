# 🔧 Fix: Erro de Build no Vercel

## Problema

O Vercel está tentando executar `ng build` (Angular), mas o projeto é Node.js/Express.

## Solução

### Opção 1: Configurar no Dashboard do Vercel (Recomendado)

1. Acesse o projeto no [Vercel Dashboard](https://vercel.com/dashboard)
2. Vá em **Settings** → **General**
3. Em **Build & Development Settings**:
   - **Framework Preset:** Selecione "Other" ou "Other"
   - **Build Command:** Deixe **VAZIO** ou coloque apenas: `echo 'No build'`
   - **Output Directory:** Deixe **VAZIO**
   - **Install Command:** `npm install`
4. Salve as configurações
5. Faça um novo deploy

### Opção 2: Remover Build Command via CLI

Se você configurou via CLI, pode remover:

```bash
vercel env rm BUILD_COMMAND
vercel --prod
```

### Opção 3: Forçar via vercel.json

O `vercel.json` já está configurado com `"buildCommand": ""` para desabilitar o build.

## Verificar

Após configurar, o log de build deve mostrar:
- ✅ Instalando dependências...
- ✅ Criando funções serverless...
- ❌ Não deve aparecer `ng build` ou qualquer comando de build

## Estrutura Correta

- ✅ `api/index.js` - Função serverless (detectada automaticamente)
- ✅ `public/` - Arquivos estáticos (servidos automaticamente)
- ✅ `vercel.json` - Configuração de rotas

## Se ainda não funcionar

1. Delete o projeto no Vercel Dashboard
2. Reconecte o repositório
3. Configure as settings antes do primeiro deploy
4. Ou use a configuração manual via `vercel.json` que já está pronta

