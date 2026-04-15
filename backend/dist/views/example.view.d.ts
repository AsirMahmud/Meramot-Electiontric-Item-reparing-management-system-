/** Placeholder types for example list shaping — no Prisma model named Example in schema. */
export interface ExampleRow {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare function exampleListView(rows: ExampleRow[]): {
    data: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
    }[];
};
export declare function exampleItemView(row: ExampleRow): {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};
//# sourceMappingURL=example.view.d.ts.map