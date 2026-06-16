export const colors = {
  bg: '#0F1117',
  bg2: '#181B24',
  bg3: '#1E2130',
  card: '#1E2130',
  border: 'rgba(255,255,255,0.07)',
  border2: 'rgba(255,255,255,0.12)',

  text: '#F0F2F8',
  text2: '#8A8FA8',
  text3: '#555A72',

  green: '#2ECC8A',
  greenBg: 'rgba(46,204,138,0.12)',
  greenBorder: 'rgba(46,204,138,0.25)',

  amber: '#F5A623',
  amberBg: 'rgba(245,166,35,0.12)',
  amberBorder: 'rgba(245,166,35,0.25)',

  red: '#F25C5C',
  redBg: 'rgba(242,92,92,0.12)',
  redBorder: 'rgba(242,92,92,0.25)',

  blue: '#4F8EF7',
  blueBg: 'rgba(79,142,247,0.12)',
  blueBorder: 'rgba(79,142,247,0.25)',
} as const;

export type ColorKey = keyof typeof colors;
