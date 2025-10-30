import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Download, Zap } from "lucide-react";
import { getChromeAI } from "../../lib/chrome-ai-client";

export const APIStatus: React.FC = () => {
  const [status, setStatus] = useState({
    promptAPI: false,
    summarizerAPI: false,
    translatorAPI: false,
    initialized: false,
    loading: true,
  });

  useEffect(() => {
    checkAPIStatus();
  }, []);

  const checkAPIStatus = async () => {
    try {
      const chromeAI = getChromeAI();
      const initialized = await chromeAI.initialize();
      const apiStatus = await chromeAI.getAPIStatus();

      setStatus({
        ...apiStatus,
        initialized,
        loading: false,
      });
    } catch (error) {
      console.error("Failed to check API status:", error);
      setStatus((prev) => ({ ...prev, loading: false }));
    }
  };

  const StatusIcon = ({ available }: { available: boolean }) => {
    return available ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    );
  };

  if (status.loading) {
    return (
      <div className="p-6 bg-gray-50 rounded-lg">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-3">
          <Zap className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">Chrome Built-in AI</h3>
            <p className="text-sm text-blue-700">
              {status.initialized ? "Ready & Running" : "Not Available"}
            </p>
          </div>
        </div>
        {status.initialized && (
          <div className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
            On-Device
          </div>
        )}
      </div>

      <div className="grid gap-3">
        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <StatusIcon available={status.promptAPI} />
            <div>
              <p className="font-medium">Prompt API</p>
              <p className="text-sm text-gray-500">
                Intent analysis & suggestions
              </p>
            </div>
          </div>
          {status.promptAPI && (
            <span className="text-xs text-green-600 font-medium">Active</span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <StatusIcon available={status.summarizerAPI} />
            <div>
              <p className="font-medium">Summarization API</p>
              <p className="text-sm text-gray-500">Session summaries</p>
            </div>
          </div>
          {status.summarizerAPI && (
            <span className="text-xs text-green-600 font-medium">Active</span>
          )}
        </div>

        <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
          <div className="flex items-center space-x-3">
            <StatusIcon available={status.translatorAPI} />
            <div>
              <p className="font-medium">Translation API</p>
              <p className="text-sm text-gray-500">Multi-language support</p>
            </div>
          </div>
          {status.translatorAPI && (
            <span className="text-xs text-green-600 font-medium">Active</span>
          )}
        </div>
      </div>

      {!status.initialized && (
        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start space-x-3">
            <Download className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-900 mb-1">Setup Required</p>
              <p className="text-sm text-yellow-800 mb-2">
                Chrome Built-in AI requires Chrome Canary with enabled flags.
              </p>
              <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                <li>Download Chrome Canary</li>
                <li>
                  Enable: chrome://flags/#optimization-guide-on-device-model
                </li>
                <li>Enable: chrome://flags/#prompt-api-for-gemini-nano</li>
                <li>Restart browser</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2">Why Built-in AI?</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            ✓ <strong>Privacy-first:</strong> All processing happens on your
            device
          </li>
          <li>
            ✓ <strong>Works offline:</strong> No internet required
          </li>
          <li>
            ✓ <strong>Fast:</strong> No network latency
          </li>
          <li>
            ✓ <strong>Free:</strong> No API keys or costs
          </li>
        </ul>
      </div>

      <button
        onClick={checkAPIStatus}
        className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Refresh Status
      </button>
    </div>
  );
};
