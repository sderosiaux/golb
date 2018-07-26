import React from 'react'
import Layout from '../components/Layout'
import Bio from '../components/Bio'
import Article from '../components/Article'
import { Helmet } from 'react-helmet'
import { graphql } from 'gatsby'

export default ({ location, data }) => {
  const [site, ...articles] = Object.values(data)
  const siteTitle = site.siteMetadata.title

  return (
    <Layout location={location}>
      <Helmet title={siteTitle + ' | Home'} />

      <div>
        Hi! Nice to meet you.
        <Bio />
        <ul>
          <img src="index.jpg" />
        </ul>
        <h3>Here are some of the most read articles:</h3>
        <ul>
          {articles.map(node => (
            <li>
              <Article {...node.frontmatter} />
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  )
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    a: markdownRemark(id: { eq: "728cf2d0-36b1-5923-9be8-eb9446735c91" }) {
      ...ArticleFrontmatter
    }
    b: markdownRemark(id: { eq: "734c8aaa-b533-5499-bdbe-8e1eeb1c56c9" }) {
      ...ArticleFrontmatter
    }
    c: markdownRemark(id: { eq: "17398135-4de2-57e7-8ddf-ba65d97e6bd8" }) {
      ...ArticleFrontmatter
    }
    d: markdownRemark(id: { eq: "78d9bfb9-de32-5919-99ab-7894d42dd4bd" }) {
      ...ArticleFrontmatter
    }
    e: markdownRemark(id: { eq: "0601275c-ebb9-5790-9f7c-cc5e1df0ea83" }) {
      ...ArticleFrontmatter
    }
    f: markdownRemark(id: { eq: "b1486cf5-616b-5432-a666-327de067b6b5" }) {
      ...ArticleFrontmatter
    }
    g: markdownRemark(id: { eq: "0a8bb89a-e611-50ed-b84d-f492aee9d265" }) {
      ...ArticleFrontmatter
    }
  }
`
