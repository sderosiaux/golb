import React from 'react'
import { css } from 'react-emotion'
import { rhythm } from '../utils/typography'
import { graphql, Link, StaticQuery } from 'gatsby'
import Tags from './Tags'
import Color from 'color'
import Img from 'gatsby-image'

const normal = 'rgb(2, 136, 209)'
const complementary = Color(normal)
  .lighten(0.1)
  .string() // 'rgb(209, 86, 2)'

const normalLight = Color(normal)
  .fade(0.7)
  .desaturate(0.2)
  .string() // 'rgb(209, 86, 2)'

export default ({
  title,
  path,
  background,
  date,
  description,
  tags,
  timeToRead,
  inverse = false,
}) => {
  return (
    <div
      key={path}
      className={css`
        display: flex;
        :not(:last-child) {
          padding-bottom: 20px;
          border-bottom: 1px solid ${normalLight};
        }
        :not(:first-child) {
          padding-top: 30px;
        }
      `}
    >
      <div
        className={css`
          width: 300px;
          height: 250px;
          border-radius: 4px;
          overflow: hidden;
          box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.15);
          @media (max-width: 800px) {
            display: none;
          }
        `}
      >
        {background && <Img fixed={background.childImageSharp.fixed} />}
      </div>

      <div
        className={css`
          margin-left: 20px;
          flex: 1;
        `}
      >
        <h3 style={{ marginBottom: 10 }}>
          <Link
            className={
              'clean underline ' +
              css`
        :hover, :active {
          color: ${inverse ? 'white' : normal} !important
      `
            }
            to={path}
          >
            {title}
          </Link>
        </h3>

        {/* <small>{date}</small> */}
        {/* <Tags tags={tags} /> */}

        <p
          className={css`
            margin-bottom: 10px;
          `}
        >
          {description}
        </p>

        <div
          className={css`
            text-align: right;
          `}
        >
          <Link
            to={path}
            className={
              'clean ' +
              css`
                cursor: pointer;
                padding: 5px 10px;
                color: #555;
                border: 1px solid #999;
                border-radius: 4px;
                transition: 0.2s all;
                font-size: 18px;
                :hover {
                  background: ${inverse ? complementary : normal};
                  color: #eee;
                }
              `
            }
          >
            → I want to read more
          </Link>
        </div>
      </div>
    </div>
  )
}

export const articleFragment = graphql`
  fragment ArticleFrontmatter on MarkdownRemark {
    id
    frontmatter {
      title
      date(formatString: "MMMM DD, YYYY")
      tags
      path
      description
      category
      background {
        childImageSharp {
          fixed(
            width: 300
            height: 250
            cropFocus: CENTER
            duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 20 }
          ) {
            ...GatsbyImageSharpFixed
          }
        }
      }
    }
    timeToRead
    excerpt
    fields {
      slug
    }
  }
`
