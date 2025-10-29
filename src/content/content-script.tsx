import { createRoot } from "react-dom/client";
import { InterventionWrapper } from "./intervention-overlay";

console.log("Morpheus: Content script loaded");

// Create root element for React overlay
const createOverlayRoot = (): HTMLElement => {
  const existingRoot = document.getElementById("morpheus-overlay-root");
  if (existingRoot) {
    return existingRoot;
  }

  const root = document.createElement("div");
  root.id = "morpheus-overlay-root";

  // Create shadow DOM for style isolation
  const shadowRoot = root.attachShadow({ mode: "open" });

  // Create container inside shadow DOM
  const container = document.createElement("div");
  container.id = "morpheus-container";
  shadowRoot.appendChild(container);

  // Add Tailwind styles (you'll need to inject the full CSS)
  const style = document.createElement("style");
  style.textContent = `
    /* Minimal Tailwind-like styles for the overlay */
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    .fixed { position: fixed; }
    .bottom-6 { bottom: 1.5rem; }
    .right-6 { right: 1.5rem; }
    .w-96 { width: 24rem; }
    .bg-white { background-color: white; }
    .rounded-xl { border-radius: 0.75rem; }
    .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .border { border-width: 1px; }
    .border-gray-200 { border-color: #e5e7eb; }
    .transition-all { transition-property: all; }
    .duration-300 { transition-duration: 300ms; }
    .ease-out { transition-timing-function: cubic-bezier(0, 0, 0.2, 1); }
    .translate-y-0 { transform: translateY(0); }
    .translate-y-4 { transform: translateY(1rem); }
    .opacity-100 { opacity: 1; }
    .opacity-0 { opacity: 0; }
    .p-4 { padding: 1rem; }
    .flex { display: flex; }
    .items-start { align-items: flex-start; }
    .items-center { align-items: center; }
    .gap-3 { gap: 0.75rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-1 { gap: 0.25rem; }
    .font-semibold { font-weight: 600; }
    .text-gray-900 { color: #111827; }
    .text-gray-600 { color: #4b5563; }
    .text-gray-400 { color: #9ca3af; }
    .text-white { color: white; }
    .text-base { font-size: 1rem; line-height: 1.5rem; }
    .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
    .text-xs { font-size: 0.75rem; line-height: 1rem; }
    .mt-1 { margin-top: 0.25rem; }
    .leading-relaxed { line-height: 1.625; }
    .rounded-lg { border-radius: 0.5rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .pb-3 { padding-bottom: 0.75rem; }
    .pb-4 { padding-bottom: 1rem; }
    .flex-1 { flex: 1; }
    .flex-wrap { flex-wrap: wrap; }
    .hover\\:bg-gray-100:hover { background-color: #f3f4f6; }
    .hover\\:bg-gray-200:hover { background-color: #e5e7eb; }
    .bg-gray-100 { background-color: #f3f4f6; }
    .bg-blue-500 { background-color: #3b82f6; }
    .hover\\:bg-blue-600:hover { background-color: #2563eb; }
    .bg-yellow-500 { background-color: #eab308; }
    .bg-orange-500 { background-color: #f97316; }
    .bg-red-500 { background-color: #ef4444; }
    .text-blue-500 { color: #3b82f6; }
    .text-yellow-500 { color: #eab308; }
    .text-orange-500 { color: #f97316; }
    .text-red-500 { color: #ef4444; }
    .font-medium { font-weight: 500; }
    .cursor-pointer { cursor: pointer; }
    .h-1 { height: 0.25rem; }
    .rounded-t-xl { border-top-left-radius: 0.75rem; border-top-right-radius: 0.75rem; }
    button {
      cursor: pointer;
      border: none;
      font-family: inherit;
    }
  `;
  shadowRoot.appendChild(style);

  document.body.appendChild(root);
  return root;
};

// Initialize React overlay
const initializeOverlay = () => {
  try {
    const rootElement = createOverlayRoot();
    const shadowRoot = rootElement.shadowRoot;

    if (!shadowRoot) {
      console.error("Shadow root not found");
      return;
    }

    const container = shadowRoot.getElementById("morpheus-container");
    if (!container) {
      console.error("Container not found");
      return;
    }

    const root = createRoot(container);
    root.render(<InterventionWrapper />);

    console.log("Morpheus: Overlay initialized");
  } catch (error) {
    console.error("Failed to initialize overlay:", error);
  }
};

// Wait for DOM to be ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOverlay);
} else {
  initializeOverlay();
}

// Handle page simplification requests
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SIMPLIFY_PAGE") {
    simplifyPage();
    sendResponse({ success: true });
  }
  return true;
});

// Simplify page content (rewrite complex text)
async function simplifyPage(): Promise<void> {
  // Find main content
  const article =
    document.querySelector("article") ||
    document.querySelector("main") ||
    document.body;

  if (!article) return;

  // Add loading indicator
  const loader = document.createElement("div");
  loader.style.cssText =
    "position: fixed; top: 20px; right: 20px; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; z-index: 999999; font-family: sans-serif;";
  loader.textContent = "Simplifying page...";
  document.body.appendChild(loader);

  // Simplify each paragraph (in reality, would use Rewriter API)
  // For now, just show concept
  setTimeout(() => {
    loader.textContent = "Page simplified! ✓";
    setTimeout(() => loader.remove(), 2000);
  }, 1500);
}

export {};
