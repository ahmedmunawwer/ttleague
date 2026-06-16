'use strict';

const registerLeagueHandlers = require('./handlers/leagues');
const registerPresetHandlers = require('./handlers/presets');
const registerScoreboardHandlers = require('./handlers/scoreboard');
const registerFixtureHandlers = require('./handlers/fixtures');

module.exports = function registerSocketEvents(io) {
  io.on('connection', (socket) => {
    console.log('socket connected:', socket.id);

    registerLeagueHandlers(io, socket);
    registerPresetHandlers(io, socket);
    registerScoreboardHandlers(io, socket);
    registerFixtureHandlers(io, socket);

    socket.on('disconnect', () => {
      console.log('socket disconnected:', socket.id);
    });
  });
};
