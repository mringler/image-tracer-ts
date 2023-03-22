import { EdgeArea, EdgePoint } from "./ImageTracer";
import { EdgeRaster, EdgeTypeId } from "./EdgeRasterBuilder";

export type BoundingBox = [number, number, number, number];

// Lookup tables for pathscan
// pathscan_combined_lookup[ arr[py][px] ][ dir ] = [nextarrpypx, nextdir, deltapx, deltapy];
const PATH_SCAN_COMBINED_LOOKUP: EdgeTypeId[][][] = [
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],// arr[py][px]===0 is invalid
    [[0, 1, 0, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [0, 2, -1, 0]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [0, 1, 0, -1], [0, 0, 1, 0]],
    [[0, 0, 1, 0], [-1, -1, -1, -1], [0, 2, -1, 0], [-1, -1, -1, -1]],

    [[-1, -1, -1, -1], [0, 0, 1, 0], [0, 3, 0, 1], [-1, -1, -1, -1]],
    [[13, 3, 0, 1], [13, 2, -1, 0], [7, 1, 0, -1], [7, 0, 1, 0]],
    [[-1, -1, -1, -1], [0, 1, 0, -1], [-1, -1, -1, -1], [0, 3, 0, 1]],
    [[0, 3, 0, 1], [0, 2, -1, 0], [-1, -1, -1, -1], [-1, -1, -1, -1]],

    [[0, 3, 0, 1], [0, 2, -1, 0], [-1, -1, -1, -1], [-1, -1, -1, -1]],
    [[-1, -1, -1, -1], [0, 1, 0, -1], [-1, -1, -1, -1], [0, 3, 0, 1]],
    [[11, 1, 0, -1], [14, 0, 1, 0], [14, 3, 0, 1], [11, 2, -1, 0]],
    [[-1, -1, -1, -1], [0, 0, 1, 0], [0, 3, 0, 1], [-1, -1, -1, -1]],

    [[0, 0, 1, 0], [-1, -1, -1, -1], [0, 2, -1, 0], [-1, -1, -1, -1]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [0, 1, 0, -1], [0, 0, 1, 0]],
    [[0, 1, 0, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [0, 2, -1, 0]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]// arr[py][px]===15 is invalid
]


export class AreaScanner {

    /**
     * 3. Walking through an edge node array, discarding edge node types 0 and 15 and creating paths from the rest.
     *  Walk directions: 0 > ; 1 ^ ; 2 < ; 3 v 
     * @param edgeRaster 
     * @returns 
     */
    public scan(edgeRaster: EdgeRaster, pathMinLength: number): EdgeArea[] {
        const width = edgeRaster[0].length;
        const height = edgeRaster.length;
        const paths = []

        let pathIx = 0;

        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const edge = edgeRaster[h][w];
                /**
                 * 12  ░░  ▓▓
                 * 84  ░▓  ▓░
                 *     4   11
                 */
                if (edge !== 4 && edge !== 11) {
                    // Other values are not important
                    continue;
                }

                // Init
                let px = w;
                let py = h;

                const pointedArea: EdgeArea = {
                    points: [],
                    boundingBox: [px, py, px, py],
                    childHoles: [],
                    isHole: (edge === 11)
                };
                paths[pathIx] = pointedArea;

                let areaClosed = false;
                let pointsInArea = 0;
                let direction = 1;

                // Path points loop
                while (!areaClosed) {

                    const edgeType = edgeRaster[py][px]
                    pointsInArea = this.addPointToArea(pointedArea, px - 1, py - 1, edgeType);

                    // Next: look up the replacement, direction and coordinate changes = clear this cell, turn if required, walk forward
                    const lookupRow = PATH_SCAN_COMBINED_LOOKUP[edgeType][direction];
                    edgeRaster[py][px] = lookupRow[0];
                    direction = lookupRow[1];
                    px += lookupRow[2];
                    py += lookupRow[3];

                    // Close path
                    if (
                        px - 1 === pointedArea.points[0].x &&
                        py - 1 === pointedArea.points[0].y
                    ) {
                        areaClosed = true;

                        // Discarding paths shorter than pathMinLength
                        if (pointedArea.points.length < pathMinLength) {
                            paths.pop();
                            continue;
                        }

                        if (pointedArea.isHole) {
                            // Finding the parent shape for this hole
                            const parentId = this.findParentId(pointedArea, paths, pathIx, width, height);
                            paths[parentId].childHoles.push(pathIx);
                        }
                        pathIx++;
                    }
                }
            }
        }

        return paths;
    }

    protected addPointToArea(area: EdgeArea, x: number, y: number, edgeType: EdgeTypeId): number {
        const point: EdgePoint = { x, y, data: edgeType };

        // Bounding box
        if (x < area.boundingBox[0]) { area.boundingBox[0] = x; }
        if (y < area.boundingBox[1]) { area.boundingBox[1] = y; }
        if (x > area.boundingBox[2]) { area.boundingBox[2] = x; }
        if (y > area.boundingBox[3]) { area.boundingBox[3] = y; }

        return area.points.push(point)
    }

    protected findParentId(path: EdgeArea, paths: EdgeArea[], maxPath: number, w: number, h: number): number {
        let parentId = 0;

        let parentbbox: BoundingBox = [-1, -1, w + 1, h + 1];

        for (let parentIx = 0; parentIx < maxPath; parentIx++) {
            const parentPath = paths[parentIx];
            if (!parentPath.isHole
                && this.boundingBoxIncludes(parentPath.boundingBox, path.boundingBox)
                && this.boundingBoxIncludes(parentbbox, parentPath.boundingBox)
                && this.pointInPolygon(path.points[0], parentPath.points)
            ) {
                parentId = parentIx;
                parentbbox = parentPath.boundingBox;
            }
        }
        return parentId
    }


    protected boundingBoxIncludes(parentbbox: BoundingBox, childbbox: BoundingBox): boolean {
        return (
            (parentbbox[0] < childbbox[0]) &&
            (parentbbox[1] < childbbox[1]) &&
            (parentbbox[2] > childbbox[2]) &&
            (parentbbox[3] > childbbox[3])
        );
    }

    // Point in polygon test
    protected pointInPolygon(point: EdgePoint, path: EdgePoint[]): boolean {
        let isIn = false;

        for (let i = 0, j = path.length - 1; i < path.length; j = i++) {
            isIn = (
                ((path[i].y > point.y) !== (path[j].y > point.y)) &&
                (point.x < (path[j].x - path[i].x) * (point.y - path[i].y) / (path[j].y - path[i].y) + path[i].x)
            )
                ? !isIn : isIn;
        }

        return isIn;
    }
}