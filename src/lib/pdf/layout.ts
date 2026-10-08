export const PAGE_H = 609.4;
export const PAGE_W = 935.4;

export const LEFT_X = 118.0;
export const LEFT_W = 154.0;
export const RIGHT_X = 824.0;
export const RIGHT_W = 94.0;

export const HEADER_POS: Record<string, { x: number; baseline: number; w: number }> = {
  nama_balita: { x: LEFT_X, baseline: 62.5, w: LEFT_W },
  nik: { x: LEFT_X, baseline: 74.1, w: LEFT_W },
  jenis_kelamin: { x: LEFT_X, baseline: 85.7, w: LEFT_W },
  tanggal_lahir: { x: LEFT_X, baseline: 97.3, w: LEFT_W },
  bb_lahir: { x: LEFT_X, baseline: 108.9, w: LEFT_W },
  pb_lahir: { x: LEFT_X, baseline: 120.5, w: LEFT_W },
  nama_ibu: { x: LEFT_X, baseline: 132.1, w: LEFT_W },
  nama_ayah: { x: LEFT_X, baseline: 143.7, w: LEFT_W },
  alamat: { x: LEFT_X, baseline: 155.3, w: LEFT_W },
  telepon: { x: LEFT_X, baseline: 166.9, w: LEFT_W },
  kecamatan: { x: RIGHT_X, baseline: 74.1, w: RIGHT_W },
  desa: { x: RIGHT_X, baseline: 85.7, w: RIGHT_W },
  dusun: { x: RIGHT_X, baseline: 97.3, w: RIGHT_W },
  posyandu: { x: RIGHT_X, baseline: 108.9, w: RIGHT_W },
};

export const COL_X = [
  16.0, 40.6, 79.0, 117.3, 148.3, 179.2, 210.3, 241.3, 272.4, 303.3,
  334.3, 365.3, 396.3, 427.3, 458.2, 489.3, 520.3, 551.3, 582.7, 614.2,
  645.8, 677.3, 708.8, 757.0, 823.2, 889.4, 918.6
];

export const FIRST_ROW_TOP = 316.5;
export const ROW_H = 14.4;
export const ROWS_PAGE_1 = 18;

// Measurements for Page 2
export const P2_FIRST_ROW_TOP = 173.4;
export const P2_ROWS = 29;

export const COLOR_GREEN = { r: 0.78, g: 0.94, b: 0.78 };
export const COLOR_YELLOW = { r: 1.0, g: 0.95, b: 0.6 };
export const COLOR_BLACK = { r: 0, g: 0, b: 0 };
