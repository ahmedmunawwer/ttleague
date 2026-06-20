import React from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();
  return (
    <div style={{
      height: 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
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
        <div style={{
          width: '28vh',
          height: '28vh',
          borderRadius: '50%',
          background: 'var(--color-trophy-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span role="img" aria-label="Scoreboard" style={{
            fontSize: '18vh',
            lineHeight: 1,
          }}>
            🏆
          </span>
        </div>
      </div>
    </div>
  );
}

export default Home;
