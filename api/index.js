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

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

    // Criar PDF - formato retrato para cartão digital
    const doc = new PDFDocument({
      size: [400, 700],
      margins: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    // Abrir diretamente no navegador/celular (inline ao invés de attachment)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="cartao-${(cliente.nome || 'cliente').replace(/\s+/g, '-')}.pdf"`);

    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // Fundo gradiente moderno
    const gradient = doc.linearGradient(0, 0, 0, pageHeight);
    gradient.stop(0, '#667eea')
           .stop(0.5, '#764ba2')
           .stop(1, '#f093fb');
    
    doc.rect(0, 0, pageWidth, pageHeight)
       .fill(gradient);

    // Área principal do cartão (com sombra visual)
    const cardMargin = 30;
    const cardWidth = pageWidth - (cardMargin * 2);
    const cardHeight = pageHeight - (cardMargin * 2);

    // Sombra do cartão
    doc.rect(cardMargin + 3, cardMargin + 3, cardWidth, cardHeight)
       .fillColor('rgba(0,0,0,0.1)')
       .fill();

    // Cartão branco principal
    doc.rect(cardMargin, cardMargin, cardWidth, cardHeight)
       .fillColor('#FFFFFF')
       .fill();

    // Linha decorativa no topo
    doc.rect(cardMargin, cardMargin, cardWidth, 6)
       .fill(gradient);

    // Área de conteúdo
    const contentPadding = 40;
    let yPosition = cardMargin + contentPadding + 40;

    // Nome principal - grande e destacado
    doc.fillColor('#2C3E50')
       .fontSize(36)
       .font('Helvetica-Bold')
       .text(cliente.nome || 'Nome', contentPadding, yPosition, {
         width: cardWidth - (contentPadding * 2),
         align: 'center',
         lineGap: 5
       });

    // Medir altura do nome para posicionar próximo elemento
    const nomeHeight = doc.heightOfString(cliente.nome || 'Nome', {
      width: cardWidth - (contentPadding * 2),
      align: 'center'
    });
    yPosition += nomeHeight + 50;

    // Linha divisória decorativa
    const lineY = yPosition - 20;
    doc.moveTo(contentPadding + 50, lineY)
       .lineTo(cardWidth - contentPadding - 50, lineY)
       .lineWidth(2)
       .strokeColor('#667eea')
       .stroke();

    yPosition += 40;

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
      // Botões estilizados para cada rede social
      const buttonHeight = 55;
      const buttonSpacing = 15;
      const buttonWidth = cardWidth - (contentPadding * 2);

      links.forEach((link, index) => {
        // Verificar se há espaço na página
        if (yPosition + buttonHeight > pageHeight - cardMargin - 40) {
          // Não adicionar nova página, apenas avisar
          return;
        }

        const buttonY = yPosition;
        
        // Botão com fundo colorido
        doc.roundedRect(contentPadding, buttonY, buttonWidth, buttonHeight, 10)
           .fillColor(link.bgColor + '15') // 15 = transparência baixa
           .fill();

        // Borda colorida
        doc.roundedRect(contentPadding, buttonY, buttonWidth, buttonHeight, 10)
           .lineWidth(2)
           .strokeColor(link.color)
           .stroke();

        // Ícone e texto do botão
        const iconSize = 28;
        const textX = contentPadding + 55;
        const textY = buttonY + (buttonHeight / 2) - 10;
        const iconX = contentPadding + 12;
        const iconY = buttonY + (buttonHeight / 2) - 14;

        // Ícone/Símbolo da rede social (grande e destacado)
        doc.fontSize(iconSize)
           .fillColor(link.color)
           .text(link.symbol || link.icon || '🔗', iconX, iconY);

        // Label da rede social
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .fillColor(link.color)
           .text(link.label, textX, textY);

        // Texto "Clique para acessar"
        doc.fontSize(11)
           .font('Helvetica')
           .fillColor('#7f8c8d')
           .text('Clique para acessar', textX, textY + 18);

        // Área clicável do botão
        doc.link(contentPadding, buttonY, buttonWidth, buttonHeight, link.url);

        yPosition += buttonHeight + buttonSpacing;
      });
    }

    // Rodapé minimalista
    const footerY = pageHeight - cardMargin - 30;
    doc.fontSize(9)
       .fillColor('#BDC3C7')
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

