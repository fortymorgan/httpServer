#!/usr/bin/env node
const net = require('net');

const server = new net.Server;
server.on('connection', socket => {
  socket.setEncoding('utf8');
  socket.on('data', data => {
    const [query, ...headers] = data.split('\r\n');
    // console.log(query);
    const [verb, path, version] = query.split(' ');
    const headersArray = headers.filter(el => !!el).map(header => header.split(': '));
    // console.log(headersArray);
    const headersHtmlTableArray = headersArray.map(item => {
      const [header, value] = item;
      return `<tr><td>${header}</td><td>${value}</td></tr>`
    });
    const htmlTableHeaders = '<tr><th>Header</th><th>Value</th></tr>';
    const content = `<p>Verb: ${verb}</p>
    <p>Path: ${path}</p>
    <p>Version: ${version.split('/').join(' ')}
    <table border="1">
    ${[htmlTableHeaders, ...headersHtmlTableArray].join('\n')}
    </table>`
    const response = `${version} 200 OK
Content-type: text/html
Content-length: ${Buffer.byteLength(content)}

${content}`
    socket.write(response);
  });
});

server.listen(8080);