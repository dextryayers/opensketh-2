import React, { useState } from 'react';
import RoomPage from './apps/web/app/room/[roomId]/page';
import LandingPage from './apps/web/app/page';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'room'>('landing');
  const [roomId, setRoomId] = useState<string | null>(null);

  const handleJoinRoom = (id: string) => {
    setRoomId(id);
    setCurrentView('room');
  };

  return (
    <>
      {currentView === 'landing' && <LandingPage onJoin={handleJoinRoom} />}
      {currentView === 'room' && roomId && <RoomPage roomId={roomId} />}
    </>
  );
};

export default App;