import type { CSSProperties, ReactNode } from 'react';

export interface Column<R> {
  key: keyof R & string;
  label: string;
  numeric?: boolean;
}

export interface DataTableProps<R extends Record<string, ReactNode>> {
  columns: readonly Column<R>[];
  rows: readonly R[];
  caption?: string;
  style?: CSSProperties;
}

export function DataTable<R extends Record<string, ReactNode>>({
  columns,
  rows,
  caption,
  style,
}: DataTableProps<R>) {
  return (
    <div
      style={{
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        ...style,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', font: 'var(--text-small)' }}>
        {caption ? (
          <caption
            style={{
              captionSide: 'top',
              textAlign: 'left',
              padding: '11px 13px',
              font: 'var(--text-body-strong)',
              color: 'var(--text-title)',
            }}
          >
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                style={{
                  textAlign: c.numeric ? 'right' : 'left',
                  font: 'var(--text-label)',
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                  color: 'var(--text-field-label)',
                  padding: '11px 13px',
                  background: 'var(--bg-sunken)',
                  borderBottom: '1px solid var(--color-line-strong)',
                  whiteSpace: 'nowrap',
                }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td
                  key={c.key}
                  data-numeric={c.numeric ? '' : undefined}
                  style={{
                    padding: '11px 13px',
                    borderBottom: i === rows.length - 1 ? 0 : 'var(--border-hairline)',
                    verticalAlign: 'top',
                    textAlign: c.numeric ? 'right' : 'left',
                    font: c.numeric ? 'var(--text-amount)' : 'var(--text-small)',
                    fontVariantNumeric: c.numeric ? 'tabular-nums' : undefined,
                    color: 'var(--text-primary)',
                    whiteSpace: c.numeric ? 'nowrap' : undefined,
                  }}
                >
                  {r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
