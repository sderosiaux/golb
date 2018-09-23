import React from 'react'
import Helmet from 'react-helmet'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'

import Bio from '../components/Bio'
import Tags from '../components/Tags'
import Layout from '../components/Layout'
import ShareButtons from '../components/ShareButtons'
import NewsletterSubscription from '../components/NewsletterSubscription'
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

    const disqusShortname = 'ctheu'
    const disqusConfig = {
      url: fullUrl.replace('/articles', ''),
      title: title,
    }

    const feelFree = <FeelFreeToShare path={fullUrl} title={title} />

    return (
      <Layout
        location={this.props.location}
        cover={background}
        description={description}
        title={title}
      >
        <Helmet title={`${siteTitle} | ${title}`} />

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

        <NewsletterSubscription />

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
        {/* <DiscussionEmbed shortname={disqusShortname} config={disqusConfig} /> */}
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
              maxWidth: 800
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
