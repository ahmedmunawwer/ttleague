import { useRef } from 'react';

const LONG_PRESS_MS = 600;

export default function useLongPress(callback) {
  const timerRef = useRef(null);

  function start() {
    timerRef.current = setTimeout(callback, LONG_PRESS_MS);
  }

  function cancel() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onContextMenu: (e) => e.preventDefault(),
  };
}
