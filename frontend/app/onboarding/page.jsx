'use client';

import React, { useState } from 'react';
import { MessageSquare, Zap, Phone, ChevronRight, CheckCircle, Loader, Upload, X, FileText, AlertCircle } from 'lucide-react';

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

  const handleNext = () => {
    if (step === 4) {
      setStep(5);
      setIsConnecting(true);
      setTimeout(() => {
        setQrCode('https://via.placeholder.com/300x300?text=QR+CODE');
        setIsConnecting(false);
      }, 2000);
    } else {
      setStep(step + 1);
    }
  };

  const handleBack = () => setStep(step - 1);

  const addSalesNumber = () => {
    setFormData({ ...formData, salesNumbers: [...formData.salesNumbers, ''] });
  };

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

    setFormData({ 
      ...formData, 
      contextDocuments: [...formData.contextDocuments, ...newDocs] 
    });
  };

  const removeDocument = (id) => {
    setFormData({
      ...formData,
      contextDocuments: formData.contextDocuments.filter(doc => doc.id !== id)
    });
  };

  const simulateConnection = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      setTimeout(() => setStep(6), 1500);
    }, 3000);
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl mb-4">
            <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Conversa</h1>
          <p className="text-gray-600">Your AI-powered WhatsApp sales assistant</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <div key={num} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold text-sm ${
                  step >= num ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > num ? <CheckCircle className="w-6 h-6" /> : num}
                </div>
                {num < 6 && (
                  <div className={`flex-1 h-1 mx-1 ${
                    step > num ? 'bg-green-600' : 'bg-gray-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Info</span>
            <span>Location</span>
            <span>Team</span>
            <span>Context</span>
            <span>Connect</span>
            <span>Done</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Tell us about your business</h2>
                <p className="text-gray-600">This helps us personalize your AI assistant</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  placeholder="e.g., Nepsix Fashion Store"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select your industry</option>
                  {industries.map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNext}
                disabled={!formData.businessName || !formData.email || !formData.industry}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose your location</h2>
                <p className="text-gray-600">This determines your AI personality and language style</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
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
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-3xl">{country.flag}</span>
                      <span className="font-semibold text-gray-900">{country.name}</span>
                      {formData.country === country.name && (
                        <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <span>AI Personality Preview</span>
                </h3>
                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-sm text-gray-600 mb-2">Sample Response:</p>
                  <p className="text-gray-900 italic">{getPersonalityPreview(formData.botPersonality).example}</p>
                </div>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Tone:</span> {getPersonalityPreview(formData.botPersonality).tone}
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Sales team notifications</h2>
                <p className="text-gray-600">Add WhatsApp numbers to receive instant lead alerts</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">How it works:</p>
                  <p>When a new lead arrives or AI needs help, we will send WhatsApp notifications to these numbers instantly.</p>
                </div>
              </div>

              <div className="space-y-3">
                {formData.salesNumbers.map((number, index) => (
                  <div key={index}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Sales Rep #{index + 1} {index === 0 && '*'}
                    </label>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        value={number}
                        onChange={(e) => updateSalesNumber(index, e.target.value)}
                        placeholder="+234 803 456 7890"
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {formData.salesNumbers.length < 5 && (
                <button
                  onClick={addSalesNumber}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 font-semibold rounded-lg hover:border-green-500 hover:text-green-600 transition"
                >
                  + Add Another Number
                </button>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={!formData.salesNumbers[0]}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <span>Continue</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload context documents</h2>
                <p className="text-gray-600">Help your AI learn about your business (optional but recommended)</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start space-x-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-sm text-purple-900">
                  <p className="font-semibold mb-1">What to upload:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>FAQs (pricing, delivery, returns)</li>
                    <li>Product catalogs or menus</li>
                    <li>Company policies</li>
                    <li>Brand voice guidelines</li>
                  </ul>
                  <p className="mt-2 text-xs text-purple-700">Supported: PDF, TXT, DOCX (Max 4 documents, 5MB each)</p>
                </div>
              </div>

              {formData.contextDocuments.length < 4 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition">
                  <input
                    type="file"
                    id="contextUpload"
                    multiple
                    accept=".pdf,.txt,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label htmlFor="contextUpload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-700 font-semibold mb-1">Click to upload documents</p>
                    <p className="text-sm text-gray-500">
                      {formData.contextDocuments.length}/4 documents uploaded
                    </p>
                  </label>
                </div>
              )}

              {formData.contextDocuments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700">Uploaded Documents:</h3>
                  {formData.contextDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.size}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeDocument(doc.id)}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  ))}
                  
                  {formData.contextDocuments.length >= 4 && (
                    <div className="flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        Maximum 4 documents reached. Delete one to upload another.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={handleBack}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition flex items-center justify-center space-x-2"
                >
                  <span>{formData.contextDocuments.length > 0 ? 'Continue' : 'Skip for Now'}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect your WhatsApp</h2>
                <p className="text-gray-600">Scan this QR code with your business WhatsApp</p>
              </div>

              {isConnecting && !qrCode ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader className="w-16 h-16 text-green-600 animate-spin mb-4" />
                  <p className="text-gray-600">Generating QR code...</p>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center">
                  {!isConnected ? (
                    <>
                      <div className="w-64 h-64 bg-white rounded-xl flex items-center justify-center mb-4 border-4 border-green-600 p-4">
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-xs">
                          QR CODE
                        </div>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full max-w-md mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">How to scan:</h3>
                        <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
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
                        <div className="flex items-center space-x-2 text-gray-600">
                          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                          <span className="text-sm">Waiting for scan...</span>
                        </div>
                      )}

                      <button
                        onClick={simulateConnection}
                        className="mt-6 px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
                      >
                        I have Scanned the QR Code
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center py-8">
                      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Connected Successfully!</h3>
                      <p className="text-gray-600">Setting up your dashboard...</p>
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
                  className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
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
                <h2 className="text-3xl font-bold text-gray-900 mb-2">You are all set!</h2>
                <p className="text-lg text-gray-600">
                  Welcome to {formData.businessName} AI assistant
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">What happens next:</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Your AI is ready</p>
                      <p className="text-sm text-gray-600">It is already responding to WhatsApp messages with your {formData.botPersonality} personality</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Notifications enabled</p>
                      <p className="text-sm text-gray-600">{formData.salesNumbers.filter(n => n).length} sales rep(s) will receive lead alerts</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Context uploaded</p>
                      <p className="text-sm text-gray-600">{formData.contextDocuments.length} documents processed for AI training</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Quick Tips:</h3>
                <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                  <li>Test your AI by sending a WhatsApp message to your business number</li>
                  <li>Monitor conversations in real-time from your dashboard</li>
                  <li>Click Take Over Chat anytime to respond manually</li>
                  <li>Upload more context documents anytime from Settings</li>
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{formData.contextDocuments.length}</p>
                  <p className="text-sm text-gray-600">Documents Uploaded</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-3xl font-bold text-green-600">{formData.salesNumbers.filter(n => n).length}</p>
                  <p className="text-sm text-gray-600">Sales Reps Notified</p>
                </div>
              </div>

              <button
                onClick={() => {
                  alert('Redirecting to dashboard...');
                }}
                className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-lg font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <ChevronRight className="w-6 h-6" />
              </button>

              <p className="text-sm text-gray-500 text-center">
                Need help? <a href="#" className="text-green-600 font-semibold hover:underline">Watch setup tutorial</a> or <a href="#" className="text-green-600 font-semibold hover:underline">Contact support</a>
              </p>
            </div>
          )}
        </div>

        <div className="text-center mt-8 text-sm text-gray-600">
          <p>Need help? <a href="#" className="text-green-600 font-semibold hover:underline">Contact Support</a></p>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;