import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Loading iKunnect Chat Desk
          </h2>
          <p className="text-sm text-gray-600">
            Please wait while we prepare your workspace...
          </p>
        </div>
      </div>
    </div>
  );
}

