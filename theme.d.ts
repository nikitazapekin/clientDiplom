 
export const theme = {
  container: 1187,
  deviceHeight: "100vh",
  colors: {
    dark: "#222121", 
    gray: "#f5f4f4", 
    grayDark: "#d8d8d8", 
    purple: "#9f0fa7",
    white: "#fff", 
  },
  fontFamilies: {
    primary: "Inter",
    secondary: "sans-serif",
  },
  fontSizes: {
    xl: "41px",
    lg: "30px",
    md: "27px",
    sm: "22px",
    xs: "20px",
    xxs: "18px",
  },
  fontWeights: {
    regular: 400,
  },
  media: {
    xxl: 1400,
    xl: 1280,
    lg: 1024,
    md: 768,
    xh: 547,
    sm: 480,
  },
  zIndexes: {
    xm: -2,
    x: -1,
    xs: 0,
    sm: 1,
    md: 2,
  },
  spaces: {
    x: 5,
    xs: 10,
    sm: 15,
    md: 20,
    lg: 30,
    xl: 40,
    xxl: 50,
    g: 60,
    h: 70,
    xh: 80,
    eh: 90,
  },
  swiper: {
    item_gap: 5,
    margin_base: 2.5,
    vw_ratio: 0.5,
    scroll_snap_type: "x mandatory",
    scroll_snap_align: "start",
    flex_basis: "0 0",
    min_width: "0",
    container: 16.6,
  },
} as const; 
 
export type ThemeType = typeof theme;
