import "./map.css";
import "./popup.css";
import * as ol from "ol";
import {Feature, Overlay, View} from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import {fromLonLat} from "ol/proj";
import {defaults as defaultControls} from "ol/control";
import VectorSource from "ol/source/Vector";
import VectorLayer from "ol/layer/Vector";
import {Pub, PubData, PubFile, Tab} from "./ts/types";
import {Point} from "ol/geom";
import {Fill, Stroke, Style} from "ol/style";
import CircleStyle from "ol/style/Circle";
import {StorageService} from "./ts/StorageService";
import {getFirstVisitText} from "./ts/first-visit";

document.addEventListener("DOMContentLoaded", () => {
    const osmLayer = new TileLayer({
        source: new OSM(),
        opacity: 0.6,
    });

    const mySource = new VectorSource({wrapX: true});
    const myLayer = new VectorLayer({source: mySource, visible: true});

    const hbtSource = new VectorSource({wrapX: true});
    const hbtLayer = new VectorLayer({source: hbtSource, visible: false});

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
            layers: [osmLayer, myLayer, hbtLayer],
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
            const pub = properties.pub as Pub;

            content.innerHTML = `<b>${pub.name}</b>`;
            overlay.setPosition(e.coordinate);
        });

        map.addOverlay(overlay);
        closer.onclick = () => {
            overlay.setPosition(undefined);
            closer.blur();
            return false;
        };
    }

    function loadPubs(): Promise<PubData[]> {
        return fetch("pubs.json")
            .then((r) => r.json())
            .then((j: PubFile) => j.pubs)
            .then((pubs) => {
                return pubs.map((p) => {
                    const points = storageSvc.getPoints(p.id);
                    const formDone = storageSvc.getFormStatus(p.id);
                    const score = storageSvc.getScore(p.id);
                    return {...p, points: points, formDone, score} as PubData;
                });
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

    const style = new Style({
        image: new CircleStyle({
            radius: 7,
            fill: new Fill({color: "saddlebrown"}),
            stroke: new Stroke({color: "white", width: 2}),
        }),
    });

    const visitedStyle = new Style({
        image: new CircleStyle({
            radius: 5,
            fill: new Fill({color: "#C0C0C0"}),
            stroke: new Stroke({color: "white", width: 2}),
        }),
    });

    function buildMap(pubs: PubData[]) {
        pubs.filter((p) => p.lon).forEach((p) => {
            const featureConfig = {
                geometry: new Point(fromLonLat([p.lon, p.lat])),
                pub: p,
            };
            const myFeature = new Feature(featureConfig);
            p.feature = myFeature;
            myFeature.setStyle(style);
            mySource.addFeature(myFeature);
        });

        pubs.sort((a, b) => {
            const aValue = a.visited ? 1 : 0;
            const bValue = b.visited ? 1 : 0;
            return bValue - aValue;
        });
        pubs.forEach((p) => {
            const featureConfig = {
                geometry: new Point(fromLonLat([p.lon, p.lat])),
                pub: p,
            };
            const hbtFeature = new Feature(featureConfig);
            hbtFeature.setStyle(p.visited ? visitedStyle : style);
            hbtSource.addFeature(hbtFeature);
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
        if (pub.feature) {
            if ([-1, 1, 3].includes(pub.points)) {
                pub.feature.setStyle(visitedStyle);
            } else {
                pub.feature.setStyle(style);
            }
        }
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
        const onChange = () => {
            const value = elementById.value;
            const layer = value === "my" ? myLayer : hbtLayer;
            const notLayer = value === "my" ? hbtLayer : myLayer;
            notLayer.setVisible(false);
            layer.setVisible(true);
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
