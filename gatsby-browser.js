import ReactGA from 'react-ga';
ReactGA.initialize('UA-59408070-1');

exports.onRouteUpdate = (state, page, pages) => {
  ReactGA.pageview(state.pathname);
};