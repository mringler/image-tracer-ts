import { OutlinedArea, TrajectoryArea, TrajectoryPoint } from "./ImageTracer";


interface SvgLineBaseAttributes {
    type: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
}

interface SvgLineAttributesL extends SvgLineBaseAttributes {
    type: 'L',
}

interface SvgLineAttributesQ extends SvgLineBaseAttributes {
    type: 'Q',
    x3: number,
    y3: number,
}

export type SvgLineAttributes = SvgLineAttributesL | SvgLineAttributesQ

export namespace SvgLineAttributes {
    export function toString(la: SvgLineAttributes) {
        const str = `${la.type} ${la.x1} ${la.y1} ${la.x2} ${la.y2}`;
        if (la.type === 'L') {
            return str;
        }
        return str + ` ${la.x3} ${la.y3}`
    }
}

export class PathTracer {
    // 5. tracepath() : recursively trying to fit straight and quadratic spline segments on the 8 direction internode path

    // 5.1. Find sequences of points with only 2 segment types
    // 5.2. Fit a straight line on the sequence
    // 5.3. If the straight line fails (distance error > lineErrorMargin), find the point with the biggest error
    // 5.4. Fit a quadratic spline through errorpoint (project this to get controlpoint), then measure errors on every point in the sequence
    // 5.5. If the spline fails (distance error > curveErrorMargin), find the point with the biggest error, set splitpoint = fitting point
    // 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences

    public trace(path: TrajectoryArea, lineErrorMargin: number, curveErrorMargin: number): OutlinedArea {
        const pathCommands: SvgLineAttributes[] = [];
        const points = ([] as TrajectoryPoint[]).concat(path.points);
        points.push(points[0]); // we want to end on the point we started on

        for (let sequenceStartIx = 0; sequenceStartIx < points.length - 1;) {
            const nextSequenceStartIx = this.findNextSequenceStartIx(points, sequenceStartIx);

            const commandSequence = this.getPathCommandsOfSequence(
                points,
                lineErrorMargin,
                curveErrorMargin,
                sequenceStartIx,
                nextSequenceStartIx
            );

            pathCommands.push(...commandSequence);

            sequenceStartIx = nextSequenceStartIx;
        }

        return {
            lineAttributes: pathCommands,
            boundingBox: path.boundingBox,
            childHoles: path.childHoles,
            isHole: path.isHole
        };
    }

    /**
     * Find sequence of points with 2 trajectories.
     * 
     * @param points 
     * @param startIx 
     * @returns The index where the next sequence starts
     */
    protected findNextSequenceStartIx(points: TrajectoryPoint[], startIx: number): number {
        const startTrajectory = points[startIx].data;
        let nextIx = startIx + 1;
        let nextPoint = points[nextIx];
        let secondTrajectory = null;

        while ((
            nextPoint.data === startTrajectory ||
            nextPoint.data === secondTrajectory ||
            secondTrajectory === null
        ) && nextIx < points.length - 1
        ) {

            if (
                nextPoint.data !== startTrajectory &&
                secondTrajectory === null
            ) {
                secondTrajectory = nextPoint.data;
            }

            nextIx++;
            nextPoint = points[nextIx]
        }

        // the very last point is same as start point and part of the last sequence, no matter its type 
        return (nextIx === points.length - 2) ? nextIx + 1 : nextIx; 
    }

    // 5.2. - 5.6. recursively fitting a straight or quadratic line segment on this sequence of path nodes,
    // called from tracepath()
    protected getPathCommandsOfSequence(
        points: TrajectoryPoint[],
        lineErrorMargin: number,
        curveErrorMargin: number,
        sequenceStartIx: number,
        sequenceEndIx: number
    ): SvgLineAttributes[] {
        if (sequenceEndIx > points.length || sequenceEndIx < 0) {
            return [];
        }

        const isLineResult = this.checkSequenceFitsLine(points, lineErrorMargin, sequenceStartIx, sequenceEndIx);
        if (typeof isLineResult === 'object') {
            return [isLineResult];
        }

        const isCurveResult = this.checkSequenceFitsCurve(points, curveErrorMargin, sequenceStartIx, sequenceEndIx, isLineResult);
        if (typeof isCurveResult === 'object') {
            return [isCurveResult];
        }

        // 5.5. If the spline fails (distance error>curveErrorMargin), find the point with the biggest error
        const splitPoint = isLineResult;
        const seqSplit1 = this.getPathCommandsOfSequence(points, lineErrorMargin, curveErrorMargin, sequenceStartIx, splitPoint)
        const seqSplit2 = this.getPathCommandsOfSequence(points, lineErrorMargin, curveErrorMargin, splitPoint, sequenceEndIx)

        return seqSplit1.concat(seqSplit2)
    }

    protected checkSequenceFitsLine(
        points: TrajectoryPoint[],
        lineErrorMargin: number,
        sequenceStartIx: number,
        sequenceEndIx: number
    ): SvgLineAttributesL | number {

        const sequenceLength = sequenceEndIx - sequenceStartIx;
        const startPoint = points[sequenceStartIx];
        const endPoint = points[sequenceEndIx];
        const gainX = (endPoint.x - startPoint.x) / sequenceLength;
        const gainY = (endPoint.y - startPoint.y) / sequenceLength;

        // 5.2. Fit a straight line on the sequence
        let isStraightLine = true;
        let maxDiffIx = sequenceStartIx;
        let maxDiff = 0;

        for (let pointIx = sequenceStartIx + 1; pointIx < sequenceEndIx; pointIx++) {
            const subsequenceLength = pointIx - sequenceStartIx;
            const expectedX = startPoint.x + subsequenceLength * gainX;
            const expectedY = startPoint.y + subsequenceLength * gainY;

            const point = points[pointIx]
            const diff = (point.x - expectedX) * (point.x - expectedX) + (point.y - expectedY) * (point.y - expectedY);
            if (diff > lineErrorMargin) {
                isStraightLine = false;
            }
            if (diff > maxDiff) {
                maxDiffIx = pointIx;
                maxDiff = diff;
            }
        }

        if (!isStraightLine) {
            return maxDiffIx;
        }

        return {
            type: 'L',
            x1: startPoint.x,
            y1: startPoint.y,
            x2: endPoint.x,
            y2: endPoint.y
        };
    }

    protected checkSequenceFitsCurve(
        points: TrajectoryPoint[],
        curveErrorMargin: number,
        sequenceStartIx: number,
        sequenceEndIx: number,
        turningPointIx: number
    ): SvgLineAttributesQ | number {

        const sequenceLength = sequenceEndIx - sequenceStartIx;
        const startPoint = points[sequenceStartIx];
        const endPoint = points[sequenceEndIx];

        let isCurve = true;
        let maxDiff = 0;
        let maxDiffIx = sequenceStartIx;

        // 5.4. Fit a quadratic spline through this point, measure errors on every point in the sequence
        // helpers and projecting to get control point

        let subsequenceLength = turningPointIx - sequenceStartIx,
            t = subsequenceLength / sequenceLength,
            t1 = (1 - t) * (1 - t),
            t2 = 2 * (1 - t) * t,
            t3 = t * t
            ;

        const qControlPointX = (t1 * startPoint.x + t3 * endPoint.x - points[turningPointIx].x) / -t2;
        const qControlPointY = (t1 * startPoint.y + t3 * endPoint.y - points[turningPointIx].y) / -t2;

        // Check every point
        for (let pointIx = sequenceStartIx + 1; pointIx != sequenceEndIx; pointIx = (pointIx + 1) % points.length) {
            subsequenceLength = pointIx - sequenceStartIx
            t = subsequenceLength / sequenceLength;
            t1 = (1 - t) * (1 - t);
            t2 = 2 * (1 - t) * t;
            t3 = t * t;

            const px = t1 * startPoint.x + t2 * qControlPointX + t3 * endPoint.x;
            const py = t1 * startPoint.y + t2 * qControlPointY + t3 * endPoint.y;
            const point = points[pointIx];
            const diff = (point.x - px) * (point.x - px) + (point.y - py) * (point.y - py);

            if (diff > curveErrorMargin) {
                isCurve = false;
            }
            if (diff > maxDiff) {
                maxDiffIx = pointIx;
                maxDiff = diff;
            }
        }

        if (!isCurve) {
            return maxDiffIx;
        }

        return {
            type: 'Q',
            x1: startPoint.x,
            y1: startPoint.y,
            x2: qControlPointX,
            y2: qControlPointY,
            x3: endPoint.x,
            y3: endPoint.y
        };
    }
}