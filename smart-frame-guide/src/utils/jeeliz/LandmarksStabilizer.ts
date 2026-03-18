/**
 * LandmarksStabilizer.ts
 * 
 * Implements the One Euro Filter for stabilizing noisy face tracking signals.
 * Ref: https://cristal.univ-lille.fr/~casiez/1euro/
 */

class OneEuroFilter {
    minCutoff: number;
    beta: number;
    dcutoff: number;
    xPrev: number | null;
    dxPrev: number;
    tPrev: number | null;
    alpha: number;
    dalpha: number;

    constructor(minCutoff = 1.0, beta = 0.0, dcutoff = 1.0) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dcutoff = dcutoff;
        this.xPrev = null;
        this.dxPrev = 0.0;
        this.tPrev = null;
        this.alpha = 0;
        this.dalpha = 0;
    }

    reset() {
        this.xPrev = null;
        this.dxPrev = 0.0;
        this.tPrev = null;
    }

    smoothingFactor(t: number, cutoff: number): number {
        const r = 2 * Math.PI * cutoff * t;
        return r / (r + 1);
    }

    exponentialSmoothing(a: number, x: number, xPrev: number): number {
        return a * x + (1 - a) * xPrev;
    }

    filter(t: number, x: number): number {
        if (this.tPrev === null || this.xPrev === null) {
            this.tPrev = t;
            this.xPrev = x;
            this.dxPrev = 0.0;
            return x;
        }

        const dt = t - this.tPrev;

        // Avoid division by zero or negative time
        if (dt <= 0) {
            return this.xPrev;
        }

        // Compute the filtered derivative of the signal.
        const dx = (x - this.xPrev) / dt;
        const edx = this.exponentialSmoothing(this.smoothingFactor(dt, this.dcutoff), dx, this.dxPrev);

        // Use the filtered derivative to compute the cutoff frequency of the filter.
        const cutoff = this.minCutoff + this.beta * Math.abs(edx);

        // Filter the signal.
        const result = this.exponentialSmoothing(this.smoothingFactor(dt, cutoff), x, this.xPrev);

        this.xPrev = result;
        this.dxPrev = edx;
        this.tPrev = t;

        return result;
    }
}

export class LandmarksStabilizer {
    // Filters for each independent property we want to stabilize
    // Jeeliz detectState: x, y, s, rx, ry, rz
    filters: { [key: string]: OneEuroFilter };

    // Tuning parameters
    // minCutoff: Lower = smoother but more lag (good for slow movement/stillness)
    // beta: Higher = less lag during fast movement, but maybe more jitter (good for speed)
    constructor() {
        // Default tuning for face tracking
        // minCutoff: 0.001 - very smooth when still
        // beta: 0.1 - responsive enough when moving
        const minCutoff = 0.01;
        const beta = 20.0;
        const dcutoff = 1.0;

        this.filters = {
            x: new OneEuroFilter(minCutoff, beta, dcutoff),
            y: new OneEuroFilter(minCutoff, beta, dcutoff),
            s: new OneEuroFilter(minCutoff, beta, dcutoff),
            rx: new OneEuroFilter(minCutoff, beta, dcutoff),
            ry: new OneEuroFilter(minCutoff, beta, dcutoff),
            rz: new OneEuroFilter(minCutoff, beta, dcutoff),
        };
    }

    update(detectState: any, timestampSec: number): any {
        if (!detectState.detected) {
            this.reset();
            return detectState;
        }

        // Stabilize main pose parameters
        const stabilizedState = { ...detectState };

        stabilizedState.x = this.filters.x.filter(timestampSec, detectState.x);
        stabilizedState.y = this.filters.y.filter(timestampSec, detectState.y);
        stabilizedState.s = this.filters.s.filter(timestampSec, detectState.s);
        stabilizedState.rx = this.filters.rx.filter(timestampSec, detectState.rx);
        stabilizedState.ry = this.filters.ry.filter(timestampSec, detectState.ry);
        stabilizedState.rz = this.filters.rz.filter(timestampSec, detectState.rz);

        return stabilizedState;
    }

    reset() {
        Object.values(this.filters).forEach(f => f.reset());
    }
}
