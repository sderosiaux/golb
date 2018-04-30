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

    const fullUrl = `https://www.sderosiaux.com${post.path}`

    return (
      <div className="markdown">
        <Helmet
          title={`${config.siteTitle} | ${post.title}`}
          meta={[
            { name: "description", content: description || title },
            { name: "twitter:card", value: "summary" },
            { name: "twitter:creator", content: "@sderosiaux" },
            { name: "twitter:site", content: "@sderosiaux" },
            { name: "twitter:title", content: title },
            { name: "twitter:description", content: description || title },
            { name: "twitter:image", content: fullUrl + post.background },
            { property: "og:title", content: title },
            { property: "og:type", content: "article" },
            { property: "og:url", content: fullUrl },
            { property: "og:description", content: description || title },
            { property: "og:image", content: fullUrl + post.background }
          ]}
        />
        {post.background && <div className="article-image" style={{ backgroundImage: 'url(' + post.background + ')' }}></div>}
        <div className="content">
          <h1>{post.title}</h1>
          <NProgress />
          <div style={{ color: '#aaa', fontSize: 'small', marginBottom: 20 }}>
            <Flex>
              <Box><span className="subtitle">{format(post.date, 'DD MMM YYYY')} — <ReadTime text={post.body} /></span></Box>
              <Box flexAuto={true}></Box>
              <Box><ShareButtons url={fullUrl} title={title} /></Box>
            </Flex>
            {post.tags && <div className="tags">➡️ {post.tags.split(',').map(t => <span>{t}</span>)}</div>}
          </div>
          <hr />
          <div dangerouslySetInnerHTML={{ __html: post.body }} />
          <ShareButtons url={fullUrl} title={title} />
          <ReadNext post={post} pages={route.pages} />
          <div style={{ height: 20 }} />
          <Subscribe />
          <div style={{ height: 20 }} />
          <ReactDisqusThread url={fullUrl} shortname="ctheu" title={title} />
        </div>
      </div>
    )
  },
})
