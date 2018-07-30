import React from 'react'
import styles from './Toto.module.css'
import { css } from 'react-emotion'
import { StaticQuery, graphql } from 'gatsby'

export default () => (
  <StaticQuery
    query={graphql`
      query {
        site {
          siteMetadata {
            title
          }
        }
      }
    `}
    render={data => (
      <div className={styles.container}>
        Hello2
        {JSON.stringify(data, null, 2)}
        <div
          className={css`
            background-color: red;
            padding: 5px;
          `}
        >
          OUCH!
        </div>
      </div>
    )}
  />
)
