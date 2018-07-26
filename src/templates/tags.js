import React from 'react'
import PropTypes from 'prop-types'

// Components
import { Link, graphql } from 'gatsby'
import Layout from '../components/Layout'
import Article from '../components/Article'

export default ({ location, pageContext, data }) => {
  const { tag } = pageContext
  const { edges, totalCount } = data.allMarkdownRemark
  const tagHeader = `Articles about "${tag}"`

  return (
    <Layout location={location}>
      <h1>{tagHeader}</h1>
      <ul>
        {edges.map(({ node }) => {
          const { title } = node.frontmatter
          const { slug: path } = node.fields
          return (
            <Article
              key={node.frontmatter.path}
              {...node.frontmatter}
              {...node}
            />
          )
        })}
      </ul>
    </Layout>
  )
}

export const pageQuery = graphql`
  query($tag: String) {
    allMarkdownRemark(
      sort: { fields: [frontmatter___date], order: DESC }
      filter: { frontmatter: { tags: { in: [$tag] } } }
    ) {
      totalCount
      edges {
        node {
          ...ArticleFrontmatter
        }
      }
    }
  }
`
