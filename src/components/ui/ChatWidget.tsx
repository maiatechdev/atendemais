import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useSenhas, type ChatMessage } from '../../context/SenhasContext';

interface ChatWidgetProps {
    usuarioId: string;
    usuarioNome: string;
}

const MUTE_STORAGE_KEY = 'atendemais_chat_muted';
const GERAL_KEY = 'geral';

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

// Conversation key from the current user's point of view: 'geral' or the other user's id
function convKeyFor(msg: ChatMessage, usuarioId: string): string {
    if (!msg.destinatarioId) return GERAL_KEY;
    return msg.autorId === usuarioId ? msg.destinatarioId : msg.autorId;
}

function playNotificationBeep(audioCtxRef: React.MutableRefObject<AudioContext | null>) {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) audioCtxRef.current = new AudioCtx();
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch {
        // Ambiente sem suporte a Web Audio - ignora silenciosamente
    }
}

export default function ChatWidget({ usuarioId, usuarioNome }: ChatWidgetProps) {
    const { mensagensChat, enviarMensagem, buscarHistoricoChat, usuarios, registerUserInChat } = useSenhas();

    const [aberto, setAberto] = useState(false);
    const [texto, setTexto] = useState('');
    const [destinatarioId, setDestinatarioId] = useState<string | null>(null);
    const [destinatarioNome, setDestinatarioNome] = useState<string | null>(null);
    const [unreadByConv, setUnreadByConv] = useState<Record<string, number>>({});
    const [recipientMenuOpen, setRecipientMenuOpen] = useState(false);
    const [muted, setMuted] = useState<boolean>(() => {
        try {
            return localStorage.getItem(MUTE_STORAGE_KEY) === '1';
        } catch {
            return false;
        }
    });

    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const processedMsgIds = useRef<Set<string>>(new Set());
    const historyLoaded = useRef(false);
    const audioCtxRef = useRef<AudioContext | null>(null);

    const activeConvKey = destinatarioId || GERAL_KEY;

    // Load history once on mount or when usuarioId changes
    useEffect(() => {
        if (usuarioId) {
            registerUserInChat(usuarioId);
            buscarHistoricoChat(usuarioId);
        }
    }, [usuarioId, usuarioNome]);

    // Scroll to bottom when new messages arrive
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [mensagensChat, aberto]);

    // Track unread messages per conversation + play notification sound
    useEffect(() => {
        if (!historyLoaded.current) {
            // First load: mark all existing messages as already seen, don't notify for history
            mensagensChat.forEach((m) => processedMsgIds.current.add(m.id));
            historyLoaded.current = true;
            return;
        }

        const novasMensagens = mensagensChat.filter((m) => !processedMsgIds.current.has(m.id));
        if (novasMensagens.length === 0) return;

        let houveNotificavel = false;
        const incrementos: Record<string, number> = {};

        novasMensagens.forEach((msg) => {
            processedMsgIds.current.add(msg.id);
            if (msg.autorId === usuarioId) return; // Mensagens que eu mesmo enviei não geram notificação

            const key = convKeyFor(msg, usuarioId);
            const estouVendoEssaConversa = aberto && key === activeConvKey;
            if (estouVendoEssaConversa) return;

            incrementos[key] = (incrementos[key] || 0) + 1;
            houveNotificavel = true;
        });

        if (houveNotificavel) {
            setUnreadByConv((prev) => {
                const next = { ...prev };
                for (const key in incrementos) {
                    next[key] = (next[key] || 0) + incrementos[key];
                }
                return next;
            });
            if (!muted) playNotificationBeep(audioCtxRef);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mensagensChat, aberto, activeConvKey, usuarioId, muted]);

    const marcarConversaComoLida = (key: string) => {
        setUnreadByConv((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handleAbrir = () => {
        setAberto(true);
        marcarConversaComoLida(activeConvKey);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleSelecionarConversa = (id: string | null, nome: string | null) => {
        setDestinatarioId(id);
        setDestinatarioNome(nome);
        marcarConversaComoLida(id || GERAL_KEY);
        setRecipientMenuOpen(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const toggleMuted = () => {
        setMuted((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(MUTE_STORAGE_KEY, next ? '1' : '0');
            } catch {
                // localStorage indisponível - preferência não será persistida
            }
            return next;
        });
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

    // Show only messages belonging to the conversation currently open in the "Para:" selector
    const filteredMessages = mensagensChat.filter(msg => {
        if (!destinatarioId) return !msg.destinatarioId; // Equipe (Geral): só mensagens públicas
        return (
            (msg.autorId === usuarioId && msg.destinatarioId === destinatarioId) ||
            (msg.autorId === destinatarioId && msg.destinatarioId === usuarioId)
        );
    });

    const totalNaoLidas = Object.values(unreadByConv).reduce((a, b) => a + b, 0);
    const outrasConversasNaoLidas = totalNaoLidas - (unreadByConv[activeConvKey] || 0);

    const outrosUsuarios = usuarios.filter(u => u.id !== usuarioId);
    const conversas = [
        { id: null as string | null, nome: 'Equipe (Geral)', key: GERAL_KEY },
        ...outrosUsuarios.map(u => ({ id: u.id, nome: u.nome, key: u.id })),
    ];

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
                        {totalNaoLidas > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1 shadow-md animate-bounce">
                                {totalNaoLidas > 9 ? '9+' : totalNaoLidas}
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
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={toggleMuted}
                                    className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                                    title={muted ? 'Ativar som de notificações' : 'Silenciar notificações'}
                                    aria-label={muted ? 'Ativar som de notificações' : 'Silenciar notificações'}
                                >
                                    {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => setAberto(false)}
                                    className="text-white/70 hover:text-white p-1 rounded-lg transition-colors"
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Recipient Selector */}
                        <div className="relative flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-blue-100/70 uppercase">Para:</span>
                            <button
                                onClick={() => setRecipientMenuOpen((v) => !v)}
                                className="relative bg-blue-500/50 text-white text-[11px] font-semibold rounded px-2 py-0.5 outline-none border border-white/20 hover:bg-blue-500/70 transition-colors cursor-pointer flex-1 flex items-center justify-between gap-1"
                            >
                                <span className="truncate">{destinatarioNome || 'Equipe (Geral)'}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                    {outrasConversasNaoLidas > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                                            {outrasConversasNaoLidas > 9 ? '9+' : outrasConversasNaoLidas}
                                        </span>
                                    )}
                                    <ChevronDown className="w-3 h-3" />
                                </span>
                            </button>

                            {recipientMenuOpen && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 max-h-56 overflow-y-auto z-10">
                                    {conversas.map((c) => {
                                        const unread = unreadByConv[c.key] || 0;
                                        const isActive = c.key === activeConvKey;
                                        return (
                                            <button
                                                key={c.key}
                                                onClick={() => handleSelecionarConversa(c.id, c.id ? c.nome : null)}
                                                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 transition-colors ${isActive ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-700'}`}
                                            >
                                                <span className="truncate">{c.nome}</span>
                                                {unread > 0 && (
                                                    <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center shrink-0">
                                                        {unread > 9 ? '9+' : unread}
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
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
