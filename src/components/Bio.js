import React from 'react'

// Import typefaces
import 'typeface-montserrat'
import 'typeface-merriweather'

import profilePic from './profile-pic.jpg'
import { rhythm } from '../utils/typography'
import { Link } from 'gatsby'

class Bio extends React.Component {
  render() {
    return (
      <div
        style={{
          display: 'flex',
          marginBottom: rhythm(2.5),
        }}
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
          Software Engineer then Data Engineer, I live in France. Enthousiast
          and eager to learn anything related to IT, I'm always seeking for
          challenge. Find out more <Link to="/about-me">about me</Link>.
        </p>
      </div>
    )
  }
}

export default Bio
