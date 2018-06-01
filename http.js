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
  
  const headers = headersArrayWithoutNull
    .reduce((acc, [header, value]) => ({ ...acc, [header]: value }), {})

  return { httpVersion, method, url, headers, body };
};

const isBodyExist = body => (body ? body : '')

const splitIntoChunks = data => {
  const chunkSize = 1024;
  const chunkCount = Math.ceil(Buffer.byteLength(data) / chunkSize);

  let chunked = '';
  let currentChunk;
  for (let i = 0; i < chunkCount; i += 1) {
    currentChunk = data.slice(chunkSize * i, chunkSize * (i + 1));
    chunked += `${Buffer.byteLength(currentChunk).toString(16)}\n${currentChunk}\n`;
  }
  chunked += '0\n\n';

  return chunked
}

function writeHead(code, message = '', headers = {}) {
  const defaultHeaders = {
    Date: new Date,
    Connection: this.request.httpVersion === '1.0' ? 'close' : 'keep-alive',
  };
  
  const headString = `HTTP/1.1 ${code} ${message}`;
  this.headers = { ...defaultHeaders, ...headers };

  const headersString = Object.keys(this.headers)
    .map(key => [key, this.headers[key]])
    .map(header => header.join(': '))
    .join('\n');

  this.head = `${headString}\n${headersString}`;
};

function write(data) {
  this.body = isBodyExist(this.body) + data;
}

function end(data = '') {
  this.body = isBodyExist(this.body) + data;
  if (Object.values(this.headers).includes('chunked')) {
    this.body = splitIntoChunks(this.body);
  } else {
    this.head += `\nContent-length: ${Buffer.byteLength(this.body)}`;
  }
  const responseBody = {
    GET: this.body,
    HEAD: '',
  }
  const responseString = `${this.head}\n\n${responseBody[this.request.method]}`;
  this.socket.write(responseString);
};

const wrapCallback = (callback, socket) => (data) => {
  const request = parseRequest(data);
  const response = { socket, request, writeHead, write, end };
  callback(request, response);
};

const wrapSubscribe = socket => (callback) => {
  socket.on('data', (data) => callback(data));
};

const accumulateData = (buffer, data) => buffer + data;

const recieveData = (subscribe, accumulate, complete, error) => {
  let buffer = accumulate.init;
  const cb = data => {
    buffer = accumulate.method(buffer, data);
    if (!error.check(buffer)) {
      error.callback();
    }
    if (complete.check(buffer)) {
      complete.callback(buffer);
    }
  };
  subscribe(cb);
};

const createServer = (callbackOnRequest) => {
  const server = new net.Server;
  server.on('connection', socket => {
    const wrappedSubscribe = wrapSubscribe(socket);
    const wrappedCallback = wrapCallback(callbackOnRequest, socket);
    const completeMethods = { check: isRequestOver, callback: wrappedCallback };
    const errorMethods = { check: isRequestValid, callback: () => socket.end() };
    const dataAccumulation = { init: '', method: accumulateData };
    recieveData(wrappedSubscribe, dataAccumulation, completeMethods, errorMethods);
  });
  return server;
};

module.exports = {
  createServer,
  listen: net.listen,
};
