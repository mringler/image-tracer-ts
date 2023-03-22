import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import terser from '@rollup/plugin-terser';
import { nodeResolve } from '@rollup/plugin-node-resolve';

const baseFile = 'src/index.ts';
const baseModuleConfig = {
  input: baseFile,
  plugins: [
    nodeResolve(),
    typescript(),
    //terser(),
  ],
  external: [/node_modules/],
};

const config = defineConfig([
  {
    ...baseModuleConfig,
    output: {
      file: 'dist/image-tracer-nodejs.mjs',
      format: 'esm',
      sourcemap: true,
    },
  }, {
    ...baseModuleConfig,
    output: {
      file: 'dist/image-tracer-nodejs.cjs',
      format: 'cjs',
      sourcemap: true,
    },
  },{
    input: baseFile,
    plugins: [
      dts()
    ],
    output: {
      file: 'dist/image-tracer-nodejs.d.ts',
      format: 'es'
    },
  }
]);

export default config;