import {PubData} from "./types";

export function getFirstVisitText(pub: PubData): string {
    if (pub.visited) {
        return "Bonus points have already been claimed";
    }
    return "Unknown if bonus points have been claimed";
}
