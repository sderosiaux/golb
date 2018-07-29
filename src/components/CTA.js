import React from 'react'
import { css } from 'react-emotion'
import { Link } from 'gatsby'
import Color from 'color'
import { graphql, StaticQuery } from 'gatsby'
import Img from 'gatsby-image'

const c = Color('rgb(2, 136, 209)')
const hover = c.lighten(0.1).string()

export default () => (
  <StaticQuery
    query={graphql`
      query {
        cover: file(relativePath: { eq: "DSC01725-2.jpg" }) {
          childImageSharp {
            fluid(quality: 90, maxWidth: 1000) {
              ...GatsbyImageSharpFluid
            }
          }
        }
      }
    `}
    render={data => (
      <div
        className={css`
          height: 1200px;
          background: url(${data.cover.childImageSharp.fluid.src}) 100% 50%;
          background-size: cover;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 42px;
          > div {
            text-align: center;
          }
        `}
      >
        <div>
          Ready to work with me?
          <br />
          <br />
          <Link
            className={
              'clean ' +
              css`
                cursor: pointer;
                background: rgb(2, 136, 209);
                color: white;
                padding: 20px 50px;
                border: 2px solid transparent;
                border-radius: 5px;
                transition: 0.2s all;
                :hover {
                  background: ${hover};
                }
              `
            }
            to="/work-with-me"
          >
            Tell me everything!
          </Link>
        </div>
      </div>
    )}
  />
)
