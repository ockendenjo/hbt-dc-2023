import "./map.css";
import "./popup.css";
import * as ol from "ol";
import {Overlay, View} from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import {fromLonLat} from "ol/proj";
import {defaults as defaultControls} from "ol/control";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {PubsStatsFile, PubStats, Pub, PubData, PubFile, Tab} from "./ts/types";
import {StorageService} from "./ts/StorageService";
import {getFirstVisitText} from "./ts/first-visit";
import {LayerDef} from "./ts/layerDef";
import {MyUnvisitedLayer} from "./ts/MyUnvisitedLayer";
import {HBTUnvisitedLayer} from "./ts/HBTUnvisitedLayer";
import {HBTRatingLayer} from "./ts/HBTRatingLayer";
import {HBTVisitsLayer} from "./ts/HBTVisitsLayer";

document.addEventListener("DOMContentLoaded", () => {
    const osmLayer = new TileLayer({
        source: new OSM(),
        opacity: 0.6,
    });

    const layerDefs: LayerDef[] = [
        {
            id: "my",
            selectText: "My unvisited pubs",
            descText: "Brown dots are unvisited",
            visible: true,
            setupRenderer: (source) => new MyUnvisitedLayer(source),
        },
        {
            id: "hbt",
            selectText: "HBT pubs - unvisited",
            descText: "Brown dots are unvisited",
            visible: false,
            setupRenderer: (source) => new HBTUnvisitedLayer(source),
        },
        {
            id: "score",
            selectText: "HBT pubs - rating",
            descText: "Updated once per day",
            visible: false,
            setupRenderer: (source) => new HBTRatingLayer(source),
        },
        {
            id: "visits",
            selectText: "HBT pubs - total visits",
            descText: "Updated once per day",
            visible: false,
            setupRenderer: (source) => new HBTVisitsLayer(source),
        },
    ];

    layerDefs.forEach((ld) => {
        const source = new VectorSource({wrapX: true});
        ld.source = source;
        ld.layer = new VectorLayer({source, visible: ld.visible});
    });

    const mapView = new View({maxZoom: 19});
    mapView.setCenter(fromLonLat([-3.18985, 55.95285]));
    mapView.setZoom(12);

    const storageSvc = new StorageService();
    if (storageSvc.needUpload()) {
        storageSvc.upload();
    }

    function initialiseMap() {
        const map = new ol.Map({
            controls: defaultControls().extend([]),
            target: "map",
            layers: [osmLayer, ...layerDefs.map((l) => l.layer)],
            keyboardEventTarget: document,
            view: mapView,
        });

        const container = document.getElementById("popup");
        const content = document.getElementById("popup-content");
        const closer = document.getElementById("popup-closer");

        const overlay = new Overlay({
            element: container,
            autoPan: true,
        });

        map.on("click", function (e) {
            const feature = map.forEachFeatureAtPixel(e.pixel, (f) => f);
            if (!feature) {
                overlay.setPosition(undefined);
                closer.blur();
                return;
            }

            const properties = feature.getProperties();
            const pub = properties.pub as PubData;

            content.innerHTML = `<b>${pub.name}</b><p>Score: ${pub.stats.meanRating.toFixed(1)}<br>Visits: ${
                pub.stats.visitCount
            }</p><div id="popup-link">View details</div>`;
            document.getElementById("popup-link").onclick = () => {
                viewPubDetails(pub);
            };
            overlay.setPosition(e.coordinate);
        });

        map.addOverlay(overlay);
        closer.onclick = () => {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };
    }

    async function loadPubs(): Promise<PubData[]> {
        const statsMap = await loadStats();

        return fetch("pubs.json")
            .then((r) => r.json())
            .then((j: PubFile) => j.pubs)
            .then((pubs) => {
                return pubs.map((p) => {
                    const points = storageSvc.getPoints(p.id);
                    const formDone = storageSvc.getFormStatus(p.id);
                    const score = storageSvc.getScore(p.id);
                    const stats = statsMap.get(p.id);
                    return {...p, points: points, formDone, score, stats} as PubData;
                });
            });
    }

    function loadStats(): Promise<Map<number, PubStats>> {
        return fetch("aggregate.json")
            .then((r) => r.json())
            .then((j: PubsStatsFile) => j.pubs)
            .then((pubs) => {
                const statsMap = new Map<number, PubStats>();
                pubs.forEach((p) => {
                    statsMap.set(p.id, p);
                });
                return statsMap;
            });
    }

    function loadGrid(): Promise<number[][]> {
        return fetch("grid.json").then((r) => r.json());
    }

    function loadData() {
        Promise.all([loadPubs(), loadGrid()]).then(([pubs, grid]) => {
            buildGrid(pubs, grid);
            buildList(pubs);
            buildMap(pubs);
            stylePubs(pubs);
        });
    }

    function buildList(pubs: PubData[]) {
        const div = document.getElementById("list-container");
        for (const p of pubs) {
            const item = document.createElement("div");
            item.className = "list-item";

            const itemId = document.createElement("div");
            itemId.textContent = String(p.id);
            p.listCell = itemId;
            item.append(itemId);

            const itemName = document.createElement("div");
            itemName.className = "list-text";
            itemName.textContent = p.name;
            item.append(itemName);

            div.append(item);

            item.onclick = () => {
                viewPubDetails(p);
            };
        }
    }

    function buildGrid(pubs: PubData[], grid: number[][]) {
        const table = document.createElement("table");
        for (let r = 0; r < 12; r++) {
            const tr = document.createElement("tr");
            for (let c = 0; c < 16; c++) {
                const pubId = grid[r][c];
                const pub = pubs.find((p) => p.id === pubId);

                const td = document.createElement("td");
                pub.gridCell = td;

                td.title = pub?.name;
                td.textContent = String(pub?.id || 0);
                tr.append(td);

                td.addEventListener("click", () => {
                    viewPubDetails(pub);
                });
            }
            table.append(tr);
        }
        document.getElementById("table-container").append(table);
    }

    function buildMap(pubs: PubData[]) {
        layerDefs.forEach((ld) => {
            const renderer = ld.setupRenderer(ld.source);
            ld.renderer = renderer;
            renderer.render(pubs);
        });
    }

    function stylePubs(pubs: PubData[]) {
        pubs.forEach((p) => {
            setPubStyles(p);
        });
    }

    initialiseMap();
    loadData();

    function viewPubDetails(pub: PubData) {
        document.getElementById("pub-name").innerText = pub.name;
        document.getElementById("pub-address").innerText = pub.address;

        const selectElem = document.getElementById("pub-select") as HTMLSelectElement;
        selectElem.value = String(pub.points);
        const checkElem = document.getElementById("pub-form-check") as HTMLInputElement;
        checkElem.checked = Boolean(pub.formDone);
        const scoreElem = document.getElementById("score-select") as HTMLSelectElement;
        scoreElem.value = String(pub.score);

        document.getElementById("first-visit-text").textContent = getFirstVisitText(pub);

        selectElem.onchange = () => {
            const newPoints = Number(selectElem.value);
            storageSvc.setPoints(pub.id, newPoints);
            pub.points = newPoints;
            setPubStyles(pub);
        };

        scoreElem.onchange = () => {
            const newScore = Number(scoreElem.value);
            pub.score = newScore;
            storageSvc.setScore(pub.id, newScore);
        };

        checkElem.onchange = () => {
            storageSvc.setFormStatus(pub.id, checkElem.checked);
            pub.formDone = checkElem.checked;
            setPubStyles(pub);
        };

        pubTab.tab.click();
    }

    function setPubStyles(pub: PubData) {
        const className = getCellClassName(pub.points, pub.formDone, pub.visited);
        if (pub.gridCell) {
            pub.gridCell.className = className;
        }
        if (pub.listCell) {
            pub.listCell.className = className;
        }
        layerDefs.forEach((ld) => {
            ld.renderer.updateStyling(pub);
        });
    }

    function getCellClassName(points: number, formDone: boolean, visited: boolean): string {
        const pointsClassName = getPointsClassName(points);
        const doneClassName = formDone ? "submitted" : "";
        const visitedClassName = visited ? "visited" : "";
        return [pointsClassName, doneClassName, visitedClassName].filter((s) => s).join(" ");
    }

    function getPointsClassName(points: number): string {
        switch (points) {
            case 1:
                return "visit-ok";
            case 3:
                return "visit-good";
            case -1:
                return "visit-bad";
            case -2:
                return "novisit-bad";
            case 2:
                return "novisit-ok";
            case 4:
                return "novisit-good";
            default:
                return "";
        }
    }

    const pubTab = {
        tab: document.getElementById("select-pub"),
        contents: document.getElementById("tab-pub"),
        name: "pub",
    };

    const tabs: Tab[] = [
        {
            tab: document.getElementById("select-grid"),
            contents: document.getElementById("tab-grid"),
            name: "grid",
        },
        {
            tab: document.getElementById("select-map"),
            contents: document.getElementById("tab-map"),
            name: "map",
        },
        {
            tab: document.getElementById("select-list"),
            contents: document.getElementById("tab-list"),
            name: "list",
        },
        {
            tab: document.getElementById("select-info"),
            contents: document.getElementById("tab-info"),
            name: "instructions",
        },
        pubTab,
    ];

    function checkActiveTab() {
        const urlParams = new URLSearchParams(window.location.search);
        const tabName = urlParams.get("tab") || "grid";
        const t = tabs.find((t) => t.name === tabName);
        t?.activate();
    }

    function setupTabs() {
        tabs.forEach((t) => {
            const otherTabs = tabs.filter((i) => i !== t);
            t.activate = () => {
                otherTabs.forEach((ot) => {
                    ot.contents.style.display = "none";
                    ot.tab.classList.remove("active");
                });
                t.contents.style.display = "";
                t.tab.classList.add("active");
            };

            t.tab.addEventListener("click", () => {
                t.activate();
                history.pushState(undefined, "", `?tab=${t.name}`);
            });
        });

        document.getElementById("form").onclick = () => {
            document.getElementById("formlink").click();
        };

        window.addEventListener("popstate", checkActiveTab);
    }

    function setupMapSelect() {
        let elementById = document.getElementById("map-select") as HTMLSelectElement;
        layerDefs.forEach((ld) => {
            const opt = document.createElement("option") as HTMLOptionElement;
            opt.value = ld.id;
            opt.innerText = ld.selectText;
            elementById.append(opt);
        });
        const descElement = document.getElementById("map-select-desc") as HTMLSpanElement;

        const onChange = () => {
            const value = elementById.value;
            layerDefs.forEach((ld) => {
                const visible = ld.id === value;
                ld.layer.setVisible(visible);
                if (visible) {
                    descElement.textContent = ld.descText;
                }
            });
        };
        elementById.onchange = onChange;
        onChange();
    }

    setupTabs();
    setupMapSelect();
    checkActiveTab();
});

window.onerror = (event, source, lineno, colno, error) => {
    console.error({event, source, lineno, colno, error});
};
