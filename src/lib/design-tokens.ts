/** رموز تصميم قبو — للاستيراد في المنطق والتوثيق؛ الألوان في الواجهة تُفضَّل عبر Tailwind و globals.css */

export const tokens = {
  colors: {
    primary: { DEFAULT: '#1B7F7A', dark: '#14605C', light: '#E6F5F4' },
    accent: { DEFAULT: '#FF8C42', dark: '#E67A35', light: '#FFF3EB' },
    /** أسماء مسطّحة للتوافق مع الكود السابق */
    primaryFlat: '#1B7F7A',
    primaryDark: '#14605C',
    primaryLight: '#E6F5F4',
    accentFlat: '#FF8C42',
    accentDark: '#E67A35',
    accentLight: '#FFF3EB',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    dangerLight: '#FEF2F2',
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  radius: { sm: 6, md: 8, lg: 12, xl: 16, full: 9999 },
  fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20, '2xl': 24, '3xl': 30 },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,0.05)',
    md: '0 4px 6px rgba(0,0,0,0.07)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
  },
} as const
