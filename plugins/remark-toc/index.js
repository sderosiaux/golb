const generateTOC = require('mdast-util-toc')
const mm = require('micromatch')

module.exports = (
  { markdownNode, markdownAST },
  { include = [], header = 'Table of Contents' }
) => {
  const filePath = markdownNode.fileAbsolutePath
    .split(process.cwd())
    .pop()
    .replace(/^\//, '')
  const isIncluded = mm.isMatch(filePath, include)

  if (!isIncluded) {
    return
  }

  const toc = generateTOC(markdownAST, { maxDepth: 2 }).map
  const index = markdownAST.children.findIndex(
    node =>
      node.type === 'paragraph' &&
      node.children[0].type == 'text' &&
      node.children[0].value == 'TOC'
  )

  if (!toc || index < 0) {
    return
  }

  const nodes = [
    header && {
      type: 'heading',
      depth: 2,
      children: [
        {
          type: 'text',
          value: header,
        },
      ],
    },
    toc,
  ].filter(Boolean)

  markdownAST.children = [].concat(
    markdownAST.children.slice(0, index),
    ...nodes,
    markdownAST.children.slice(index + 1)
  )
}
