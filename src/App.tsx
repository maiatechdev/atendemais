import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "./components/Home";
import Login from "./components/Login";
import PainelPublico from "./components/PainelPublico";
import Atendente from "./components/Atendente";
import GeradorSenhas from "./components/GeradorSenhas";
import Administrador from "./components/Administrador";
import ProtectedRoute from "./components/auth/ProtectedRoute";

import { SenhasProvider } from "./context/SenhasContext";

export default function App() {
  return (
    <SenhasProvider>
      <BrowserRouter>
        <div className="min-h-screen">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/painel-publico" element={<PainelPublico />} />
            <Route
              path="/atendente"
              element={
                <ProtectedRoute moduleKey="atendente">
                  <Atendente />
                </ProtectedRoute>
              }
            />
            <Route
              path="/gerador"
              element={
                <ProtectedRoute moduleKey="gerador">
                  <GeradorSenhas />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute moduleKey="admin">
                  <Administrador />
                </ProtectedRoute>
              }
            />

            {/* Fallback route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </BrowserRouter>
    </SenhasProvider>
  );
}
