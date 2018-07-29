import React from 'react'
import { Link } from 'gatsby'
import { SocialIcon } from 'react-social-icons'
import Helmet from 'react-helmet'
import { css } from 'react-emotion'
import Color from 'color'
import CTA from '../components/CTA'
import Rights from '../components/Rights'

import { rhythm, scale } from '../utils/typography'
import Img from 'gatsby-image'

const color = Color('rgb(2, 136, 209)')
const light = color.string()
const dark = color.darken(0.2).string()

require('./Layout.module.css')

export default class extends React.Component {
  render() {
    const { location, children, fullWidth, cover } = this.props

    return (
      <div>
        <Helmet>
          <link rel="dns-prefetch" href="//fonts.googleapis.com" />
          <link rel="preconnect" href="//fonts.googleapis.com" />
          <meta charSet="utf-8" />
          <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
          <meta httpEquiv="Content-Language" content="en" />
          <meta name="robots" content="index,follow" />
          <meta name="application-name" content="sderosiaux.com" />
          <meta
            name="description"
            content="Personal website of S. Derosiaux, talking about Scala and Data Engineering"
          />
          <meta
            name="keywords"
            content="java, scala, hadoop, spark, hbase, flume, kafka, javascript, reactjs, data-engineer"
          />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, user-scalable=yes, minimal-ui"
          />
          <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1" />
          <link rel="icon" sizes="32x32" href="/favicon.ico" />
          <link rel="icon" sizes="192x192" href="/favicon.ico" />
          <link rel="apple-touch-icon-precomposed" href="/favicon.ico" />
          <meta name="msapplication-TileImage" content="/favicon.ico" />
        </Helmet>

        <Header location={location} />

        {cover && (
          <Img
            fluid={cover.childImageSharp.fluid}
            style={{
              boxShadow: '0 5px 10px rgba(0, 0, 0, .2)',
            }}
          />
        )}

        {fullWidth ? (
          <div>{children}</div>
        ) : (
          <div
            className={css`
              margin-left: auto;
              margin-right: auto;
              max-width: 1200px;
              padding: 40px;
              min-height: 100vh;
            `}
          >
            {children}
          </div>
        )}
        <CTA />
        <Rights />
      </div>
    )
  }
}

const Header = ({ location }) => [
  <header
    key="header"
    className={css`
      position: fixed;
      width: 100%;
      background: white;
      z-index: 99999; // to avoid tweet going on top

      @media (max-width: 1205px) {
        .myname {
          font-size: 24px;
        }
        li {
          padding: 5px 10px !important;
          font-size: 18px;
          text-transform: none !important;
        }import { Helmet } from 'react-helmet';

        .social {
          display: none;
        }
        .bar {
          height: 10px;
        }
        + .spacebar {
          height: 30px;
        }
      }
      @media (max-width: 600px) {
        .myname {
          display: none;
        }
        .bar {
          height: 5px;
        }
      }
    `}
  >
    <div
      className={css`
        display: flex;
        align-items: center;
      `}
    >
      <Link
        className={
          'myname clean ' +
          css`
            margin-left: 40px;
            font-family: 'Kalam';
            font-weight: 400;
            font-size: 32px;
            :hover {
              color: #888;
            }
          `
        }
        to={'/'}
      >
        S.&nbsp;Derosiaux
      </Link>

      <div
        className={css`
          flex: 1;
        `}
      />

      <ul
        className={css`
          li {
            display: inline-block;
            text-transform: uppercase;
            padding: 40px 30px;
          }
          li.active {
            background: ${light};
          }
          li.active > a {
            color: white;
          }
        `}
      >
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link className="clean underline" to="/">
            Home
          </Link>
        </li>
        <li className={location.pathname === '/articles' ? 'active' : ''}>
          <Link className="clean underline" to="/articles">
            Articles
          </Link>
        </li>
        <li className={location.pathname === '/about-me' ? 'active' : ''}>
          <Link className="clean underline" to="/about-me">
            About Me
          </Link>
        </li>
        <li className={location.pathname === '/work-with-me' ? 'active' : ''}>
          <Link className="clean underline" to="/work-with-me">
            Work with me
          </Link>
        </li>
      </ul>

      <ul
        className={
          'social ' +
          css`
            margin: 0 20px;
            li {
              display: inline-block;
              margin-right: 5px;
            }
          `
        }
      >
        <li>
          <SocialIcon
            className="clean"
            url="https://twitter.com/sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://medium.com/@sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://github.com/sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://www.linkedin.com/in/st%C3%A9phane-derosiaux-525404106"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://www.sderosiaux.com/rss.xml"
            network="rss"
            style={{ height: 32, width: 32 }}
          />
        </li>
      </ul>
    </div>

    <div
      className={
        'bar ' +
        css`
          height: 20px;
          background: linear-gradient(to bottom, ${light}, ${light}, ${light});
          box-shadow: 0 2px 1px 2px rgba(0, 0, 0, 0.1);
        `
      }
    />
  </header>,
  <div
    key="spacebar"
    className={
      'spacebar ' +
      css`
        height: 134px; // top bar
      `
    }
  />,
]
