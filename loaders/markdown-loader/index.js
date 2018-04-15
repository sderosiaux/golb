/*

List of emojis:

https://github.com/markdown-it/markdown-it-emoji/blob/master/lib/data/full.json

*/

var frontMatter = require('front-matter')
var markdownIt = require('markdown-it')
var hljs = require('highlight.js')
var objectAssign = require('object-assign')

var highlight = function (str, lang) {
  if (lang === 'raw') {
    return str
  }

  if ((lang !== null) && hljs.getLanguage(lang)) {
    try {
      return hljs.highlight(lang, str, true, false).value
    } catch (_error) {
      console.error(_error)
    }
  } else if (lang !== null) {
    //console.error("unknown language: " + lang + " (" + str.substring(0, 15) + ")")
  }

  try {
    return hljs.highlightAuto(str).value
  } catch (_error) {
    console.error(_error)
  }
  return ''
}

var md = markdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight,
})
  .use(require('markdown-it-sub'))
  .use(require('markdown-it-footnote'))
  .use(require('markdown-it-deflist'))
  .use(require('markdown-it-abbr'))
  .use(require('markdown-it-attrs'))
  .use(require('markdown-it-task-lists'))
  .use(require("markdown-it-anchor"), {})
  .use(require('markdown-it-emoji'))
  .use(require('markdown-it-checkbox'))
  .use(require('markdown-it-link-attributes'), {
    target: '_blank',
    rel: 'noopener'
  })
  .use(require('markdown-it-table-of-contents'), {
    includeLevel: [1, 2]
  })

module.exports = function (content) {
  this.cacheable()
  const meta = frontMatter(content)
  const body = md.render(meta.body)
  const result = objectAssign({}, meta.attributes, {
    body,
  })
  this.value = result
  return `module.exports = ${JSON.stringify(result)}`
}
