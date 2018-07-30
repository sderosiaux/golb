import Typography from 'typography'
//import Wordpress2016 from 'typography-theme-wordpress-2016'
//import bootstrapTheme from './bootstrap'
import Color from 'color'

/*
const theme: OptionsType = {
  title: 'Wordpress Theme 2016',
  baseFontSize: '16px',
  baseLineHeight: 1.75,
  scaleRatio: 5 / 2,
  googleFonts: [
    {
      name: 'Montserrat',
      styles: ['700'],
    },
    {
      name: 'Merriweather',
      styles: ['400', '400i', '700', '700i', '900', '900i'],
    },
  ],
  headerFontFamily: ['Merriweather', 'Georgia', 'serif'],
  bodyFontFamily: ['Merriweather', 'Georgia', 'serif'],
  bodyColor: 'hsla(0,0%,0%,0.9)',
  headerWeight: 900,
  bodyWeight: 400,
  boldWeight: 700,
  overrideStyles: ({ adjustFontSizeTo, scale, rhythm }, options) => ({
    h1: {
      fontFamily: ['Montserrat', 'sans-serif'].join(','),
    },
    blockquote: {
      ...scale(1 / 5),
      color: gray(41),
      fontStyle: 'italic',
      paddingLeft: rhythm(13 / 16),
      marginLeft: rhythm(-1),
      borderLeft: `${rhythm(3 / 16)} solid ${gray(10)}`,
    },
    'blockquote > :last-child': {
      marginBottom: 0,
    },
    'blockquote cite': {
      ...adjustFontSizeTo(options.baseFontSize),
      color: options.bodyColor,
      fontWeight: options.bodyWeight,
    },
    'blockquote cite:before': {
      content: '"— "',
    },
    ul: {
      listStyle: 'disc',
    },
    'ul,ol': {
      marginLeft: 0,
    },
    [MOBILE_MEDIA_QUERY]: {
      'ul,ol': {
        marginLeft: rhythm(1),
      },
      blockquote: {
        marginLeft: rhythm(-3 / 4),
        marginRight: 0,
        paddingLeft: rhythm(9 / 16),
      },
    },
    'h1,h2,h3,h4,h5,h6': {
      marginTop: rhythm(2),
    },
    h4: {
      letterSpacing: '0.140625em',
      textTransform: 'uppercase',
    },
    h6: {
      fontStyle: 'italic',
    },
    a: {
      boxShadow: '0 1px 0 0 currentColor',
      color: '#007acc',
      textDecoration: 'none',
    },
    'a:hover,a:active': {
      boxShadow: 'none',
    },
    'mark,ins': {
      background: '#007acc',
      color: 'white',
      padding: `${rhythm(1 / 16)} ${rhythm(1 / 8)}`,
      textDecoration: 'none',
    },
  }),
}
*/
// Wordpress2016.overrideThemeStyles = () => ({
//   'a.gatsby-resp-image-link': {
//     boxShadow: 'none',
//   },
// })

//delete Wordpress2016.googleFonts

//let typography = new Typography(Wordpress2016)

const typography = new Typography({
  baseFontSize: '24px',
  baseLineHeight: 1.45,
  googleFonts: [
    {
      name: 'Varela Round',
      styles: ['400', '400i', '700', '700i', '900', '900i'],
    },
    {
      name: 'Kalam',
      styles: ['300', '400'],
    },
  ],
  headerFontFamily: [
    'Avenir Next',
    'Helvetica Neue',
    'Segoe UI',
    'Helvetica',
    'Arial',
    'sans-serif',
  ],
  bodyFontFamily: ['Varela Round', 'Georgia', 'serif'],
  bodyColor: 'hsla(0,0%,0%,0.9)',
  headerWeight: 900,
  bodyWeight: 100,
  overrideStyles: ({ adjustFontSizeTo, scale, rhythm }, options) => ({
    'ul,ol,li': {
      margin: 0,
      listStyle: 'none',
    },
    a: {
      color: '#444',
      textDecoration: 'none',
    },
    'a:not(.clean):not(.anchor):not(.gatsby-resp-image-link)': {
      boxShadow: '0 1px 0 0 currentColor',
    },
    'a:not(.clean):not(.anchor):hover:not(.gatsby-resp-image-link),a:not(.clean):not(.anchor):not(.gatsby-resp-image-link):active': {
      boxShadow: '0 1px 0 0 currentColor',
      color: Color('rgb(2, 136, 209)').string(),
    },
    'a.underline:hover,a.underline:active': {
      boxShadow: '0 1px 0 0 currentColor',
      color: Color('rgb(2, 136, 209)').string(),
    },
  }),
})

//typography = new Typography(bootstrapTheme)

// Hot reload typography in development.
if (process.env.NODE_ENV !== 'production') {
  typography.injectStyles()
}

export default typography
export const rhythm = typography.rhythm
export const scale = typography.scale
