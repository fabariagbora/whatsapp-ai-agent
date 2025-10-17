'use client';

import React, { useState, useEffect } from 'react';
import { MessageSquare, Zap, Phone, ChevronRight, CheckCircle, Loader, Upload, X, FileText, AlertCircle, Sun, Moon } from 'lucide-react';

const OnboardingFlow = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    businessName: '',
    country: 'Nigeria',
    email: '',
    industry: '',
    salesNumbers: [''],
    botPersonality: 'nigerian',
    contextDocuments: []
  });
  const [qrCode, setQrCode] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Auto-refresh QR code every 45 seconds to prevent expiration
  useEffect(() => {
    let refreshInterval;
    
    if (step === 5 && qrCode && !isConnected) {
      refreshInterval = setInterval(async () => {
        console.log('🔄 Refreshing QR code...');
        try {
          const response = await fetch('/api/evolution/qr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: accountId })
          });
          
          const data = await response.json();
          if (data.qrCode) {
            setQrCode(data.qrCode);
            console.log('✅ QR code refreshed');
          }
        } catch (error) {
          console.error('Failed to refresh QR code:', error);
        }
      }, 45000); // Refresh every 45 seconds (45000 milliseconds)
    }
    
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [step, qrCode, isConnected, accountId]);


  const countries = [
    { code: 'NG', name: 'Nigeria', flag: '🇳🇬', personality: 'nigerian' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', personality: 'ghanaian' },
    { code: 'KE', name: 'Kenya', flag: '🇰🇪', personality: 'kenyan' },
    { code: 'ZA', name: 'South Africa', flag: '🇿🇦', personality: 'south_african' },
    { code: 'US', name: 'United States', flag: '🇺🇸', personality: 'american' },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', personality: 'british' }
  ];

  const industries = [
    'E-commerce/Retail',
    'Food & Restaurants',
    'Fashion & Beauty',
    'Real Estate',
    'Professional Services',
    'Technology',
    'Education',
    'Other'
  ];

  const handleNext = async () => {
    if (step === 1) {
      if (!formData.businessName || !formData.email || !formData.industry) {
        alert('Please fill in all fields');
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName: formData.businessName,
            email: formData.email,
            industry: formData.industry,
            country: formData.country,
            botPersonality: formData.botPersonality
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to create account');
        setAccountId(data.accountId);
        console.log('✅ Account created:', data.accountId);
        setIsLoading(false);
        setStep(2);
      } catch (error) {
        console.error('Error creating account:', error);
        alert('Failed to create account. Please try again.');
        setIsLoading(false);
      }
      return;
    }

    if (step === 2) {
      setStep(3);
      return;
    }

    if (step === 3) {
      const validNumbers = formData.salesNumbers.filter(num => num.trim() !== '');
      if (validNumbers.length === 0) {
        alert('Please add at least one sales team number');
        return;
      }
      setIsLoading(true);
      try {
        const response = await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: accountId, salesNumbers: validNumbers })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to save sales numbers');
        console.log('✅ Sales numbers saved');
        setIsLoading(false);
        setStep(4);
      } catch (error) {
        console.error('Error saving sales numbers:', error);
        alert('Failed to save sales numbers. Please try again.');
        setIsLoading(false);
      }
      return;
    }

    if (step === 4) {
      if (formData.contextDocuments.length === 0) {
        setStep(5);
        return;
      }
      if (!accountId) {
        alert('Session expired. Please start over from Step 1.');
        setStep(1);
        return;
      }
      setIsLoading(true);
      try {
        const uploadData = new FormData();
        uploadData.append('accountId', accountId);
        formData.contextDocuments.forEach((doc) => {
          uploadData.append('documents', doc.file);
        });
        const response = await fetch('/api/onboarding/upload', {
          method: 'POST',
          body: uploadData
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to upload documents');
        console.log('✅ Documents uploaded:', data.documents);
        setIsLoading(false);
        setStep(5);
      } catch (error) {
        console.error('❌ Upload error:', error);
        alert('Failed to upload documents: ' + error.message);
        setIsLoading(false);
      }
      return;
    }

    // Step 5: Generate QR Code (Real Evolution API)
    if (step === 5) {
      if (!accountId) {
        alert('Session expired. Please start over.');
        setStep(1);
        return;
      }

      setIsConnecting(true);

      try {
        // Generate real QR code
        const response = await fetch('/api/evolution/qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId: accountId })
      });

      const data = await response.json();

      if (!response.ok) {
      throw new Error(data.error || 'Failed to generate QR code');
      }

      console.log('✅ QR code generated');
      setQrCode(data.qrCode);
      setIsConnecting(false);

      // Start polling for connection status
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/evolution/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId: accountId })
          });

          const statusData = await statusRes.json();
        
          if (statusData.connected) {
            clearInterval(pollInterval);
            setIsConnected(true);
            console.log('✅ WhatsApp connected!');
            setTimeout(() => setStep(6), 1500);
          }
        } catch (err) {
        console.error('Status check error:', err);
        }
      }, 3000); // Check every 3 seconds

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);

    } catch (error) {
      console.error('QR generation error:', error);
      alert('Failed to generate QR code: ' + error.message);
      setIsConnecting(false);
    }
    return;
  }

    if (step === 6) {
      try {
        await fetch('/api/onboarding', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId: accountId, onboardingCompleted: true })
        });
        console.log('✅ Onboarding completed!');
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Error completing onboarding:', error);
        window.location.href = '/dashboard';
      }
    }
  };

  const handleBack = () => setStep(step - 1);
  const addSalesNumber = () => setFormData({ ...formData, salesNumbers: [...formData.salesNumbers, ''] });
  const updateSalesNumber = (index, value) => {
    const newNumbers = [...formData.salesNumbers];
    newNumbers[index] = value;
    setFormData({ ...formData, salesNumbers: newNumbers });
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const remainingSlots = 4 - formData.contextDocuments.length;
    if (files.length > remainingSlots) {
      alert('You can only upload ' + remainingSlots + ' more documents. Maximum is 4.');
      return;
    }
    const newDocs = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      file: file
    }));
    setFormData({ ...formData, contextDocuments: [...formData.contextDocuments, ...newDocs] });
  };

  const removeDocument = (id) => {
    setFormData({ ...formData, contextDocuments: formData.contextDocuments.filter(doc => doc.id !== id) });
  };

  const getPersonalityPreview = (country) => {
    const previews = {
      nigerian: {
        example: "Good afternoon boss! Yes o, we deliver to Lekki. Na ₦1,500 for delivery and e go take 1-2 hours. Wetin you wan order?",
        tone: "Warm, friendly, uses Nigerian Pidgin naturally"
      },
      ghanaian: {
        example: "Good afternoon! Yes, we deliver to Accra. Delivery is GH₵50 and takes 1-2 hours. What would you like to order?",
        tone: "Professional yet friendly, Ghanaian English"
      },
      kenyan: {
        example: "Hello! Yes, we deliver to Nairobi. Delivery is KSh 500 and takes 1-2 hours. What can I get for you?",
        tone: "Polite, efficient, Kenyan English"
      },
      south_african: {
        example: "Hi there! Yes, we deliver to Cape Town. Delivery is R150 and takes 1-2 hours. What would you like to order?",
        tone: "Friendly, professional, South African English"
      },
      american: {
        example: "Hi! Yes, we deliver to your area. Delivery is $15 and takes 1-2 hours. What can I help you with today?",
        tone: "Professional, efficient, American English"
      },
      british: {
        example: "Hello! Yes, we deliver to your area. Delivery is £12 and takes 1-2 hours. How may I assist you?",
        tone: "Polite, formal, British English"
      }
    };
    return previews[country] || previews.nigerian;
  };

  return (
    <div className={`min-h-screen py-12 px-4 transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900' 
        : 'bg-gradient-to-br from-green-50 via-white to-emerald-50'
    }`}>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 relative">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`absolute right-0 top-0 p-3 rounded-lg transition ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-yellow-400' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            {darkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>

          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Welcome to Conversa
          </h1>
          <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
            Your AI-powered WhatsApp sales assistant
          </p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
                  step >= num ? 'bg-green-600 text-white' : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                {num < 6 && (
                  <div className={`flex-1 h-1 mx-1 ${
                    step > num ? 'bg-green-600' : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className={`flex justify-between mt-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            <span>Info</span>
            <span>Location</span>
            <span>Team</span>
            <span>Context</span>
            <span>Connect</span>
            <span>Done</span>
          </div>
        </div>

        <div className={`rounded-2xl shadow-lg p-8 transition-colors duration-300 ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Tell us about your business
                </h2>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  This helps us personalize your AI assistant
                </p>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g., Nepsix Fashion Store"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    darkMode 
                      ? 'bg-gray-700 text-white border border-gray-600 placeholder-gray-400' 
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    darkMode 
                      ? 'bg-gray-700 text-white border border-gray-600 placeholder-gray-400' 
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    darkMode 
                      ? 'bg-gray-700 text-white border border-gray-600' 
                      : 'bg-white text-gray-900 border border-gray-300'
                  }`}
                >
                  <option value="">Select your industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.businessName || !formData.email || !formData.industry || isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Continue</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Choose your location
                </h2>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  This determines your AI personality and language style
                </p>
              </div>

              <div>
                <label className={`block text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Select Country *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {countries.map((country) => (
                    <button
                      key={country.code}
                      onClick={() => setFormData({ 
                        ...formData, 
                        country: country.name,
                        botPersonality: country.personality 
                      })}
                      className={`p-4 border-2 rounded-lg transition flex items-center space-x-3 ${
                        formData.country === country.name
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/30'
                          : darkMode 
                            ? 'border-gray-600 hover:border-gray-500 bg-gray-700/50' 
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-3xl">{country.flag}</span>
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {country.name}
                      </span>
                      {formData.country === country.name && (
                        <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`rounded-xl p-6 border ${
                darkMode 
                  ? 'bg-gray-700/50 border-green-800' 
                  : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              }`}>
                <h3 className={`font-semibold mb-3 flex items-center space-x-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Zap className="w-5 h-5 text-green-600" />
                  <span>AI Personality Preview</span>
                </h3>
                <div className={`rounded-lg p-4 mb-3 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Sample Response:</p>
                  <p className={`italic ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {getPersonalityPreview(formData.botPersonality).example}
                  </p>
                </div>
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="font-semibold">Tone:</span> {getPersonalityPreview(formData.botPersonality).tone}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 px-6 py-3 border-2 font-semibold rounded-lg transition ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Sales team notifications
                </h2>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Add WhatsApp numbers to receive instant lead alerts
                </p>
              </div>

              <div className={`rounded-lg p-4 flex items-start space-x-3 ${
                darkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  darkMode ? 'bg-blue-800' : 'bg-blue-100'
                }`}>
                  <MessageSquare className={`w-4 h-4 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`} />
                </div>
                <div className={`text-sm ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                  <p className="font-semibold mb-1">How it works:</p>
                  <p>When a new lead arrives or AI needs help, we will send WhatsApp notifications to these numbers instantly.</p>
                </div>
              </div>

              <div className="space-y-3">
                {formData.salesNumbers.map((number, index) => (
                  <div key={index}>
                    <label className={`block text-sm font-semibold mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Sales Rep #{index + 1} {index === 0 && '*'}
                    </label>
                    <div className="flex items-center space-x-2">
                      <Phone className={`w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      <input
                        type="tel"
                        value={number}
                        onChange={(e) => updateSalesNumber(index, e.target.value)}
                        placeholder="+234 803 456 7890"
                        className={`flex-1 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                          darkMode 
                            ? 'bg-gray-700 text-white border border-gray-600 placeholder-gray-400' 
                            : 'bg-white text-gray-900 border border-gray-300'
                        }`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {formData.salesNumbers.length < 5 && (
                <button
                  onClick={addSalesNumber}
                  className={`w-full px-4 py-3 border-2 border-dashed font-semibold rounded-lg transition ${
                    darkMode 
                      ? 'border-gray-600 text-gray-300 hover:border-green-500 hover:text-green-400' 
                      : 'border-gray-300 text-gray-600 hover:border-green-500 hover:text-green-600'
                  }`}
                >
                  + Add Another Number
                </button>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 px-6 py-3 border-2 font-semibold rounded-lg transition ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.salesNumbers[0] || isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <span>Continue</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Upload context documents
                </h2>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Help your AI learn about your business (optional but recommended)
                </p>
              </div>

              <div className={`rounded-lg p-4 flex items-start space-x-3 ${
                darkMode ? 'bg-purple-900/30 border border-purple-800' : 'bg-purple-50 border border-purple-200'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  darkMode ? 'bg-purple-800' : 'bg-purple-100'
                }`}>
                  <FileText className={`w-4 h-4 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`} />
                </div>
                <div className={`text-sm ${darkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                  <p className="font-semibold mb-1">What to upload:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>FAQs (pricing, delivery, returns)</li>
                    <li>Product catalogs or menus</li>
                    <li>Company policies</li>
                    <li>Brand voice guidelines</li>
                  </ul>
                  <p className={`mt-2 text-xs ${darkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                    Supported: PDF, TXT, DOCX (Max 4 documents, 5MB each)
                  </p>
                </div>
              </div>

              {formData.contextDocuments.length < 4 && (
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  darkMode 
                    ? 'border-gray-600 hover:border-green-500' 
                    : 'border-gray-300 hover:border-green-500'
                }`}>
                  <input
                    type="file"
                    id="contextUpload"
                    multiple
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="contextUpload" className="cursor-pointer">
                    <Upload className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                    <p className={`font-semibold mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Click to upload documents
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formData.contextDocuments.length}/4 documents uploaded
                    </p>
                  </label>
                </div>
              )}

              {formData.contextDocuments.length > 0 && (
                <div className="space-y-2">
                  <h3 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Uploaded Documents:
                  </h3>
                  {formData.contextDocuments.map((doc) => (
                    <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      darkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                            {doc.name}
                          </p>
                          <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{doc.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  
                  {formData.contextDocuments.length >= 4 && (
                    <div className={`flex items-start space-x-2 p-3 rounded-lg ${
                      darkMode ? 'bg-yellow-900/30 border border-yellow-800' : 'bg-yellow-50 border border-yellow-200'
                    }`}>
                      <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
                      <p className={`text-sm ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                        Maximum 4 documents reached. Delete one to upload another.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 px-6 py-3 border-2 font-semibold rounded-lg transition ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span>{formData.contextDocuments.length > 0 ? 'Continue' : 'Skip for Now'}</span>
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Connect your WhatsApp
                </h2>
                <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Scan this QR code with your business WhatsApp
                </p>
              </div>

              {isConnecting && !qrCode ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader className="w-16 h-16 text-green-600 animate-spin mb-4" />
                  <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Generating QR code...</p>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center">
                  {!isConnected ? (
                    <>
                      <div className={`w-64 h-64 rounded-xl flex items-center justify-center mb-4 border-4 border-green-600 p-4 ${
                        darkMode ? 'bg-gray-700' : 'bg-white'
                      }`}>
                        <img 
                          src={qrCode} 
                          alt="WhatsApp QR Code" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                      
                      <div className={`rounded-lg p-4 w-full max-w-md mb-4 ${
                        darkMode ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
                      }`}>
                        <h3 className={`font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          How to scan:
                        </h3>
                        <ol className={`text-sm space-y-1 list-decimal list-inside ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          <li>Open WhatsApp on your phone</li>
                          <li>Tap Menu → Linked Devices</li>
                          <li>Tap Link a Device</li>
                          <li>Point your phone at this screen</li>
                        </ol>
                      </div>

                      {isConnecting ? (
                        <div className="flex items-center space-x-2 text-green-600">
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="text-sm font-semibold">Connecting...</span>
                        </div>
                      ) : (
                        <div className={`flex items-center space-x-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-sm">Waiting for scan...</span>
                        </div>
                      )}

                      <button
                        onClick={handleNext}
                        className="mt-6 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
                      >
                        I have Scanned the QR Code
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        Connected Successfully!
                      </h3>
                      <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Setting up your dashboard...</p>
                      <Loader className="w-6 h-6 text-green-600 animate-spin mt-4" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <button
                    onClick={handleNext}
                    className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition"
                  >
                    Generate QR Code
                  </button>
                </div>
              )}

              <div className="border-t pt-4">
                <button
                  onClick={handleBack}
                  className={`w-full px-6 py-3 border-2 font-semibold rounded-lg transition ${
                    darkMode 
                      ? 'border-gray-600 text-gray-200 hover:bg-gray-700' 
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="text-center space-y-6 py-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full mb-4">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              
              <div>
                <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  You are all set!
                </h2>
                <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Welcome to {formData.businessName} AI assistant
                </p>
              </div>

              <div className={`rounded-xl p-6 border text-left ${
                darkMode 
                  ? 'bg-gray-700/50 border-green-800' 
                  : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
              }`}>
                <h3 className={`font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  What happens next:
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Your AI is ready</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        It is already responding to WhatsApp messages with your {formData.botPersonality} personality
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Notifications enabled</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formData.salesNumbers.filter(n => n).length} sales rep(s) will receive lead alerts
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Context uploaded</p>
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formData.contextDocuments.length} documents processed for AI training
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-4 ${
                darkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${darkMode ? 'text-blue-200' : 'text-blue-900'}`}>Quick Tips:</h3>
                <ul className={`text-sm space-y-1 list-disc list-inside ${darkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                  <li>Test your AI by sending a WhatsApp message to your business number</li>
                  <li>Monitor conversations in real-time from your dashboard</li>
                  <li>Click Take Over Chat anytime to respond manually</li>
                  <li>Upload more context documents anytime from Settings</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-3xl font-bold text-green-600">{formData.contextDocuments.length}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Documents Uploaded</p>
                </div>
                <div className={`text-center p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-3xl font-bold text-green-600">{formData.salesNumbers.filter(n => n).length}</p>
                  <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Sales Reps Notified</p>
                </div>
              </div>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader className="w-6 h-6 animate-spin" />
                    <span>Completing setup...</span>
                  </>
                ) : (
                  <>
                    <span>Go to Dashboard</span>
                    <ChevronRight className="w-6 h-6" />
                  </>
                )}
              </button>

              <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Need help? <a href="#" className="text-green-600 font-semibold hover:underline">Watch setup tutorial</a> or <a href="#" className="text-green-600 font-semibold hover:underline">Contact support</a>
              </p>
            </div>
          )}
        </div>

        <div className={`text-center mt-8 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <p>Need help? <a href="#" className="text-green-600 font-semibold hover:underline">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;