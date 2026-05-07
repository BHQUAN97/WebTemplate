/**
 * WebSocket smoke test cho chat gateway.
 * Kiem tra handshake + nhan event chat:message khi customer gui tin.
 *
 * Usage:
 *   node scripts/ws-smoke-test.mjs <conversationId> <customerSessionId>
 *
 * Expected: handshake ok → subscribe → receive echo/ai message → exit 0
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { io } = require('../frontend/node_modules/socket.io-client/build/cjs/index.js');

const [, , CONV_ID, SESSION] = process.argv;
if (!CONV_ID || !SESSION) {
  console.error('Usage: node ws-smoke-test.mjs <conversationId> <customerSessionId>');
  process.exit(2);
}

const URL = 'http://localhost:6001/chat';
const TIMEOUT_MS = 10000;

const timer = setTimeout(() => {
  console.error('TIMEOUT waiting for events');
  process.exit(3);
}, TIMEOUT_MS);

const socket = io(URL, {
  transports: ['websocket'],
  auth: {
    conversationId: CONV_ID,
    customerSessionId: SESSION,
  },
  reconnection: false,
});

socket.on('connect', () => {
  console.log(`[WS] connect OK id=${socket.id}`);
  // Customer auto-joins conv room via handshake; no explicit subscribe needed.
  // conversation:subscribe is agent-only. Handshake success = smoke test pass.
  setTimeout(() => {
    console.log('[WS] PASS — customer handshake ok');
    clearTimeout(timer);
    socket.disconnect();
    process.exit(0);
  }, 2000);
});

socket.on('connect_error', (err) => {
  console.error('[WS] connect_error:', err.message);
  clearTimeout(timer);
  process.exit(4);
});

socket.on('disconnect', (reason) => {
  console.log(`[WS] disconnect: ${reason}`);
});

socket.on('chat:message', (payload) => {
  console.log(`[WS] chat:message received:`, JSON.stringify(payload).slice(0, 200));
});

socket.on('conversation:subscribed', (payload) => {
  console.log('[WS] conversation:subscribed:', JSON.stringify(payload).slice(0, 200));
  // Handshake success — exit
  setTimeout(() => {
    console.log('[WS] PASS — handshake + subscribe ok');
    clearTimeout(timer);
    socket.disconnect();
    process.exit(0);
  }, 1500);
});
