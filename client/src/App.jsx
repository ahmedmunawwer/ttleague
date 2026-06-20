import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './socket.js';
import Home from './pages/Home.jsx';
import LeagueMenu from './pages/LeagueMenu.jsx';
import LeagueView from './pages/LeagueView.jsx';
import Scoreboard from './pages/Scoreboard.jsx';
import PlayerDetail from './pages/PlayerDetail.jsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/league" element={<LeagueMenu />} />
        <Route path="/league/:id" element={<LeagueView />} />
        <Route path="/scoreboard" element={<Scoreboard />} />
        <Route path="/players/:name" element={<PlayerDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
