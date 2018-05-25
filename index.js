#!/usr/bin/env node
const http = require('http');
const fs = require('fs');

http.createServer((request, response) => {
  const body = `Request type: ${request.method}</br>
  User agent: ${request.headers['user-agent']}`;
  response.writeHead(200, 'OK', {
    'Content-length': Buffer.byteLength(body),
    'Content-Type': 'text/html',
  });
  response.write(body);
  response.end();
}).listen(8080);