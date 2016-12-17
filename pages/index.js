import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Helmet from 'react-helmet'
import { config } from 'config'

export default class Index extends React.Component {
  render () {
    return (
      <div>
        <Helmet
          title={config.siteTitle}
          meta={[
            {"name": "description", "content": "My blog"},
            {"name": "keywords", "content": "java, scala"},
          ]}
        />
        <ul>
          <li>
            <Link to={prefixLink('/2016/09/07/why-it-s-important-to-log-using-slf4j/')}>Why it's important to log using slf4j ?</Link>
          </li>
        </ul>
      </div>
    )
  }
}
