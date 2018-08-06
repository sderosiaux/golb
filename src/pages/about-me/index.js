import React from 'react'
import { graphql, Link } from 'gatsby'
import { css } from 'react-emotion'
import Layout from '../../components/Layout'
import { Centered, ColorfulCentered, Quote } from '../../components/Centered'
import { Helmet } from 'react-helmet'
import Img from 'gatsby-image'
require('./About.js')

const Blocks = ({ children }) => (
  <div
    className={css`
      padding: 20px;
    `}
  >
    <div
      className={css`
        max-width: 1120px;
        margin-left: auto;
        margin-right: auto;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
      `}
    >
      {children}
    </div>
  </div>
)

const Block = ({ cover, fluid, children, fullWidth }) => (
  <div
    className={css`
      width: ${fullWidth ? 100 : 50}%;
      padding: 10px;
      text-align: center;
      color: #444;
      width: 500px;
      overflow: hidden;
    `}
  >
    {cover && (
      <Img fixed={cover.childImageSharp.fixed} style={{ borderRadius: 6 }} />
    )}
    {fluid && (
      <Img fluid={fluid.childImageSharp.fluid} style={{ borderRadius: 6 }} />
    )}
    {children}
  </div>
)

export default ({ location, data }) => {
  const siteTitle = data.site.siteMetadata.title

  return (
    <Layout
      location={location}
      fullWidth={true}
      cover={data.cover}
      title="About Me"
      description="Hi! It's Stéphane from France! Here is my story."
    >
      <Helmet title={siteTitle + ' | About Me'} />

      <div style={{ marginTop: 20 }}>
        <Centered>
          <h1>Hi!</h1>

          <p>It's Stéphane from France!</p>

          <p>
            I've started this personal website as a blog a few years ago. Even I
            don't blog too often, it's better than nothing, right? It takes time
            to write them down (or I am a slow writer), to ensure the quality
            and depth is acceptable.
          </p>
        </Centered>

        <Quote>
          Optimism is an essential ingredient of innovation. How else can the
          individual welcome change over security, adventure over staying in
          safe place. —Robert N. Noyce (Intel)
        </Quote>

        <ColorfulCentered>
          <p>
            TLDR: I have worked as a <strong>Software Engineer</strong>, doing
            Front-end and Back-end (Java, .NET, JS), then{' '}
            <strong>Data Engineer</strong> (Scala, Kafka, Spark, Hadoop, Google
            Cloud Platform). In 2018, I decided to be self-employed, doing{' '}
            <strong>freelance</strong> and consultant work mostly related to
            data engineering, because I love data!
          </p>
          <p>
            Read more about <Link to="/work-with-me">how I work</Link> and
            checkout my{' '}
            <a href="https://www.linkedin.com/in/st%C3%A9phane-derosiaux/">
              LinkedIn
            </a>.
          </p>
        </ColorfulCentered>

        <p />

        <Blocks>
          <Block cover={data.enthousiast}>
            Optimist, enthousiast, and always eager to learn.
          </Block>
          <Block cover={data.scala}>
            I love Scala and functional programming. I'm hanging out on the
            gitter{' '}
            <a href="https://gitter.im/scala/fr">
              <code>scala/fr</code>
            </a>{' '}
            if you need help.
          </Block>
          <Block cover={data.startup}>
            I love startups, technology, science, software engineering.
          </Block>
          <Block cover={data.reading}>
            I love reading on the web. I saved most of what I read here:{' '}
            <a href="https://github.com/sderosiaux/every-single-day-i-tldr">
              sderosiaux/every-single-day-i-tldr
            </a>. More than 3000 links, yikes.
          </Block>
        </Blocks>

        <ColorfulCentered>
          I've also started to read <em>real</em> books since a tweet of{' '}
          <a href="https://twitter.com/nehanarkhede">Neha Narkhede</a>{' '}
          (Co-founder and CTO of Confluent) answering to{' '}
          <a href="https://twitter.com/patrickc">Patrick Collison</a> (CEO of
          Stripe).
        </ColorfulCentered>

        <Centered
          extraCss={css`
            text-align: center;
          `}
        >
          <blockquote className="twitter-tweet" data-lang="fr">
            <p lang="en" dir="ltr">
              So, Sunday evening Twitter: which five books have influenced you
              the most? (In terms of shaping your worldview.)
            </p>&mdash; Patrick Collison (@patrickc){' '}
            <a href="https://twitter.com/patrickc/status/929862403763798016">
              13 novembre 2017
            </a>
          </blockquote>
        </Centered>

        <ColorfulCentered>
          Seriously,{' '}
          <a href="https://twitter.com/patrickc/status/929862403763798016">
            checkout this tweet
          </a>. Thanks to both of them, I keep adding books to my{' '}
          <a href="http://amzn.eu/iOQIowS">Books I Will Read list</a> when I
          stumbled upon some interesting references. I still have around 80
          books still to buy and read! One book at a time. You can{' '}
          <a href="http://amzn.eu/iOQIowS">check it out</a> and{' '}
          <a href="http://amzn.eu/iOQIowS">offer me one</a> if you're nice!
        </ColorfulCentered>
        <p />
        <Blocks>
          <Block cover={data.wine}>
            I'm fluent in French (native) and English (I guess so).
          </Block>
          <Block cover={data.hike}>
            I love running and travelling to hike and find geocaches all over the world.
          </Block>
          <Block cover={data.ddr}>
            I love old games, fitness, DDR (and Stepmania!), cooking (paleo!)
          </Block>
          <Block cover={data.wife}>I love my cats and my wife.</Block>
        </Blocks>

        <Blocks>
          <Block fluid={data.photo} fullWidth={true}>
            <div style={{ height: 10 }} /> {/* HACK! */}
            I love <strong>photography</strong>. I have a reflex since a few
            years, and I love playing with Adobe Lightroom to make the best of
            my photos. You can check some of my <em>work</em> on{' '}
            <a href="https://www.instagram.com/sderosiaux">Instagram</a>.
          </Block>
        </Blocks>
      </div>
    </Layout>
  )
}

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    cover: file(relativePath: { eq: "DSC00806.jpg" }) {
      childImageSharp {
        fluid(
          maxHeight: 220
          maxWidth: 1000
          cropFocus: CENTER
          quality: 90
          duotone: { highlight: "#0288d1", shadow: "#192550", opacity: 80 }
        ) {
          ...GatsbyImageSharpFluid
        }
      }
    }
    wife: file(relativePath: { eq: "about-me/wife.jpg" }) {
      ...BlockImage
    }

    wine: file(relativePath: { eq: "about-me/wine.jpg" }) {
      ...BlockImage
    }

    ddr: file(relativePath: { eq: "about-me/ddr.jpg" }) {
      ...BlockImage
    }

    hike: file(relativePath: { eq: "about-me/rando.jpg" }) {
      ...BlockImage
    }
    enthousiast: file(relativePath: { eq: "about-me/enthousiast.jpg" }) {
      ...BlockImage
    }
    scala: file(relativePath: { eq: "about-me/scala.jpg" }) {
      ...BlockImageBottom
    }
    reading: file(relativePath: { eq: "about-me/reading.jpg" }) {
      ...BlockImage
    }
    startup: file(relativePath: { eq: "about-me/startup.jpg" }) {
      ...BlockImage
    }

    photo: file(relativePath: { eq: "about-me/photo.jpg" }) {
      childImageSharp {
        fluid(cropFocus: CENTER, quality: 50, maxHeight: 300) {
          ...GatsbyImageSharpFluid
        }
      }
    }
  }
`
