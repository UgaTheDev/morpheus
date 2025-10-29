import React from "react";
import ReactDOM from "react-dom/client";
import { SidePanel } from "./SidePanel";
import { messageRouter, registerSidePanelHandlers } from "../shared/messages";
import { db } from "../lib/db";

async function initialize() {
  try {
    await db.initialize();
    messageRouter.initialize();
    registerSidePanelHandlers();

    const root = document.getElementById("root");
    if (root) {
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <SidePanel />
        </React.StrictMode>
      );
    }
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
