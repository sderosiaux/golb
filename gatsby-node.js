var fs = require('fs-extra-promise') //install this package
var sm = require('sitemap') // install this package

function pagesToSitemap(pages) {
  var urls = pages.map(function(p) {
    if (p.path !== undefined) {
      return {
        url: p.path,
        changefreq: 'monthly',
        priority: 0.5
      }
    }
  })
  // remove undefined (template pages)
  return urls.filter(function(u) { return u !== undefined})
}

function generateSiteMap(pages) {
  var sitemap = sm.createSitemap({
    hostname: 'https://www.ctheu.com',
    cacheTime: '60000',
    urls: pagesToSitemap(pages),
  })
  console.log('Generating sitemap.xml')
  fs.writeFileSync(
    `${__dirname}/public/sitemap.xml`,
    sitemap.toString()
  )
}

module.exports.postBuild = function(pages, callback) {
  generateSiteMap(pages)
  callback()
}

exports.modifyWebpackConfig = function(config, env) {
  if (env == 'build-javascript') {
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