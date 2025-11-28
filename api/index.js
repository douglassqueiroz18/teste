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

    // Criar PDF
    const doc = new PDFDocument({
      size: [400, 600],
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartao-visita-${(cliente.nome || 'cliente').replace(/\s+/g, '-')}.pdf"`);

    doc.pipe(res);

    // Estilo do cartão
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 50;

    // Fundo colorido
    doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin)
       .fillColor('#4A90E2')
       .fill();

    // Área de conteúdo (branco)
    const contentMargin = 20;
    doc.rect(margin + contentMargin, margin + contentMargin, 
             pageWidth - 2 * (margin + contentMargin), 
             pageHeight - 2 * (margin + contentMargin))
       .fillColor('#FFFFFF')
       .fill();

    // Nome
    doc.fillColor('#2C3E50')
       .fontSize(28)
       .font('Helvetica-Bold')
       .text(cliente.nome || 'Nome', margin + contentMargin + 30, margin + contentMargin + 40, {
         width: pageWidth - 2 * (margin + contentMargin + 30),
         align: 'center'
       });

    let yPosition = margin + contentMargin + 120;

    // Informações de contato
    doc.fontSize(12)
       .font('Helvetica');

    if (cliente.telefone) {
      doc.fillColor('#34495E')
         .text('📞 Telefone:', margin + contentMargin + 30, yPosition)
         .fillColor('#4A90E2')
         .text(cliente.telefone, margin + contentMargin + 30, yPosition + 20);
      yPosition += 50;
    }

    if (cliente.email) {
      doc.fillColor('#34495E')
         .text('✉️ Email:', margin + contentMargin + 30, yPosition)
         .fillColor('#4A90E2')
         .link(margin + contentMargin + 30, yPosition + 20, 300, 20, `mailto:${cliente.email}`)
         .text(cliente.email, margin + contentMargin + 30, yPosition + 20);
      yPosition += 50;
    }

    // Links sociais
    const links = [];

    if (cliente.instagram) {
      const instagramUrl = cliente.instagram.startsWith('http') ? cliente.instagram : `https://instagram.com/${cliente.instagram.replace('@', '')}`;
      links.push({ label: 'Instagram', url: instagramUrl, icon: '📷' });
    }

    if (cliente.whatsapp) {
      const whatsappUrl = cliente.whatsapp.startsWith('http') ? cliente.whatsapp : `https://wa.me/${cliente.whatsapp.replace(/\D/g, '')}`;
      links.push({ label: 'WhatsApp', url: whatsappUrl, icon: '💬' });
    }

    if (cliente.facebook) {
      const facebookUrl = cliente.facebook.startsWith('http') ? cliente.facebook : `https://facebook.com/${cliente.facebook}`;
      links.push({ label: 'Facebook', url: facebookUrl, icon: '👥' });
    }

    if (cliente.linkedin) {
      const linkedinUrl = cliente.linkedin.startsWith('http') ? cliente.linkedin : `https://linkedin.com/in/${cliente.linkedin}`;
      links.push({ label: 'LinkedIn', url: linkedinUrl, icon: '💼' });
    }

    if (cliente.website) {
      const websiteUrl = cliente.website.startsWith('http') ? cliente.website : `https://${cliente.website}`;
      links.push({ label: 'Website', url: websiteUrl, icon: '🌐' });
    }

    // Processar outros links
    if (cliente.outros_links) {
      const outrosLinks = cliente.outros_links.split(',').map(link => {
        const [label, url] = link.split('|');
        return { 
          label: label ? label.trim() : 'Link', 
          url: url ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : '', 
          icon: '🔗' 
        };
      }).filter(link => link.url);
      links.push(...outrosLinks);
    }

    // Adicionar links ao PDF
    links.forEach((link) => {
      if (yPosition > pageHeight - margin - contentMargin - 60) {
        doc.addPage();
        yPosition = margin + contentMargin + 40;
      }

      doc.fillColor('#34495E')
         .text(`${link.icon} ${link.label}:`, margin + contentMargin + 30, yPosition);

      if (link.url) {
        doc.fillColor('#4A90E2')
           .link(margin + contentMargin + 30, yPosition + 20, 300, 20, link.url)
           .text(link.url, margin + contentMargin + 30, yPosition + 20, {
             link: link.url,
             underline: true
           });
      }

      yPosition += 50;
    });

    // Rodapé
    doc.fontSize(10)
       .fillColor('#95A5A6')
       .text('Cartão de Visita Digital', margin + contentMargin + 30, pageHeight - margin - contentMargin - 30, {
         align: 'center',
         width: pageWidth - 2 * (margin + contentMargin + 30)
       });

    doc.end();
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF');
  }
});

// Exportar para Vercel
module.exports = app;

