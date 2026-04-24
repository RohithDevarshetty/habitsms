import React, { useEffect, useState } from "react";
import "./chat.css";

const Bubble = ({ text, type }: { text: string; type: string }) => {
  return (
    <div className={`bubble ${type}`}>
      {text}
    </div>
  );
};

const Typing = () => {
  return (
    <div className="bubble bot typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  );
};

function WhatsAppGifChat({ isDemo = false }: { isDemo?: boolean }) {
  const [isOpen, setIsOpen] = useState(!isDemo);
  const [step, setStep] = useState(0);

  // Demo shows full sequence immediately
  useEffect(() => {
    if (isDemo) {
      setStep(10);
    }
  }, [isDemo]);

  // Floating mode auto-plays
  useEffect(() => {
    if (!isOpen && !isDemo) return;
    
    setStep(0);
    const timeouts = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 1500),
      setTimeout(() => setStep(3), 2500),
      setTimeout(() => setStep(4), 3500),
      setTimeout(() => setStep(5), 4500),
      setTimeout(() => setStep(6), 5500),
      setTimeout(() => setStep(7), 6500),
      setTimeout(() => setStep(8), 7500),
      setTimeout(() => setStep(9), 8500),
      setTimeout(() => setStep(10), 9500),
    ];
    return () => timeouts.forEach(clearTimeout);
  }, [isOpen, isDemo]);

  if (!isOpen && !isDemo) {
    return (
      <button 
        className="chat-toggle" 
        onClick={() => setIsOpen(true)}
        aria-label="Open chat"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
    );
  }

  const containerClass = isDemo ? "chat-container-demo" : "chat-container floating";
  return (
    <div className={containerClass}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: '#075e54',
        color: 'white',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: '#25d366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: 'white'
          }}>H</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Habit</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Online</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', background: '#ece5dd', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {/* Bot typing indicator - show only when transitioning */}
        {step === 1 && <Typing />}
        {step >= 2 && <Bubble text="Gym session at 6 PM, Ready?" type="bot" />}
        
        {/* User responds */}
        {step === 3 && <Typing />}
        {step >= 4 && <Bubble text="Yes" type="user" />}
        
        {/* Bot asks follow-up */}
        {step === 5 && <Typing />}
        {step >= 6 && <Bubble text="Did you complete workout?" type="bot" />}
        
        {/* User confirms */}
        {step === 7 && <Typing />}
        {step >= 8 && <Bubble text="Done" type="user" />}
        
        {/* Final bot response with stats */}
        {step === 9 && <Typing />}
        {step >= 10 && <Bubble text="Workout logged ✓  🔥 Streak: 4 days 📊 80% consistency" type="bot" />}

        {step === 0 && isDemo && (
          <div style={{ textAlign: 'center', color: '#666', marginTop: '40%', fontSize: '14px' }}>
            Loading ...
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppGifChat;