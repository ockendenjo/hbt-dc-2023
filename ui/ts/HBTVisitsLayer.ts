import {RenderBase} from "./RenderBase";
import VectorSource from "ol/source/Vector";
import {PubStats, PubData} from "./types";
import {Feature} from "ol";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {interpolateOranges} from "d3-scale-chromatic";

export class HBTVisitsLayer extends RenderBase {
    constructor(source: VectorSource) {
        super(source);
    }

    private min = 0;
    private max = 0;

    render(pubs: PubData[]) {
        const visits = pubs.filter((p) => p.stats.visitCount).map((p) => p.stats.visitCount);
        this.max = Math.max(...visits);
        this.min = Math.min(...visits);
        super.render(pubs);
    }

    setStyle(pub: PubData, feature: Feature): void {
        const n = (pub.stats.visitCount - this.min) / (this.max - this.min);
        feature.setStyle(getStyle(n));
    }

    sort(pubs: PubData[]): PubData[] {
        return pubs.sort((a, b) => {
            return a.stats.visitCount - b.stats.visitCount;
        });
    }

    protected filter(pubs: PubData[]): PubData[] {
        return pubs.filter((p) => p.stats.visitCount);
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
