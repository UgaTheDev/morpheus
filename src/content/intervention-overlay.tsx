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

        <button
          onClick={handleDismiss}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Actions */}
      {intervention.action && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <button
            onClick={() => handleAction(intervention.action!)}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            {intervention.action.label}
          </button>
        </div>
      )}

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
    console.log("🎨 InterventionWrapper mounted");

    // Listen for intervention messages from background script
    const handleMessage = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      console.log("📨 InterventionWrapper received message:", message.type);

      if (message.type === "SHOW_INTERVENTION") {
        console.log("🎯 Showing intervention:", message.data);
        setIntervention(message.data);
        sendResponse({ received: true, success: true });
        return true;
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);

    // Cleanup
    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleAction = (action: Action) => {
    if (!intervention) return;

    console.log("🎬 Intervention action taken:", action.type);

    // Send action to background script
    try {
      chrome.runtime.sendMessage({
        type: "INTERVENTION_RESPONSE",
        interventionId: intervention.id,
        outcome: action.type,
        action,
        site: window.location.href,
        interventionMessage: intervention.message,
      });
    } catch (error) {
      console.error("Failed to send intervention response:", error);
    }

    // Handle specific actions (allow for actions not declared in the Action union)
    if ((action as any).type === "close_tab") {
      window.close();
    }

    setIntervention(null);
  };

  const handleDismiss = () => {
    if (!intervention) return;

    console.log("❌ Intervention dismissed");

    // Mark as dismissed
    try {
      chrome.runtime.sendMessage({
        type: "INTERVENTION_RESPONSE",
        interventionId: intervention.id,
        outcome: "dismissed",
        action: { type: "dismiss", label: "Dismissed" },
        site: window.location.href,
        interventionMessage: intervention.message,
      });
    } catch (error) {
      console.error("Failed to send dismissal:", error);
    }

    setIntervention(null);
  };

  if (!intervention) {
    console.log("💤 No intervention to display");
    return null;
  }

  console.log("🎨 Rendering intervention:", intervention.title);

  return (
    <InterventionOverlay
      intervention={intervention}
      onAction={handleAction}
      onDismiss={handleDismiss}
    />
  );
};
