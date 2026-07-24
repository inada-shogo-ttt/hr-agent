// 依存なしの ZIP 生成(無圧縮 STORE)。クライアントでも動く。
// 「全て保存」を1ファイルの ZIP ダウンロードにまとめるために使う。
// ブラウザは同一操作からの複数ファイル自動ダウンロードをブロックするため、
// 個別ダウンロードの連打では 2 枚目以降が保存されない。
// 画像(PNG/JPG)は既に圧縮済みのため、無圧縮格納で十分。

const textEncoder = new TextEncoder();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date =
    (((d.getFullYear() - 1980) & 0x7f) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

export interface ZipEntry {
  name: string;
  // Blob に渡すため ArrayBuffer 基盤であることを型で保証する
  data: Uint8Array<ArrayBuffer>;
}

export function createZip(files: ZipEntry[]): Blob {
  const { time, date } = dosDateTime(new Date());
  const parts: BlobPart[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const crc = crc32(file.data);

    // ローカルファイルヘッダ
    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // flags: UTF-8 filename
    lv.setUint16(8, 0, true); // method: STORE(無圧縮)
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    local.set(nameBytes, 30);

    // セントラルディレクトリエントリ
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // flags: UTF-8 filename
    cv.setUint16(10, 0, true); // method: STORE
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // ローカルヘッダのオフセット
    central.set(nameBytes, 46);

    parts.push(local, file.data);
    centralParts.push(central);
    offset += local.length + file.data.length;
  }

  const centralSize = centralParts.reduce((sum, p) => sum + p.length, 0);

  // エンドオブセントラルディレクトリ
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true); // セントラルディレクトリ開始オフセット

  return new Blob([...parts, ...centralParts, end], { type: "application/zip" });
}
