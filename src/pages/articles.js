import React from 'react'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'
import Helmet from 'react-helmet'
import Layout from '../components/Layout'
import Article from '../components/Article'

export default class extends React.Component {
  render() {
    const siteTitle = get(this, 'props.data.site.siteMetadata.title')
    const articles = get(this, 'props.data.allMarkdownRemark.edges')

    return (
      <Layout location={this.props.location}>
        <Helmet title={siteTitle + ' | Articles'} />
        {articles.map(({ node }) => (
          <Article
            key={node.frontmatter.path}
            {...node.frontmatter}
            {...node}
          />
        ))}
      </Layout>
    )
  }
}

export const pageQuery = graphql`
  query IndexQuery {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { frontmatter: { is_blog: { eq: true } } }
    ) {
      edges {
        node {
          ...ArticleFrontmatter
        }
      }
    }
  }
`
