import React from 'react'

export default ({ text }) => <span>{Math.floor(text.split(' ').length / 300)} min read</span>