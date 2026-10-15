interface Box {
  type: string;
  start: number;
  size: number;
}

const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl", "edts"]);

async function readBytes(file: Blob, start: number, len: number): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(start, start + len).arrayBuffer());
}

async function readTopBoxes(file: File): Promise<Box[]> {
  const boxes: Box[] = [];
  let pos = 0;
  while (pos + 8 <= file.size && boxes.length < 200) {
    const head = await readBytes(file, pos, 16);
    const dv = new DataView(head.buffer);
    let size = dv.getUint32(0);
    const type = String.fromCharCode(head[4], head[5], head[6], head[7]);
    if (size === 1) {
      if (head.length < 16) break;
      size = Number(dv.getBigUint64(8));
    } else if (size === 0) {
      size = file.size - pos;
    }
    if (size < 8 || pos + size > file.size) break;
    boxes.push({ type, start: pos, size });
    pos += size;
  }
  return boxes;
}

function shiftOffsets(buf: Uint8Array, start: number, end: number, delta: number): void {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let pos = start;
  while (pos + 8 <= end) {
    const size = dv.getUint32(pos);
    const type = String.fromCharCode(buf[pos + 4], buf[pos + 5], buf[pos + 6], buf[pos + 7]);
    if (size < 8 || pos + size > end) return;
    if (CONTAINERS.has(type)) {
      shiftOffsets(buf, pos + 8, pos + size, delta);
    } else if (type === "stco") {
      const count = dv.getUint32(pos + 12);
      for (let i = 0; i < count; i++) {
        const p = pos + 16 + i * 4;
        dv.setUint32(p, dv.getUint32(p) + delta);
      }
    } else if (type === "co64") {
      const count = dv.getUint32(pos + 12);
      for (let i = 0; i < count; i++) {
        const p = pos + 16 + i * 8;
        dv.setBigUint64(p, dv.getBigUint64(p) + BigInt(delta));
      }
    }
    pos += size;
  }
}

/**
 * Переносит служебный блок moov в начало MP4/MOV, чтобы видео начинало
 * играть сразу, не дожидаясь полной загрузки файла. Качество не меняется.
 * При любой неполадке возвращает исходный файл.
 */
export async function faststartMp4(file: File): Promise<File> {
  try {
    const boxes = await readTopBoxes(file);
    const ftyp = boxes[0];
    const moov = boxes.find((b) => b.type === "moov");
    const mdat = boxes.find((b) => b.type === "mdat");
    if (!ftyp || ftyp.type !== "ftyp" || !moov || !mdat) return file;
    if (moov.start < mdat.start) return file;
    if (moov.size > 64 * 1024 * 1024) return file;

    const moovBytes = await readBytes(file, moov.start, moov.size);
    shiftOffsets(moovBytes, 8, moovBytes.length, moov.size);

    const ftypEnd = ftyp.start + ftyp.size;
    const parts: BlobPart[] = [file.slice(0, ftypEnd), moovBytes];
    if (moov.start > ftypEnd) parts.push(file.slice(ftypEnd, moov.start));
    if (moov.start + moov.size < file.size) parts.push(file.slice(moov.start + moov.size));

    return new File(parts, file.name, { type: file.type || "video/mp4", lastModified: file.lastModified });
  } catch {
    return file;
  }
}
