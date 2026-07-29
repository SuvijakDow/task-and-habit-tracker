export interface FontOption {
  id: string;
  name: string;
  nameThai: string;
  fontFamily: string;
  googleFontQuery: string;
  previewText: string;
  category: string;
}

export const APP_FONTS: FontOption[] = [
  {
    id: 'bai_jamjuree',
    name: 'Bai Jamjuree',
    nameThai: 'ใบจามจุรี',
    fontFamily: "'Bai Jamjuree', sans-serif",
    googleFontQuery: 'Bai+Jamjuree:wght@300;400;500;600;700',
    previewText: 'จัดสรรเวลาและชีวิตประจำวัน',
    category: 'Modern Tech',
  },
  {
    id: 'sarabun',
    name: 'Sarabun',
    nameThai: 'สารบรรณ',
    fontFamily: "'Sarabun', sans-serif",
    googleFontQuery: 'Sarabun:wght@300;400;500;600;700;800',
    previewText: 'ระบบติดตามงานและวินัยชีวิตประจำวัน',
    category: 'Formal & Clean',
  },
  {
    id: 'prompt',
    name: 'Prompt',
    nameThai: 'พร้อม',
    fontFamily: "'Prompt', sans-serif",
    googleFontQuery: 'Prompt:wght@300;400;500;600;700;800',
    previewText: 'สร้างเป้าหมายและนิสัยที่ดีในทุกๆ วัน',
    category: 'Sleek Sans-Serif',
  },
  {
    id: 'kanit',
    name: 'Kanit',
    nameThai: 'คนิต',
    fontFamily: "'Kanit', sans-serif",
    googleFontQuery: 'Kanit:wght@300;400;500;600;700;800',
    previewText: 'วางแผนงานอย่างมีระเบียบและทรงพลัง',
    category: 'Bold Geometric',
  },
  {
    id: 'pridi',
    name: 'Pridi',
    nameThai: 'ปรีดี',
    fontFamily: "'Pridi', sans-serif",
    googleFontQuery: 'Pridi:wght@300;400;500;600;700',
    previewText: 'เพิ่มสมาธิและความสม่ำเสมอในทุกภารกิจ',
    category: 'Warm Slab Serif',
  },
  {
    id: 'chakra_petch',
    name: 'Chakra Petch',
    nameThai: 'จักรเพชร',
    fontFamily: "'Chakra Petch', sans-serif",
    googleFontQuery: 'Chakra+Petch:wght@300;400;500;600;700',
    previewText: 'ยกระดับประสิทธิภาพชีวิตแบบก้าวกระโดด',
    category: 'Futuristic Tech',
  },
  {
    id: 'mitr',
    name: 'Mitr',
    nameThai: 'มิตร',
    fontFamily: "'Mitr', sans-serif",
    googleFontQuery: 'Mitr:wght@300;400;500;600;700',
    previewText: 'เช็คลิสต์งานย่อยและความสำเร็จวันนี้',
    category: 'Soft Rounded',
  },
  {
    id: 'krub',
    name: 'Krub',
    nameThai: 'ครับ',
    fontFamily: "'Krub', sans-serif",
    googleFontQuery: 'Krub:wght@300;400;500;600;700',
    previewText: 'วางแผนวันนี้ เพื่อความสำเร็จในอนาคต',
    category: 'Curved Modern',
  },
  {
    id: 'inter',
    name: 'Inter',
    nameThai: 'อินเตอร์',
    fontFamily: "'Inter', sans-serif",
    googleFontQuery: 'Inter:wght@300;400;500;600;700;800',
    previewText: 'Modern International Sans-Serif Font',
    category: 'International Minimal',
  },
];

export const DEFAULT_FONT_ID = 'bai_jamjuree';

export const getStoredFontId = (): string => {
  if (typeof window === 'undefined') return DEFAULT_FONT_ID;
  return localStorage.getItem('app_master_font') || DEFAULT_FONT_ID;
};

export const applyAppFont = (fontId: string) => {
  const font = APP_FONTS.find((f) => f.id === fontId) || APP_FONTS.find((f) => f.id === DEFAULT_FONT_ID)!;

  const linkId = 'app-master-font-link';
  let fontLink = document.getElementById(linkId) as HTMLLinkElement | null;
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = linkId;
    fontLink.rel = 'stylesheet';
    document.head.appendChild(fontLink);
  }
  const href = `https://fonts.googleapis.com/css2?family=${font.googleFontQuery}&display=swap`;
  if (fontLink.href !== href) {
    fontLink.href = href;
  }

  document.documentElement.style.setProperty('--font-master', font.fontFamily);
  document.body.style.fontFamily = font.fontFamily;

  localStorage.setItem('app_master_font', font.id);
};

export const preloadAllAppFonts = () => {
  if (typeof window === 'undefined') return;
  const linkId = 'app-all-fonts-preload';
  if (document.getElementById(linkId)) return;

  const fontQueries = APP_FONTS.map((f) => `family=${f.googleFontQuery}`).join('&');
  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${fontQueries}&display=swap`;
  document.head.appendChild(link);
};
