const args = require("minimist")(process.argv.slice(2));
const {resolve} = require("path");
const {build} = require("esbuild");

const target = args._[0] || "reactivity";
const format = args.f || "global";

const pkg = require(resolve(__dirname, `../packages/${target}/package.json`));

// iife 立即执行函数
// cjs node中的模块
// esm es6模块
const outputFormat = format.startsWith("global") ? 'iife' : format === 'cjs' ? 'cjs' : 'esm';


const outfile = resolve(__dirname, `../packages/${target}/dist/${target}.${format}.js`);

build({
  entryPoints: [resolve(__dirname, `../packages/${target}/src/index.js`)],
  outfile,
  bundle: true,
  format: outputFormat,
  globalName: pkg.buildOption?.name,
  platform: format === 'cjs' ? 'node' : 'browser',
  watch: {
    onRebuild(error) {
      if (error) {
        console.error(error);
      } else {
        console.log(`${target} rebuild success`);
      }
    }
  }
}).then(() => {
  console.log(`${target} build success`);
})