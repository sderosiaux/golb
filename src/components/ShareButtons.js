import React from 'react'
import { css } from 'react-emotion'
import {
  TwitterShareButton,
  TwitterIcon,
  RedditShareButton,
  RedditIcon,
  LinkedinShareButton,
  LinkedinIcon,
  GooglePlusShareButton,
  GooglePlusIcon,
} from 'react-share'

export default ({ url, title }) => (
  <ul
    className={css`
      display: flex;
      li {
        margin-right: 5px;
        cursor: pointer;
      }
    `}
  >
    <li>
      <TwitterShareButton url={url}>
        <TwitterIcon size={32} title={title} round={true} />
      </TwitterShareButton>
    </li>
    <li>
      <RedditShareButton url={url}>
        <RedditIcon size={32} title={title} round={true} />
      </RedditShareButton>
    </li>
    <li>
      <LinkedinShareButton url={url}>
        <LinkedinIcon size={32} title={title} round={true} />
      </LinkedinShareButton>
    </li>
    <li>
      <GooglePlusShareButton url={url}>
        <GooglePlusIcon size={32} title={title} round={true} />
      </GooglePlusShareButton>
    </li>
  </ul>
)
