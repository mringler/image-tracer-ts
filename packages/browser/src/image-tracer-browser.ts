import { ImageTracer } from "@image-tracer-ts/core";
import { Options } from "@image-tracer-ts/core";
import { ImageDrawer } from "@image-tracer-ts/core";
import { ImageLoader } from "./image-loader";

export class ImageTracerBrowser extends ImageTracer {

    public static async fromUrl<OutputType = string>(
        url: string,
        options: Partial<Options>,
        drawer: ImageDrawer<OutputType> | null = null
    ): Promise<string | OutputType> {
        const imageData = await ImageLoader.loadUrl(url);
        return this.fromImageData<OutputType>(imageData, options, drawer);
    }

    public static async fromBuffer<OutputType = string>(
        buffer: ArrayBuffer,
        options: Partial<Options>,
        drawer: ImageDrawer<OutputType> | null = null
    ): Promise<string | OutputType> {
        const imageData = await ImageLoader.loadImageDataFromBuffer(buffer);
        return this.fromImageData<OutputType>(imageData, options, drawer);
    }

    public static async fromFile<OutputType = string>(
        file: File,
        options: Partial<Options>,
        drawer: ImageDrawer<OutputType> | null = null
    ): Promise<string | OutputType> {
        const imageData = await ImageLoader.loadImageDataFromFile(file);
        return this.fromImageData<OutputType>(imageData, options, drawer);
    }

    public static async fromImageData<OutputType = string>(
        imageData: ImageData,
        options: Partial<Options>,
        drawer: ImageDrawer<OutputType> | null = null
    ): Promise<string | OutputType> {
        const tracer = new ImageTracerBrowser(options);

        return drawer ?
            tracer.traceImage<OutputType>(imageData, drawer) :
            tracer.traceImageToSvg(imageData);
    }
}