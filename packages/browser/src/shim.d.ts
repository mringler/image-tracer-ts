declare module 'read-pixels' {
    type InputDataTypes = ArrayBuffer|File|Response|string|Blob|RelativeIndexable
    type InputData = {
        data: InputDataTypes|Promise<InputDataTypes>,
        debug?: boolean
    }
    type PixelData = {
        width: number,
        height: number,
        pixels: Uint8ClampedArray,
    }
    export default async function readPixels(inp: InputData): Promise<PixelData>
};