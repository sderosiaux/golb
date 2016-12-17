import React from 'react'
import { Link } from 'react-router'
import { prefixLink } from 'gatsby-helpers'
import { rhythm, scale } from 'utils/typography'

export default ({ pages, post }) => {
    let posts = pages.filter(p => p.data.layout === 'post')
    let currentPostIndex = posts.map(p => p.data).indexOf(post)
    let nextPost = posts.slice(currentPostIndex + 1, currentPostIndex + 2)[0]

    if (!nextPost) {
        return null
    } else {
        return (
        <div>
            <hr style={{margin: 0, marginTop: 20}} />
            <h6 style={{ ...scale(-0.5), margin: 0, letterSpacing: -0.25, }}>READ THIS NEXT:</h6>
            <h3 style={{ marginTop: 0, marginBottom: rhythm(1/4) }}>
                <Link to={{ pathname: prefixLink(nextPost.path) }}>{nextPost.data.title}</Link>
            </h3>
            <hr />
        </div>
        )
    }
}

