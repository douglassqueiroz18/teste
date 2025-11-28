# Cartão de Visita Digital

Aplicativo web para gerar cartões de visita digitais em PDF a partir de links fornecidos pelo usuário (Instagram, WhatsApp e outros).

## Funcionalidades

- ✅ Criação e edição de dados do cliente (nome, contatos, links sociais)
- ✅ Geração automática de link exclusivo para cada cliente
- ✅ Download de PDF com todos os hiperlinks clicáveis
- ✅ Interface moderna e responsiva
- ✅ Armazenamento de dados em SQLite

## Instalação

1. Instale as dependências:
```bash
npm install
```

2. Inicie o servidor:
```bash
npm start
```

Para desenvolvimento com auto-reload:
```bash
npm run dev
```

3. Acesse o aplicativo em: `http://localhost:3000`

## Como Usar

1. **Criar um novo cartão:**
   - Preencha os dados do cliente no formulário
   - Clique em "Salvar e Gerar Link"
   - Um link exclusivo será gerado

2. **Editar um cartão existente:**
   - Acesse a lista de clientes na página inicial
   - Clique em "Editar" no cliente desejado
   - Faça as alterações e clique em "Atualizar Dados"

3. **Compartilhar o cartão:**
   - Copie o link exclusivo gerado
   - Compartilhe com outras pessoas
   - Ao acessar o link, o PDF será baixado automaticamente

## Estrutura do Projeto

```
├── server.js          # Servidor Express e rotas da API
├── package.json       # Dependências do projeto
├── database.db        # Banco de dados SQLite (criado automaticamente)
└── public/
    ├── index.html     # Interface do usuário
    ├── styles.css     # Estilos CSS
    └── script.js      # Lógica do frontend
```

## Tecnologias Utilizadas

- **Backend:** Node.js + Express
- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **PDF:** PDFKit
- **Banco de Dados:** MongoDB Atlas (Vercel) / SQLite (local)

## Deploy no Vercel

Este projeto está pronto para deploy no Vercel! Veja o guia completo em [DEPLOY.md](./DEPLOY.md)

**Resumo rápido:**
1. Configure uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (gratuito)
2. Obtenha a connection string do MongoDB
3. Faça deploy no Vercel (via GitHub ou CLI)
4. Adicione a variável de ambiente `MONGODB_URI` no Vercel

### Estrutura para Vercel

- `api/index.js` - Serverless function para o Vercel
- `server.js` - Servidor Express para desenvolvimento local
- `vercel.json` - Configuração do Vercel

## Desenvolvimento Local

Para desenvolvimento local, você pode usar SQLite (já configurado) ou MongoDB:

```bash
npm install
npm start
```

## API Endpoints

- `GET /` - Página principal (editor)
- `GET /editar/:id` - Página de edição de cliente
- `GET /c/:id` - Gera e baixa o PDF do cartão
- `POST /api/clientes` - Cria novo cliente
- `GET /api/clientes` - Lista todos os clientes
- `GET /api/clientes/:id` - Busca cliente por ID
- `PUT /api/clientes/:id` - Atualiza cliente

## Licença

ISC

