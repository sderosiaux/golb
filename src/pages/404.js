import React from 'react'
import Layout from '../components/Layout'
import { Helmet } from 'react-helmet'

export default ({ location }) => (
  <Layout
    location={location}
    title="404"
    description="You really need a description for a 404 page?"
  >
    <Helmet title={'404'} />
    <p>Nothing here.</p>
    <p>
      Send me a tweet at{' '}
      <a href="https://twitter.com/sderosiaux">@sderosiaux</a> if you think it's
      not normal, and I'm sorry about that!
    </p>
  </Layout>
)
