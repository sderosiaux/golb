import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Helmet from 'react-helmet'
import { config } from 'config'
import ReadTime from '../components/ReadTime'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import compareDesc from 'date-fns/compare_desc'
import { Flex, Box } from 'reflexbox'
import { SocialIcon } from 'react-social-icons'

import "css/index"

export default (props) => {

  const blogs = props.route.pages.filter(page => page.data.layout == 'post')
    .map(page => page.data)
    .sort((a, b) => compareDesc(a.date, b.date))

  return (
    <div>
      <Helmet
        title={config.siteTitle}
        link={[
          { "rel": "icon", "href": "/m.jpg" }
        ]}
      />
      <div className="my-presentation">
        <h2>Bonjour,</h2>
        <p>I'm Stéphane, a Senior Scala and Data Engineer from France, and previously Front-End Developer. Passionated about everything related to IT, I <a href="https://github.com/chtefi/every-single-day-i-tldr">read a lot</a> and try to provide you some feedback about what I learned. I hope you'll enjoy it.</p>
        <div>Feel free to come say Hi <SocialIcon url="https://twitter.com/ChtefiD" style={{ height: 32, width: 32, verticalAlign: 'text-top' }} /></div>
      </div>
      <div style={{
        boxShadow: 'rgba(0, 0, 0, 0.1) 0px 4px 120px',
        borderRadius: '1rem',
        padding: '10px 80px'
      }}>
        <div className="latest">Latest articles</div>
        <ul className="index">
          {blogs.map(blog => <li>
            <Link className="title" to={prefixLink(blog.path)}>{blog.title}</Link>
            <div>
              <span className="subtitle">{format(blog.date, 'DD MMM YYYY')} — <ReadTime text={blog.body} /></span>
              {blog.tags && <div className="tags">➡️ {blog.tags.split(',').map(t => <span>{t}</span>)}</div>}
            </div>
          </li>)}
        </ul>
      </div>
    </div>
  )
}
