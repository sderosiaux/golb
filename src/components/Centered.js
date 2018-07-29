import React from 'react'
import { css } from 'react-emotion'

export const Quote = ({ children }) => (
  <Centered>
    <blockquote>{children}</blockquote>
  </Centered>
)

export const Centered = ({
  fg,
  bg = 'transparent',
  children,
  extraCss = '',
}) => (
  <div
    className={css`
      background-color: ${bg};
      padding: 20px;
    `}
  >
    <div
      className={
        css`
          max-width: 1120px;
          margin-left: auto;
          margin-right: auto;
          color: ${fg};
          a {
            color: ${fg};
          }
          > p:last-child {
            margin-bottom: 0;
          }
        ` +
        ' ' +
        extraCss
      }
    >
      {children}
    </div>
  </div>
)

export const ColorfulCentered = ({ children }) => (
  <Centered
    fg="#fafafa"
    bg="rgb(2, 136, 209)"
    extraCss={css`
      a:hover,
      a:active {
        color: rgb(2, 136, 209);
        background-color: rgb(255, 255, 255);
      }
    `}
  >
    {children}
  </Centered>
)
