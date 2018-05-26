#!/usr/bin/env node
const net = require('net');

const server = new net.Server;
let bufer = '';
server.on('connection', socket => {
  socket.setEncoding('utf8');
  socket.on('data', data => {
    if (data.charCodeAt() === 13) {
      console.log(bufer);
    } else {
      bufer += data;
    }
  });
});

server.listen(8080);