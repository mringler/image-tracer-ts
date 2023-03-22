import decodeIco from 'decode-ico';
import filetype from 'magic-bytes.js';
import * as png from '@vivaxy/png';
import readPixels from 'read-pixels';
import { GuessedFile } from 'magic-bytes.js/dist/model/tree';

function loadPng(buffer: ArrayBuffer) {
    const pngData = png.decode(buffer)
    const data = new Uint8ClampedArray(pngData.data);
    return new ImageData(data, pngData.width, pngData.height)
}

// workaround to get return data of decodeIco
type ArrayElement<ArrayType extends readonly unknown[]> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
type BmpOrPngData = ArrayElement<ReturnType<typeof decodeIco>>

export namespace ImageLoader {

    export async function loadUrl(url: string): Promise<ImageData> {

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load image from url ' + url);
        }

        const arrayBuffer = await response.arrayBuffer();

        return loadImageDataFromBuffer(arrayBuffer);
    }

    export async function loadImageDataFromBuffer(buffer: ArrayBuffer): Promise<ImageData> {
        const bytes = new Uint8Array(buffer);

        return loadImageDataFromBytes(bytes);
    }

    export async function loadImageDataFromFile(file: File): Promise<ImageData> {
        return loadImageFromBlob(file);
    }

    async function loadImageFromBlob(blob: Blob): Promise<ImageData> {
        const reader = new FileReader();
        const onLoadPromise = new Promise(resolve => reader.onload = resolve);
        reader.readAsArrayBuffer(blob);
        await onLoadPromise;

        return loadImageDataFromBuffer(reader.result as ArrayBuffer)
    }

    export async function loadImageDataFromBytes(bytes: Uint8Array): Promise<ImageData> {
        const guessedFileTypes = filetype(bytes);
        if (guessedFileTypes.length === 0) {
            throw new Error('Failed to read file type')
        }
        if (guessedExtensionIs(guessedFileTypes, 'ico')) {
            return loadIco(bytes)
        }

        if (guessedExtensionIs(guessedFileTypes, 'png')) {
            return loadPng(bytes)
        }

        const { height, width, pixels } = await readPixels({ data: bytes });
        return new ImageData(pixels, width, height); // reads from canvas
    }

    function guessedExtensionIs(guessedTypes: GuessedFile[], ext: string): boolean {
        return guessedTypes.some(type => type.extension === ext)
    }

    function loadIco(buffer: ArrayBuffer): ImageData {
        const images: BmpOrPngData[] = decodeIco(buffer)

        const image = images.reduce((largest: BmpOrPngData | null, image) =>
            largest && largest.width >= image.width ? largest : image, null)

        if (!image) {
            throw new Error('No image in ico')
        }

        if (image.type === 'png') {
            return loadPng(image.data);
        }

        return new ImageData(image.data, image.width, image.height);
    }
}