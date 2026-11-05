// A small static server for testing Disc Dogs on a phone over Wi-Fi
//   node tools/serve.js [port], 8783 if left out
// Serves the project folder to the local network with caching off, so a reload always gets the latest files

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const root = path.join(__dirname, '..');
const port = +process.argv[2] || 8783;
const types =
{
    '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
    '.png': 'image/png', '.ico': 'image/x-icon', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
};

http.createServer((request, response)=>
{
    let file = decodeURIComponent(new URL(request.url, 'http://x').pathname);
    if (file.endsWith('/'))
        file += 'index.html';
    file = path.join(root, path.normalize(file));
    if (!file.startsWith(root))
    {
        response.writeHead(403).end();
        return;
    }
    fs.readFile(file, (error, data)=>
    {
        if (error)
        {
            response.writeHead(404).end('not found');
            return;
        }
        response.writeHead(200, {'Content-Type': types[path.extname(file)] || 'application/octet-stream',
            'Cache-Control': 'no-store'});
        response.end(data);
    });
}).listen(port, '0.0.0.0', ()=>
{
    console.log(`Zoomies on http://localhost:${port}/`);
    for (const list of Object.values(os.networkInterfaces()))
    for (const net of list)
        if (net.family == 'IPv4' && !net.internal)
            console.log(`  phone: http://${net.address}:${port}/`);
});
