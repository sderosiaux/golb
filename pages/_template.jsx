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
  getInitialState: function () {
    return { email: '' }
  },
  propTypes () {
    return {
      children: React.PropTypes.any,
    }
  },
  handleChange(event) {
    this.setState({ email: event.target.value });
  },
  handleSubmit() {
    setTimeout(() => this.setState({ email: '' }), 100);
  },
  render: function () {

    return (
      <div>
        <Headroom wrapperStyle={{marginBottom: rhythm(1)}}>
          <Container style={{maxWidth: null, padding: '16px 20px'}}>
            <Flex align="center" col="5" justify="space-between">
              <Box>
                <div style={{width: 300}}>
                  <Flex>
                    <Box px={1}>
                      <a target="_blank" href="https://twitter.com/ChtefiD" style={{color: 'black',textDecoration: 'none',}}>
                        <img src={m} height={32} style={{ borderRadius: 100, margin: 0, display: 'block' }} />
                      </a>
                    </Box>
                    <Box px={0}>
                        <form style={{margin:0,padding:0,fontSize:14}} onSubmit={this.handleSubmit} action="//ctheu.us15.list-manage.com/subscribe/post?u=10fa09a0a644f563c084ab3fd&amp;id=32c9c3f4b2" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" className="validate" target="_blank" novalidate>
                          <input style={{height: 26}} type="email" value={this.state.email} onChange={this.handleChange} name="EMAIL" placeholder="my.email@domain.com" id="mce-EMAIL" />
                          &nbsp;
                          <input style={{height: 26, lineHeight: 1}} type="submit" value="Join" name="subscribe" id="mc-embedded-subscribe" />
                          <div style={{position: "absolute", left: -5000}} aria-hidden="true"><input type="text" name="b_10fa09a0a644f563c084ab3fd_32c9c3f4b2" tabindex="-1" value="" /></div>
                        </form>
                      </Box>
                  </Flex>
                </div>
              </Box>
              <Box px={1} className="index"><Link to={prefixLink('/')}>Blog Index</Link></Box>
              <Box px={1} className="social">
                <div>
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
