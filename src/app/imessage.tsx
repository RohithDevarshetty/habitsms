import { useEffect, useState } from "react";
import "./imessage.css";

const Bubble = ({ text, type }: { text: string; type: string }) => {
  return (
    <div 
      className="bubble" 
      style={{
        background: type === 'user' ? '#007AFF' : '#2c2c2e',
        color: type === 'user' ? 'white' : 'white',
        alignSelf: type === 'user' ? 'flex-end' : 'flex-start',
        borderRadius: '18px',
        padding: '10px 14px',
        fontSize: '15px',
        lineHeight: '1.35',
      }}
    >
      {text}
    </div>
  );
};

const Typing = () => {
  return (
    <div className="bubble" style={{ background: '#2c2c2e', padding: '12px 16px', alignSelf: 'flex-start', borderRadius: '18px' }}>
      <span className="typing-dot"></span>
      <span className="typing-dot"></span>
      <span className="typing-dot"></span>
    </div>
  );
};

function IMessageChat({ isDemo = false }: { isDemo?: boolean }) {
  const [isOpen, setIsOpen] = useState(!isDemo);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isDemo) {
      setStep(10);
    }
  }, [isDemo]);

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
        className="chat-toggle-imessage" 
        onClick={() => setIsOpen(true)}
        aria-label="Open iMessage"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>
    );
  }

  const containerClass = isDemo ? "chat-container-demo" : "chat-container floating";
  return (
    <div className={containerClass} style={{ background: '#000' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        padding: '14px 16px',
        background: 'linear-gradient(135deg, #007AFF, #5856D6)',
        color: 'white',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '18px',
            color: '#007AFF'
          }}>H</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>Habit</div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>Online</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '12px 14px', overflowY: 'auto', background: '#000', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {step === 1 && <Typing />}
        {step >= 2 && <Bubble text="Gym session at 6 PM, Ready?" type="bot" />}
        
        {step === 3 && <Typing />}
        {step >= 4 && <Bubble text="Yes" type="user" />}
        
        {step === 5 && <Typing />}
        {step >= 6 && <Bubble text="Did you complete workout?" type="bot" />}
        
        {step === 7 && <Typing />}
        {step >= 8 && <Bubble text="Done" type="user" />}
        
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

export default IMessageChat;