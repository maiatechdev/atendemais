import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.svg';

interface LoginLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    colorScheme?: 'primary' | 'success' | 'warning' | 'purple'; // For branding differentiation
    backPath?: string;
}

export default function LoginLayout({
    children,
    title,
    subtitle,
    colorScheme = 'primary',
    backPath = '/'
}: LoginLayoutProps) {
    const navigate = useNavigate();

    // Dynamic color classes based on scheme
    const colors = {
        primary: {
            bg: 'from-blue-600 to-blue-900',
            accent: 'text-primary-400',
            badge: 'bg-primary-500/20 text-primary-200'
        },
        success: {
            bg: 'from-emerald-600 to-emerald-900', // Greenish for Atendente
            accent: 'text-emerald-400',
            badge: 'bg-emerald-500/20 text-emerald-200'
        },
        warning: {
            bg: 'from-amber-600 to-amber-900', // Orange/Amber for Reception? Or we keep blue/dark
            accent: 'text-amber-400',
            badge: 'bg-amber-500/20 text-amber-200'
        },
        purple: {
            bg: 'from-purple-600 to-purple-900',
            accent: 'text-purple-400',
            badge: 'bg-purple-500/20 text-purple-200'
        }
    };

    const theme = colors[colorScheme] || colors.primary;

    return (
        <div className={`min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br ${theme.bg} relative overflow-hidden`}>
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-black opacity-20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-300">

                {/* Header Section */}
                <div className="bg-secondary-900 p-8 text-center relative overflow-hidden group">
                    {/* Subtle Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

                    <div className="relative z-10 flex flex-col items-center">
                        <img src={logo} alt="Atende+ Logo" className="h-14 mb-4 drop-shadow-lg transform group-hover:scale-110 transition-transform duration-500" />
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Atende<span className={theme.accent}>+</span>
                        </h1>

                        <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-white/10 ${theme.badge}`}>
                            {title}
                        </div>
                        <p className="text-secondary-400 text-sm mt-2 font-medium">{subtitle}</p>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-8">
                    {children}
                </div>

                {/* Footer / Back Link */}
                <div className="bg-secondary-50 border-t border-secondary-100 p-4 text-center">
                    <button
                        onClick={() => navigate(backPath)}
                        className="inline-flex items-center gap-2 text-secondary-500 hover:text-secondary-800 text-sm font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" /> Voltar ao Início
                    </button>
                </div>
            </div>

            {/* Footer Copyright */}
            <div className="absolute bottom-6 text-white/40 text-xs text-center w-full">
                &copy; 2026 Atende+. Todos os direitos reservados.
            </div>
        </div>
    );
}
