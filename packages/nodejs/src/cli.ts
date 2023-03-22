import { ImageTracerNodejsOptions } from './image-tracer-nodejs-options';
import { ImageTracerNodejs } from './image-tracer-nodejs';


(async function () {
    const [fileName, options] = await ImageTracerNodejsOptions.fromArgs();
    ImageTracerNodejs.fromFileName(fileName, options);
})()