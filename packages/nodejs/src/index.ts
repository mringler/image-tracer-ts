
import { ImageTracerNodejs } from './image-tracer-nodejs';
import { ImageTracerNodejsOptions } from './image-tracer-nodejs-options';

export * from "./image-tracer-nodejs";
export * from "./image-tracer-nodejs-options";
export * from '@image-tracer-ts/core';

(async function () {
    const [fileName, options] = await ImageTracerNodejsOptions.fromArgs();
    if (!fileName) {
        console.log('No file specified')
        return
    }
    ImageTracerNodejs.fromFileName(fileName as string, options);
})()