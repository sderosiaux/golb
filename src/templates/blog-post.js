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

require('prismjs/themes/prism.css')
require('./blog-post.css')

export default class extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteTitle = get(this.props, 'data.site.siteMetadata.title')
    const siteUrl = get(this.props, 'data.site.siteMetadata.siteUrl')
    const { previous, next } = this.props.pageContext

    return (
      <Layout location={this.props.location}>
        <Helmet title={`${siteTitle} | ${post.frontmatter.title}`} />

        <h1>{post.frontmatter.title}</h1>
        <p
          style={{
            ...scale(-1 / 5),
            display: 'block',
            marginBottom: rhythm(1),
            marginTop: rhythm(-1),
          }}
        >
          {post.frontmatter.date}
        </p>
        <p>
          <Tags tags={post.frontmatter.tags} />
        </p>
        <ShareButtons
          url={siteUrl + this.props.location.pathname}
          title={post.frontmatter.title}
        />
        <div dangerouslySetInnerHTML={{ __html: post.html }} />
        <hr
          style={{
            marginBottom: rhythm(1),
          }}
        />
        <Bio />

        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            listStyle: 'none',
            padding: 0,
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
        date(formatString: "MMMM DD, YYYY")
        tags
        background {
          relativePath
        }
      }
    }
  }
`
