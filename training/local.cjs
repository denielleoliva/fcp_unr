const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const webpack = require('webpack');
process.env.BABEL_ENV = 'development';
const root = path.resolve(__dirname, '..');
const output = path.join(__dirname, '.cache');
const compiler = webpack({
  mode: 'development', devtool: 'source-map', context: root,
  entry: path.join(root, 'src/training/index.js'),
  output: { path: output, filename: 'trainer.js', publicPath: '/' },
  resolve: { extensions: ['.js', '.mjs', '.jsx'] },
  module: { rules: [
    { test: /\.[cm]?jsx?$/, exclude: /node_modules/, use: { loader: require.resolve('babel-loader'), options: { presets: [require.resolve('babel-preset-react-app')] } } },
    { test: /\.css$/, use: [require.resolve('style-loader'), require.resolve('css-loader')] },
  ] },
});
compiler.run((error, stats) => {
  compiler.close(() => {});
  if (error || stats.hasErrors()) { console.error(error || stats.toString({all:false,errors:true})); process.exitCode=1; return; }
  fs.writeFileSync(path.join(output,'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FCP Local Feature Trainer</title></head><body><div id="root"></div><script src="/trainer.js"></script></body></html>');
  console.log('Local trainer built.');
  if (process.argv.includes('--build-only')) return;
  const mime={'.html':'text/html','.js':'text/javascript','.map':'application/json'};
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const name=pathname==='/'?'index.html':pathname.slice(1);
    if(!['index.html','trainer.js','trainer.js.map'].includes(name)){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(name)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    fs.createReadStream(path.join(output,name)).pipe(res);
  });
  server.on('error',error=>{console.error(error.code==='EADDRINUSE'?'Port 3001 is already in use. Stop the previous trainer first.':error.message);process.exitCode=1;});
  server.listen(3001,'127.0.0.1',()=>console.log('Open http://127.0.0.1:3001 in a separate browser window. Ctrl-C stops the trainer.'));
});
