export function exampleListView(rows) {
    return { data: rows.map(exampleItemView) };
}
export function exampleItemView(row) {
    return {
        id: row.id,
        title: row.title,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}
//# sourceMappingURL=example.view.js.map