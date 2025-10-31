// src/content/intervention-overlay-premium.tsx
// Beautiful intervention overlay with glassmorphism

import React, { useState, useEffect } from "react";
import { X, Brain, Sparkles, Zap, Clock, Target } from "lucide-react";
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
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(), 300);
  };

  const handleAction = (action: Action) => {
    setIsExiting(true);
    setTimeout(() => onAction(action), 300);
  };

  const priorityConfig = {
    low: {
      gradient: "from-blue-500 to-blue-600",
      icon: Brain,
      glow: "shadow-blue-500/50",
    },
    medium: {
      gradient: "from-yellow-500 to-orange-500",
      icon: Zap,
      glow: "shadow-orange-500/50",
    },
    high: {
      gradient: "from-orange-500 to-red-500",
      icon: Target,
      glow: "shadow-red-500/50",
    },
    critical: {
      gradient: "from-red-500 to-pink-600",
      icon: Target,
      glow: "shadow-red-500/50",
    },
  };

  const config = priorityConfig[intervention.priority];
  const Icon = config.icon;

  return (
    <div
      className={`
        fixed bottom-8 right-8 w-[420px] z-[999999]
        transition-all duration-500 ease-out
        ${
          isVisible && !isExiting
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-8 opacity-0 scale-95"
        }
      `}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Glow Effect */}
      <div
        className={`absolute inset-0 rounded-3xl bg-gradient-to-r ${config.gradient} blur-2xl opacity-30 ${config.glow}`}
      ></div>

      {/* Main Card */}
      <div className="relative bg-white/90 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500 to-pink-500"></div>
        </div>

        {/* Top Gradient Bar */}
        <div className={`h-2 bg-gradient-to-r ${config.gradient}`}></div>

        {/* Header */}
        <div className="relative p-6 pb-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div
              className={`p-3 rounded-2xl bg-gradient-to-r ${config.gradient} shadow-lg ${config.glow}`}
            >
              <Icon className="w-7 h-7 text-white" />
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                {intervention.title}
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {intervention.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200 group"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Actions */}
        {intervention.action && (
          <div className="relative px-6 pb-6">
            <button
              onClick={() => handleAction(intervention.action!)}
              className={`w-full py-4 rounded-2xl font-semibold text-white bg-gradient-to-r ${config.gradient} shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]`}
            >
              {intervention.action.label || "Take Action"}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="relative px-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Brain className="w-3.5 h-3.5" />
            <span className="font-medium">Morpheus AI</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Just now</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapper component
export const InterventionWrapper: React.FC = () => {
  const [intervention, setIntervention] = useState<Intervention | null>(null);

  useEffect(() => {
    console.log("🎨 Premium InterventionWrapper mounted");

    const handleMessage = (
      message: any,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      console.log("📨 Premium intervention received:", message.type);

      if (message.type === "SHOW_INTERVENTION") {
        console.log("🎯 Showing premium intervention:", message.data);
        setIntervention(message.data);
        sendResponse({ received: true, success: true });
        return true;
      }

      return false;
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  const handleAction = (action: Action) => {
    if (!intervention) return;

    console.log("🎬 Action taken:", action.type);

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

    if (action.type === "block_site") {
      window.close();
    }

    setIntervention(null);
  };

  const handleDismiss = () => {
    if (!intervention) return;

    console.log("❌ Intervention dismissed");

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

  if (!intervention) return null;

  return (
    <InterventionOverlay
      intervention={intervention}
      onAction={handleAction}
      onDismiss={handleDismiss}
    />
  );
};
