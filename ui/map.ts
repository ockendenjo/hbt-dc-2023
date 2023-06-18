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
                    return {...p, points: points} as PubData;
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
        });
    }

    function buildList(pubs: PubData[]) {
        const div = document.getElementById("list-container");
        for (const p of pubs) {
            const item = document.createElement("div");
            item.className = "list-item";

            const itemId = document.createElement("div");
            itemId.className = "list-id";
            itemId.textContent = String(p.id);
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
                styleGridCell(pub);
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

    function buildMap(pubs: Pub[]) {
        pubs.filter((p) => p.lon).forEach((p) => {
            const featureConfig = {
                geometry: new Point(fromLonLat([p.lon, p.lat])),
                pub: p,
            };
            const iconFeature = new Feature(featureConfig);
            iconFeature.setStyle(style);
            vectorSource.addFeature(iconFeature);
        });
    }

    initialiseMap();
    loadData();

    function viewPubDetails(pub: PubData) {
        console.log(pub);

        document.getElementById("pub-name").innerText = pub.name;
        document.getElementById("pub-address").innerText = pub.address;
        const selectElem = document.getElementById("pub-select") as HTMLSelectElement;
        selectElem.value = String(pub.points);

        selectElem.onchange = () => {
            const newPoints = Number(selectElem.value);
            storageSvc.setPoints(pub.id, newPoints);
            pub.points = newPoints;
            styleGridCell(pub);
        };
        pubTab.tab.click();
    }

    function styleGridCell(pub: PubData) {
        switch (pub.points) {
            case 1:
                pub.gridCell.className = "visit-ok";
                break;
            case 3:
                pub.gridCell.className = "visit-good";
                break;
            case -1:
                pub.gridCell.className = "visit-bad";
                break;
            default:
                pub.gridCell.className = "";
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
        pubTab,
    ];

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

        window.addEventListener("popstate", (event) => {
            const urlParams = new URLSearchParams(window.location.search);
            const tabName = urlParams.get("tab") || "grid";
            const t = tabs.find((t) => t.name === tabName);
            t?.activate();
        });
    }
    setupTabs();
});
