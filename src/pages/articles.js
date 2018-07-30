import React from 'react'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'
import Helmet from 'react-helmet'
import Layout from '../components/Layout'
import Article from '../components/Article'
import NewsletterSubscription from '../components/NewsletterSubscription'

export default class extends React.Component {
  render() {
    const siteTitle = get(this, 'props.data.site.siteMetadata.title')
    const articles = get(this, 'props.data.allMarkdownRemark.edges')
    const cover = get(this, 'props.data.cover')

    return (
      <Layout
        location={this.props.location}
        title="Articles"
        description="Checkout all my articles about Scala, Kafka, ReactJS etc."
      >
        <Helmet title={siteTitle + ' | Articles'} />
        <NewsletterSubscription />
        {articles.map(({ node }) => (
          <Article
            key={node.frontmatter.path}
            {...node.frontmatter}
            {...node}
          />
        ))}
        <NewsletterSubscription />
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

    cover: file(relativePath: { eq: "DSC00806.jpg" }) {
      childImageSharp {
        fluid(
          maxHeight: 220
          maxWidth: 1000
          cropFocus: CENTER
          quality: 90
          duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 80 }
        ) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`
