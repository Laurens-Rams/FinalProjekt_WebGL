import './style.css';
import { DragGesture } from '@use-gesture/vanilla';
import App from './App';

const app = new App();

const el = document.querySelector('#canvas_main');
el.style.touchAction = 'none';

const gesture = new DragGesture(el, (state) => {
  app.onDrag(state);
});

history.scrollRestoration = "manual"
