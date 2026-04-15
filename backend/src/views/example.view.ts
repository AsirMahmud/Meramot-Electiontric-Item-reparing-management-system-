/** Placeholder types for example list shaping — no Prisma model named Example in schema. */
export interface ExampleRow {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export function exampleListView(rows: ExampleRow[]) {
  return { data: rows.map(exampleItemView) };
}

export function exampleItemView(row: ExampleRow) {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
