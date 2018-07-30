import React from 'react'
import { Link } from 'gatsby'
import { css } from 'react-emotion'

export default ({ tags }) => (
  <ul
    className={css`
      li {
        display: inline-block;
        margin-right: 5px;
        padding: 0 10px;
        background: #eee;
        border: 1px solid #ddd;
        border-radius: 20px;
        font-size: 18px;
      }
      li:hover {
        background-color: rgb(2, 136, 209);
      }
      li:hover a {
        color: white;
      }
    `}
  >
    {(tags || []).map(tag => (
      <li key={tag}>
        <Link className="clean" to={'/tags/' + tag}>
          {tag}
        </Link>
      </li>
    ))}
  </ul>
)
