import React from 'react'
import Helmet from 'react-helmet'
import { graphql, Link } from 'gatsby'
import get from 'lodash/get'
import { css } from 'react-emotion'
import addToMailchimp from 'gatsby-plugin-mailchimp'

import Bio from '../components/Bio'
import Tags from '../components/Tags'
import Layout from '../components/Layout'
import ShareButtons from '../components/ShareButtons'
import { rhythm, scale } from '../utils/typography'
import { DiscussionEmbed } from 'disqus-react'

require('prismjs/themes/prism.css')
require('./blog-post.css')

const FeelFreeToShare = ({ path, title }) => (
  <div style={{ display: 'flex', marginBottom: '1.5em' }}>
    Feel free to share this article:&nbsp;
    <ShareButtons url={path} title={title} />
  </div>
)

class NewsletterSubscription extends React.Component {
  constructor() {
    super()
    this.state = {
      email: '',
      status: null,
      msg: null,
    }
  }
  _handleEmailChange = e => {
    this.setState({ email: e.target.value })
  }

  _handleFormSubmit = e => {
    e.preventDefault()
    e.stopPropagation()

    this.setState(
      { status: `sending`, msg: null },
      this._postEmailToMailchimp(this.state.email, {})
    )
  }

  _postEmailToMailchimp = (email, attributes) => {
    addToMailchimp(email, attributes)
      .then(payload => {
        if (payload.result !== `success`) {
          this.setState({
            status: `error`,
            msg: payload.msg,
          })
        } else {
          this.setState({
            status: `success`,
            msg: payload.msg,
          })
        }
      })
      .catch(err => {
        this.setState({
          status: `error`,
          msg: err,
        })
      })
  }

  render() {
    return this.state.status === `success` ? (
      <div className="custom-block-info">
        You just subscribed to my newsletter. Thank you my friend!
      </div>
    ) : (
      <div
        className={css`
          background-color: rgb(2, 136, 209);
          padding: 40px;
          color: #fafafa;
          margin-bottom: 40px;
          border-radius: 4px;
          text-align: center;
        `}
      >
        <form
          method="post"
          onSubmit={this._handleFormSubmit}
          style={{ marginBottom: 0 }}
        >
          <p>
            Join the club and receive an email when I post a new article! No
            spam ever, no worries.
          </p>
          <input
            type="email"
            required
            placeholder="you@email.com"
            onChange={this._handleEmailChange}
            className={css`
              width: 500px;
              padding: 10px;
              border-radius: 4px;
              border: 1px solid white;
              ::placeholder {
                color: rgb(2, 136, 209);
              }
            `}
          />
          <div style={{ textAlign: 'center' }}>
            <button
              type="submit"
              className={css`
                color: #eee;
                padding: 15px 30px;
                margin-top: 20px;
                background: rgb(2, 136, 209);
                cursor: pointer;
                border: 1px solid white;
                border-radius: 4px;
                transition: 0.2s all;
                font-size: 22px;
                :hover {
                  background: white;
                  color: #555;
                }
              `}
            >
              Subscribe
            </button>
          </div>
          {this.state.status === `error` && (
            <div
              className="custom-block-warn"
              dangerouslySetInnerHTML={{ __html: this.state.msg }}
            />
          )}
        </form>
      </div>
    )
  }
}
/*
#contact-form button[type='submit'] {
  background: rgb(2, 136, 209);
  cursor: pointer;
  padding: 15px 30px;
  color: #eee;
  border: 1px solid #999;
  border-radius: 4px;
  transition: 0.2s all;
  font-size: 22px;
}


*/
export default class extends React.Component {
  render() {
    const post = this.props.data.markdownRemark
    const siteTitle = get(this.props, 'data.site.siteMetadata.title')
    const siteUrl = get(this.props, 'data.site.siteMetadata.siteUrl')
    const author = get(this.props, 'data.site.siteMetadata.author')
    const { previous, next } = this.props.pageContext
    const background = post.frontmatter.background
    const description = post.frontmatter.description
    const title = post.frontmatter.title
    const fullUrl = siteUrl + this.props.location.pathname

    const disqusShortname = 'ctheu'
    const disqusConfig = {
      url: fullUrl.replace('/articles', ''),
      title: title,
    }

    const feelFree = <FeelFreeToShare path={fullUrl} title={title} />

    return (
      <Layout
        location={this.props.location}
        cover={background}
        description={description}
        title={title}
      >
        <Helmet title={`${siteTitle} | ${title}`} />

        <h1 style={{ marginBottom: 5 }}>{post.frontmatter.title}</h1>

        <p style={{ marginBottom: 0, ...scale(-1 / 5) }}>
          {post.frontmatter.date}
        </p>
        <Tags tags={post.frontmatter.tags} />
        <br />

        <hr />

        <article dangerouslySetInnerHTML={{ __html: post.html }} />

        <hr />
        {feelFree}
        <hr />

        <NewsletterSubscription />

        <Bio />
        <br />
        <ul
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            listStyle: 'none',
          }}
        >
          {previous && (
            <li>
              <Link to={previous.frontmatter.path} rel="prev">
                ← {previous.frontmatter.title}
              </Link>
            </li>
          )}

          {next && (
            <li>
              <Link to={next.frontmatter.path} rel="next">
                {next.frontmatter.title} →
              </Link>
            </li>
          )}
        </ul>
        <br />
        <DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />
      </Layout>
    )
  }
}

export const pageQuery = graphql`
  query($slug: String!) {
    site {
      siteMetadata {
        title
        author
        siteUrl
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      html
      frontmatter {
        title
        description
        date(formatString: "MMMM DD, YYYY")
        tags
        path
        background {
          childImageSharp {
            fluid(
              maxHeight: 200
              cropFocus: CENTER
              duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 80 }
            ) {
              ...GatsbyImageSharpFluid
            }
          }
        }
      }
    }
  }
`
