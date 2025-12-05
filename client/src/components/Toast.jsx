import React, { useEffect } from 'react';

const Toast = ({ message, type, onClose }) => {
    if (!message) return null;

    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [message, onClose]);

    const bg = type === 'success' 
        ? 'border-l-4 border-cyan-500 text-cyan-400' 
        : 'border-l-4 border-red-500 text-red-400';

    // Thêm animation style trực tiếp hoặc class
    const style = {
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
    };

    return (
        <div className={`toast ${type === 'success' ? 'notify-success' : 'notify-error'}`} style={style}>
            {type === 'success' ? <i className="fas fa-check-circle" style={{color:'var(--accent)'}}></i> : <i className="fas fa-exclamation-triangle" style={{color:'var(--danger)'}}></i>}
            <span>{message}</span>
        </div>
    );
};

export default Toast;