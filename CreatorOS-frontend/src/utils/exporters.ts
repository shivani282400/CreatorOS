export type ExportableContent = {
  topic: string;
  platform?: string | null;
  script?: string | null;
  hooks?: string[] | null;
  captions?: string[] | null;
  threads?: string[] | null;
  score?: number | null;
  analysis?: { summary?: string; improvements?: string[] } | Record<string, unknown> | null;
};

export type CalendarExportRow = {
  date: string; // YYYY-MM-DD
  topic: string;
  platform: string;
  status: string;
  script?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
};

const list = (value?: string[] | null) => (Array.isArray(value) ? value.filter(Boolean) : []);

/* ------------------------------ file helpers ------------------------------ */

export const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "creatoros-export";

export const downloadFile = (filename: string, content: string, mime = "text/plain") => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts / older browsers.
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Opens the browser print dialog for the given HTML, where "Save as PDF" is one click. */
export const printAsPdf = (title: string, bodyHtml: string) => {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }

  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;margin:40px;line-height:1.55}
  h1{font-size:26px;margin:0 0 4px} h2{font-size:15px;margin:22px 0 6px;text-transform:uppercase;letter-spacing:.06em;color:#4f46e5}
  .meta{color:#666;font-size:13px;margin-bottom:18px} p,li{font-size:14px;white-space:pre-wrap} ul{padding-left:20px;margin:0}
  table{border-collapse:collapse;width:100%;font-size:13px} th,td{border:1px solid #ddd;padding:6px 8px;text-align:left} th{background:#f4f4f8}
  .item{page-break-inside:avoid;margin-bottom:26px} footer{margin-top:30px;font-size:11px;color:#999}
</style></head><body>${bodyHtml}<footer>Exported from CreatorOS</footer></body></html>`);
  doc.close();

  const cleanup = () => setTimeout(() => frame.remove(), 1000);
  frame.contentWindow.addEventListener("afterprint", cleanup);
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(cleanup, 60_000);
  }, 250);

  return true;
};

/* --------------------------------- content --------------------------------- */

export const contentToPlainText = (item: ExportableContent) => {
  const parts: string[] = [item.topic];
  if (item.platform) parts.push(`Platform: ${item.platform}`);
  if (item.script) parts.push("", "SCRIPT", item.script);
  const hooks = list(item.hooks);
  if (hooks.length) parts.push("", "HOOKS", ...hooks.map((h) => `- ${h}`));
  const captions = list(item.captions);
  if (captions.length) parts.push("", "CAPTIONS", ...captions.map((c) => `- ${c}`));
  const threads = list(item.threads);
  if (threads.length) parts.push("", "THREAD", ...threads);
  return parts.join("\n");
};

/** Markdown that pastes cleanly into Notion (headings, bullets and paragraphs convert to blocks). */
export const contentToMarkdown = (item: ExportableContent) => {
  const lines: string[] = [`# ${item.topic}`, ""];
  const meta = [item.platform, typeof item.score === "number" ? `AI score ${item.score}/100` : ""].filter(Boolean);
  if (meta.length) lines.push(`*${meta.join(" · ")}*`, "");

  if (item.script) lines.push("## Script", "", item.script, "");

  const hooks = list(item.hooks);
  if (hooks.length) lines.push("## Hooks", "", ...hooks.map((h) => `- ${h}`), "");

  const captions = list(item.captions);
  if (captions.length) lines.push("## Captions", "", ...captions.map((c) => `- ${c}`), "");

  const threads = list(item.threads);
  if (threads.length) lines.push("## Thread", "", ...threads.map((t) => `- ${t}`), "");

  const analysis = item.analysis as { summary?: string; improvements?: string[] } | null | undefined;
  if (analysis?.summary) lines.push("## AI feedback", "", analysis.summary, "");
  if (analysis?.improvements?.length) lines.push(...analysis.improvements.map((i) => `- ${i}`), "");

  return lines.join("\n").trim() + "\n";
};

export const contentToHtml = (item: ExportableContent) => {
  const section = (heading: string, body: string) => (body ? `<h2>${heading}</h2>${body}` : "");
  const bullets = (values: string[]) =>
    values.length ? `<ul>${values.map((v) => `<li>${escapeHtml(v)}</li>`).join("")}</ul>` : "";

  const meta = [item.platform, typeof item.score === "number" ? `AI score ${item.score}/100` : ""].filter(Boolean).join(" · ");

  return `<div class="item"><h1>${escapeHtml(item.topic)}</h1>${meta ? `<div class="meta">${escapeHtml(meta)}</div>` : ""}
${section("Script", item.script ? `<p>${escapeHtml(item.script)}</p>` : "")}
${section("Hooks", bullets(list(item.hooks)))}
${section("Captions", bullets(list(item.captions)))}
${section("Thread", bullets(list(item.threads)))}</div>`;
};

export const contentToHtmlList = (items: ExportableContent[]) => items.map(contentToHtml).join("");

/* --------------------------------- calendar --------------------------------- */

const csvCell = (value: unknown) => {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV imports straight into a Notion database (Notion → Import → CSV) or Google Sheets. */
export const calendarToCsv = (rows: CalendarExportRow[]) => {
  const header = ["Date", "Topic", "Platform", "Status", "Views", "Likes", "Comments", "Shares", "Script"];
  const body = rows.map((r) =>
    [r.date, r.topic, r.platform, r.status, r.views ?? "", r.likes ?? "", r.comments ?? "", r.shares ?? "", r.script ?? ""]
      .map(csvCell)
      .join(",")
  );
  return [header.join(","), ...body].join("\r\n");
};

export const calendarToMarkdown = (rows: CalendarExportRow[]) => {
  const cell = (value: unknown) => String(value ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = ["# Content calendar", "", "| Date | Topic | Platform | Status |", "| --- | --- | --- | --- |"];
  rows.forEach((r) => lines.push(`| ${cell(r.date)} | ${cell(r.topic)} | ${cell(r.platform)} | ${cell(r.status)} |`));
  return lines.join("\n") + "\n";
};

/** iCalendar (.ics): imports into Google Calendar, Apple Calendar and Outlook. */
export const calendarToIcs = (rows: CalendarExportRow[]) => {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const fold = (text: string) => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

  const events = rows
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map((r, index) => {
      const day = r.date.replace(/-/g, "");
      const next = new Date(`${r.date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const end = next.toISOString().slice(0, 10).replace(/-/g, "");

      return [
        "BEGIN:VEVENT",
        `UID:creatoros-${day}-${index}@creatoros`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${day}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${fold(`${r.topic} (${r.platform})`)}`,
        `DESCRIPTION:${fold(`Status: ${r.status}${r.script ? `\n\n${r.script}` : ""}`)}`,
        "END:VEVENT"
      ].join("\r\n");
    });

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//CreatorOS//Content Calendar//EN", "CALSCALE:GREGORIAN", ...events, "END:VCALENDAR"].join("\r\n");
};

export const calendarToHtml = (rows: CalendarExportRow[]) =>
  `<h1>Content calendar</h1><div class="meta">${rows.length} scheduled item${rows.length === 1 ? "" : "s"}</div>
<table><thead><tr><th>Date</th><th>Topic</th><th>Platform</th><th>Status</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td>${escapeHtml(r.date)}</td><td>${escapeHtml(r.topic)}</td><td>${escapeHtml(r.platform)}</td><td>${escapeHtml(r.status)}</td></tr>`)
    .join("")}</tbody></table>`;
