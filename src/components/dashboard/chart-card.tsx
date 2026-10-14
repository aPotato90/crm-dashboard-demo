import { useId } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type DataTable = {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
};

/**
 * Card for one chart. The chart itself is exposed as a single image with a
 * text summary, followed by a visually hidden data table with every value.
 */
export function ChartCard({
  title,
  description,
  summary,
  table,
  children,
  className,
  action,
}: {
  title: string;
  description?: React.ReactNode;
  /** One-sentence description of what the chart shows, for screen readers. */
  summary: string;
  table: DataTable;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="font-semibold">
              <h2 id={titleId}>{title}</h2>
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <figure aria-labelledby={titleId} className="m-0">
          <div
            role="img"
            aria-label={`${summary} Full data in the table below.`}
          >
            {children}
          </div>
          <table className="sr-only">
            <caption>{table.caption}</caption>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column} scope="col">
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={String(row[0])}>
                  {row.map((cell, i) =>
                    i === 0 ? (
                      <th key={i} scope="row">
                        {cell}
                      </th>
                    ) : (
                      <td key={i}>{cell}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </CardContent>
    </Card>
  );
}
