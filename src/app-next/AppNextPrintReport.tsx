import { useEffect, useState } from "react";
import { createPortal, flushSync } from "react-dom";

/** Print only the data already authorized and loaded by the owning route. */
export function AppNextPrintReport({ title, columns, rows }: {
  title: string; columns: string[]; rows: string[][];
}) {
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("print");
    const change = () => setPrinting(media.matches);
    const before = () => flushSync(() => setPrinting(true));
    const after = () => setPrinting(false);
    media.addEventListener("change", change);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    change();
    return () => {
      media.removeEventListener("change", change);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  return <>
    <button type="button" className="secondary app-next-print-action" onClick={() => window.print()}>현재 목록 인쇄</button>
    {printing ? createPortal(<section className="app-next-print-report" aria-label={`${title} 인쇄본`}>
      <h1>{title}</h1>
      <p>현재 조회 목록 · {rows.length}건</p>
      <table><thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table>
    </section>, document.body) : null}
  </>;
}
