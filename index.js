#!/usr/bin/env node
const net = require('net');

const response = `HTTP/1.1 200 OK
Content-type: text/plain
Content-length: 13

Hello, World!`

const server = new net.Server;
server.on('connection', socket => {
  socket.setEncoding('utf8');
  socket.on('data', data => {
    socket.write(response);
  });
});

server.listen(8080);