import * as exporters from "../../utils/exporters";
import type { ExportableContent } from "../../utils/exporters";
import type { ExportAction } from "./ExportMenu";

/** Ready-made action set for a single piece of content. */
export const contentExportActions = (item: ExportableContent): ExportAction[] => [
  {
    key: "copy",
    label: "Copy text",
    hint: "Script, hooks and captions",
    icon: "copy",
    successMessage: "Copied to clipboard",
    run: () => exporters.copyText(exporters.contentToPlainText(item))
  },
  {
    key: "copy-md",
    label: "Copy for Notion",
    hint: "Markdown: paste straight into a Notion page",
    icon: "copy",
    successMessage: "Markdown copied. Paste it into Notion.",
    run: () => exporters.copyText(exporters.contentToMarkdown(item))
  },
  {
    key: "md",
    label: "Download Markdown (.md)",
    hint: "Also works with Notion → Import",
    icon: "download",
    successMessage: "Markdown downloaded",
    run: () => exporters.downloadFile(`${exporters.slugify(item.topic)}.md`, exporters.contentToMarkdown(item), "text/markdown")
  },
  {
    key: "pdf",
    label: "Save as PDF",
    hint: "Opens print dialog → Save as PDF",
    icon: "pdf",
    successMessage: "Choose “Save as PDF” in the print dialog",
    run: () => exporters.printAsPdf(item.topic, exporters.contentToHtml(item))
  }
];
