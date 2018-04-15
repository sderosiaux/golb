import React from 'react'
import 'css/markdown-styles.css'
import Helmet from 'react-helmet'
import { config } from 'config'
import ReadTime from 'components/ReadTime'
import format from 'date-fns/format'
import parse from 'date-fns/parse'
import ShareButtons from 'components/ShareButtons'
import { Flex, Box } from 'reflexbox'
import ReadNext from 'components/ReadNext'
import ReactDisqusThread from 'components/DisqusThread'
import Subscribe from 'components/Subscribe'
import NProgress from 'components/NProgress'

module.exports = React.createClass({
  propTypes() {
    return {
      router: React.PropTypes.object,
    }
  },
  render() {
    const { route } = this.props
    const post = route.page.data
    const { title, description, tags } = post;

    const fullUrl = `https://www.ctheu.com${post.path}`

    return (
      <div className="markdown">
        <Helmet
          title={`${config.siteTitle} | ${post.title}`}
          meta={[
            { name: "description", content: description || title },
            { name: "twitter:card", value: "summary" },
            { name: "twitter:creator", content: "@ChtefiD" },
            { name: "twitter:site", content: "@ChtefiD" },
            { name: "twitter:title", content: title },
            { name: "twitter:description", content: description || title },
            { name: "twitter:image", content: "/m.jpg" },
            { property: "og:title", content: title },
            { property: "og:type", content: "article" },
            { property: "og:url", content: fullUrl },
            { property: "og:description", content: description || title },
            { property: "og:image", content: "/m.jpg" }
          ]}
        />
        <h1>{post.title}</h1>
        <NProgress />
        {post.tags && <ul className="tags">{post.tags.split(',').map(t => <li>{t}</li>)}</ul>}
        <div style={{ color: '#aaa', fontSize: 'small', marginBottom: 20 }}>
          <Flex>
            <Box>{format(post.date, 'MMM Do, YYYY')}</Box>
            <Box>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="clock"></span>&nbsp;</Box>
            <Box><ReadTime text={post.body} /></Box>
            <Box flexAuto={true}></Box>
            <Box><ShareButtons url={fullUrl} title={title} /></Box>
          </Flex>
        </div>
        <div dangerouslySetInnerHTML={{ __html: post.body }} />
        <ShareButtons url={fullUrl} title={title} />
        <ReadNext post={post} pages={route.pages} />
        <div style={{ height: 20 }} />
        <Subscribe />
        <div style={{ height: 20 }} />
        <ReactDisqusThread url={fullUrl} shortname="ctheu" title={title} />
      </div>
    )
  },
})
