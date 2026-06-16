export const fontFamilies = {
  display: 'SpaceGrotesk',
  body: 'Inter',
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, fontFamily: fontFamilies.display },
  h2: { fontSize: 22, fontWeight: '700' as const, fontFamily: fontFamilies.display },
  h3: { fontSize: 18, fontWeight: '600' as const, fontFamily: fontFamilies.display },
  body: { fontSize: 15, fontWeight: '400' as const, fontFamily: fontFamilies.body },
  label: { fontSize: 13, fontWeight: '500' as const, fontFamily: fontFamilies.body },
  small: { fontSize: 11, fontWeight: '400' as const, fontFamily: fontFamilies.body },
  micro: { fontSize: 10, fontWeight: '500' as const, fontFamily: fontFamilies.body },
} as const;
