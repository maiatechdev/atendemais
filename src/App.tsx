import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import PainelPublico from "./components/PainelPublico";
import Atendente from "./components/Atendente";
import GeradorSenhas from "./components/GeradorSenhas";
import Administrador from "./components/Administrador";

import { SenhasProvider } from "./context/SenhasContext";

export default function App() {
  return (
    <SenhasProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/painel-publico" element={<PainelPublico />} />
            <Route path="/atendente" element={<Atendente />} />
            <Route path="/gerador" element={<GeradorSenhas />} />
            <Route path="/admin" element={<Administrador />} />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </SenhasProvider>
  );
}