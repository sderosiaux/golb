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
    return (
      <Layout location={this.props.location} fullWidth={fullWidth}>
        <Helmet title={`${siteTitle} | ${post.frontmatter.title}`} />
        <h1
          className={fullWidth ? 'marginAuto' : ''}
          style={fullWidth ? { paddingTop: 40 } : {}}
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
        {post.frontmatter.addBio && <Bio />}
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
        addBio
        fullWidth
        background {
          relativePath
        }
      }
    }
  }
`
