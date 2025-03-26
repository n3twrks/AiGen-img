import React from 'react';

const Background = () => {
  return (
    <div className="fixed inset-0 -z-10 bg-gray-100">
      <div className="absolute inset-0" 
        style={{
          backgroundImage: `radial-gradient(circle at 0.25px 0.25px, #d1d5db 2px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
      />
    </div>
  );
};

export default Background; 