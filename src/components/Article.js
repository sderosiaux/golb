import React from 'react'
import { css } from 'react-emotion'
import { rhythm } from '../utils/typography'
import { graphql, Link } from 'gatsby'
import Tags from './Tags'

export default ({
  title,
  path,
  background,
  date,
  description,
  tags,
  timeToRead,
}) => (
  <div
    key={path}
    className={css`
      margin-bottom: 80px;
    `}
  >
    <div
      className={css`
        width: 200px;
        height: 100%;
        background-position: 0 0;
        background-repeat: no-repeat;
        background-size: contain;
        background-image: url(${background});
      `}
    />

    <h3 style={{ marginBottom: 10 }}>
      <Link className="clean underline" to={path}>
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
              background: rgb(2, 136, 209);
              color: #eee;
            }
          `
        }
      >
        I want to read more
      </Link>
    </div>
  </div>
)

export const articleFragment = graphql`
  fragment ArticleFrontmatter on MarkdownRemark {
    id
    frontmatter {
      title
      date(formatString: "MMMM DD, YYYY")
      tags
      path
      description
      background {
        id
        absolutePath
      }
    }
    timeToRead
    excerpt
    fields {
      slug
    }
  }
`
