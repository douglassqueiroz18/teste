const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');

// Para Vercel, vamos usar MongoDB ou armazenamento em memória
// Você pode usar MongoDB Atlas (gratuito) ou Vercel KV
let db;

// Inicializar banco de dados
let mongoClient = null;

async function initDB() {
  // Se estiver no Vercel e tiver MongoDB configurado
  if (process.env.MONGODB_URI) {
    try {
      const { MongoClient } = require('mongodb');
      mongoClient = new MongoClient(process.env.MONGODB_URI);
      await mongoClient.connect();
      const database = mongoClient.db('cartao-visita');
      db = database.collection('clientes');
      
      // Criar índice único no campo id
      await db.createIndex({ id: 1 }, { unique: true });
      return;
    } catch (error) {
      console.error('Erro ao conectar ao MongoDB:', error);
      // Fallback para memória se MongoDB falhar
    }
  }

  // Fallback: usar armazenamento em memória (não persiste, apenas para demo)
  // Para produção, configure MongoDB Atlas
  db = {
    data: new Map(),
    async findOne(query) {
      const id = query.id || query._id;
      const result = this.data.get(id);
      return result ? { ...result } : null;
    },
    async insertOne(doc) {
      this.data.set(doc.id, { ...doc });
      return { insertedId: doc.id };
    },
    async updateOne(query, update) {
      const id = query.id || query._id;
      const existing = this.data.get(id);
      if (existing) {
        const updated = { ...existing, ...update.$set };
        this.data.set(id, updated);
        return { modifiedCount: 1 };
      }
      return { modifiedCount: 0 };
    },
    async find() {
      return Array.from(this.data.values()).map(item => ({ ...item }));
    }
  };
}

const app = express();
const fs = require('fs');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir arquivos estáticos (para Vercel)
app.get('/', (req, res) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('Página não encontrada');
  }
});

// Rota para edição
app.get('/editar/:id', (req, res) => {
  const htmlPath = path.join(__dirname, '..', 'public', 'index.html');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.status(404).send('Página não encontrada');
  }
});

// Inicializar DB antes de processar requisições
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
  next();
});

// Criar índice/estrutura se necessário
async function ensureSchema() {
  if (db.createIndex) {
    await db.createIndex({ id: 1 }, { unique: true });
  }
}

// Rota para criar novo cliente
app.post('/api/clientes', async (req, res) => {
  try {
    await ensureSchema();
    const id = uuidv4();
    const cliente = {
      id,
      nome: req.body.nome || '',
      telefone: req.body.telefone || '',
      email: req.body.email || '',
      instagram: req.body.instagram || '',
      whatsapp: req.body.whatsapp || '',
      facebook: req.body.facebook || '',
      linkedin: req.body.linkedin || '',
      website: req.body.website || '',
      outros_links: req.body.outros_links || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (db.insertOne) {
      await db.insertOne(cliente);
    } else {
      db.data.set(id, cliente);
    }

    res.json({ id, message: 'Cliente criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// Rota para buscar cliente por ID
app.get('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await db.findOne({ id });

    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(cliente);
  } catch (error) {
    console.error('Erro ao buscar cliente:', error);
    res.status(500).json({ error: 'Erro ao buscar cliente' });
  }
});

// Rota para atualizar cliente
app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const update = {
      $set: {
        nome: req.body.nome || '',
        telefone: req.body.telefone || '',
        email: req.body.email || '',
        instagram: req.body.instagram || '',
        whatsapp: req.body.whatsapp || '',
        facebook: req.body.facebook || '',
        linkedin: req.body.linkedin || '',
        website: req.body.website || '',
        outros_links: req.body.outros_links || '',
        updated_at: new Date().toISOString()
      }
    };

    let result;
    if (db.updateOne) {
      result = await db.updateOne({ id }, update);
    } else {
      const existing = db.data.get(id);
      if (existing) {
        db.data.set(id, { ...existing, ...update.$set });
        result = { modifiedCount: 1 };
      } else {
        result = { modifiedCount: 0 };
      }
    }

    if (result.modifiedCount === 0) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json({ message: 'Cliente atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar cliente:', error);
    res.status(500).json({ error: 'Erro ao atualizar cliente' });
  }
});

// Rota para listar todos os clientes
app.get('/api/clientes', async (req, res) => {
  try {
    const all = await db.find();
    const clientes = all.map(cliente => ({
      id: cliente.id || cliente._id,
      nome: cliente.nome || '',
      created_at: cliente.created_at
    })).sort((a, b) => {
      const dateA = new Date(a.created_at || 0);
      const dateB = new Date(b.created_at || 0);
      return dateB - dateA;
    });

    res.json(clientes);
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// Rota para gerar e baixar PDF
app.get('/c/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await db.findOne({ id });

    if (!cliente) {
      return res.status(404).send('Cliente não encontrado');
    }

    // Criar PDF - formato retrato premium para cartão digital
    const doc = new PDFDocument({
      size: [400, 700],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    // Fazer download automático do PDF para garantir que o cliente tenha uma cópia
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartao-${(cliente.nome || 'cliente').replace(/\s+/g, '-')}.pdf"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Fundo gradiente premium moderno
    const gradient = doc.linearGradient(0, 0, 0, pageHeight);
    gradient.stop(0, '#6366f1')  // Indigo vibrante
           .stop(0.3, '#8b5cf6') // Roxo
           .stop(0.6, '#ec4899') // Rosa
           .stop(1, '#f43f5e');  // Rosa vibrante
    
    doc.rect(0, 0, pageWidth, pageHeight)
       .fill(gradient);

    // Área principal do cartão com sombra elegante
    const cardMargin = 25;
    const cardWidth = pageWidth - (cardMargin * 2);
    const cardHeight = pageHeight - (cardMargin * 2);
    const borderRadius = 20;

    // Múltiplas camadas de sombra para profundidade
    for (let i = 3; i > 0; i--) {
      doc.roundedRect(cardMargin + i, cardMargin + i, cardWidth, cardHeight, borderRadius)
         .fillColor(`rgba(0,0,0,${0.05 * i})`)
         .fill();
    }

    // Cartão branco principal com bordas arredondadas
    doc.roundedRect(cardMargin, cardMargin, cardWidth, cardHeight, borderRadius)
       .fillColor('#FFFFFF')
       .fill();

    // Barra superior decorativa com gradiente
    const topBarHeight = 8;
    doc.roundedRect(cardMargin, cardMargin, cardWidth, topBarHeight, borderRadius)
       .fill(gradient);

    // Área de conteúdo
    const contentPadding = 35;
    let yPosition = cardMargin + 60;

    // Nome principal - estilo premium
    doc.fillColor('#1e293b')
       .fontSize(42)
       .font('Helvetica-Bold')
       .text(cliente.nome || 'Nome', contentPadding, yPosition, {
         width: cardWidth - (contentPadding * 2),
         align: 'center',
         lineGap: 8
       });

    // Medir altura do nome
    const nomeHeight = doc.heightOfString(cliente.nome || 'Nome', {
      width: cardWidth - (contentPadding * 2),
      align: 'center'
    });
    yPosition += nomeHeight + 45;

    // Linha divisória elegante com gradiente
    const lineY = yPosition - 25;
    const lineWidth = cardWidth - (contentPadding * 2) - 80;
    const lineX = (pageWidth - lineWidth) / 2;
    
    // Linha com gradiente (simulado com múltiplas linhas)
    for (let i = 0; i < 3; i++) {
      doc.moveTo(lineX, lineY + i)
         .lineTo(lineX + lineWidth, lineY + i)
         .lineWidth(1)
         .strokeColor(i === 1 ? '#6366f1' : '#e2e8f0')
         .stroke();
    }

    yPosition += 35;

    // Links sociais - apenas os que existem
    const links = [];

    if (cliente.instagram) {
      const instagramUrl = cliente.instagram.startsWith('http') ? cliente.instagram : `https://instagram.com/${cliente.instagram.replace('@', '')}`;
      links.push({ 
        label: 'Instagram', 
        url: instagramUrl, 
        color: '#E4405F',
        bgColor: '#E4405F',
        symbol: '📷'
      });
    }

    if (cliente.whatsapp) {
      const whatsappUrl = cliente.whatsapp.startsWith('http') ? cliente.whatsapp : `https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`;
      links.push({ 
        label: 'WhatsApp', 
        url: whatsappUrl, 
        color: '#25D366',
        bgColor: '#25D366',
        symbol: '💬'
      });
    }

    if (cliente.facebook) {
      const facebookUrl = cliente.facebook.startsWith('http') ? cliente.facebook : `https://facebook.com/${cliente.facebook}`;
      links.push({ 
        label: 'Facebook', 
        url: facebookUrl, 
        color: '#1877F2',
        bgColor: '#1877F2',
        symbol: '👥'
      });
    }

    if (cliente.linkedin) {
      const linkedinUrl = cliente.linkedin.startsWith('http') ? cliente.linkedin : `https://linkedin.com/in/${cliente.linkedin}`;
      links.push({ 
        label: 'LinkedIn', 
        url: linkedinUrl, 
        color: '#0077B5',
        bgColor: '#0077B5',
        symbol: '💼'
      });
    }

    if (cliente.website) {
      const websiteUrl = cliente.website.startsWith('http') ? cliente.website : `https://${cliente.website}`;
      links.push({ 
        label: 'Website', 
        url: websiteUrl, 
        color: '#667eea',
        bgColor: '#667eea',
        symbol: '🌐'
      });
    }

    // Processar outros links
    if (cliente.outros_links) {
      const outrosLinks = cliente.outros_links.split(',').map(link => {
        const [label, url] = link.split('|');
        return { 
          label: label ? label.trim() : 'Link', 
          url: url ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : '', 
          color: '#764ba2',
          bgColor: '#764ba2',
          symbol: '🔗'
        };
      }).filter(link => link.url);
      links.push(...outrosLinks);
    }

    // Se não houver links, mostrar mensagem
    if (links.length === 0) {
      doc.fontSize(14)
         .fillColor('#95A5A6')
         .text('Adicione links nas redes sociais', contentPadding, yPosition, {
           width: cardWidth - (contentPadding * 2),
           align: 'center'
         });
    } else {
      // Botões premium estilizados para cada rede social
      const buttonHeight = 65;
      const buttonSpacing = 18;
      const buttonWidth = cardWidth - (contentPadding * 2);
      const buttonRadius = 15;

      links.forEach((link, index) => {
        // Verificar se há espaço na página
        if (yPosition + buttonHeight > pageHeight - cardMargin - 50) {
          return;
        }

        const buttonY = yPosition;
        
        // Sombra sutil do botão
        doc.roundedRect(contentPadding + 2, buttonY + 2, buttonWidth, buttonHeight, buttonRadius)
           .fillColor('rgba(0,0,0,0.05)')
           .fill();

        // Fundo do botão com cor suave (simulado)
        doc.roundedRect(contentPadding, buttonY, buttonWidth, buttonHeight, buttonRadius)
           .fillColor('#f8fafc')
           .fill();

        // Borda elegante
        doc.roundedRect(contentPadding, buttonY, buttonWidth, buttonHeight, buttonRadius)
           .lineWidth(2.5)
           .strokeColor(link.color)
           .stroke();

        // Ícone e texto do botão
        const iconSize = 32;
        const iconCircleSize = 48;
        const iconCircleX = contentPadding + 15;
        const iconCircleY = buttonY + (buttonHeight / 2) - (iconCircleSize / 2);
        const textX = contentPadding + 75;
        const textY = buttonY + (buttonHeight / 2) - 12;

        // Círculo de fundo para o ícone (cor suave)
        const lightColor = link.color === '#E4405F' ? '#fce7f3' : 
                          link.color === '#25D366' ? '#d1fae5' :
                          link.color === '#1877F2' ? '#dbeafe' :
                          link.color === '#0077B5' ? '#e0f2fe' :
                          link.color === '#667eea' ? '#eef2ff' : '#f3f4f6';
        doc.circle(iconCircleX + (iconCircleSize / 2), iconCircleY + (iconCircleSize / 2), iconCircleSize / 2)
           .fillColor(lightColor)
           .fill();

        // Ícone da rede social
        doc.fontSize(iconSize)
           .fillColor(link.color)
           .text(link.symbol || link.icon || '🔗', iconCircleX + 8, iconCircleY + 8);

        // Label da rede social - estilo premium
        doc.fontSize(18)
           .font('Helvetica-Bold')
           .fillColor('#1e293b')
           .text(link.label, textX, textY);

        // Texto "Toque para acessar" - mais elegante
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#64748b')
           .text('Toque para acessar', textX, textY + 22);

        // Área clicável do botão (toda a área)
        doc.link(contentPadding, buttonY, buttonWidth, buttonHeight, link.url);

        yPosition += buttonHeight + buttonSpacing;
      });
    }

    // Rodapé elegante e minimalista
    const footerY = pageHeight - cardMargin - 25;
    doc.fontSize(8)
       .font('Helvetica')
       .fillColor('#cbd5e1')
       .text('Cartão de Visita Digital', contentPadding, footerY, {
         align: 'center',
         width: cardWidth - (contentPadding * 2)
       });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF');
  }
});

// Exportar para Vercel
module.exports = app;

