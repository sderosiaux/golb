import React from 'react'
import { prefixLink } from 'gatsby-helpers'

export default class Subscribe extends React.Component {
    constructor() {
        super()
        this.state = { email: '' }
    }
    handleChange(event) {
        this.setState({ email: event.target.value })
    }
    handleSubmit() {
        setTimeout(() => this.setState({ email: '' }), 100)
    }
    render() {
        return (
            <div className="newsletter">
                <h1>Subscribe to my newsletter</h1>
                <p>If you like what you read, don't hesitate to join the club and receive an email when I post a new article! No spam ever, I promise. ❤❤❤</p>
                <form onSubmit={() => this.handleSubmit()} action="//ctheu.us15.list-manage.com/subscribe/post?u=10fa09a0a644f563c084ab3fd&amp;id=32c9c3f4b2" method="post" id="mc-embedded-subscribe-form" name="mc-embedded-subscribe-form" className="validate" target="_blank" novalidate>
                    <div><input type="email" value={this.state.email} onChange={(e) => this.handleChange(e)} name="EMAIL" placeholder="my.email@domain.com" /></div>
                    <div><input type="submit" className="nice-btn" value="I subscribe" name="subscribe" /></div>
                    <div style={{ position: "absolute", left: -5000 }} aria-hidden="true"><input type="text" name="b_10fa09a0a644f563c084ab3fd_32c9c3f4b2" tabindex="-1" value="" /></div>
                </form>
            </div>
        )
    }
}



