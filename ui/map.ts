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

document.addEventListener("DOMContentLoaded", () => {
    const osmLayer = new TileLayer({
        source: new OSM(),
        opacity: 0.6,
    });
    const vectorSource = new VectorSource({wrapX: true});
    const vectorLayer = new VectorLayer({source: vectorSource});

    const mapView = new View({maxZoom: 19});
    mapView.setCenter(fromLonLat([-3.18985, 55.95285]));
    mapView.setZoom(12);

    const storageSvc = new StorageService();

    function initialiseMap() {
        const map = new ol.Map({
            controls: defaultControls().extend([]),
            target: "map",
            layers: [osmLayer, vectorLayer],
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
                    return {...p, points: points, formDone} as PubData;
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
            radius: 7,
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
            const iconFeature = new Feature(featureConfig);
            p.feature = iconFeature;
            iconFeature.setStyle(style);
            vectorSource.addFeature(iconFeature);
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

        selectElem.onchange = () => {
            const newPoints = Number(selectElem.value);
            storageSvc.setPoints(pub.id, newPoints);
            pub.points = newPoints;
            setPubStyles(pub);
        };

        checkElem.onchange = () => {
            storageSvc.setFormStatus(pub.id, checkElem.checked);
            pub.formDone = checkElem.checked;
            setPubStyles(pub);
        };

        pubTab.tab.click();
    }

    function setPubStyles(pub: PubData) {
        const className = getCellClassName(pub.points, pub.formDone);
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

    function getCellClassName(points: number, formDone: boolean): string {
        if (formDone) {
            console.log("done");
        }
        const pointsClassName = getPointsClassName(points);
        const doneClassName = formDone ? "submitted" : "";
        return [pointsClassName, doneClassName].filter((s) => s).join(" ");
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

    setupTabs();
    checkActiveTab();
});

window.onerror = (event, source, lineno, colno, error) => {
    console.error({event, source, lineno, colno, error});
};
