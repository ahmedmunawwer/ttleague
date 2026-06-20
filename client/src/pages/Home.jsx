import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  return (
    <div style={{
      height: '100vh',
      background: 'var(--color-background)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top half: Paddle */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }} onClick={() => navigate('/league')}>
        <img
          src="/paddle.png"
          alt="League"
          style={{
            width: '28vh',
            height: '28vh',
            display: 'block',
            borderRadius: '50%',
          }}
        />
      </div>

      {/* Bottom half: Trophy */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
        userSelect: 'none',
      }} onClick={() => navigate('/scoreboard')}>
        <span role="img" aria-label="Scoreboard" style={{
          fontSize: '28vh',
          lineHeight: 1,
        }}>
          🏆
        </span>
      </div>
    </div>
  );
}

export default Home;
