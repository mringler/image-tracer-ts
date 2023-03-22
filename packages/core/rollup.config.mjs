import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';
import dts from "rollup-plugin-dts";
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

const baseFile = 'src/index.ts';
const baseModuleConfig = {
  input: baseFile,
  plugins: [
    typescript(),
    replace({'__rollup-replace-versionNumber__': process.env.npm_package_version, preventAssignment: true}),
    // terser(), // currently causes "(!) Broken sourcemap"
  ],
};

const config = defineConfig([
  {
    ...baseModuleConfig,
    output: {
      file: 'dist/index.mjs',
      format: 'esm',
      sourcemap: true,
    },
    
  }, {
    ...baseModuleConfig,
    output: {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true,
    },
  }, {
    input: baseFile,
    plugins: [
      dts()
    ],
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
  }, {
    input: baseFile,
    plugins: [
      typescript({
        compilerOptions:{
          outDir: 'dist/src/',
          sourceMap: true,
        }
      })
    ],
    output: {
      file: 'dist/src/',
      sourcemap: true
    },
  }
]);

export default config;