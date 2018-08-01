import React from 'react'
import PropTypes from 'prop-types'

// Components
import { Link, graphql } from 'gatsby'
import Layout from '../components/Layout'
import Article from '../components/Article'

export default ({ location, pageContext, data }) => {
  const { tag } = pageContext
  const { edges, totalCount } = data.allMarkdownRemark
  const { defaultImage } = data
  const tagHeader = `Articles about "${tag}"`

  edges
    .filter(a => !a.node.frontmatter.background)
    .forEach(a => (a.node.frontmatter.background = defaultImage))

  return (
    <Layout
      location={location}
      title={tagHeader}
      description={`All my articles talking about ${tag}`}
    >
      <h1>{tagHeader}</h1>
      <ul>
        {edges.map(({ node }) => {
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

    defaultImage: file(relativePath: { eq: "DSC00806.jpg" }) {
      childImageSharp {
        fixed(
          width: 300
          height: 250
          cropFocus: CENTER
          duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 80 }
        ) {
          ...GatsbyImageSharpFixed
        }
      }
    }
  }
`
