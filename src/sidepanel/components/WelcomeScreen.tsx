import React from "react";
import { Brain, Target, Lock, Zap, TrendingUp, Clock } from "lucide-react";

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onGetStarted,
}) => {
  return (
    <div className="max-w-2xl mx-auto p-8 text-center">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Brain className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Welcome to Morpheus! 🧠
        </h1>
        <p className="text-xl text-gray-600">
          Your AI-powered browsing coach using Chrome's Built-in AI
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200 text-left">
          <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
            <Target className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-blue-900 mb-2">
            🎯 Track Your Habits
          </h3>
          <p className="text-sm text-blue-800">
            Automatically monitor your browsing patterns and understand where
            your time goes
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200 text-left">
          <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-3">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-green-900 mb-2">
            🤖 AI-Powered Insights
          </h3>
          <p className="text-sm text-green-800">
            Get personalized productivity suggestions powered by Chrome's
            on-device AI
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200 text-left">
          <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-purple-900 mb-2">
            🔒 Privacy-First
          </h3>
          <p className="text-sm text-purple-800">
            All AI processing happens on your device - no data sent to the cloud
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200 text-left">
          <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold text-orange-900 mb-2">
            ⚡ Smart Interventions
          </h3>
          <p className="text-sm text-orange-800">
            Gentle nudges when you're distracted to help you stay focused
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 p-6 rounded-xl border mb-8 text-left">
        <h3 className="font-semibold text-gray-900 mb-4 text-center">
          What You'll Get:
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-start space-x-3">
            <TrendingUp className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">Better Focus</p>
              <p className="text-xs text-gray-600">
                Understand your distraction patterns
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Clock className="w-5 h-5 text-green-600 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">
                Time Awareness
              </p>
              <p className="text-xs text-gray-600">
                See where your time actually goes
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <Target className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
            <div>
              <p className="font-medium text-gray-900 text-sm">
                Goal Alignment
              </p>
              <p className="text-xs text-gray-600">
                Stay aligned with your intentions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chrome AI Badge */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200 mb-8">
        <div className="flex items-center justify-center space-x-2">
          <Zap className="w-5 h-5 text-indigo-600" />
          <span className="font-semibold text-indigo-900">
            Powered by Chrome Built-in AI
          </span>
        </div>
        <p className="text-sm text-indigo-700 mt-1">
          Works offline • Privacy-first • No API keys needed
        </p>
      </div>

      {/* CTA Button */}
      <button
        onClick={onGetStarted}
        className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
      >
        Get Started →
      </button>

      <p className="text-sm text-gray-500 mt-4">
        No setup required • Start tracking immediately
      </p>
    </div>
  );
};
