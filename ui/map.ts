import "./map.css";
import * as ol from "ol";
import {View} from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import {fromLonLat, transformExtent} from "ol/proj";
import {defaults as defaultControls, FullScreen} from "ol/control";
import {RunTime} from "../lib/run-time";
import {CombinedData, CombinedDataEvent, CombinedDataEventRecord} from "../lib/combined-data";
import {PopularityRenderer} from "./ts/PopularityRenderer";
import {FastestTimeRenderer} from "./ts/FastestTimeRenderer";
import {RecentlyUpdatedRenderer} from "./ts/RecentlyUpdatedRenderer";
import {Region, RegionsFile} from "./ts/region";
import {findOverlappingRegions} from "./ts/find-overlapping-regions";
import {UnvisitedRenderer} from "./ts/UnvisitedRenderer";

document.addEventListener("DOMContentLoaded", () => {
    const rasterLayers: TileLayer<any>[] = [];
    const osmLayer = new TileLayer({
        source: new OSM(),
        opacity: 0.6,
    });
    rasterLayers.push(osmLayer);

    const vectorLayers = [
        {id: "popularity", visible: true, getRenderer: (source) => new PopularityRenderer(source)},
        {id: "fkt-star", visible: false, getRenderer: (source) => new FastestTimeRenderer(source, "*")},
        {id: "fkt-m", visible: false, getRenderer: (source) => new FastestTimeRenderer(source, "M")},
        {id: "fkt-w", visible: false, getRenderer: (source) => new FastestTimeRenderer(source, "W")},
        {id: "updated", visible: false, getRenderer: (source) => new RecentlyUpdatedRenderer(source)},
        {id: "unvisited", visible: false, getRenderer: (source) => new UnvisitedRenderer(source)},
    ].map((def) => {
        const source = new VectorSource({wrapX: true});
        const layer = new VectorLayer({source, visible: def.visible});
        const renderer = def.getRenderer(source);
        return {...def, source, layer, renderer};
    });

    const mapView = new View({maxZoom: 19});
    mapView.setZoom(10);
    mapView.setCenter(fromLonLat([-3.745, 55.8957]));

    function initialiseMap() {
        const map = new ol.Map({
            controls: defaultControls().extend([new FullScreen()]),
            target: "map",
            layers: [...rasterLayers, ...vectorLayers.map((def) => def.layer)],
            keyboardEventTarget: document,
            view: mapView,
        });

        map.on("click", function (e) {
            const feature = map.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (!feature) {
                return;
            }

            document.getElementById("event-details").style.display = "block";

            const properties = feature.getProperties();
            const event = properties.event as CombinedDataEvent;
            const fgw = event.records.find((r) => r.age_category === "W");
            const fgm = event.records.find((r) => r.age_category === "M");

            document.getElementById("name").textContent = event.event_short_name;
            document.getElementById("runs").textContent = String(event.hbt_run_count);
            document.getElementById("id").textContent = String(event.event_number);
            document.getElementById("updated").textContent = new Date(event.last_modified)
                .toISOString()
                .substring(0, 10);
            document.getElementById("fgw-name").textContent = fgw?.name;
            document.getElementById("fgw-time").textContent = fgw?.time;
            document.getElementById("fgm-name").textContent = fgm?.name;
            document.getElementById("fgm-time").textContent = fgm?.time;
            const linkElement = document.getElementById("link") as HTMLAnchorElement;
            linkElement.href = `https://www.parkrun.org.uk/${event.eventname}/`;

            let recordsDetails = document.getElementById("records-details");
            recordsDetails.innerHTML = "";
            let show = false;
            event.records.forEach((r) => {
                if (["M", "W", "*"].includes(r.age_category)) {
                    return;
                }

                const record = document.createElement("div");
                record.classList.add("record");

                const ageCat = document.createElement("div");
                ageCat.textContent = r.age_category;
                record.append(ageCat);

                const who = document.createElement("div");
                const time = new RunTime(r.time);
                who.textContent = `${time.toString()} ${r.name}`;
                record.append(who);

                recordsDetails.append(record);
                show = true;
            });
            document.getElementById("records-container").style.display = show ? "block" : "none";
        });

        map.on("moveend", () => {
            const mercatorExtent = mapView.getViewStateAndExtent().extent;
            const lonLatExtent = transformExtent(mercatorExtent, "EPSG:3857", "EPSG:4326");
            const overlap = findOverlappingRegions([...notLoadedRegions], lonLatExtent);
            overlap.forEach((r) => {
                notLoadedRegions.delete(r);
                loadRegion(r.name);
            });
        });
    }

    const selectElem = document.getElementById("layer-select") as HTMLSelectElement;
    const changeFn = () => {
        const layerId = selectElem.value;
        vectorLayers.forEach((vld) => {
            const visible = vld.id === layerId;
            vld.layer.setVisible(visible);
        });
    };
    selectElem.onchange = changeFn;

    const loadedRegions: Map<string, boolean> = new Map([["scotland", true]]);
    const notLoadedRegions: Set<Region> = new Set<Region>();

    function loadRegion(region: string) {
        fetch(`/regions/${region}.json`)
            .then((r) => r.json())
            .then((data: CombinedData) => data.events)
            .then((events) => {
                events.forEach((e) => addRecords(e));

                vectorLayers.forEach((def) => {
                    def.renderer.addEvents(events);
                });

                if (region === "scotland") {
                    const visibleLayerDef = vectorLayers.find((vl) => vl.visible);
                    mapView.fit(visibleLayerDef.source.getExtent(), {padding: [20, 20, 20, 20]});
                    changeFn();
                }
            });
    }

    function loadData() {
        loadedRegions.forEach((v, k) => {
            loadRegion(k);
        });

        fetch("regions.json")
            .then((r) => r.json())
            .then((regionFile: RegionsFile) => regionFile.regions)
            .then((rs) => {
                rs.filter((r) => !loadedRegions.has(r.name)).forEach((r) => {
                    loadedRegions.set(r.name, false);
                    notLoadedRegions.add(r);
                });
            });
    }

    function addRecords(event: CombinedDataEvent): void {
        const maleRecords = event.records.filter((r) => r.age_category.includes("M"));
        const womenRecords = event.records.filter((r) => r.age_category.includes("W"));

        let records = [];
        if (maleRecords.length) {
            const fastestMaleRecord = findFKT(maleRecords);
            records.push(fastestMaleRecord);
            event.records.push({...fastestMaleRecord, age_category: "M"});
        }

        if (womenRecords.length) {
            const fastestWomanRecord = findFKT(womenRecords);
            records.push(fastestWomanRecord);
            event.records.push({...fastestWomanRecord, age_category: "W"});
        }

        if (event.records.length) {
            const fastest = findFKT(records);
            event.records.push({...fastest, age_category: "*"});
        }

        event.records.sort(sortRecord);
    }

    function sortRecord(a: CombinedDataEventRecord, b: CombinedDataEventRecord) {
        const aAge = Number(a.age_category.substring(2, 4));
        const bAge = Number(b.age_category.substring(2, 4));
        if (aAge < bAge) {
            return -1;
        }
        if (bAge < aAge) {
            return 1;
        }

        const aGen = a.age_category.substring(1, 2);
        const bGen = b.age_category.substring(1, 2);
        if (aGen === "W") {
            return -1;
        }
        return aGen === bGen ? 0 : 1;
    }

    function findFKT(records: CombinedDataEventRecord[]): CombinedDataEventRecord {
        let record = records[0];
        let fkt = new RunTime(record.time);

        records.forEach((r) => {
            const nextTime = new RunTime(r.time);
            if (!fkt) {
                fkt = nextTime;
                record = r;
                return;
            }
            if (nextTime.lessThan(fkt)) {
                fkt = nextTime;
                record = r;
            }
        });
        return record;
    }

    initialiseMap();
    loadData();
});
