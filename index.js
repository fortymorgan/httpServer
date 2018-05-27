#!/usr/bin/env node
const net = require('net');
let dataContainer = '';

const server = new net.Server;
server.on('connection', socket => {
  socket.setEncoding('utf8');
  socket.on('data', data => {
    dataContainer += data;
    if (dataContainer.includes('\r\n\r\n')) {
      const [query, ...headers] = dataContainer.split('\r\n');
      const [verb, path, version] = query.split(' ');
      const headersArray = headers.filter(el => !!el).map(header => header.split(': '));
      const headersHtmlTableArray = headersArray.map(item => {
        const [header, value] = item;
        return `<tr><td>${header}</td><td>${value}</td></tr>`
      });
      const htmlTableHeaders = '<tr><th>Header</th><th>Value</th></tr>';
      const content = `<p>Verb: ${verb}</p><p>Path: ${path}</p><p>Version: ${version.split('/').join(' ')}</p><table border="1">${[htmlTableHeaders, ...headersHtmlTableArray].join('')}</table>`;
      const response = `${version} 200 OK\nContent-type: text/html\nContent-length: ${Buffer.byteLength(content)}\n\n${content}`;
      socket.write(response, () => dataContainer = '');
    }
  });
});

server.listen(3000);