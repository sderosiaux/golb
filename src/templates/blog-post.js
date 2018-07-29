import React from 'react'
import Helmet from 'react-helmet'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'
import { css } from 'react-emotion'

import Bio from '../components/Bio'
import Tags from '../components/Tags'
import Layout from '../components/Layout'
import ShareButtons from '../components/ShareButtons'
import { rhythm, scale } from '../utils/typography'
import { DiscussionEmbed } from 'disqus-react'

require('prismjs/themes/prism.css')
require('./blog-post.css')

const FeelFreeToShare = ({ path, title }) => (
  <div style={{ display: 'flex', marginBottom: '1.5em' }}>
    Feel free to share this article:&nbsp;
    <ShareButtons url={path} title={title} />
  </div>
)

export default class extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteTitle = get(this.props, 'data.site.siteMetadata.title')
    const siteUrl = get(this.props, 'data.site.siteMetadata.siteUrl')
    const author = get(this.props, 'data.site.siteMetadata.author')
    const { previous, next } = this.props.pageContext
    const background = post.frontmatter.background
    const description = post.frontmatter.description
    const title = post.frontmatter.title
    const fullUrl = siteUrl + this.props.location.pathname
    const cover = background
      ? siteUrl + background.childImageSharp.fluid.src
      : ''

    const disqusShortname = 'ctheu'
    const disqusConfig = {
      url: fullUrl.replace('/articles', ''),
      title: title,
    }

    const feelFree = <FeelFreeToShare path={fullUrl} title={title} />

    const schemaOrgJSONLD = [
      {
        '@context': 'http://schema.org',
        '@type': 'WebSite',
        url: siteUrl,
        name: title,
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
              cover,
            },
          },
        ],
      },
      {
        '@context': 'http://schema.org',
        '@type': 'BlogPosting',
        url: siteUrl,
        name: title,
        headline: title,
        image: {
          '@type': 'ImageObject',
          url: cover,
        },
        description,
        author,
        datePublished: post.frontmatter.date,
        publisher: author,
      },
    ]

    return (
      <Layout location={this.props.location} cover={background}>
        <Helmet
          title={`${siteTitle} | ${title}`}
          meta={[
            { name: 'description', content: description || title },
            { name: 'image', content: cover },
            { name: 'twitter:card', value: 'summary' },
            { name: 'twitter:creator', content: '@sderosiaux' },
            { name: 'twitter:site', content: '@sderosiaux' },
            { name: 'twitter:title', content: title },
            { name: 'twitter:description', content: description || title },
            { name: 'twitter:image', content: cover },
            { property: 'og:title', content: title },
            { property: 'og:type', content: 'article' },
            { property: 'og:url', content: fullUrl },
            { property: 'og:description', content: description || title },
            { property: 'og:image', content: cover },
          ]}
        >
          <script type="application/ld+json">
            {JSON.stringify(schemaOrgJSONLD)}
          </script>
        </Helmet>
        <h1 style={{ marginBottom: 5 }}>{post.frontmatter.title}</h1>

        <p style={{ marginBottom: 0, ...scale(-1 / 5) }}>
          {post.frontmatter.date}
        </p>
        <Tags tags={post.frontmatter.tags} />
        <br />

        <hr />

        <article dangerouslySetInnerHTML={{ __html: post.html }} />

        <hr />
        {feelFree}
        <hr />

        <Bio />
        <br />
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            listStyle: 'none',
          }}
        >
          {previous && (
            <li>
              <Link to={previous.frontmatter.path} rel="prev">
                ← {previous.frontmatter.title}
              </Link>
            </li>
          )}

          {next && (
            <li>
              <Link to={next.frontmatter.path} rel="next">
                {next.frontmatter.title} →
              </Link>
            </li>
          )}
        </ul>
        <br />
        <DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />
      </Layout>
    )
  }
}

export const pageQuery = graphql`
  query($slug: String!) {
    site {
      siteMetadata {
        title
        author
        siteUrl
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      frontmatter {
        title
        description
        date(formatString: "MMMM DD, YYYY")
        tags
        path
        background {
          childImageSharp {
            fluid(
              maxHeight: 200
              cropFocus: CENTER
              duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 80 }
            ) {
              ...GatsbyImageSharpFluid
            }
          }
        }
      }
    }
  }
`
