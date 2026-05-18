export type ReportColumn<T> = {
  label: string;
  value: (row: T) => string | number | null | undefined;
};

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderMeta(meta: Array<{ label: string; value: string | number | null | undefined }>) {
  if (meta.length === 0) return '';
  return `
    <section class="meta">
      ${meta.map(item => `
        <div>
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value || 'Todos')}</strong>
        </div>
      `).join('')}
    </section>
  `;
}

function renderTable<T>(columns: ReportColumn<T>[], rows: T[]) {
  return `
    <table>
      <thead>
        <tr>${columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${rows.map(row => `
          <tr>
            ${columns.map(column => `<td>${escapeHtml(column.value(row) ?? '')}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export function printReport<T>({
  title,
  subtitle,
  meta = [],
  columns,
  rows,
  filename,
  scheduleHtml,
}: {
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string | number | null | undefined }>;
  columns: ReportColumn<T>[];
  rows: T[];
  filename?: string;
  scheduleHtml?: string;
}) {
  const win = window.open('', '_blank', 'width=1200,height=800');
  if (!win) return false;

  const generatedAt = new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const headerHtml = `
  <header>
    <h1>${escapeHtml(title)}</h1>
    ${subtitle ? `<p class="subtitle">${escapeHtml(subtitle)}</p>` : ''}
    <div class="generated">Generado: ${escapeHtml(generatedAt)} · e-Schedule</div>
  </header>
  ${renderMeta(meta)}`;

  win.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(filename || title)}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1f2933; margin: 0; }
    header { border-bottom: 3px solid #87BF58; padding-bottom: 10px; margin-bottom: 14px; }
    h1 { margin: 0; font-size: 22px; color: #264362; }
    .subtitle { margin: 4px 0 0; color: #5c6670; font-size: 12px; }
    .generated { margin-top: 8px; color: #7a8490; font-size: 10px; }
    .meta { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
    .meta div { border: 1px solid #dbe6f2; border-radius: 6px; padding: 7px 8px; background: #f8fbfd; }
    .meta span { display: block; color: #6b7280; font-size: 9px; text-transform: uppercase; font-weight: 700; }
    .meta strong { display: block; margin-top: 2px; font-size: 11px; color: #264362; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #264362; color: white; text-align: left; padding: 6px; border: 1px solid #264362; }
    td { padding: 5px 6px; border: 1px solid #d7dee8; vertical-align: top; }
    tr:nth-child(even) td { background: #f7fafc; }
    .empty { border: 1px solid #d7dee8; border-radius: 6px; padding: 18px; color: #6b7280; text-align: center; }
    .page-break { page-break-after: always; }
    .section-title { font-size: 13px; font-weight: 700; color: #264362; margin: 0 0 10px; padding-bottom: 5px; border-bottom: 2px solid #87BF58; }
    /* Horario visual */
    .schedule-wrap { display: flex; width: 100%; font-size: 9px; }
    .schedule-time-col { width: 44px; flex-shrink: 0; }
    .schedule-time-col .time-spacer { height: 28px; }
    .schedule-time-col .time-body { position: relative; }
    .schedule-time-label { position: absolute; right: 4px; color: #868e96; font-size: 8px; transform: translateY(-50%); }
    .schedule-day-col { flex: 1; min-width: 0; }
    .schedule-day-header { height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 10px; border-bottom: 2px solid #e9ecef; background: #f8f9fa; color: #495057; }
    .schedule-day-header.sat { background: #f0f7e8; color: #5f8f33; }
    .schedule-day-body { position: relative; border-right: 1px solid #e9ecef; background: white; }
    .schedule-day-body.sat { background: #fbfef8; }
    .schedule-hour-line { position: absolute; left: 0; right: 0; border-top: 1px solid #f1f3f5; }
    .sched-block { position: absolute; border-radius: 3px; padding: 2px 3px; overflow: hidden; box-sizing: border-box; }
    .sched-block-title { font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sched-block-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; }
    .sched-block-docente { margin-top: 2px; padding: 1px 3px; border-radius: 3px; background: #d3f9d8; border: 1px solid #8ce99a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 8px; color: #2b8a3e; font-weight: 700; }
    .sched-block-noasig { margin-top: 2px; padding: 1px 3px; border-radius: 3px; background: #fff3bf; border: 1px solid #ffd43b; font-size: 8px; color: #8d6b00; font-weight: 700; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  ${scheduleHtml ? `
  <div class="page-break">
    ${headerHtml}
    <p class="section-title">Vista de horario</p>
    ${scheduleHtml}
  </div>
  <div>
    ${headerHtml}
    <p class="section-title">Detalle de bloques</p>
    ${rows.length > 0 ? renderTable(columns, rows) : '<div class="empty">No hay datos para los filtros seleccionados.</div>'}
  </div>
  ` : `
  ${headerHtml}
  ${rows.length > 0 ? renderTable(columns, rows) : '<div class="empty">No hay datos para los filtros seleccionados.</div>'}
  `}
  <script>
    window.onload = () => {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  win.document.close();
  return true;
}
