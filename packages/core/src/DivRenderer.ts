import { RgbColorData } from "./RgbColor";
import { EdgeRaster } from "./EdgeRasterBuilder";

const SPEC_PALETTE: RgbColorData[] = [
    { r: 0, g: 0, b: 0, a: 255 }, { r: 128, g: 128, b: 128, a: 255 }, { r: 0, g: 0, b: 128, a: 255 }, { r: 64, g: 64, b: 128, a: 255 },
    { r: 192, g: 192, b: 192, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }, { r: 128, g: 128, b: 192, a: 255 }, { r: 0, g: 0, b: 192, a: 255 },
    { r: 128, g: 0, b: 0, a: 255 }, { r: 128, g: 64, b: 64, a: 255 }, { r: 128, g: 0, b: 128, a: 255 }, { r: 168, g: 168, b: 168, a: 255 },
    { r: 192, g: 128, b: 128, a: 255 }, { r: 192, g: 0, b: 0, a: 255 }, { r: 255, g: 255, b: 255, a: 255 }, { r: 0, g: 128, b: 0, a: 255 }
]

export class DivRenderer {

    // Helper function: Drawing all edge node layers into a container
    drawLayersToDiv(edgeRasters: EdgeRaster[], scale: number, parentId: string) {
        scale = scale || 1;
        var w, h, i, j, k;

        // Preparing container
        var div;
        if (parentId) {
            div = document.getElementById(parentId);
            if (!div) {
                div = document.createElement('div');
                div.id = parentId;
                document.body.appendChild(div);
            }
        } else {
            div = document.createElement('div');
            document.body.appendChild(div);
        }

        // Layers loop
        for (k in edgeRasters) {
            if (!edgeRasters.hasOwnProperty(k)) { continue; }

            // width, height
            w = edgeRasters[k][0].length; h = edgeRasters[k].length;

            // Creating new canvas for every layer
            const canvas = document.createElement('canvas');
            canvas.width = w * scale;
            canvas.height = h * scale;

            const context = this.getCanvasContext(canvas)

            // Drawing
            const palette = SPEC_PALETTE;

            for (j = 0; j < h; j++) {
                for (i = 0; i < w; i++) {
                    const colorIndex = edgeRasters[k][j][i] % palette.length;
                    const color = palette[colorIndex];
                    context.fillStyle = this.toRgbaLiteral(color);
                    context.fillRect(i * scale, j * scale, scale, scale);
                }
            }

            // Appending canvas to container
            div.appendChild(canvas);
        }
    }

    // Convert color object to rgba string
    protected toRgbaLiteral(c: RgbColorData): string {
        return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + c.a + ')';
    }

    // TODO check duplication
    protected getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Could not read canvas');
        }
        return context
    }
}