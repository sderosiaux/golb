import React from 'react'
import { Container } from 'react-responsive-grid'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import Headroom from 'react-headroom'
import 'css/markdown-styles'
import 'css/headroom'
import m from './m.jpg'
import { Flex, Box } from 'reflexbox'
import { rhythm } from '../utils/typography'
import ScrollUp from 'react-scroll-up'
import img from './up_arrow_round.png'
import { SocialIcon } from 'react-social-icons'

module.exports = React.createClass({
  propTypes () {
    return {
      children: React.PropTypes.any,
    }
  },
  render () {

    return (
      <div>
        <Headroom wrapperStyle={{marginBottom: rhythm(1)}}>
          <Container style={{maxWidth: null, padding: '16px 20px'}}>
            <Flex align="center" col="5" justify="space-between">
              <Box>
                <div style={{width: 240}}>
                  <Link to={prefixLink('/')} style={{color: 'black',textDecoration: 'none',}}>
                    <Flex>
                      <Box px={1}><img src={m} height={32} style={{ borderRadius: 100, margin: 0, display: 'block' }} /></Box>
                      <Box px={1}><span style={{ fontVariant: 'small-caps' }}>Stéphane Derosiaux</span></Box>
                    </Flex>
                  </Link>
                </div>
              </Box>
              <Box px={1}><Link to={prefixLink('/')}>Blog Index</Link></Box>
              <Box px={1}>
                <div style={{width: 240, textAlign: "right"}}>
                  <SocialIcon url="https://twitter.com/ChtefiD" style={{ height: 32, width: 32 }}/>&nbsp;
                  <SocialIcon url="https://medium.com/@ChtefiD/" style={{ height: 32, width: 32 }}/>&nbsp;
                  <SocialIcon url="https://github.com/chtefi" style={{ height: 32, width: 32 }}/>
                </div>
              </Box>
            </Flex>
          </Container>
        </Headroom>
        <Container style={{maxWidth: 960,padding: `${rhythm(1)} ${rhythm(3/4)}`,paddingTop: 0}}>
          {this.props.children}
        </Container>
        <ScrollUp showUnder={3000} easing={'easeOutCubic'} duration={500}>
          <img src={img} className="scrollUp" />
        </ScrollUp>
      </div>
    )
  },
})
