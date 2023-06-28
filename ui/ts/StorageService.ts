export class StorageService {
    private pointsMap = new Map<number, number>();
    private formMap = new Map<number, boolean>();

    constructor() {
        this.readPoints();
        this.readForm();
    }

    private readPoints(): void {
        const lsd = localStorage.getItem("data") ?? "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.pointsMap.set(Number(k), v as number);
        });
    }

    private readForm(): void {
        const lsd = localStorage.getItem("formData") ?? "{}";
        const sd = JSON.parse(lsd);
        Object.entries(sd).forEach(([k, v]) => {
            this.formMap.set(Number(k), Boolean(v));
        });
        console.log(this.formMap);
    }

    public getPoints(pubId: number): number {
        return this.pointsMap.get(pubId) || 0;
    }

    public setPoints(pubId: number, points: number): void {
        this.pointsMap.set(pubId, points);
        this.writePoints();
    }

    public getFormStatus(pubId: number): boolean {
        return Boolean(this.formMap.get(pubId));
    }

    public setFormStatus(pubId: number, checked: boolean): void {
        this.formMap.set(pubId, checked);
        this.writeForm();
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

    private writeForm(): void {
        const data: Record<string, boolean> = {};
        this.formMap.forEach((v, k) => {
            if (v) {
                data[String(k)] = v;
            }
        });
        localStorage.setItem("formData", JSON.stringify(data));
    }
}
