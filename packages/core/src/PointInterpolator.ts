import { PointedArea, Point, EdgeArea, TrajectoryArea, TrajectoryPoint, EdgePoint } from "./ImageTracer";

export enum Trajectory {
    RIGHT = 0,
    DOWN_RIGHT = 1,
    DOWN = 2,
    DOWN_LEFT = 3,
    LEFT = 4,
    UP_LEFT = 5,
    UP = 6,
    UP_RIGHT = 7,
    NONE = 0,
}

export enum InterpolationMode{
    OFF = 'off',
    INTERPOLATE = 'interpolate',
}

export class PointInterpolator {

    interpolate(mode: InterpolationMode, paths: EdgeArea[], enhanceRightAngle: boolean): TrajectoryArea[] {
        const interpolatedPaths: TrajectoryArea[] = [];

        for(const path of paths){
            const interpolatedPoints = this.interpolatePointsUsingMode(mode, path.points, enhanceRightAngle);
            const interpolatedPath = {
                points: interpolatedPoints,
                boundingBox: path.boundingBox,
                childHoles: path.childHoles,
                isHole: path.isHole
            };
            interpolatedPaths.push(interpolatedPath);
        }

        return interpolatedPaths;
    }

    protected interpolatePointsUsingMode(mode: InterpolationMode, edgePoints: EdgePoint[], enhanceRightAngle: boolean): TrajectoryPoint[] {
        switch(mode){
            case InterpolationMode.OFF:
                return edgePoints.map( (ep, ix) => this.trajectoryPointFromEdgePoint(edgePoints, ix));
            default:
            case InterpolationMode.INTERPOLATE:
                return this.buildInterpolatedPoints(edgePoints, enhanceRightAngle);
        }
    }

    protected trajectoryPointFromEdgePoint(points: EdgePoint[], pointIx: number): TrajectoryPoint{
        const edgePoint = points[pointIx];
        const nextIx = (pointIx + 1) % points.length;
        const nextPoint = points[nextIx];
        return {
            x: edgePoint.x,
            y: edgePoint.y,
            data: this.geTrajectory(edgePoint.x, edgePoint.y, nextPoint.x, nextPoint.y)
        }
    }

    protected buildInterpolatedPoints(edgePoints: EdgePoint[], enhanceRightAngle: boolean): TrajectoryPoint[] {
        const interpolatedPoints: TrajectoryPoint[] = [];

        for (let pointIx = 0; pointIx < edgePoints.length; pointIx++) {

            if (enhanceRightAngle && this.isRightAngle(edgePoints, pointIx)){
                const cornerPoint = this.buildCornerPoint(edgePoints, pointIx);
                this.updateLastPointTrajectory(interpolatedPoints, edgePoints[pointIx]);
                interpolatedPoints.push(cornerPoint);
            }

            const midPoint = this.interpolateNextTwoPoints(edgePoints, pointIx);
            interpolatedPoints.push(midPoint);
        }
        return interpolatedPoints
    }

    protected updateLastPointTrajectory(points: TrajectoryPoint[], referencePoint: Point): void{
        if(points.length === 0){
            return;
        }
        const lastPointIx = points.length - 1
        const lastPoint = points[lastPointIx]
        lastPoint.data = this.geTrajectory(lastPoint.x, lastPoint.y, referencePoint.x, referencePoint.y);
    }

    protected interpolateNextTwoPoints(points: Point[], pointIx: number): TrajectoryPoint{
        const totalPoints = points.length;

        const nextIx1 = (pointIx + 1) % totalPoints;
        const nextIx2 = (pointIx + 2) % totalPoints;

        const currentPoint = points[pointIx];
        const nextPoint = points[nextIx1];
        const nextNextPoint = points[nextIx2];

        const midX = (currentPoint.x + nextPoint.x) / 2;
        const midY = (currentPoint.y + nextPoint.y) / 2;
        const nextMidX = (nextPoint.x + nextNextPoint.x) / 2;
        const nextMidY = (nextPoint.y + nextNextPoint.y) / 2;
        return {
            x: midX,
            y: midY,
            data: this.geTrajectory(midX, midY, nextMidX, nextMidY)
        }
    }

    protected isRightAngle(points: Point[], pointIx: number): boolean {
        const totalPoints = points.length;
        const currentPoint = points[pointIx];

        const nextIx1 = (pointIx + 1) % totalPoints;
        const nextIx2 = (pointIx + 2) % totalPoints;
        const prevIx1 = (pointIx - 1 + totalPoints) % totalPoints;
        const prevIx2 = (pointIx - 2 + totalPoints) % totalPoints;

        return (
            (currentPoint.x === points[prevIx2].x) &&
            (currentPoint.x === points[prevIx1].x) &&
            (currentPoint.y === points[nextIx1].y) &&
            (currentPoint.y === points[nextIx2].y)
        ) || (
            (currentPoint.y === points[prevIx2].y) &&
            (currentPoint.y === points[prevIx1].y) &&
            (currentPoint.x === points[nextIx1].x) &&
            (currentPoint.x === points[nextIx2].x)
        );
    }

    protected buildCornerPoint(points: Point[], pointIx: number): TrajectoryPoint{

        const nextIx1 = (pointIx + 1) % points.length;
        const currentPoint = points[pointIx];
        const nextPoint = points[nextIx1];
        const midX = (currentPoint.x + nextPoint.x) / 2;
        const midY = (currentPoint.y + nextPoint.y) / 2;
        const trajectory = this.geTrajectory(currentPoint.x, currentPoint.y, midX, midY);

        return {
            x: currentPoint.x,
            y: currentPoint.y,
            data: trajectory,
        }
    }

    protected geTrajectory(x1: number, y1: number, x2: number, y2: number): Trajectory {
        if (x1 < x2) {
            if (y1 < y2) { return Trajectory.DOWN_RIGHT; }
            if (y1 > y2) { return Trajectory.UP_RIGHT; }
            return Trajectory.RIGHT;
        } else if (x1 > x2) {
            if (y1 < y2) { return  Trajectory.DOWN_LEFT; }
            if (y1 > y2) { return  Trajectory.UP_LEFT; }
            return  Trajectory.LEFT;
        } else {
            if (y1 < y2) { return  Trajectory.DOWN; }
            if (y1 > y2) { return  Trajectory.UP; }
        }
        return Trajectory.NONE
    }
}