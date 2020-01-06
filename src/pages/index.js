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
    <Layout
      location={location}
      fullWidth={true}
      cover={cover}
      title="Personal website of S. Derosiaux"
      description="I talk mostly about Scala and Data Engineering!"
    >
      <Helmet title={siteTitle + ' | Home'} />

      <div style={{ marginTop: 20 }}>
        <Centered>
          <h1>Hi!</h1>
          <Bio />
          <br />
          <h2>Where to go?</h2>
          <ul className={ulClassName}>
            <li>
              You're looking to read some articles about{' '}
              <a href="/tags/kafka">Kafka</a>, <a href="/tags/scala">Scala</a>,{' '}
              <a href="/tags/java">Java</a>, <a href="/tags/reactjs">ReactJS</a>{' '}
              and more? Check below for a selection, or just go to{' '}
              <a href="/articles" className="yellow">
                Articles
              </a>{' '}
              to list everything.
            </li>
            <li>
              Stalker? Feel free to read{' '}
              <a href="/about-me" className="yellow">
                About Me
              </a>
              !
            </li>
            <li>
              If you think we fit and would like we work together, I would be
              honored.{' '}
              <a href="/work-with-me" className="yellow">
                Work With Me
              </a>
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
    cover: file(relativePath: { eq: "DSC_9238.jpg" }) {
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

    data1: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2020/01/06/learnings-from-using-kafka-connect-debezium-postgresql/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }

    data2: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2019/08/29/cqrs-why-and-all-the-things-to-consider/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }
    data3: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2019/08/07/kafka-streams-topology-and-optimizations/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }
    data4: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2017/08/07/looking-at-kafka-s-consumers-offsets/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }

    back1: markdownRemark(
      frontmatter: {
        path: { eq: "/articles/2018/08/15/types-never-commit-too-early-part1/" }
      }
    ) {
      ...ArticleFrontmatter
    }

    back2: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2018/06/15/a-simple-way-to-write-parsers-using-the-state-monad/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }

    back3: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2016/01/10/java-cli-gc-memory-and-tools-overview/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }
    back4: markdownRemark(
      frontmatter: {
        path: { eq: "/articles/2017/02/14/all-the-things-we-can-do-with-jmx/" }
      }
    ) {
      ...ArticleFrontmatter
    }
    frnt1: markdownRemark(
      frontmatter: {
        path: {
          eq: "/articles/2015/02/12/how-to-communicate-between-react-components/"
        }
      }
    ) {
      ...ArticleFrontmatter
    }
  }
`
