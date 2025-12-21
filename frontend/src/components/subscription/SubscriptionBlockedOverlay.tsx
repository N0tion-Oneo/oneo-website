import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, ExternalLink, RefreshCw, WifiOff } from 'lucide-react';
import { useSubscriptionStatus } from '@/contexts/SubscriptionContext';
import { useAuth } from '@/contexts/AuthContext';

export default function SubscriptionBlockedOverlay() {
  const { isBlocked, status, statusDisplay, message, contactEmail, error, refetch } = useSubscriptionStatus();
  const { logout } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  if (!isBlocked) return null;

  const isConnectionError = error && !status;

  const handleRetry = async () => {
    setIsRetrying(true);
    await refetch();
    setIsRetrying(false);
  };

  const getStatusColor = () => {
    if (isConnectionError) {
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-600',
        icon: 'text-blue-500',
      };
    }
    switch (status) {
      case 'paused':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-600',
          icon: 'text-yellow-500',
        };
      case 'terminated':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-600',
          icon: 'text-red-500',
        };
      case 'expired':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-600',
          icon: 'text-orange-500',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-600',
          icon: 'text-gray-500',
        };
    }
  };

  const colors = getStatusColor();
  const IconComponent = isConnectionError ? WifiOff : AlertTriangle;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 text-center">
        {/* Warning Icon */}
        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${colors.bg}`}>
          <IconComponent className={`w-8 h-8 ${colors.icon}`} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isConnectionError ? 'Connection Error' : `Subscription ${statusDisplay || 'Inactive'}`}
        </h2>

        {/* Message */}
        <p className="text-gray-600 mb-6">
          {message || `Your subscription is currently ${statusDisplay?.toLowerCase() || 'inactive'}. Please contact our support team to restore access to your dashboard.`}
        </p>

        {/* Status Badge */}
        <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium mb-8 ${colors.bg} ${colors.text} ${colors.border} border`}>
          {isConnectionError ? 'Unable to connect' : `Status: ${statusDisplay || status}`}
        </div>

        {/* Retry Button for Connection Errors */}
        {isConnectionError && (
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full mb-6 px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Retrying...' : 'Retry Connection'}
          </button>
        )}

        {/* Contact Section */}
        <div className="bg-gray-50 rounded-lg p-6 text-left">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Contact Support
          </h3>

          <a
            href={`mailto:${contactEmail}`}
            className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors mb-3"
          >
            <Mail className="w-5 h-5 text-gray-400" />
            <span>{contactEmail}</span>
          </a>

          <Link
            to="/contact"
            className="flex items-center gap-3 text-gray-700 hover:text-primary transition-colors"
          >
            <ExternalLink className="w-5 h-5 text-gray-400" />
            <span>Visit Contact Page</span>
          </Link>
        </div>

        {/* Sign Out Button */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-sm text-gray-500 mb-3">
            If you believe this is an error, please sign out and try again.
          </p>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
