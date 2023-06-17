import {Region} from "./region";
import {Extent} from "ol/extent";

export function findOverlappingRegions(regions: Region[], extent: Extent): Region[] {
    const [left, bottom, right, top] = extent;

    return regions.filter((r) => {
        const leftInside = left < r.left && r.left < right;
        const rightInside = left < r.right && r.right < right;

        const topInside = bottom < r.top && r.top < top;
        const bottomInside = bottom < r.bottom && r.bottom < top;

        return (leftInside || rightInside) && (topInside || bottomInside);
    });
}
