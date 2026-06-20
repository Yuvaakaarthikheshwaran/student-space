import React, { useState, useRef, useEffect } from 'react';
import { PRACTICALS_DATA } from '../../data/practicals';

// We now pass the global 'username' into the terminal securely
export default function InteractiveTerminal({ onClose, username }: { onClose: () => void, username: string }) {
  const [history, setHistory] = useState<{ text: string, type: 'system' | 'user' | 'output' | 'error' | 'success' }[]>([
    { text: "Cosmic Drift OS v9.0.1 (tty1)", type: "system" },
    { text: `Welcome, Agent ${username}.`, type: "system" },
    { text: "Unauthorized access is strictly prohibited.", type: "system" },
    { text: "Type 'help' for a list of commands.", type: "system" }
  ]);
  const [input, setInput] = useState('');
  const [isRoot, setIsRoot] = useState(false);
  const [awaitingPassword, setAwaitingPassword] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd && !awaitingPassword) return;

    // Use the dynamic username in the prompt history
    const promptUser = isRoot ? 'root' : username;
    const promptSymbol = isRoot ? '~#' : '~$';

    const newHistory = [...history, { text: `${promptUser}@cosmic-drift:${promptSymbol} ${awaitingPassword ? '********' : cmd}`, type: 'user' as const }];
    setInput('');

    if (awaitingPassword) {
      if (cmd === '0xCS26') {
        setIsRoot(true);
        newHistory.push({ text: "Authentication successful. Superuser privileges granted.", type: "success" });
      } else {
        newHistory.push({ text: "su: Authentication failure", type: "error" });
      }
      setAwaitingPassword(false);
      setHistory(newHistory);
      return;
    }

    const args = cmd.split(' ');
    const mainCmd = args[0].toLowerCase();

    switch (mainCmd) {
      case 'help':
        newHistory.push({ text: "Available commands: clear, help, ls, cat, su, exit", type: "output" });
        break;
      case 'clear':
        setHistory([]);
        return;
      case 'ls':
        if (isRoot) {
          newHistory.push({ text: "engine_core.sys  nav_data.bin  practicals_26_27.txt", type: "output" });
        } else {
          newHistory.push({ text: "readme.txt  public_telemetry.log", type: "output" });
        }
        break;
      case 'cat':
        if (args[1] === 'practicals_26_27.txt') {
          if (isRoot) {
            newHistory.push({ text: `Decrypting file payload for Agent ${username}...`, type: "system" });
            newHistory.push({ text: PRACTICALS_DATA, type: "output" });
          } else {
            newHistory.push({ text: "cat: practicals_26_27.txt: Permission denied. Root access required.", type: "error" });
          }
        } else if (args[1] === 'readme.txt') {
          newHistory.push({ text: `Welcome to the Cosmic Drift navigation console, Agent ${username}.`, type: "output" });
        } else {
          newHistory.push({ text: `cat: ${args[1] || ''}: No such file or directory`, type: "error" });
        }
        break;
      case 'su':
        if (args[1] === 'admin' || args[1] === 'root') {
          if (isRoot) {
            newHistory.push({ text: "Already running as root.", type: "output" });
          } else {
            newHistory.push({ text: "Password:", type: "system" });
            setAwaitingPassword(true);
          }
        } else {
          newHistory.push({ text: "Usage: su admin", type: "error" });
        }
        break;
      case 'exit':
        onClose();
        return;
      default:
        if (mainCmd) newHistory.push({ text: `${mainCmd}: command not found`, type: "error" });
    }
    
    setHistory(newHistory);
  };

  return (
    <div 
      className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-8" 
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}
      onPointerDown={onClose}
    >
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', opacity: 0.1, backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #0f0 2px, #0f0 4px)" }}></div>
      <div 
        className="relative w-full max-w-5xl h-[85vh] bg-black border border-green-500/50 rounded-lg shadow-[0_0_50px_rgba(0,255,0,0.1)] flex flex-col font-mono text-green-500 overflow-hidden" 
        style={{ position: 'relative', width: '100%', maxWidth: '1024px', height: '85vh', background: '#000', border: '1px solid rgba(0,255,0,0.5)', borderRadius: '8px', display: 'flex', flexDirection: 'column', fontFamily: 'monospace', color: '#22c55e', overflow: 'hidden' }}
        onPointerDown={(e) => { e.stopPropagation(); inputRef.current?.focus(); }}
      >
        <div className="flex justify-between items-center bg-green-950/30 border-b border-green-500/50 p-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(5,46,22,0.3)', borderBottom: '1px solid rgba(0,255,0,0.5)', padding: '16px' }}>
          <div className="flex items-center gap-3" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#0f0]" style={{ width: '12px', height: '12px', backgroundColor: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px #0f0' }}></div>
            <h2 className="font-bold tracking-widest uppercase text-sm" style={{ fontWeight: 'bold', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '0.875rem', margin: 0 }}>TTY1 - SECURE SHELL</h2>
          </div>
          <button onClick={onClose} className="text-green-500 hover:text-black hover:bg-green-500 px-4 py-2 border border-green-500 rounded transition-colors text-xs font-bold uppercase tracking-widest cursor-pointer" style={{ color: '#22c55e', background: 'transparent', padding: '8px 16px', border: '1px solid #22c55e', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer' }}>Disconnect</button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 text-sm whitespace-pre-wrap leading-relaxed" style={{ padding: '24px', overflowY: 'auto', flex: 1, fontSize: '0.875rem', whiteSpace: 'pre-wrap', lineHeight: 1.625 }}>
          {history.map((line, i) => (
            <div key={i} style={{ color: line.type === 'error' ? '#ef4444' : line.type === 'system' ? '#86efac' : line.type === 'success' ? '#3b82f6' : '#22c55e', marginBottom: '4px' }}>
              {line.text}
            </div>
          ))}
          <form onSubmit={handleCommand} style={{ display: 'flex', marginTop: '8px' }}>
            <span style={{ marginRight: '8px', color: isRoot ? '#3b82f6' : '#22c55e' }}>
              {isRoot ? "root" : username}@cosmic-drift:{isRoot ? "~#" : "~$"} {awaitingPassword && "Password:"}
            </span>
            <input ref={inputRef} type={awaitingPassword ? "password" : "text"} value={input} onChange={(e) => setInput(e.target.value)} className="bg-transparent border-none outline-none text-green-500 flex-1 font-mono" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#22c55e', flex: 1, fontFamily: 'monospace', fontSize: '0.875rem' }} autoComplete="off" spellCheck="false" autoFocus />
          </form>
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}
