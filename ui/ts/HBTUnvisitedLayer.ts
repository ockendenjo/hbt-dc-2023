import {RenderBase, STYLE_BROWN, STYLE_GREY} from "./RenderBase";
import VectorSource from "ol/source/Vector";
import {PubData} from "./types";
import {Feature} from "ol";

export class HBTUnvisitedLayer extends RenderBase {
    constructor(source: VectorSource) {
        super(source);
    }

    setStyle(pub: PubData, feature: Feature): void {
        feature.setStyle(pub.visited ? STYLE_GREY : STYLE_BROWN); //FIXME
    }

    sort(pubs: PubData[]): PubData[] {
        return pubs.sort((a, b) => {
            const aValue = a.visited ? 1 : 0;
            const bValue = b.visited ? 1 : 0;
            return bValue - aValue;
        });
    }
}
