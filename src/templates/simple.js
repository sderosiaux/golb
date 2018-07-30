import React from 'react'
import Helmet from 'react-helmet'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'
import { css } from 'react-emotion'
import Bio from '../components/Bio'
import Layout from '../components/Layout'

import { rhythm, scale } from '../utils/typography'

require('./simple.css')

export default class extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteTitle = get(this.props, 'data.site.siteMetadata.title')
    const fullWidth = post.frontmatter.fullWidth
    const cover = post.frontmatter.background

    return (
      <Layout
        location={this.props.location}
        fullWidth={fullWidth}
        cover={cover}
        title={post.frontmatter.title}
        description={post.frontmatter.description}
      >
        <Helmet title={`${siteTitle} | ${post.frontmatter.title}`} />
        <h1
          className={fullWidth ? 'marginAuto' : ''}
          style={fullWidth ? { marginTop: 40 } : {}}
        >
          {post.frontmatter.title}
        </h1>
        <div
          dangerouslySetInnerHTML={{ __html: post.html }}
          className={css`
            > div:first-child {
              padding-top: 0;
            }
          `}
        />
      </Layout>
    )
  }
}

export const pageQuerySimple = graphql`
  query($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      frontmatter {
        title
        description
        fullWidth
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
