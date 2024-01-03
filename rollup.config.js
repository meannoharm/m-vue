import typescript from '@rollup/plugin-typescript';
import sourceMaps from 'rollup-plugin-sourcemaps';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: './packages/m-vue/src/index.ts',
  plugins: [typescript(), sourceMaps(), resolve(), commonjs()],
  output: [
    {
      format: 'cjs',
      file: './packages/m-vue/dist/m-vue.cjs.js',
      sourcemap: true,
    },
    {
      name: 'm-vue',
      formate: 'es',
      file: './packages/m-vue/dist/m-vue.esm-bundler.js',
      sourcemap: true,
    },
  ],
};
