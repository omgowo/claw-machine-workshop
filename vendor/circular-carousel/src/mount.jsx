import React from 'react';
import { createRoot } from 'react-dom/client';
import CircularCarousel from './CircularCarousel.jsx';
import MatchboxCarousel from './MatchboxCarousel.jsx';

// 讓純 HTML 專案也能使用：window.mountXxx(元素, props) -> { update(props), destroy() }
const make = (Comp) => (el, props) => {
  const root = createRoot(el);
  root.render(<Comp {...props} />);
  return { update: p => root.render(<Comp {...p} />), destroy: () => root.unmount() };
};
window.mountCircularCarousel = make(CircularCarousel);
window.mountMatchboxCarousel = make(MatchboxCarousel);
