import {RenderBase} from "./RenderBase";
import VectorSource from "ol/source/Vector";
import {PubData} from "./types";
import {Feature} from "ol";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateOranges} from "d3-scale-chromatic";

export class HBTRatingLayer extends RenderBase {
    constructor(source: VectorSource) {
        super(source);
    }

    setStyle(pub: PubData, feature: Feature): void {
        const n = (pub.stats.meanRating - 1) / (5 - 1);
        if (!feature) {
            console.error(pub);
        }
        feature.setStyle(getStyle(n));
    }

    sort(pubs: PubData[]): PubData[] {
        return pubs.sort((a, b) => {
            return a.stats.meanRating - b.stats.meanRating;
        });
    }

    protected filter(pubs: PubData[]): PubData[] {
        return pubs.filter((p) => p.stats.meanRating);
    }
}

const getStyle = (n: number) => {
    return new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({color: interpolateOranges(n)}),
            stroke: new Stroke({color: n < 0.25 ? "grey" : "white", width: 2}),
        }),
    });
};
