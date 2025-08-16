// ETH Price utilities with caching and USD conversion
import React from 'react';

const CACHE_KEY = 'eth_price_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd';

/**
 * Get ETH price in USD with caching
 * @returns {Promise<number>} ETH price in USD
 */
export async function getEthPrice() {
  try {
    // Check cache first
    const cached = getCachedPrice();
    if (cached) {
      return cached;
    }

    // Fetch from API
    const response = await fetch(COINGECKO_API);
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const price = data.ethereum?.usd;
    
    if (!price || typeof price !== 'number') {
      throw new Error('Invalid price data');
    }

    // Cache the result
    setCachedPrice(price);
    return price;
    
  } catch (error) {
    console.warn('Failed to fetch ETH price:', error);
    // Return cached price even if expired, or null
    return getCachedPrice(true) || null;
  }
}

/**
 * Convert ETH amount to USD
 * @param {number|string} ethAmount - ETH amount
 * @param {number} ethPrice - ETH price in USD (optional, will fetch if not provided)
 * @returns {Promise<number|null>} USD amount or null if conversion failed
 */
export async function ethToUsd(ethAmount, ethPrice = null) {
  try {
    const eth = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    if (isNaN(eth)) return null;

    const price = ethPrice || await getEthPrice();
    if (!price) return null;

    return eth * price;
  } catch (error) {
    console.warn('ETH to USD conversion failed:', error);
    return null;
  }
}

/**
 * Format ETH amount with USD equivalent
 * @param {number|string} ethAmount - ETH amount
 * @param {number} ethDecimals - Decimal places for ETH (default: 5)
 * @param {number} ethPrice - ETH price in USD (optional)
 * @returns {Promise<string>} Formatted string like "0.12345 ETH ($245.67)"
 */
export async function formatEthWithUsd(ethAmount, ethDecimals = 5, ethPrice = null) {
  try {
    const eth = typeof ethAmount === 'string' ? parseFloat(ethAmount) : ethAmount;
    if (isNaN(eth)) return `${ethAmount} ETH`;

    const ethFormatted = eth.toFixed(ethDecimals);
    
    const usdAmount = await ethToUsd(eth, ethPrice);
    if (usdAmount === null) {
      return `${ethFormatted} ETH`;
    }

    const usdFormatted = usdAmount.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${ethFormatted} ETH (${usdFormatted})`;
  } catch (error) {
    console.warn('ETH formatting failed:', error);
    return `${ethAmount} ETH`;
  }
}

/**
 * React component for displaying ETH with USD
 * @param {Object} props
 * @param {number|string} props.amount - ETH amount
 * @param {number} props.decimals - Decimal places for ETH (default: 5)
 * @param {string} props.className - CSS classes for ETH amount
 * @param {string} props.usdClassName - CSS classes for USD amount (default: "text-xs text-gray-400 ml-1")
 * @returns {JSX.Element}
 */
export function EthWithUsd({ amount, decimals = 5, className = "", usdClassName = "text-xs text-gray-400 ml-1" }) {
  const [usdAmount, setUsdAmount] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let isMounted = true;
    
    async function fetchUsd() {
      try {
        const usd = await ethToUsd(amount);
        if (isMounted) {
          setUsdAmount(usd);
          setLoading(false);
        }
      } catch (error) {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUsd();
    
    return () => {
      isMounted = false;
    };
  }, [amount]);

  const eth = typeof amount === 'string' ? parseFloat(amount) : amount;
  const ethFormatted = isNaN(eth) ? amount : eth.toFixed(decimals);

  return (
    <span>
      <span className={className}>{ethFormatted} ETH</span>
      {!loading && usdAmount !== null && (
        <span className={usdClassName}>
          ({usdAmount.toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })})
        </span>
      )}
    </span>
  );
}

// Cache management functions
function getCachedPrice(ignoreExpiry = false) {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { price, timestamp } = JSON.parse(cached);
    
    if (!ignoreExpiry && Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return price;
  } catch (error) {
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedPrice(price) {
  try {
    const data = {
      price,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to cache ETH price:', error);
  }
}