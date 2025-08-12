import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

export default function FarcasterInit() {
  const [debugInfo, setDebugInfo] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    setDebugInfo(prev => [...prev, { message: logEntry, type }]);
  };

  useEffect(() => {
    async function initializeFarcaster() {
      addLog('🚀 === FARCASTER MINI APP DEBUG START ===', 'info');
      addLog(`🌍 Environment: ${typeof window !== 'undefined' ? 'Browser' : 'Server'}`);
      addLog(`🔗 URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
      addLog(`👥 User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`);
      addLog(`📱 Is in iframe: ${typeof window !== 'undefined' && window.parent !== window}`);
      addLog(`🎯 Window parent exists: ${typeof window !== 'undefined' && !!window.parent}`);
      
      // Check SDK availability
      addLog(`📦 SDK object available: ${!!sdk}`);
      addLog(`📦 SDK.actions available: ${!!(sdk && sdk.actions)}`);
      addLog(`📦 SDK.actions.ready available: ${!!(sdk && sdk.actions && sdk.actions.ready)}`);
      addLog(`📦 SDK.context available: ${!!(sdk && sdk.context)}`);
      
      // Check if we're in a Farcaster context
      if (typeof window !== 'undefined') {
        addLog(`🔍 Checking window.parent.postMessage: ${!!window.parent?.postMessage}`);
        addLog(`🔍 Checking document.referrer: ${document.referrer || 'none'}`);
        addLog(`🔍 Checking URL params: ${window.location.search}`);
      }

      if (!sdk) {
        addLog('❌ SDK is not available!', 'error');
        return;
      }

      if (!sdk.actions) {
        addLog('❌ SDK.actions is not available!', 'error');
        return;
      }

      if (!sdk.actions.ready) {
        addLog('❌ SDK.actions.ready is not available!', 'error');
        return;
      }

      // According to Farcaster docs, we should ALWAYS call ready() when the app loads
      // The SDK will handle whether we're in the right context or not
      addLog('📞 Calling sdk.actions.ready() - as recommended by Farcaster docs...');
      
      try {
        // Add timeout to ready call
        const readyPromise = sdk.actions.ready();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ready call timeout after 10 seconds')), 10000)
        );

        await Promise.race([readyPromise, timeoutPromise]);
        addLog('✅ SUCCESS: sdk.actions.ready() completed!', 'success');
        
        // Log context info for debugging
        const isInIframe = typeof window !== 'undefined' && window.parent !== window;
        const hasFarcasterReferrer = typeof document !== 'undefined' && 
          (document.referrer.includes('farcaster.xyz') || 
           document.referrer.includes('warpcast.com') ||
           document.referrer.includes('client.warpcast.com'));
        
        addLog(`🔍 Debug info: iframe=${isInIframe}, farcaster-referrer=${hasFarcasterReferrer}`);
        
      } catch (error) {
        addLog(`❌ FAILED to call sdk.actions.ready(): ${error.message}`, 'error');
        addLog(`❌ Error stack: ${error.stack}`, 'error');
        
        // Try manual postMessage as fallback if in iframe
        const isInIframe = typeof window !== 'undefined' && window.parent !== window;
        if (isInIframe) {
          try {
            addLog('🔄 Trying manual postMessage fallback...');
            window.parent.postMessage({ type: 'ready' }, '*');
            addLog('✅ Manual ready signal sent via postMessage', 'success');
          } catch (postError) {
            addLog(`❌ PostMessage fallback failed: ${postError.message}`, 'error');
          }
        }
      }

      // Get context after ready is called (or skipped)
      try {
        addLog('🔍 Getting SDK context...');
        addLog(`📋 Context type: ${typeof sdk.context}`);
        
        // Check if context is a function (newer SDK) or object (older SDK)
        let context;
        if (typeof sdk.context === 'function') {
          addLog('📋 Context is function - calling it...');
          context = sdk.context();  // Actually call the function
        } else if (typeof sdk.context === 'object') {
          addLog('📋 Context is object - using directly...');
          context = sdk.context;
        } else {
          addLog('❌ Context is not available or unknown type');
          context = null;
        }
        
        if (context) {
          addLog(`👤 User available: ${!!context.user}`);
          addLog(`📱 Client available: ${!!context.client}`);
          addLog(`📍 Location available: ${!!context.location}`);
          
          if (context.user) {
            addLog(`👤 User FID: ${context.user.fid || 'N/A'}`);
            addLog(`👤 User username: ${context.user.username || 'N/A'}`);
          }
          
          if (context.client) {
            addLog(`📱 Client FID: ${context.client.clientFid || 'N/A'}`);
            addLog(`📱 Platform: ${context.client.platformType || 'N/A'}`);
            addLog(`📱 App added: ${context.client.added}`);
          }

          if (context.location) {
            addLog(`📍 Location type: ${context.location.type || 'N/A'}`);
          }
        } else {
          addLog('ℹ️ No context available');
        }
      } catch (contextError) {
        addLog(`❌ Context error: ${contextError.message}`, 'error');
      }

      // Try to get capabilities
      try {
        if (sdk.getCapabilities) {
          addLog('🔧 Getting capabilities...');
          const capabilities = await sdk.getCapabilities();
          addLog(`🔧 Capabilities: ${JSON.stringify(capabilities)}`);
        } else {
          addLog('ℹ️ getCapabilities not available');
        }
      } catch (capError) {
        addLog(`❌ Capabilities error: ${capError.message}`, 'error');
      }

      
      addLog('🏁 === FARCASTER MINI APP DEBUG END ===', 'info');
    }

    // Add small delay to ensure DOM is ready
    const timer = setTimeout(initializeFarcaster, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show debug info in development
  if (process.env.NODE_ENV === 'development' || typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        fontSize: '10px',
        padding: '10px',
        maxHeight: '200px',
        overflow: 'auto',
        fontFamily: 'monospace'
      }}>
        <div style={{ marginBottom: '10px', fontWeight: 'bold' }}>
          🐛 Farcaster SDK Debug Logs (add ?debug=true to URL to show)
        </div>
        {debugInfo.map((log, i) => (
          <div key={i} style={{
            color: log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'white',
            marginBottom: '2px'
          }}>
            {log.message}
          </div>
        ))}
      </div>
    );
  }

  return null;
}