import React from 'react'
import Layout from '../components/Layout'
import Bio from '../components/Bio'
import Article from '../components/Article'
import groupBy from 'lodash/groupBy'
import { Helmet } from 'react-helmet'
import { graphql } from 'gatsby'
import { css } from 'react-emotion'
import Color from 'color'
import { Centered, ColorfulCentered } from '../components/Centered'

const Category = ({ cat }) => {
  return (
    <ColorfulCentered>
      <h3 style={{ marginBottom: 0 }}>{'# About ' + cat}</h3>
    </ColorfulCentered>
  )
}

const ulClassName = css`
  > li {
    list-style-type: disc;
    margin-bottom: 20px;
  }
`

export default ({ location, data }) => {
  const [site, cover, ...articles] = Object.values(data)
  const siteTitle = site.siteMetadata.title

  const groups = groupBy(articles, a => a.frontmatter.category)

  return (
    <Layout location={location} fullWidth={true} cover={cover}>
      <Helmet title={siteTitle + ' | Home'} />

      <div style={{ marginTop: 20 }}>
        <Centered>
          <h1>Hi!</h1>
          <h2>Where to go?</h2>
          <ul className={ulClassName}>
            <li>
              You're looking to read some articles about{' '}
              <a href="/tags/scala">Scala</a>, <a href="/tags/java">Java</a>,{' '}
              <a href="/tags/kafka">Kafka</a>,{' '}
              <a href="/tags/reactjs">ReactJS</a> and more? Check below for a
              selection, or just go to <a href="/articles">Articles</a> to list
              everything.
            </li>
            <li>
              Stalker? Feel free to read <a href="/about-me">About Me</a>!
            </li>
            <li>
              If you think we fit and would like we work together, I would be
              honored. <a href="/work-with-me">Work With Me</a>
            </li>
          </ul>
        </Centered>
        <br />
        <Centered>
          <h2>Take a look!</h2>
          <p>
            ↓ Below is a small selection of the most read articles, grouped by
            theme. ↓
          </p>
        </Centered>
        <ul>
          {Object.keys(groups).map(key => {
            const articles = groups[key]

            return [
              <Category key={'cat' + key} cat={key} />,
              <Centered key={'cen' + key}>
                <ul>
                  {articles.map(node => (
                    <li
                      key={node.id}
                      className={css`
                        margin-bottom: 20px;
                      `}
                    >
                      <Article {...node.frontmatter} />
                    </li>
                  ))}
                </ul>
              </Centered>,
            ]
          })}
        </ul>
        <Centered>
          <Bio />
        </Centered>
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

    back1: markdownRemark(id: { eq: "728cf2d0-36b1-5923-9be8-eb9446735c91" }) {
      ...ArticleFrontmatter
    }
    back2: markdownRemark(id: { eq: "734c8aaa-b533-5499-bdbe-8e1eeb1c56c9" }) {
      ...ArticleFrontmatter
    }
    data1: markdownRemark(id: { eq: "17398135-4de2-57e7-8ddf-ba65d97e6bd8" }) {
      ...ArticleFrontmatter
    }
    data2: markdownRemark(id: { eq: "78d9bfb9-de32-5919-99ab-7894d42dd4bd" }) {
      ...ArticleFrontmatter
    }
    back3: markdownRemark(id: { eq: "0601275c-ebb9-5790-9f7c-cc5e1df0ea83" }) {
      ...ArticleFrontmatter
    }
    back4: markdownRemark(id: { eq: "b1486cf5-616b-5432-a666-327de067b6b5" }) {
      ...ArticleFrontmatter
    }
    frnt1: markdownRemark(id: { eq: "0a8bb89a-e611-50ed-b84d-f492aee9d265" }) {
      ...ArticleFrontmatter
    }
  }
`
