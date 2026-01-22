import React, { useState } from 'react';
import { AlertTriangle, Lock, Mail, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
    onLogin: (email: string, pass: string) => Promise<void>;
    isLoading: boolean;
    error?: string;
    defaultEmail?: string;
}

export default function LoginForm({ onLogin, isLoading, error, defaultEmail = '' }: LoginFormProps) {
    const [email, setEmail] = useState(defaultEmail);
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="block text-secondary-700 text-sm font-bold ml-1">Email / Usuário</label>
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors">
                        <Mail className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-secondary-50 border-2 border-secondary-200 rounded-xl outline-none focus:border-primary-500 focus:bg-white transition-all text-secondary-900 font-medium placeholder-secondary-400"
                        placeholder="nome@exemplo.com"
                        required
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-1">
                <label className="block text-secondary-700 text-sm font-bold ml-1">Senha</label>
                <div className="relative group">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-400 group-focus-within:text-primary-500 transition-colors">
                        <Lock className="w-5 h-5" />
                    </div>
                    <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-secondary-50 border-2 border-secondary-200 rounded-xl outline-none focus:border-primary-500 focus:bg-white transition-all text-secondary-900 font-medium placeholder-secondary-400"
                        placeholder="Digite sua senha"
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 transition-colors p-2 rounded-full hover:bg-secondary-100"
                        tabIndex={-1}
                        title={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-danger-50 text-danger-600 p-3 rounded-xl text-sm flex items-center gap-2 border border-danger-100 animate-in fade-in slide-in-from-top-1">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 disabled:cursor-not-allowed text-white py-3.5 rounded-xl font-bold shadow-lg shadow-primary-200 hover:shadow-primary-300 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[15px]"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Validando Acesso...
                    </>
                ) : (
                    <>
                        Acessar Sistema
                        <ArrowRight className="w-5 h-5" />
                    </>
                )}
            </button>
        </form>
    );
}
