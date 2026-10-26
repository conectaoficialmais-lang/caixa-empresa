#!/usr/bin/env node
/**
 * Servidor estatico minimo, so para abrir o app localmente.
 * Uso: node tools/servidor.js [porta]
 *
 * Abrir o index.html direto pelo file:// tambem funciona — o app nao faz fetch
 * de nada. O servidor existe porque alguns navegadores bloqueiam localStorage
 * em file://, e sem localStorage o app nao salva.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const PORTA = Number(process.argv[2]) || 4180;

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const rel = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
    const alvo = path.resolve(RAIZ, rel);

    // nao deixa sair da pasta do projeto
    if (!alvo.startsWith(RAIZ)) {
      res.writeHead(403).end('403');
      return;
    }

    fs.readFile(alvo, (erro, dados) => {
      if (erro) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 — ' + rel);
        return;
      }
      res.writeHead(200, {
        'content-type': TIPOS[path.extname(alvo).toLowerCase()] || 'application/octet-stream',
        'cache-control': 'no-cache',
      });
      res.end(dados);
    });
  })
  .listen(PORTA, () => {
    console.log('Caixa da Empresa rodando em http://localhost:' + PORTA);
  });
