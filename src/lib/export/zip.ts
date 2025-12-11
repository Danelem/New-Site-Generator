import JSZip from "jszip";
import type { StaticFile } from "./buildCreatineReportFiles";

export async function buildZipFromFiles(files: StaticFile[]): Promise<Uint8Array> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.contents);
  }

  return await zip.generateAsync({ type: "uint8array" });
}

