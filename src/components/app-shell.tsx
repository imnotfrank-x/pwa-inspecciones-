import type { ReactNode } from "react";

type AppShellProps = Readonly<{
  children: ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido principal
      </a>

      <header className="app-header">
        <div className="app-header-inner">
          <a
            aria-label="LabInspect, ir al inicio"
            className="app-brand"
            href="/"
          >
            <span aria-hidden="true" className="app-brand-mark">
              LI
            </span>
            <span className="app-brand-copy">
              <strong>LabInspect</strong>
              <small>Mantenimiento de laboratorios</small>
            </span>
          </a>

          <nav
            aria-label="Navegación principal"
            className="primary-navigation"
          >
            <a href="/">Inicio</a>
            <a href="/#inspecciones">Inspecciones</a>
            <a href="/#state-verification">Estados</a>
          </nav>
        </div>
      </header>

      <main
        className="app-main"
        id="contenido-principal"
        tabIndex={-1}
      >
        {children}
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <p>
            Aplicaciones Web Progresivas · Universidad Tecnológica de
            Tehuacán
          </p>
          <p>Demostración académica con datos exclusivamente sintéticos.</p>
        </div>
      </footer>
    </div>
  );
}