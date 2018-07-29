import React from 'react'
import { graphql } from 'gatsby'

export default () => <div />

export const blockImageFragment = graphql`
  fragment BlockImage on File {
    childImageSharp {
      fixed(
        width: 540
        height: 200
        cropFocus: CENTER
        quality: 50
        duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 60 }
      ) {
        ...GatsbyImageSharpFixed
      }
    }
  }

  fragment BlockImageBottom on File {
    childImageSharp {
      fixed(
        width: 540
        height: 200
        cropFocus: SOUTH
        quality: 50
        duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 60 }
      ) {
        ...GatsbyImageSharpFixed
      }
    }
  }

`
