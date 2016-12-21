import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Helmet from 'react-helmet'
import { config } from 'config'
import ReadTime from 'react-read-time'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import compareDesc from 'date-fns/compare_desc'
import { Flex, Box } from 'reflexbox'

export default (props) => {
  const blogs = props.route.pages.filter(page => page.data.layout == 'post')
                                     .map(page => page.data)
                                     .sort((a, b) => compareDesc(a.date, b.date))

  return (
    <div>
      <Helmet
        title={config.siteTitle}
        meta={[
          {"name": "description", "content": "My blog"},
          {"name": "keywords", "content": "java, scala"},
        ]}
        link={[
           {"rel": "shortcut icon", "type": "image/x-icon", "href": "m.jpg"}
        ]}
      />
      <ul>
        { blogs.map(blog => <li>
          <Link to={prefixLink(blog.path)}>{blog.title}</Link>
            <Flex>
              <Box>{format(blog.date, 'MMM Do, YYYY')}</Box>
              <Box>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="clock"></span>&nbsp;</Box>
              <Box><ReadTime content={blog.body} /></Box>
            </Flex>
          </li>) }
      </ul>
    </div>
  )
}
