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

const isBodyExist = body => (body ? body : '')

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
  this.body = isBodyExist(this.body);
  this.body += data;
}

function end(data = '') {
  this.body = isBodyExist(this.body);
  if (Object.values(this.headers).includes('chunked')) {
    const body = this.body + data;
    const chunkSize = 1024;
    const chunkCount = Math.ceil(Buffer.byteLength(body) / chunkSize);
    
    let chunked = '';
    let current;
    for (let i = 0; i < chunkCount; i += 1) {
      current = body.slice(chunkSize * i, chunkSize * (i + 1));
      chunked += `${Buffer.byteLength(current).toString(16)}\n${current}\n`;
    }
    chunked += '0\n\n';
    this.body = chunked;
  } else {
    this.head += `\nContent-length: ${Buffer.byteLength(this.body)}`;
  }
  const responseString = `${this.head}\n\n${this.request.method === 'HEAD' ? '' : this.body}`;
  this.subscription.write(responseString);
  // this.subscription.setTimeout(5000, () => this.subscription.end());
};

const recieveData = (subscribe, accumulate, check, callback) => {
  const subscription = subscribe();
  accumulate(subscription, check, callback);
};

const accumulateData = (subscription, check, callback) => {
  let buffer = '';
  subscription.on('data', data => {
    buffer += data;
    if (!isRequestValid(buffer)) {
      subscription.end();
    }
    if (check(buffer)) {
      callback(subscription, buffer);
      buffer = '';
    }
  });
};

const wrapCallback = callback => (subscription, data) => {
  const request = parseRequest(data);
  const response = { subscription, request, writeHead, write, end };
  callback(request, response);
};

const createServer = (callbackOnRequest) => {
  const server = new net.Server;
  server.on('connection', socket => {
    const wrappedCallback = wrapCallback(callbackOnRequest);
    recieveData(() => socket, accumulateData, isRequestOver, wrappedCallback);
  });
  return server;
}

module.exports = {
  createServer,
  listen: net.listen,
}
