var fs = require('fs-extra-promise') //install this package
var sm = require('sitemap') // install this package
var rss = require('rss')

function pagesToSitemap(pages) {
  var urls = pages.map(function (p) {
    if (p.path !== undefined) {
      return {
        url: p.path,
        changefreq: 'monthly',
        priority: 0.5
      }
    }
  })
  // remove undefined (template pages)
  return urls.filter(function (u) { return u !== undefined })
}

function generateSiteMap(pages) {
  var sitemap = sm.createSitemap({
    hostname: 'https://www.sderosiaux.com',
    cacheTime: '60000',
    urls: pagesToSitemap(pages),
  })
  console.log('Generating sitemap.xml')
  fs.writeFileSync(
    `${__dirname}/public/sitemap.xml`,
    sitemap.toString()
  )
}

function generateRss(pages) {
  const feed = new rss({
    title: "Blog sderosiaux.com",
    description: "A technical blog talking about Scala, Java, Hadoop, Spark, React, JavaScript, and much more",
    feed_url: 'https://www.sderosiaux.com/rss.xml',
    site_url: 'https://www.sderosiaux.com'
  })

  pages.map(p => {
    if (p.data && p.data.title) {
      feed.item({
        title: p.data.title,
        description: p.data.description,
        url: 'https://www.sderosiaux.com' + p.data.path,
        categories: p.data.tags ? p.data.tags.split(',').map(s => s.trim()) : [],
        date: p.data.date
      })
    }
  })

  console.log('Generating rss.xml')
  fs.writeFileSync(
    `${__dirname}/public/rss.xml`,
    feed.xml({ indent: true }).toString()
  )
}

function generateRedirect() {
  console.log('Generating _redirects for Netlify')
  fs.writeFileSync(
    `${__dirname}/public/_redirects`,
    "https://www.ctheu.com/* https://www.sderosiaux.com/:splat 301!"
  )
}

module.exports.postBuild = function (pages, callback) {
  generateSiteMap(pages)
  generateRss(pages)
  generateRedirect()
  callback()
}

exports.modifyWebpackConfig = function (config, env) {
  if (env == 'AAbuild-javascript') {
    config.merge({
      resolve: {
        alias: {
          'react': 'preact-compat',
          'react-dom': 'preact-compat'
        }
      }
    })
    return config;
  }

  return config
}