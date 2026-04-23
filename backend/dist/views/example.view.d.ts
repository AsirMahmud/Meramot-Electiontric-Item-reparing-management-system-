type Example = {
    id: string;
    title: string;
    createdAt: Date;
    updatedAt: Date;
};
export declare function exampleListView(rows: Example[]): {
    data: {
        id: string;
        title: string;
        createdAt: string;
        updatedAt: string;
    }[];
};
export declare function exampleItemView(row: Example): {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
};
export {};
//# sourceMappingURL=example.view.d.ts.map