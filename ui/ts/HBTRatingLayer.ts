import {RenderBase} from "./RenderBase";
import VectorSource from "ol/source/Vector";
import {CombinedPub, PubData} from "./types";
import {Feature} from "ol";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateOranges} from "d3-scale-chromatic";

export class HBTRatingLayer extends RenderBase {
    constructor(source: VectorSource) {
        super(source);
    }

    setStyle(pub: PubData, feature: Feature): void {
        console.log(this.statsMap);
        const stat = this.statsMap.get(pub.id);
        const n = stat.meanRating / 5;
        feature.setStyle(getStyle(n));
    }

    sort(pubs: PubData[], stats: CombinedPub[]): PubData[] {
        return pubs.sort((a, b) => {
            return this.statsMap.get(a.id).meanRating - this.statsMap.get(b.id).meanRating;
        });
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
