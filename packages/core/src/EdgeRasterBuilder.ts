import { ColorIndex } from "./ColorIndex";


export type EdgeTypeId = -1 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13| 14 | 15 | 16

/**
 * Rows of image data where each point represents the type of edge the pixel
 * is a part of.
 * 
 * Point system: 
 *  Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
 * 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
 * 84  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓
 *     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
 */
export type EdgeRaster = EdgeTypeId[][]

export class EdgeRasterBuilder {

    /**
     * 
     * Builds one layer for each color in the given color index.
     *
     * @param colorIndex
     * @returns 
     */
    public static buildForColors(colorIndex: ColorIndex): EdgeRaster[] {
        // Creating layers for each indexed color in arr
        const rows = colorIndex.rows;
        const height = rows.length
        const width = rows[0].length;

        // Create layers
        const edgeRasters: EdgeRaster[] = []
        for (let colorId = 0; colorId < colorIndex.palette.length; colorId++) {
            edgeRasters[colorId] = [];
            for (let h = 0; h < height; h++) {
                edgeRasters[colorId][h] = new Array(width).fill(0);
            }
        }

        // Looping through all pixels and calculating edge node type
        let n1, n2, n3, n4, n5, n6, n7, n8
        for (let h = 1; h < height - 1; h++) {
            for (let w = 1; w < width - 1; w++) {

                // This pixel's indexed color
                const colorId = rows[h][w];

                /**
                 * n1 n2 n3
                 * n4    n5
                 * n6 n7 n8
                 */
                n1 = rows[h - 1][w - 1] === colorId ? 1 : 0;
                n2 = rows[h - 1][w] === colorId ? 1 : 0;
                n3 = rows[h - 1][w + 1] === colorId ? 1 : 0;
                n4 = rows[h][w - 1] === colorId ? 1 : 0;
                n5 = rows[h][w + 1] === colorId ? 1 : 0;
                n6 = rows[h + 1][w - 1] === colorId ? 1 : 0;
                n7 = rows[h + 1][w] === colorId ? 1 : 0;
                n8 = rows[h + 1][w + 1] === colorId ? 1 : 0;

                // this pixel's type and looking back on previous pixels
                const edgeRaster = edgeRasters[colorId]

                edgeRaster[h + 1][w + 1] = 1 + n5 * 2 + n8 * 4 + n7 * 8 as EdgeTypeId;
                if (!n4) {
                    edgeRaster[h + 1][w] = 0 + 2 + n7 * 4 + n6 * 8 as EdgeTypeId;
                }
                if (!n2) {
                    edgeRaster[h][w + 1] = 0 + n3 * 2 + n5 * 4 + 8 as EdgeTypeId;
                }
                if (!n1) {
                    edgeRaster[h][w] = 0 + n2 * 2 + 4 + n4 * 8 as EdgeTypeId;
                }
            }
        }

        return edgeRasters;
    }

    // 2. Layer separation and edge detection
    // Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
    // 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
    // 48  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓
    //     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
    public static buildForColor(colorData: ColorIndex, colorId: number): EdgeRaster {
        // Creating layers for each indexed color in arr
        const rows = colorData.rows;
        const height = rows.length
        const width = rows[0].length;

        // Create layer
        const edgeRaster: EdgeRaster = []
        for (let j = 0; j < height; j++) {
            edgeRaster[j] = new Array(width).fill(0);
        }

        // Looping through all pixels and calculating edge node type
        for (let h = 1; h < height; h++) {
            for (let w = 1; w < width; w++) {

                /*
                 * current pixel is at 4:
                 *  ░░ of 1 2    
                 *  ░▓    8 4
                 */
                edgeRaster[h][w] = (
                    (rows[h - 1][w - 1] === colorId ? 1 : 0) +
                    (rows[h - 1][w] === colorId ? 2 : 0) +
                    (rows[h][w - 1] === colorId ? 8 : 0) +
                    (rows[h][w] === colorId ? 4 : 0)
                ) as EdgeTypeId;
            }
        }

        return edgeRaster;
    }
}