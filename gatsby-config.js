module.exports = {
  siteMetadata: {
    title: 'S. Derosiaux',
    author: 'Stéphane Derosiaux',
    description: 'Stéphane Derosiaux - Scala & Data Engineer',
    siteUrl: 'https://www.sderosiaux.com',
  },
  pathPrefix: '/',
  plugins: [
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/src/pages`,
        name: 'pages',
      },
    },
    {
      resolve: 'gatsby-plugin-netlify',
      options: {},
    },
    //`gatsby-plugin-twitter`,
    {
      resolve: 'gatsby-plugin-mailchimp',
      options: {
        endpoint:
          'https://sderosiaux.us15.list-manage.com/subscribe/post?u=10fa09a0a644f563c084ab3fd&amp;id=32c9c3f4b2',
      },
    },
    'gatsby-plugin-catch-links',
    'gatsby-plugin-sitemap',
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 1000,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          // {
          //   resolve: `gatsby-remark-twemoji-shortcut`,
          //   options: {
          //     // classname: 'some_classname another_classname', // add additional classname(s) to the emoji
          //     // style: {
          //     //   // add additional inline-styling to the emoji
          //     //   //background: 'gold',
          //     // },
          //   },
          // },
          'gatsby-remark-autolink-headers',
          'gatsby-remark-prismjs',
          'gatsby-remark-copy-linked-files',
          'gatsby-remark-smartypants',
          {
            resolve: 'gatsby-remark-custom-blocks',
            options: {
              blocks: {
                warn: {
                  classes: 'custom-block-warn',
                  title: 'optional',
                },
                info: {
                  classes: 'custom-block-info',
                  title: 'optional',
                },
                float: {
                  classes: 'float'
                },
                hero0: {
                  classes: 'custom-block-hero custom-block-hero0',
                },
                'hero0-centered': {
                  classes: 'custom-block-hero custom-block-hero0 centered',
                },
                hero1: {
                  classes: 'custom-block-hero custom-block-hero1',
                },
                hero2: {
                  classes: 'custom-block-hero custom-block-hero2',
                },
                hero3: {
                  classes: 'custom-block-hero custom-block-hero3',
                },
                hero4: {
                  classes: 'custom-block-hero custom-block-hero4',
                },
                hero5: {
                  classes: 'custom-block-hero custom-block-hero5',
                },
              },
            },
          },
          {
            resolve: 'remark-toc',
            options: {
              header: 'Summary', // the custom header text
              include: [
                '**/index.md', // an include glob to match against
              ],
            },
          },
        ],
      },
    },
    `gatsby-plugin-emotion`,
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `UA-59408070-1`,
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        // setup(ref) {
        //   const ret = ref.query.site.siteMetadata
        //   ret.allMarkdownRemark = ref.query.allMarkdownRemark
        //   ret.generator = 'GatsbyJS Material Starter'
        //   return ret
        // },
        //   query: `
        //     {
        //       site {
        //         siteMetadata {
        //           title
        //           description
        //           siteUrl
        //           author
        //         }
        //       }
        //     }
        //   `,
        feeds: [
          {
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                return Object.assign({}, edge.node.frontmatter, {
                  url: site.siteMetadata.siteUrl + edge.node.frontmatter.path,
                  guid: site.siteMetadata.siteUrl + edge.node.frontmatter.path,
                  //custom_elements: [{ 'content:encoded': edge.node.html }],
                })
              })
            },
            query: `
                {
                  allMarkdownRemark(
                    limit: 1000,
                    sort: { order: DESC, fields: [frontmatter___date] },
                    filter: {frontmatter: { is_blog: { eq: true } }}
                  ) {
                    edges {
                      node {
                        frontmatter {
                          title
                          date
                          description
                          path
                        }
                      }
                    }
                  }
                }
              `,
            output: '/rss.xml',
          },
        ],
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: 'gatsby-plugin-typography',
      options: {
        pathToConfigModule: 'src/utils/typography',
      },
    },
  ],
}
