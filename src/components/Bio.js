import React from 'react'

// Import typefaces
//import 'typeface-montserrat'
//import 'typeface-merriweather'

import profilePic from './profile-pic.jpg'
import { rhythm } from '../utils/typography'
import { Link } from 'gatsby'
import { css } from 'react-emotion'

class Bio extends React.Component {
  render() {
    return (
      <div
        className={css`
          padding: 10px;
          display: flex;
          border: 1px solid #ccc;
          border-radius: 3px;
          align-items: center;
          > * {
            margin-bottom: 0;
          }
        `}
      >
        <img
          src={profilePic}
          alt={`Me, Stéphane Derosiaux`}
          style={{
            marginRight: 20,
            width: 64,
            height: 64,
            borderRadius: 32,
          }}
        />
        <p>
          Software &amp; Data Engineer, I live in France. Enthousiast and eager
          to learn, I'm always seeking for challenges. Find out more{' '}
          <Link to="/about-me">about me</Link>.
        </p>
      </div>
    )
  }
}

export default Bio
