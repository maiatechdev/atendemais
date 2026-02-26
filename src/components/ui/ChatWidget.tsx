import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ChevronDown } from 'lucide-react';
import { useSenhas, type ChatMessage } from '../../context/SenhasContext';

interface ChatWidgetProps {
    usuarioId: string;
    usuarioNome: string;
}

function getInitials(nome: string): string {
    return nome
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? '')
        .join('');
}

// Deterministic color per user based on name hash
const AVATAR_COLORS = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
    'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-rose-500',
];

function getUserColor(nome: string): string {
    let hash = 0;
    for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatTime(dateStr: string): string {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export default function ChatWidget({ usuarioId, usuarioNome }: ChatWidgetProps) {
    const { mensagensChat, enviarMensagem, buscarHistoricoChat, usuarios, registerUserInChat } = useSenhas();

    const [aberto, setAberto] = useState(false);
    const [texto, setTexto] = useState('');
    const [naoLidas, setNaoLidas] = useState(0);
    const [destinatarioId, setDestinatarioId] = useState<string | null>(null);
    const [destinatarioNome, setDestinatarioNome] = useState<string | null>(null);

    const ultimaMsgVistaid = useRef<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const historyLoaded = useRef(false);

    // Load history once on mount or when usuarioId changes
    useEffect(() => {
        if (usuarioId) {
            console.log(`[ChatWidget] Inicializando para ${usuarioNome} (${usuarioId})`);
            registerUserInChat(usuarioId);
            buscarHistoricoChat(usuarioId);
            historyLoaded.current = true;
        }
    }, [usuarioId, usuarioNome]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [mensagensChat, aberto]);

    // Track unread count when chat is closed
    useEffect(() => {
        if (!aberto && mensagensChat.length > 0) {
            const ultima = mensagensChat[mensagensChat.length - 1];
            // Only count if it's for me (or general) and not from me
            const isForMe = !ultima.destinatarioId || ultima.destinatarioId === usuarioId;
            if (isForMe && ultima.autorId !== usuarioId && ultima.id !== ultimaMsgVistaid.current) {
                setNaoLidas((prev) => prev + 1);
            }
        }
    }, [mensagensChat, aberto, usuarioId]);

    // Reset unread when opened
    const handleAbrir = () => {
        setAberto(true);
        setNaoLidas(0);
        if (mensagensChat.length > 0) {
            ultimaMsgVistaid.current = mensagensChat[mensagensChat.length - 1].id;
        }
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleEnviar = () => {
        if (!texto.trim()) return;
        enviarMensagem(usuarioId, usuarioNome, texto.trim(), destinatarioId || undefined, destinatarioNome || undefined);
        setTexto('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEnviar();
        }
    };

    // Filter messages for display (optional since server filters, but good for client-side consistency)
    const filteredMessages = mensagensChat.filter(msg => {
        if (!msg.destinatarioId) return true; // Public
        return msg.autorId === usuarioId || msg.destinatarioId === usuarioId;
    });

    return (
        <div className="chat-widget-container">
            {/* Floating Button */}
            <button
                onClick={aberto ? () => setAberto(false) : handleAbrir}
                className="fixed bottom-6 right-6 z-[9999] w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-2xl shadow-blue-300 transition-all hover:scale-110 active:scale-95"
                title="Chat Interno"
                aria-label="Abrir chat"
            >
                {aberto ? (
                    <X className="w-6 h-6" />
                ) : (
                    <>
                        <MessageSquare className="w-6 h-6" />
                        {naoLidas > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-md animate-bounce">
                                {naoLidas > 9 ? '9+' : naoLidas}
                            </span>
                        )}
                    </>
                )}
            </button>

            {/* Chat Panel */}
            {aberto && (
                <div
                    className="fixed bottom-24 right-6 z-[9999] w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300"
                    style={{ maxHeight: '70vh' }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-white/90" />
                                <div>
                                    <h3 className="font-bold text-white text-sm leading-none">Chat Interno</h3>
                                    <p className="text-blue-100 text-[10px] mt-0.5">Equipe Atende+</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setAberto(false)}
                                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Recipient Selector */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-blue-100/70 uppercase">Para:</span>
                            <select
                                value={destinatarioId || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) {
                                        setDestinatarioId(null);
                                        setDestinatarioNome(null);
                                    } else {
                                        const u = usuarios.find(usr => usr.id === val);
                                        setDestinatarioId(val);
                                        setDestinatarioNome(u?.nome || 'Usuário');
                                    }
                                }}
                                className="bg-blue-500/50 text-white text-[11px] font-semibold rounded px-2 py-0.5 outline-none border border-white/20 hover:bg-blue-500/70 transition-colors cursor-pointer flex-1"
                            >
                                <option value="" className="text-gray-800">Equipe (Geral)</option>
                                {usuarios.filter(u => u.id !== usuarioId).map(u => (
                                    <option key={u.id} value={u.id} className="text-gray-800">{u.nome}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Messages List */}
                    <div
                        ref={listRef}
                        className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50"
                        style={{ minHeight: '200px', maxHeight: 'calc(70vh - 160px)' }}
                    >
                        {filteredMessages.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">Nenhuma mensagem ainda.<br />Seja o primeiro a falar!</p>
                            </div>
                        ) : (
                            filteredMessages.map((msg, idx) => {
                                const isOwn = msg.autorId === usuarioId;
                                const isPrivate = !!msg.destinatarioId;
                                const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
                                const showAuthor = !prevMsg || prevMsg.autorId !== msg.autorId;

                                return (
                                    <div
                                        key={msg.id}
                                        className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                                    >
                                        {/* Avatar */}
                                        {!isOwn && (
                                            <div
                                                className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm ${getUserColor(msg.autorNome)} ${!showAuthor ? 'opacity-0' : ''}`}
                                            >
                                                {getInitials(msg.autorNome)}
                                            </div>
                                        )}

                                        <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
                                            {showAuthor && !isOwn && (
                                                <span className="text-xs font-semibold text-gray-500 ml-1">{msg.autorNome}</span>
                                            )}
                                            <div
                                                className={`px-3 py-2 rounded-2xl text-sm leading-snug shadow-sm relative ${isOwn
                                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                                    } ${isPrivate ? 'ring-2 ring-purple-400/30' : ''}`}
                                            >
                                                {isPrivate && (
                                                    <div className={`text-[9px] font-bold uppercase mb-1 ${isOwn ? 'text-blue-100' : 'text-purple-500'}`}>
                                                        {isOwn ? `Para: ${msg.destinatarioNome}` : 'Privado'}
                                                    </div>
                                                )}
                                                {msg.texto}
                                            </div>
                                            <span className="text-[10px] text-gray-400 px-1">{formatTime(msg.criadoEm)}</span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Input */}
                    <div className="px-3 py-3 bg-white border-t border-gray-100 flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={destinatarioId ? `Mensagem para ${destinatarioNome}...` : "Mensagem para equipe..."}
                            maxLength={500}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                        />
                        <button
                            onClick={handleEnviar}
                            disabled={!texto.trim()}
                            className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all active:scale-95"
                            aria-label="Enviar"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
