import * as fs from 'fs';
import { GuessedFile } from 'magic-bytes.js/dist/model/tree';
import sharp from 'sharp';
import decodeIco from 'decode-ico';
import { filetypeinfo as getFileTypInfo } from 'magic-bytes.js';

export namespace FileLoader {

    export function loadImageData(fileName: string): Promise<ImageData> {
        const buffer = fs.readFileSync(fileName);

        const guessedFileTypes = getFileTypInfo(buffer);
        if (guessedExtensionIs(guessedFileTypes, 'ico')) {
            return loadIcoData(buffer)
        }

        return loadWithSharp(fileName)
    }

    function guessedExtensionIs(guessedTypes: GuessedFile[], ext: string): boolean {
        return guessedTypes.some(type => type.extension === ext)
    }

    async function loadWithSharp(fileName: string): Promise<ImageData> {
        const sharpImage = await sharp(fileName)

        const [meta, data] = await Promise.all([
            sharpImage.metadata(),
            sharpImage.raw().toBuffer()
        ] as const);

        return {
            data: new Uint8ClampedArray(data),
            width: meta.width as number,
            height: meta.height as number,
            colorSpace: 'srgb'
        };
    }

    export async function loadIcoData(buffer: Buffer): Promise<ImageData> {
        const images: ImageData[] = decodeIco(buffer) as unknown as ImageData[]

        const image = images.reduce((largest: ImageData | null, image) =>
            largest && largest.width >= image.width ? largest : image, null)

        if (!image) {
            throw new Error('No image in ico')
        }

        // @ts-ignore
        if (image.type === 'png') {
            const data = await sharp(image.data).raw().toBuffer();
            return {
                data: new Uint8ClampedArray(data),
                width: image.width,
                height: image.height,
                colorSpace: 'srgb'
            };
        }

        return image
    }
}