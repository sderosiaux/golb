import React from 'react'
import { css } from 'react-emotion'
import addToMailchimp from 'gatsby-plugin-mailchimp'

export default class NewsletterSubscription extends React.Component {
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
          <p>
            <input
              type="email"
              required
              placeholder="you@email.com"
              onChange={this._handleEmailChange}
              className={css`
                width: 100%;
                max-width: 500px;
                padding: 10px;
                border-radius: 4px;
                border: 1px solid white;
                ::placeholder {
                  color: rgb(2, 136, 209);
                }
              `}
            />
          </p>
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
