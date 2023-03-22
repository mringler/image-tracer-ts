import { ImageTracerBrowser } from './image-tracer-browser';

export * from "@image-tracer-ts/core";
export * from './image-tracer-browser';
export * from './image-loader'

declare global {
    interface Window {
        imageTracer: typeof ImageTracerBrowser;
    }
}

window.imageTracer = ImageTracerBrowser;