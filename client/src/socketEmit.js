import socket from './socket.js';

const TIMEOUT_MS = 5000;

export default function socketEmit(event, ...args) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({ ok: false, error: 'ack timeout' });
    }, TIMEOUT_MS);
    socket.emit(event, ...args, (ack) => {
      clearTimeout(timer);
      resolve(ack);
    });
  });
}
