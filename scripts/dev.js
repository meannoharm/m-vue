const args = require('minimist')(process.argv.slice(2));
const { resolve } = require('path');
const esbuild = require('esbuild');

const target = args._[0] || 'reactivity';
const format = args.f || 'global';

const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

// iife 立即执行函数
// cjs node中的模块
// esm es6模块
const outputFormat = format.startsWith('global') ? 'iife' : format === 'cjs' ? 'cjs' : 'esm';

const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`);

esbuild
  .context({
    entryPoints: [resolve(__dirname, `../packages/${target}/src/index.js`)],
    outfile,
    bundle: true,
    format: outputFormat,
    globalName: pkg.buildOption?.name,
    platform: format === 'cjs' ? 'node' : 'browser',
  })
  .then((ctx) => {
    ctx.watch();
  });
