"use client";

import { useEffect } from "react";

const swaggerUiVersion = "5.32.6";
const swaggerUiBaseUrl = `https://unpkg.com/swagger-ui-dist@${swaggerUiVersion}`;
const swaggerUiScriptId = "swagger-ui-bundle";

declare global {
  interface Window {
    SwaggerUIBundle?: (config: { url: string; dom_id: string }) => unknown;
  }
}

const initializeSwaggerUi = () => {
  if (typeof window.SwaggerUIBundle !== "function") {
    return;
  }

  window.SwaggerUIBundle({
    url: "/api/openapi.json",
    dom_id: "#swagger-ui",
  });
};

export const SwaggerUiViewer = () => {
  useEffect(() => {
    if (typeof window.SwaggerUIBundle === "function") {
      initializeSwaggerUi();
      return;
    }

    const existingScript = document.getElementById(swaggerUiScriptId);
    if (existingScript instanceof HTMLScriptElement) {
      existingScript.addEventListener("load", initializeSwaggerUi, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = swaggerUiScriptId;
    script.src = `${swaggerUiBaseUrl}/swagger-ui-bundle.js`;
    script.async = true;
    script.addEventListener("load", initializeSwaggerUi, { once: true });
    document.body.appendChild(script);
  }, []);

  return (
    <>
      <link rel="stylesheet" href={`${swaggerUiBaseUrl}/swagger-ui.css`} />
      <main id="swagger-ui" />
    </>
  );
};
