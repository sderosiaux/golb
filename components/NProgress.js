import React from 'react'

export default class NProgress extends React.Component {
    constructor() {
        super()
        this.state = { width: 0 }
    }
    componentWillMount() {
        window.addEventListener('scroll', this.handleScroll)
    }
    componentWillUnmount() {
        window.removeEventListener("scroll", this.handleScroll)
    }
    handleScroll = (e) => {
        const wintop = window.scrollY
        const docheight = document.body.offsetHeight
        const endOffset = document.getElementsByClassName("newsletter")[0].offsetTop // ahah
        const ratio = wintop / endOffset
        this.setState({ width: Math.min((wintop + (window.innerHeight * ratio)) / endOffset, 1) * 100 })
    }
    render() {
        return (
            <div className="KW_progressContainer"><div className="KW_progressBar" style={{ width: this.state.width + '%' }}></div></div>
        )
    }
}
