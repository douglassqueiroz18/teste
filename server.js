const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const PDFDocument = require('pdfkit');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Inicializar banco de dados
const db = new sqlite3.Database('./database.db');

// Criar tabela se não existir
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    instagram TEXT,
    whatsapp TEXT,
    facebook TEXT,
    linkedin TEXT,
    website TEXT,
    outros_links TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Rota principal - página de edição
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para criar novo cliente
app.post('/api/clientes', (req, res) => {
  const id = uuidv4();
  const {
    nome,
    telefone,
    email,
    instagram,
    whatsapp,
    facebook,
    linkedin,
    website,
    outros_links
  } = req.body;

  const stmt = db.prepare(`INSERT INTO clientes 
    (id, nome, telefone, email, instagram, whatsapp, facebook, linkedin, website, outros_links)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  stmt.run(
    id,
    nome || '',
    telefone || '',
    email || '',
    instagram || '',
    whatsapp || '',
    facebook || '',
    linkedin || '',
    website || '',
    outros_links || ''
  );

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao criar cliente' });
    }
    res.json({ id, message: 'Cliente criado com sucesso' });
  });
});

// Rota para buscar cliente por ID
app.get('/api/clientes/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.json(row);
  });
});

// Rota para atualizar cliente
app.put('/api/clientes/:id', (req, res) => {
  const { id } = req.params;
  const {
    nome,
    telefone,
    email,
    instagram,
    whatsapp,
    facebook,
    linkedin,
    website,
    outros_links
  } = req.body;

  const stmt = db.prepare(`UPDATE clientes SET
    nome = ?,
    telefone = ?,
    email = ?,
    instagram = ?,
    whatsapp = ?,
    facebook = ?,
    linkedin = ?,
    website = ?,
    outros_links = ?,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`);

  stmt.run(
    nome || '',
    telefone || '',
    email || '',
    instagram || '',
    whatsapp || '',
    facebook || '',
    linkedin || '',
    website || '',
    outros_links || '',
    id
  );

  stmt.finalize((err) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao atualizar cliente' });
    }
    res.json({ message: 'Cliente atualizado com sucesso' });
  });
});

// Rota para listar todos os clientes
app.get('/api/clientes', (req, res) => {
  db.all('SELECT id, nome, created_at FROM clientes ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao listar clientes' });
    }
    res.json(rows);
  });
});

// Rota para gerar e baixar PDF
app.get('/c/:id', (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM clientes WHERE id = ?', [id], (err, cliente) => {
    if (err || !cliente) {
      return res.status(404).send('Cliente não encontrado');
    }

    // Criar PDF
    const doc = new PDFDocument({
      size: [400, 600],
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartao-visita-${cliente.nome.replace(/\s+/g, '-')}.pdf"`);

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

    // Processar outros links (formato: "label|url,label|url")
    if (cliente.outros_links) {
      const outrosLinks = cliente.outros_links.split(',').map(link => {
        const [label, url] = link.split('|');
        return { label: label.trim(), url: url ? (url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`) : '', icon: '🔗' };
      });
      links.push(...outrosLinks);
    }

    // Adicionar links ao PDF
    links.forEach((link, index) => {
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
  });
});

// Rota para página de edição de cliente existente
app.get('/editar/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

