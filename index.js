const http = require('./http');

const generateHeadersHtmlTable = ({ headers }) => {
  const headersHtmlTableArray = Object.keys(headers)
    .map(key => [key, headers[key]])
    .map(item => {
      const [header, value] = item;
      return `<tr><td>${header}</td><td>${value}</td></tr>`;
    });
  const htmlTableHeaders = '<tr><th>Header</th><th>Value</th></tr>';
  return ['<table border>', htmlTableHeaders, ...headersHtmlTableArray, '</table>'].join('');
}

const generateQueryHtmlData = ({ method, url, httpVersion }) => {
  const verbHtmlString = `<p>Method: ${method.toUpperCase()}</p>`;
  const pathHtmlString = `<p>URL: ${url}</p>`;
  const versionHtmlString = `<p>Version: HTTP ${httpVersion}</p>`;
  return `${verbHtmlString}${pathHtmlString}${versionHtmlString}`;
}

const generateBody = data => {
  const queryHtmlData = generateQueryHtmlData(data);
  const headersHtmlTable = generateHeadersHtmlTable(data);
  return `${queryHtmlData}${headersHtmlTable}`;
}

http.createServer((request, response) => {
  response.writeHead(200, 'OK', { 'Content-type': 'text/html' });
  response.end(generateBody(request));
}).listen(3000);
