import { useState } from 'react';

const ShareButtons = ({ message, url = 'https://cryptoduel.xyz', className = '' }) => {
  const [copied, setCopied] = useState(false);

  const shareUrl = url;
  const shareText = message;

  const handleFarcasterShare = () => {
    const farcasterUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(shareText)}&embeds[]=${encodeURIComponent(shareUrl)}`;
    window.open(farcasterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTwitterShare = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${shareText} ${shareUrl}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={handleFarcasterShare}
        className="flex items-center gap-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors"
        title="Share on Farcaster"
      >
        <img src="/farcaster.png" alt="Farcaster" className="w-4 h-4" />
        <span>Farcaster</span>
      </button>
      
      <button
        onClick={handleTwitterShare}
        className="flex items-center gap-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-lg transition-colors"
        title="Share on X (Twitter)"
      >
        <img src="/x.png" alt="X" className="w-4 h-4" />
        <span>X</span>
      </button>
      
      <button
        onClick={handleCopyLink}
        className={`flex items-center gap-1 px-3 py-2 text-white text-xs rounded-lg transition-colors ${
          copied 
            ? 'bg-green-600 hover:bg-green-700' 
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        title="Copy link"
      >
        <span className="text-sm">{copied ? '✅' : '📋'}</span>
        <span>{copied ? 'Copied!' : 'Copy'}</span>
      </button>
    </div>
  );
};

export default ShareButtons;