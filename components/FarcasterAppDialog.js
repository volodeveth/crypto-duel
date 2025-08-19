import { useState, useEffect } from 'react';
import { X, Plus, Bell } from 'lucide-react';

export default function FarcasterAppDialog() {
  const [showDialog, setShowDialog] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    console.log('🔍 FarcasterAppDialog: Component mounted, checking if should show dialog...');
    checkShouldShowDialog();
  }, []);

  const checkShouldShowDialog = async () => {
    try {
      console.log('🔍 FarcasterAppDialog: Checking if should show dialog...');
      
      // Check if we're in Farcaster context
      const { sdk } = await import('@farcaster/miniapp-sdk');
      console.log('📦 FarcasterAppDialog: SDK available:', !!sdk);
      if (!sdk) {
        console.log('❌ FarcasterAppDialog: No SDK available, exiting');
        return;
      }

      // Check if user has already confirmed permanently
      const userDecision = localStorage.getItem('cd_farcaster_app_decision');
      console.log('💾 FarcasterAppDialog: User decision from localStorage:', userDecision);
      if (userDecision === 'confirmed') {
        console.log('ℹ️ FarcasterAppDialog: User already confirmed app addition, skipping dialog');
        return;
      }

      // Check if we need to show dialog again for cancelled users
      if (userDecision === 'cancelled') {
        // Check if this is a new session (user reopened the app)
        const lastSessionId = localStorage.getItem('cd_session_id');
        const currentSessionId = Date.now().toString();
        
        if (lastSessionId && (currentSessionId - parseInt(lastSessionId)) < 300000) {
          // Less than 5 minutes since last session, don't show dialog
          console.log('ℹ️ User cancelled recently, not showing dialog in same session');
          return;
        }
        
        // Update session ID
        localStorage.setItem('cd_session_id', currentSessionId);
        console.log('ℹ️ New session detected, showing dialog again for cancelled user');
      }

      // Check if we're in Farcaster context with valid user
      let context = null;
      try {
        console.log('🔍 FarcasterAppDialog: Checking SDK context...');
        console.log('📋 FarcasterAppDialog: SDK context type:', typeof sdk.context);
        
        if (typeof sdk.context === 'function') {
          console.log('📋 FarcasterAppDialog: Context is function, calling it...');
          context = sdk.context();
        } else if (typeof sdk.context === 'object') {
          console.log('📋 FarcasterAppDialog: Context is object, using directly...');
          context = sdk.context;
        }
        
        console.log('👤 FarcasterAppDialog: Context result:', context);
        console.log('👤 FarcasterAppDialog: User available:', !!context?.user);
        console.log('👤 FarcasterAppDialog: User FID:', context?.user?.fid);
        
      } catch (error) {
        console.log('❌ FarcasterAppDialog: Error getting context:', error);
        return;
      }

      if (context && context.user && context.user.fid) {
        console.log('✅ FarcasterAppDialog: Farcaster user detected, showing app dialog');
        console.log('👤 FarcasterAppDialog: User details:', { fid: context.user.fid, username: context.user.username });
        setShowDialog(true);
        // Small delay for smooth animation
        setTimeout(() => setIsVisible(true), 100);
      } else {
        console.log('❌ FarcasterAppDialog: No valid Farcaster user found');
        console.log('❌ FarcasterAppDialog: Context:', context);
        
        // Check if we're in Farcaster iframe (even without user context)
        const isInFarcasterIframe = typeof window !== 'undefined' && 
          window.parent !== window && 
          document.referrer && 
          (document.referrer.includes('farcaster.xyz') || document.referrer.includes('warpcast.com'));
        
        console.log('🔍 FarcasterAppDialog: Is in Farcaster iframe:', isInFarcasterIframe);
        console.log('🔍 FarcasterAppDialog: Document referrer:', document.referrer);
        
        if (isInFarcasterIframe) {
          console.log('✅ FarcasterAppDialog: In Farcaster iframe, showing dialog even without user context');
          setShowDialog(true);
          setTimeout(() => setIsVisible(true), 100);
        }
        
        // TEMPORARY: For testing, show dialog if URL has ?test_dialog=true
        else if (typeof window !== 'undefined' && window.location.search.includes('test_dialog=true')) {
          console.log('🧪 FarcasterAppDialog: Test mode enabled, showing dialog anyway');
          setShowDialog(true);
          setTimeout(() => setIsVisible(true), 100);
        }
      }
    } catch (error) {
      console.log('❌ FarcasterAppDialog: Error in checkShouldShowDialog:', error.message);
      console.log('❌ FarcasterAppDialog: Full error:', error);
    }
  };

  const handleConfirm = async () => {
    try {
      console.log('✅ User confirmed - adding to Farcaster app');
      
      // Save decision permanently
      localStorage.setItem('cd_farcaster_app_decision', 'confirmed');
      
      // Try to add to Farcaster using SDK
      const { sdk } = await import('@farcaster/miniapp-sdk');
      
      // Try different SDK methods for adding app
      if (sdk && sdk.actions) {
        try {
          // Try addFrame method first
          if (sdk.actions.addFrame) {
            await sdk.actions.addFrame();
            console.log('✅ Successfully added to Farcaster app via addFrame');
          }
          // Try add method as fallback
          else if (sdk.actions.add) {
            await sdk.actions.add();
            console.log('✅ Successfully added to Farcaster app via add');
          }
          // Try subscribe method
          else if (sdk.actions.subscribe) {
            await sdk.actions.subscribe();
            console.log('✅ Successfully subscribed to Farcaster app');
          }
          else {
            console.log('ℹ️ No add/subscribe method available in SDK');
          }
        } catch (error) {
          console.warn('⚠️ Failed to add to Farcaster app:', error);
        }
      }

      // Enable notifications
      try {
        // Get user context for FID
        let context = null;
        if (typeof sdk.context === 'function') {
          context = sdk.context();
        } else if (typeof sdk.context === 'object') {
          context = sdk.context;
        }

        if (context && context.user && context.user.fid) {
          // Get wallet address for notifications
          let walletAddress = null;
          if (typeof window !== 'undefined' && window.ethereum) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts && accounts.length > 0) {
              walletAddress = accounts[0];
            }
          }

          if (walletAddress) {
            const response = await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fid: Number(context.user.fid),
                username: context.user.username || '',
                walletAddress: walletAddress
              })
            });

            if (response.ok) {
              console.log('✅ Notifications enabled successfully');
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Failed to enable notifications:', error);
      }

      // Close dialog
      handleClose();
      
    } catch (error) {
      console.error('❌ Error in handleConfirm:', error);
      handleClose();
    }
  };

  const handleCancel = () => {
    console.log('❌ User cancelled - will ask again next time');
    // Don't save decision, so we ask again next time
    localStorage.setItem('cd_farcaster_app_decision', 'cancelled');
    handleClose();
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setShowDialog(false), 300);
  };

  if (!showDialog) return null;

  return (
    <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-2xl max-w-sm w-full p-6 transform transition-transform duration-300 ${isVisible ? 'scale-100' : 'scale-95'}`}>
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-3">
            <img src="/icon2.png" alt="Crypto Duel" className="w-12 h-12" />
            <Plus size={20} className="text-purple-400" />
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Add Crypto Duel App</h2>
          <p className="text-gray-300 text-sm">Add to Farcaster</p>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
              <Plus size={12} className="text-green-400" />
            </div>
            <span>Quick access from your Farcaster app list</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-200">
            <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Bell size={12} className="text-blue-400" />
            </div>
            <span>Enable notifications for game results</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-300 bg-white/10 hover:bg-white/20 transition-colors duration-200 border border-white/20"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:scale-105"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}