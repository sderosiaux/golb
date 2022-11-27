import React from 'react'
import { css } from 'react-emotion'
import Color from 'color'

const color = Color('rgb(2, 136, 209)') // #7289da')
const light = color.string()
const dark = color.darken(0.1).string()

export default ({}) => (
  <div
    className={css`
      text-align: center;
      padding: 30px;
      background: linear-gradient(to bottom, ${dark}, ${light}, ${dark});
      color: #d0d0d0;
      font-size: 16px;
    `}
  >
    © Copyright 2018-2022 · Stéphane Derosiaux · All Rights Reserved.
  </div>
)
