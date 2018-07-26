import React from 'react'
import { Link } from 'gatsby'
import { SocialIcon } from 'react-social-icons'
import { css } from 'react-emotion'
import Color from 'color'
import CTA from '../components/CTA'
import Rights from '../components/Rights'

import { rhythm, scale } from '../utils/typography'

const color = Color('rgb(2, 136, 209)')
const light = color.string()
const dark = color.darken(0.2).string()

export default class extends React.Component {
  render() {
    const { location, children, fullWidth } = this.props

    return (
      <div>
        <Header location={location} />
        <div
          className={css`
            height: 134px; // top bar
          `}
        />

        {fullWidth ? (
          <div>{children}</div>
        ) : (
          <div
            className={css`
              margin-left: auto;
              margin-right: auto;
              max-width: 1200px;
              padding: 40px;
              min-height: 100vh;
            `}
          >
            {children}
          </div>
        )}
        <CTA />
        <Rights />
      </div>
    )
  }
}

const Header = ({ location }) => (
  <header
    className={css`
      position: fixed;
      width: 100%;
      background: white;
      z-index: 99999; // to avoid tweet going on top
    `}
  >
    <div
      className={css`
        display: flex;
        align-items: center;
      `}
    >
      <Link
        className={
          'clean ' +
          css`
            margin-left: 40px;
            font-family: 'Kalam';
            font-weight: 400;
            font-size: 32px;
            :hover {
              color: #888;
            }
          `
        }
        to={'/'}
      >
        S.&nbsp;Derosiaux
      </Link>

      <div
        className={css`
          flex: 1;
        `}
      />

      <ul
        className={css`
          li {
            display: inline-block;
            text-transform: uppercase;
            padding: 40px 30px;
          }
          li.active {
            background: ${light};
          }
          li.active > a {
            color: white;
          }
        `}
      >
        <li className={location.pathname === '/' ? 'active' : ''}>
          <Link className="clean underline" to="/">
            Home
          </Link>
        </li>
        <li className={location.pathname === '/articles' ? 'active' : ''}>
          <Link className="clean underline" to="/articles">
            Articles
          </Link>
        </li>
        <li className={location.pathname === '/about-me' ? 'active' : ''}>
          <Link className="clean underline" to="/about-me">
            About Me
          </Link>
        </li>
        <li className={location.pathname === '/work-with-me' ? 'active' : ''}>
          <Link className="clean underline" to="/work-with-me">
            Work with me
          </Link>
        </li>
      </ul>

      <ul
        className={css`
          margin: 0 20px;
          li {
            display: inline-block;
            margin-right: 5px;
          }
        `}
      >
        <li>
          <SocialIcon
            className="clean"
            url="https://twitter.com/sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://medium.com/@sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://github.com/sderosiaux"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://www.linkedin.com/in/st%C3%A9phane-derosiaux-525404106"
            style={{ height: 32, width: 32 }}
          />
        </li>
        <li>
          <SocialIcon
            className="clean"
            url="https://www.sderosiaux.com/rss.xml"
            network="rss"
            style={{ height: 32, width: 32 }}
          />
        </li>
      </ul>
    </div>

    <div
      className={css`
        height: 20px;
        background: linear-gradient(to bottom, ${light}, ${light}, ${light});
        box-shadow: 0 2px 1px 2px rgba(0, 0, 0, 0.1);
      `}
    />
  </header>
)
