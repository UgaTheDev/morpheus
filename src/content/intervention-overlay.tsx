import React, { useState, useEffect } from "react";
import { X, Brain, Sparkles } from "lucide-react";
import type { Intervention, Action } from "../lib/types";

interface InterventionOverlayProps {
  intervention: Intervention;
  onAction: (action: Action) => void;
  onDismiss: () => void;
}

export const InterventionOverlay: React.FC<InterventionOverlayProps> = ({
  intervention,
  onAction,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  };

  const handleAction = (action: Action) => {
    setIsExiting(true);
    setTimeout(() => {
      onAction(action);
    }, 300);
  };

  const Icon = Brain;

  // Priority to color mapping
  const priorityColors = {
    low: "bg-blue-500",
    medium: "bg-yellow-500",
    high: "bg-orange-500",
    critical: "bg-red-500",
  };

  const priorityColor = priorityColors[intervention.priority];

  return (
    <div
      className={`
        fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl border border-gray-200
        transition-all duration-300 ease-out z-[999999]
        ${
          isVisible && !isExiting
            ? "translate-y-0 opacity-100"
            : "translate-y-4 opacity-0"
        }
      `}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Priority indicator bar */}
      <div className={`h-1 ${priorityColor} rounded-t-xl`} />

      {/* Header */}
      <div className="p-4 flex items-start gap-3">
        <div className={`p-2 ${priorityColor} bg-opacity-10 rounded-lg`}>
          <Icon
            className={`w-5 h-5 ${priorityColor.replace("bg-", "text-")}`}
          />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-base">
            {intervention.title}
          </h3>
          <p className="text-gray-600 text-sm mt-1 leading-relaxed">
            {intervention.message}
          </p>
        </div>

        {true && ( // was: {intervention.dismissible && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex flex-wrap gap-2">
        {intervention.action && (
          <button
            onClick={() => handleAction(intervention.action!)}
            className="..."
          >
            {intervention.action.type === "open_url" ? "Open" : "Take Action"}
          </button>
        )}
      </div>

      {/* Subtle branding */}
      <div className="px-4 pb-3 text-xs text-gray-400 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        <span>Morpheus AI</span>
      </div>
    </div>
  );
};

// Wrapper component for the overlay
export const InterventionWrapper: React.FC = () => {
  const [intervention, setIntervention] = useState<Intervention | null>(null);

  useEffect(() => {
    // Listen for intervention messages from background script
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === "SHOW_INTERVENTION") {
        setIntervention(message.data);
        sendResponse({ received: true });
      }
      return true;
    });
  }, []);

  const handleAction = (action: Action) => {
    if (!intervention) return;

    // Send action to background script
    chrome.runtime.sendMessage({
      type: "INTERVENTION_ACTION",
      interventionId: intervention.id,
      action,
    });

    setIntervention(null);
  };

  const handleDismiss = () => {
    if (!intervention) return;

    // Mark as dismissed
    chrome.runtime.sendMessage({
      type: "INTERVENTION_ACTION",
      interventionId: intervention.id,
      action: { type: "dismiss", label: "Dismissed" },
    });

    setIntervention(null);
  };

  if (!intervention) return null;

  return (
    <InterventionOverlay
      intervention={intervention}
      onAction={handleAction}
      onDismiss={handleDismiss}
    />
  );
};
