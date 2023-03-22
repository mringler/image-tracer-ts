import { ImageDrawer, ImageTracer } from "@image-tracer-ts/core"
import * as fs from 'fs';
import * as path from 'path';
import { FileLoader } from "./file-loader";
import { ImageTracerNodejsOptions, OutputFormat } from "./image-tracer-nodejs-options";
import sharp from 'sharp';


export class ImageTracerNodejs extends ImageTracer {

    public static async fromFileName(
        fileName: string,
        options: Partial<ImageTracerNodejsOptions> | null = null,
        drawer: ImageDrawer<string> | null = null
    ) {
        fs.accessSync(fileName);

        const imageData = await FileLoader.loadImageData(fileName);
        const tracer = new ImageTracerNodejs(options);
        const svg = tracer.traceImage(imageData, drawer);

        const outputFileName = options?.out?.trim() || path.basename(fileName)
        writeOutput(svg, options?.output, outputFileName);
    }
}



function writeOutput(svg: string, outputAs: OutputFormat | OutputFormat[] | undefined, fileName: string): void {
    const isArray = Array.isArray(outputAs);
    const outputPng = isArray ? outputAs.includes(OutputFormat.PNG) : outputAs === OutputFormat.PNG;
    const outputSvg = isArray ? outputAs.includes(OutputFormat.SVG) : outputAs !== OutputFormat.PNG;
    outputPng && writeAsPng(svg, getUniqueFileName(fileName, '.png'))
    outputSvg && writeToFile(svg, getUniqueFileName(fileName, '.svg'));
}

function writeAsPng(svg: string, fileName: string) {
    const buffer = Buffer.from(svg);
    return sharp(buffer)
        .png({ palette: true }) // https://sharp.pixelplumbing.com/api-output#png
        .toFile(fileName)
}

function writeToFile(data: string, fileName: string) {
    fs.writeFileSync(fileName, data);
}

function getUniqueFileName(fileName: string, extensionName: string): string {
    let uniqueName = path.extname(fileName) === extensionName ? fileName : `${fileName}${extensionName}`
    if (!fs.existsSync(uniqueName)) {
        return uniqueName
    }

    const baseName = path.basename(uniqueName, extensionName)
    let suffix = 0
    while (fs.existsSync(uniqueName)) {
        suffix++
        uniqueName = `${baseName}${suffix}${extensionName}`
    }
    return uniqueName
}