const net = require('net');

const isRequestOver = data => {
  const isOver = data.includes('\r\n\r\n');
  return isOver;
};

const getQueryLine = data => {
  const [query] = data.split('\r\n');
  return query;
};

const isRequestValid = data => {
  const query = getQueryLine(data);
  const verbs = ['GET', 'HEAD'];
  const [verb, path, version] = query.split(' ');

  const isValid = verbs.includes(verb.toUpperCase())
    && path[0] === '/'
    && version.toUpperCase().includes('HTTP/');
  
  return isValid;
};

const parseRequest = (data) => {
  const [head, body] = data.split('\r\n\r\n');
  
  const [queryLine, ...headersArray] = head.split('\r\n');
  const [method, url, version] = queryLine.split(' ');
  const [_, httpVersion] = version.split('/')

  const headersArrayWithoutNull = headersArray
    .map(header => header.split(': '));
  
  const headers = headersArrayWithoutNull.reduce((acc, [header, value]) => {
    acc[header] = value;
    return acc;
  }, {})

  return { httpVersion, method, url, headers, body };
};

function writeHead(code, message = '', headers = {}) {
  const defaultHeaders = {
    Date: new Date,
    Connection: this.version === '1.0' ? 'close' : 'keep-alive',
    'Transfer-Encoding': 'chunked',
  }
  
  const headString = `HTTP/1.1 ${code} ${message}`
  const responseHeaders = { ...headers, ...defaultHeaders };

  const headersString = Object.keys(responseHeaders)
    .map(key => [key, responseHeaders[key]])
    .map(header => header.join(': '))
    .join('\n');

  const responseHead = `${headString}\n${headersString}\n\n`;
  this.socket.write(responseHead);
}

function end(data) {
  const chunkSize = 1024;
  const chunkCount = Math.ceil(Buffer.byteLength(data) / chunkSize);

  let chunked = '';
  let current;
  for (let i = 0; i < chunkCount; i += 1) {
    current = data.slice(chunkSize * i, chunkSize * (i + 1));
    chunked += `${Buffer.byteLength(current).toString(16)}\n${current}\n`;
  }
  chunked += '0\n\n';
  this.socket.write(chunked);
  this.socket.setTimeout(5000, () => this.socket.end());
}

const createServer = (callbackOnRequest) => {
  const server = new net.Server;
  server.on('connection', socket => {
    let buffer = '';
    socket.on('data', data => {
      buffer += data;
      if (!isRequestValid(buffer)) {
        socket.end();
      }
      if (isRequestOver(buffer)) {
        const request = { socket, ...parseRequest(buffer) };
        const response = { socket, writeHead, end, version: request.httpVersion };
        callbackOnRequest(request, response);
        buffer = '';
      }
    })
  });
  return server;
}

module.exports = {
  createServer,
  listen: net.listen,
}
