export class StorageService {
    private map = new Map<number, number>();

    constructor() {
        this.read();
    }

    private read(): void {
        const lsd = localStorage.getItem("data") || "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.map.set(Number(k), v as number);
        });
    }

    public getPoints(pubId: number): number {
        return this.map.get(pubId) || 0;
    }

    public setPoints(pubId: number, points: number): void {
        this.map.set(pubId, points);
        this.write();
    }

    private write(): void {
        const data: Record<string, number> = {};
        this.map.forEach((v, k) => {
            if (v) {
                data[String(k)] = v;
            }
        });
        localStorage.setItem("data", JSON.stringify(data));
    }
}
