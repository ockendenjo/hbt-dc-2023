import {Upload, UploadPub} from "./types";

const LS_KEY_ID = "ID";

export class StorageService {
    private pointsMap = new Map<number, number>();
    private scoreMap = new Map<number, number>();
    private formMap = new Map<number, boolean>();

    constructor() {
        this.readPoints();
        this.readForm();
        this.readScores();
    }

    private readPoints(): void {
        const lsd = localStorage.getItem("data") ?? "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.pointsMap.set(Number(k), v as number);
        });
    }

    private readScores(): void {
        const lsd = localStorage.getItem("scores") ?? "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.scoreMap.set(Number(k), v as number);
        });
    }

    private readForm(): void {
        const lsd = localStorage.getItem("formData") ?? "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.formMap.set(Number(k), Boolean(v));
        });
    }

    public getPoints(pubId: number): number {
        return this.pointsMap.get(pubId) || 0;
    }

    public getScore(pubId: number): number {
        return this.scoreMap.get(pubId) ?? 0;
    }

    public setPoints(pubId: number, points: number): void {
        this.pointsMap.set(pubId, points);
        this.writePoints();
        this.upload();
    }

    public setScore(pubId: number, score: number): void {
        if (score) {
            this.scoreMap.set(pubId, score);
        } else {
            this.scoreMap.delete(pubId);
        }
        this.writeScore();
        this.upload();
    }

    public getFormStatus(pubId: number): boolean {
        return Boolean(this.formMap.get(pubId));
    }

    public setFormStatus(pubId: number, checked: boolean): void {
        this.formMap.set(pubId, checked);
        this.writeForm();
        this.upload();
    }

    private writePoints(): void {
        const data: Record<string, number> = {};
        this.pointsMap.forEach((v, k) => {
            if (v) {
                data[String(k)] = v;
            }
        });
        localStorage.setItem("data", JSON.stringify(data));
    }

    private writeScore(): void {
        const data: Record<string, number> = {};
        this.scoreMap.forEach((v, k) => {
            if (v) {
                data[String(k)] = v;
            }
        });
        localStorage.setItem("scores", JSON.stringify(data));
    }

    private writeForm(): void {
        const data: Record<string, boolean> = {};
        this.formMap.forEach((v, k) => {
            if (v) {
                data[String(k)] = v;
            }
        });
        localStorage.setItem("formData", JSON.stringify(data));
    }

    public getUUID() {
        let id = localStorage.getItem(LS_KEY_ID);
        if (!id) {
            id = generateUUID();
            localStorage.setItem(LS_KEY_ID, id);
        }
        return id;
    }

    public needUpload(): boolean {
        let id = localStorage.getItem(LS_KEY_ID);
        return !id;
    }

    private getPayload(): Upload {
        const uploadPubs: UploadPub[] = [];

        const keySet = new Set([...this.formMap.keys(), ...this.pointsMap.keys()]);
        keySet.forEach((id) => {
            const form = this.formMap.get(id);
            const points = getStateValue(this.pointsMap.get(id) ?? 0);
            const score = this.scoreMap.get(id) ?? 0;
            uploadPubs.push({id, form: Boolean(form), points, score});
        });

        return {pubs: uploadPubs};
    }

    public upload(): void {
        const id = this.getUUID();
        const body = this.getPayload();
        fetch(`/upload/${id}`, {method: "POST", body: JSON.stringify(body)}).catch((e) => {
            console.error(e);
        });
    }
}

const generateUUID = () => {
    let d = new Date().getTime(),
        d2 = (typeof performance !== "undefined" && performance.now && performance.now() * 1000) || 0;
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        let r = Math.random() * 16;
        if (d > 0) {
            r = (d + r) % 16 | 0;
            d = Math.floor(d / 16);
        } else {
            r = (d2 + r) % 16 | 0;
            d2 = Math.floor(d2 / 16);
        }
        return (c == "x" ? r : (r & 0x7) | 0x8).toString(16);
    });
};

const getStateValue = (points: number): number => {
    switch (points) {
        case -1:
            return -1;
        case 1:
            return 1;
        case 3:
            return 3;
        default:
            return 0;
    }
};
