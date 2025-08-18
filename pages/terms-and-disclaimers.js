import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, FileText, Scale, Shield, Gavel, Mail, ExternalLink, CheckCircle } from 'lucide-react';

export default function TermsAndDisclaimers() {
  const baseUrl = 'https://cryptoduel.xyz';

  return (
    <>
      <Head>
        <title>Terms of Service & Risk Disclaimer - Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Legal terms, risk disclaimers, and responsible gaming information for Crypto Duel platform." />
        <meta property="og:title" content="Terms of Service & Risk Disclaimer - Crypto Duel" />
        <meta property="og:description" content="Important legal information and risk disclaimers for blockchain-based gaming platform" />
        <meta property="og:image" content={`${baseUrl}/image.png`} />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto p-4">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-4">
              <img src="/icon.png" alt="Crypto Duel" className="w-16 h-16 mx-auto mb-3" />
              <Link href="/" className="inline-flex items-center gap-2 text-purple-200 hover:text-purple-100 text-sm mb-4">
                <ArrowLeft size={16} /> Back to Home
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 mb-4">
              <AlertTriangle size={32} className="text-red-400" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Terms of Service & Risk Disclaimer
              </h1>
            </div>
            <p className="text-gray-300">Last Updated: August 18, 2025</p>
          </div>

          {/* Important Legal Notice */}
          <div className="bg-red-600/20 backdrop-blur-md rounded-2xl p-6 mb-8 border border-red-600/30 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={24} className="text-red-400" />
              <h2 className="text-xl font-bold text-red-400">⚠️ IMPORTANT LEGAL NOTICE</h2>
            </div>
            <p className="text-gray-200 leading-relaxed">
              <strong>BY ACCESSING, USING, OR PARTICIPATING IN CRYPTO DUEL (THE "PLATFORM"), YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS OF SERVICE AND RISK DISCLAIMER.</strong>
            </p>
          </div>

          {/* Platform Description */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <FileText size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-blue-400">🎯 1. PLATFORM DESCRIPTION</h2>
            </div>
            <p className="text-gray-300 leading-relaxed">
              Crypto Duel is a decentralized blockchain-based application that facilitates peer-to-peer wagering using cryptocurrency (ETH) on the Base network. The platform operates through smart contracts that automatically determine winners using blockchain-based randomness.
            </p>
          </div>

          {/* Risk Disclaimer */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle size={24} className="text-red-400" />
              <h2 className="text-2xl font-bold text-red-400">⚠️ 2. RISK DISCLAIMER & WARRANTIES</h2>
            </div>
            
            {/* Financial Risk */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">2.1 Financial Risk</h3>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                  <span><strong>TOTAL LOSS RISK:</strong> You may lose 100% of any cryptocurrency wagered</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                  <span><strong>NO GUARANTEED RETURNS:</strong> Past performance does not predict future results</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                  <span><strong>CRYPTOCURRENCY VOLATILITY:</strong> ETH value may fluctuate significantly</span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                  <span><strong>NETWORK FEES:</strong> Gas fees are non-refundable regardless of outcome</span>
                </li>
              </ul>
            </div>

            {/* No Warranties */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">2.2 No Warranties</h3>
              <p className="text-gray-300 mb-3"><strong>THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, INCLUDING:</strong></p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-orange-400 mt-1 flex-shrink-0" />
                  <span><strong>NO WARRANTY OF ACCURACY</strong> of smart contract functionality</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-orange-400 mt-1 flex-shrink-0" />
                  <span><strong>NO WARRANTY OF AVAILABILITY</strong> or uninterrupted service</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-orange-400 mt-1 flex-shrink-0" />
                  <span><strong>NO WARRANTY OF SECURITY</strong> against hacks or exploits</span>
                </li>
                <li className="flex items-start gap-2">
                  <Shield size={16} className="text-orange-400 mt-1 flex-shrink-0" />
                  <span><strong>NO WARRANTY OF COMPLIANCE</strong> with local laws in your jurisdiction</span>
                </li>
              </ul>
            </div>

            {/* Technical Risks */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">2.3 Technical Risks</h3>
              <ul className="space-y-1 text-gray-300 list-disc list-inside ml-4">
                <li>Smart contract bugs or vulnerabilities</li>
                <li>Blockchain network congestion or failure</li>
                <li>Wallet connectivity issues</li>
                <li>User interface errors or malfunctions</li>
              </ul>
            </div>
          </div>

          {/* Limitation of Liability */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Scale size={24} className="text-purple-400" />
              <h2 className="text-2xl font-bold text-purple-400">🚫 3. LIMITATION OF LIABILITY</h2>
            </div>
            
            {/* Maximum Liability */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">3.1 Maximum Liability</h3>
              <div className="bg-red-600/20 rounded-xl p-4 border border-red-600/30">
                <p className="text-gray-200 font-medium">
                  THE PLATFORM'S TOTAL LIABILITY TO YOU SHALL NOT EXCEED THE AMOUNT OF CRYPTOCURRENCY YOU DEPOSITED IN THE SPECIFIC TRANSACTION GIVING RISE TO THE CLAIM, AND IN NO EVENT SHALL EXCEED $100 USD.
                </p>
              </div>
            </div>

            {/* Excluded Damages */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">3.2 Excluded Damages</h3>
              <p className="text-gray-300 mb-3"><strong>WE SHALL NOT BE LIABLE FOR:</strong></p>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES</strong></li>
                <li>• <strong>LOSS OF PROFITS, REVENUE, OR BUSINESS OPPORTUNITIES</strong></li>
                <li>• <strong>EMOTIONAL DISTRESS OR PUNITIVE DAMAGES</strong></li>
                <li>• <strong>THIRD-PARTY CLAIMS OR ACTIONS</strong></li>
              </ul>
            </div>
          </div>

          {/* Regulatory Compliance */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Gavel size={24} className="text-blue-400" />
              <h2 className="text-2xl font-bold text-blue-400">🌍 4. REGULATORY COMPLIANCE</h2>
            </div>
            
            {/* User Responsibility */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">4.1 User Responsibility</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>YOU ARE SOLELY RESPONSIBLE</strong> for compliance with local laws</li>
                <li>• <strong>PROHIBITED JURISDICTIONS:</strong> Do not use if wagering is illegal in your location</li>
                <li>• <strong>AGE VERIFICATION:</strong> You must be 18+ or legal gambling age in your jurisdiction</li>
                <li>• <strong>TAX OBLIGATIONS:</strong> You are responsible for all tax implications</li>
              </ul>
            </div>

            {/* Platform Position */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">4.2 Platform Position</h3>
              <ul className="space-y-1 text-gray-300 list-disc list-inside ml-4">
                <li>We do not provide legal, financial, or tax advice</li>
                <li>We do not verify user jurisdiction or legal compliance</li>
                <li>We are not responsible for regulatory violations by users</li>
              </ul>
            </div>
          </div>

          {/* Responsible Gaming */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Shield size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold text-green-400">🎲 5. RESPONSIBLE GAMING</h2>
            </div>
            
            {/* Entertainment Only */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">5.1 Entertainment Only</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• This platform is for <strong>ENTERTAINMENT PURPOSES ONLY</strong></li>
                <li>• Do not wager money you cannot afford to lose</li>
                <li>• Set personal limits and stick to them</li>
                <li>• Take regular breaks from gaming activities</li>
              </ul>
            </div>

            {/* Problem Gaming Resources */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">5.2 Problem Gaming Resources</h3>
              <p className="text-gray-300 mb-3">If you believe you have a gambling problem:</p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <ExternalLink size={16} className="text-blue-400" />
                  <span><strong>National Problem Gaming Helpline:</strong> 1-800-522-4700</span>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink size={16} className="text-blue-400" />
                  <span><strong>Gamblers Anonymous:</strong> www.gamblersanonymous.org</span>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink size={16} className="text-blue-400" />
                  <span><strong>UK GamCare:</strong> www.gamcare.org.uk</span>
                </li>
                <li className="flex items-center gap-2">
                  <ExternalLink size={16} className="text-blue-400" />
                  <span><strong>Australia Gambling Help:</strong> gamblinghelponline.org.au</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Platform Terms */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <FileText size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-bold text-cyan-400">💻 6. PLATFORM TERMS</h2>
            </div>
            
            {/* Smart Contract Finality */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">6.1 Smart Contract Finality</h3>
              <ul className="space-y-1 text-gray-300 list-disc list-inside ml-4">
                <li>All transactions are final and irreversible</li>
                <li>Smart contract results are binding and cannot be disputed</li>
                <li>No refunds except as provided by smart contract code</li>
              </ul>
            </div>

            {/* Platform Changes */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">6.2 Platform Changes</h3>
              <ul className="space-y-1 text-gray-300 list-disc list-inside ml-4">
                <li>We reserve the right to modify or discontinue the platform</li>
                <li>Terms may be updated with notice on the platform</li>
                <li>Continued use constitutes acceptance of changes</li>
              </ul>
            </div>

            {/* Account Termination */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">6.3 Account Termination</h3>
              <p className="text-gray-300 mb-2">We may restrict or terminate access for:</p>
              <ul className="space-y-1 text-gray-300 list-disc list-inside ml-4">
                <li>Violation of these terms</li>
                <li>Suspicious or fraudulent activity</li>
                <li>Legal compliance requirements</li>
              </ul>
            </div>
          </div>

          {/* Legal Jurisdiction */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Gavel size={24} className="text-orange-400" />
              <h2 className="text-2xl font-bold text-orange-400">🏛️ 7. LEGAL JURISDICTION</h2>
            </div>
            
            {/* Governing Law */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">7.1 Governing Law</h3>
              <p className="text-gray-300">
                These terms are governed by the laws of <strong>Switzerland</strong>, without regard to conflict of law principles.
              </p>
            </div>

            {/* Dispute Resolution */}
            <div>
              <h3 className="text-xl font-semibold text-yellow-400 mb-3">7.2 Dispute Resolution</h3>
              <ul className="space-y-2 text-gray-300">
                <li>• <strong>BINDING ARBITRATION:</strong> Disputes shall be resolved through binding arbitration</li>
                <li>• <strong>CLASS ACTION WAIVER:</strong> You waive the right to participate in class action lawsuits</li>
                <li>• <strong>INDIVIDUAL CLAIMS ONLY:</strong> All claims must be brought individually</li>
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Mail size={24} className="text-purple-400" />
              <h2 className="text-2xl font-bold text-purple-400">📞 8. CONTACT INFORMATION</h2>
            </div>
            <p className="text-gray-300 mb-4">For questions about these terms:</p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <Mail size={16} className="text-blue-400" />
                <span><strong>Email:</strong> cryptoduel@proton.me</span>
              </li>
              <li className="flex items-center gap-2">
                <ExternalLink size={16} className="text-blue-400" />
                <span><strong>Website:</strong> https://cryptoduel.xyz</span>
              </li>
              <li>• <strong>Last Updated:</strong> Check platform for most current version</li>
            </ul>
          </div>

          {/* Acknowledgment */}
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 backdrop-blur-md rounded-2xl p-6 mb-8 border border-green-600/30 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle size={24} className="text-green-400" />
              <h2 className="text-2xl font-bold text-green-400">✅ 9. ACKNOWLEDGMENT</h2>
            </div>
            <p className="text-gray-200 mb-4 font-medium">
              BY CHECKING THE ACCEPTANCE BOX AND USING THIS PLATFORM, YOU ACKNOWLEDGE THAT:
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You have read and understand these terms in full</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You accept all risks associated with cryptocurrency wagering</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You are legally permitted to use this platform in your jurisdiction</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You are 18+ years old or of legal gambling age</span>
                </li>
              </ul>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You understand this is entertainment, not investment</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You will not hold the platform liable for any losses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                  <span className="text-gray-300">You agree to binding arbitration for disputes</span>
                </li>
              </ul>
            </div>
            
            <div className="mt-6 p-4 bg-red-600/30 rounded-xl border border-red-600/50">
              <p className="text-red-200 font-bold text-center">
                🚨 IF YOU DO NOT AGREE TO ALL TERMS, DO NOT USE THIS PLATFORM 🚨
              </p>
            </div>
          </div>

          {/* Back to Home Button */}
          <div className="text-center">
            <Link 
              href="/"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 px-8 py-4 rounded-xl font-semibold text-white transition-all duration-300 hover:scale-105 shadow-lg"
            >
              <ArrowLeft size={20} />
              Return to Home Page
            </Link>
          </div>

        </div>
      </div>
    </>
  );
}