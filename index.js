#!/usr/bin/env node
const net = require('net');

const isRequestOver = data => data.includes('\r\n\r\n')

const isRequestValid = data => {
  const query = getQueryLine(data);
  const verbs = ['GET', 'HEAD'];
  const [verb, path, version] = query.split(' ');

  const valid = verbs.includes(verb.toUpperCase())
    && path[0] === '/'
    && version.toUpperCase().includes('HTTP/');
  
  return valid;
}

const getQueryLine = data => {
  const [query] = data.split('\r\n');
  return query;
}

const getVersion = data => {
  const query = getQueryLine(data);
  const [_, __, version] = query.split(' ');
  return version.toUpperCase();
}

const generateResponseHeaders = (headers, body) => {
  const headerTypes = {
    'Location': () => 'http://www.google.com/',
    'Content-type': () => 'text/html',
    'Content-length': () => Buffer.byteLength(body),
  }
  return headers.map(header => `${header}: ${headerTypes[header]()}`).join('\n')
}

const generateResponse = (code, data, version = 'HTTP/1.0') => {
  const responses = {
    '200': {
      message: 'OK',
      headers: ['Content-type', 'Content-length'],
      body: data => generateOkBody(data),
    },
    '400': {
      message: 'Bad Request',
      headers: ['Content-type', 'Content-length'],
      body: function() { return `<h1>${this.code} ${this.message}</h1>` },
    },
    '301': {
      message: 'Moved Permanently',
      headers: ['Location', 'Content-type', 'Content-length'],
      body: function() { return `<h1>${this.code} ${this.message}</h1>` },
    }
  }

  const response = responses[code];

  const responseHead = `${version} ${code} ${response.message}`;
  const responseBody = response.body(data);
  const responseHeaders = generateResponseHeaders(response.headers, responseBody);
  return `${responseHead}\n${responseHeaders}\n\n${responseBody}`;
}

const generateHeadersHtmlTable = headers => {
  const headersArray = headers.filter(el => !!el).map(header => header.split(': '));
  const headersHtmlTableArray = headersArray.map(item => {
    const [header, value] = item;
    return `<tr><td>${header}</td><td>${value}</td></tr>`
  });
  const htmlTableHeaders = '<tr><th>Header</th><th>Value</th></tr>';
  return `<table border>\n${[htmlTableHeaders, ...headersHtmlTableArray].join('\n')}\n</table>`;
}

const generateQueryHtmlData = queryLine => {
  const [verb, path, version] = queryLine.split(' ');
  const verbHtmlString = `<p>Verb: ${verb.toUpperCase()}</p>`;
  const pathHtmlString = `<p>Path: ${path}</p>`;
  const versionHtmlString = `<p>Version: ${version.toUpperCase().split('/').join(' ')}</p>`;
  return `${verbHtmlString}${pathHtmlString}${versionHtmlString}`;
}

const generateOkBody = data => {
  const [query, ...headers] = data.split('\r\n');
  const queryHtmlData = generateQueryHtmlData(query);
  const headersHtmlTable = generateHeadersHtmlTable(headers);
  return `${queryHtmlData}\n${headersHtmlTable}`;
}

net.createServer(socket => {
  let dataContainer = '';
  socket.setEncoding('utf8');
  socket.on('data', data => {
    dataContainer += data;
    if (!isRequestValid(dataContainer)) {
      const response400 = generateResponse(400);
      socket.write(response400, () => socket.end());
    }
    if (isRequestOver(dataContainer)) {
      const version = getVersion(dataContainer);
      // const response301 = generateResponse(301);
      // socket.write(response301, () => socket.end());
      const response200 = generateResponse(200, dataContainer, version);
      socket.write(response200, () => dataContainer = '');
    }
  });
}).listen(3000);