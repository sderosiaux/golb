import React from 'react'
import Helmet from 'react-helmet'

import { prefixLink } from 'gatsby-helpers'
import { TypographyStyle, GoogleFont } from 'react-typography'
import typography from './utils/typography'

const BUILD_TIME = new Date().getTime()

module.exports = React.createClass({
  propTypes () {
    return {
      body: React.PropTypes.string,
    }
  },
  render () {
    const head = Helmet.rewind()

    let css
    if (process.env.NODE_ENV === 'production') {
      css = <style dangerouslySetInnerHTML={{ __html: require('!raw!./public/styles.css') }} />
    }

    return (
      <html lang="en">
        <head>
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="preconnect" href="//fonts.googleapis.com" />  
          <meta charSet="utf-8" />
          <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta httpEquiv="Content-Language" content="en" />
          <meta name="robots" content="index,follow" />
          <meta name="application-name" content="ctheu" />
          <meta name="description" content="A technical blog talking about Javascript, Java, Scala, Hadoop, and much more" />
          <meta name="keywords" content="javascript, reactjs, java, scala, hadoop, spark, hbase, flume, webpack, gulp, nodejs" />
          <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=yes, minimal-ui" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
          <link rel="icon" sizes="32x32" href="m32.jpg" />
          <link rel="icon" sizes="192x192"  href="m192.jpg" />
          <link rel="apple-touch-icon-precomposed" href="m.jpg" />
          <meta name="msapplication-TileImage" content="m.jpg" />
          <link rel="sitemap" type="application/xml" title="Sitemap" href="sitemap.xml" />
          {head.title.toComponent()}
          {head.meta.toComponent()}
          <TypographyStyle typography={typography} />
          <GoogleFont typography={typography} />
          {css}
        </head>
        <body>
          <div id="react-mount" dangerouslySetInnerHTML={{ __html: this.props.body }} />
          <script src={prefixLink(`/bundle.js?t=${BUILD_TIME}`)} />
        </body>
      </html>
    )
  },
})
