import React from 'react'
import { Link, graphql, StaticQuery } from 'gatsby'
import { SocialIcon } from 'react-social-icons'
import Helmet from 'react-helmet'
import { css } from 'react-emotion'
import Color from 'color'
import CTA from '../components/CTA'
import Rights from '../components/Rights'

import { rhythm, scale } from '../utils/typography'
import Img from 'gatsby-image'
import { blockImageFragment } from '../pages/about-me/About'

const color = Color('rgb(2, 136, 209)')
const light = color.string()
const dark = color.darken(0.2).string()

require('./Layout.module.css')

function schemaOrgJSONLD(
  author,
  siteUrl,
  siteTitle,
  siteDescription,
  fullUrl,
  date,
  title,
  bg
) {
  const res = [
    {
      '@context': 'http://schema.org',
      '@type': 'Person',
      name: author,
      url: siteUrl,
      sameAs: [
        'http://instagram.com/sderosiaux',
        'http://www.linkedin.com/in/stephane.derosiaux',
      ],
    },
    {
      '@context': 'http://schema.org',
      '@type': 'Blog',
      name: siteTitle,
      url: siteUrl,
      description: siteDescription,
      publisher: author,
    },
    {
      '@context': 'http://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          item: {
            '@id': fullUrl,
            name: title,
            image: bg,
          },
        },
      ],
    },
  ]

  if (date) {
    res.push({
      '@context': 'http://schema.org',
      '@type': 'BlogPosting',
      url: siteUrl,
      headline: title,
      image: {
        '@type': 'ImageObject',
        url: bg,
      },
      description,
      author,
      publisher: author,
      datePublished: date,
      publisher: author,
    })
  }

  return res
}

export default class extends React.Component {
  render() {
    const {
      location,
      children,
      fullWidth,
      cover,
      description,
      title,
      date,
    } = this.props

    return (
      <StaticQuery
        query={graphql`
          query {
            site {
              siteMetadata {
                title
                author
                description
                siteUrl
              }
            }
          }
        `}
        render={data => {
          const metadata = data.site.siteMetadata
          const siteUrl = metadata.siteUrl
          const author = metadata.author
          const siteDescription = metadata.description
          const siteTitle = metadata.title

          const bg = cover ? siteUrl + cover.childImageSharp.fluid.src : ''
          const fullUrl = siteUrl + location.pathname
          const jsonld = schemaOrgJSONLD(
            author,
            siteUrl,
            siteTitle,
            siteDescription,
            fullUrl,
            date,
            title,
            bg
          )

          return (
            <div>
              <Helmet
                meta={[
                  { name: 'description', content: description || title },
                  { name: 'image', content: bg },
                  { name: 'twitter:card', value: 'summary' },
                  { name: 'twitter:creator', content: '@sderosiaux' },
                  { name: 'twitter:site', content: '@sderosiaux' },
                  { name: 'twitter:title', content: title },
                  {
                    name: 'twitter:description',
                    content: description || title,
                  },
                  { name: 'twitter:image', content: bg },
                  { property: 'og:title', content: title },
                  { property: 'og:type', content: 'article' },
                  { property: 'og:url', content: fullUrl },
                  { property: 'og:description', content: description || title },
                  { property: 'og:image', content: bg },
                ]}
              />
              <Helmet>
                <script type="application/ld+json">
                  {JSON.stringify(jsonld)}
                </script>
                <script async src="https://cdn.splitbee.io/sb.js"></script>
                <meta
                  httpEquiv="Content-Type"
                  content="text/html; charset=UTF-8"
                />
                <meta httpEquiv="Content-Language" content="en" />
                <meta name="robots" content="index,follow" />
                <meta name="application-name" content="sderosiaux.com" />
                <meta
                  name="keywords"
                  content="java, scala, hadoop, spark, hbase, flume, kafka, javascript, reactjs, data-engineer"
                />
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
        }}
      />
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

      @media (max-width: 2000px) {
        ul.directory li {
          padding: 20px 20px;
        }
      }
      @media (max-width: 1205px) {
        .myname {
          font-size: 24px;
        }
        li {
          padding: 5px 5px !important;
          font-size: 18px;
          text-transform: none !important;
        }

        .social {
          display: none;
        }
        .bar {
          height: 10px;
        }
      }
      @media (max-width: 600px) {
        .sep {
          display: none;
        }
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
        className={
          'sep ' +
          css`
            flex: 1;
          `
        }
      />

      <ul
        className={
          'directory ' +
          css`
            li {
              display: inline-block;
              text-transform: uppercase;
              padding: 30px 30px;
            }
            li.active {
              background: ${light};
            }
            li.active > a {
              color: white;
            }
          `
        }
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
        height: 114px; // top bar
        @media (max-width: 2000px) {
          height: 94px;
        }
        @media (max-width: 1205px) {
          height: 30px;
        }
      `
    }
  />,
]
