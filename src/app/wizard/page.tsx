'use client';

import { useState } from 'react';
import Link from 'next/link';

interface WizardData {
  // Step 1: Template & basics
  template: string;
  productName: string;
  productUrl: string;
  mainKeyword: string;
  
  // Step 2: Audience & tone
  ageRange: string;
  gender: string;
  country: string;
  region: string;
  tone: string;
  
  // Step 3: Content placeholders
  pageHeadline: string;
  introParagraph: string;
  mainBenefits: string;
}

const initialData: WizardData = {
  template: 'creatine-report-default',
  productName: '',
  productUrl: '',
  mainKeyword: '',
  ageRange: '',
  gender: '',
  country: '',
  region: '',
  tone: '',
  pageHeadline: '',
  introParagraph: '',
  mainBenefits: '',
};

export default function WizardPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);

  const updateField = (field: keyof WizardData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canGoNext = () => {
    if (currentStep === 1) {
      return data.productName.trim() !== '' && data.mainKeyword.trim() !== '';
    }
    if (currentStep === 2) {
      return data.ageRange !== '' && data.gender !== '' && data.tone !== '';
    }
    return true;
  };

  const goNext = () => {
    if (canGoNext() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Back to home
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              New Funnel Wizard
            </h1>
          </div>
          <div className="text-sm text-gray-600">
            Step {currentStep} of 3
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left side: Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Step 1: Template & basics */}
              {currentStep === 1 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Template & Basics
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Template <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.template}
                        onChange={(e) => updateField('template', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="creatine-report-default">
                          Creatine Report (default)
                        </option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supplement / Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.productName}
                        onChange={(e) => updateField('productName', e.target.value)}
                        placeholder="e.g. CreaPure Creatine Monohydrate"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Product URL
                      </label>
                      <input
                        type="text"
                        value={data.productUrl}
                        onChange={(e) => updateField('productUrl', e.target.value)}
                        placeholder="https://example.com/product"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Keyword / Topic <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={data.mainKeyword}
                        onChange={(e) => updateField('mainKeyword', e.target.value)}
                        placeholder="e.g. creatine bloating"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Audience & tone */}
              {currentStep === 2 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Audience & Tone
                  </h2>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Age Range <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.ageRange}
                        onChange={(e) => updateField('ageRange', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select age range</option>
                        <option value="18-34">18–34</option>
                        <option value="35+">35+</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.gender}
                        onChange={(e) => updateField('gender', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={data.country}
                        onChange={(e) => updateField('country', e.target.value)}
                        placeholder="e.g. United States"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State / Region <span className="text-gray-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={data.region}
                        onChange={(e) => updateField('region', e.target.value)}
                        placeholder="e.g. California"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tone of Voice <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={data.tone}
                        onChange={(e) => updateField('tone', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select tone</option>
                        <option value="serious">Serious</option>
                        <option value="educational">Educational</option>
                        <option value="cheerful">Cheerful</option>
                        <option value="direct">Direct</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Content placeholders */}
              {currentStep === 3 && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Content Placeholders
                  </h2>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      Later, the content generator will auto-fill these fields.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Page Headline
                      </label>
                      <input
                        type="text"
                        value={data.pageHeadline}
                        onChange={(e) => updateField('pageHeadline', e.target.value)}
                        placeholder="e.g. Does Creatine Cause Bloating? Here's What Science Says"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Intro Paragraph
                      </label>
                      <textarea
                        value={data.introParagraph}
                        onChange={(e) => updateField('introParagraph', e.target.value)}
                        placeholder="Write a brief introduction..."
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Main Benefits <span className="text-gray-500">(one per line)</span>
                      </label>
                      <textarea
                        value={data.mainBenefits}
                        onChange={(e) => updateField('mainBenefits', e.target.value)}
                        placeholder="Increases muscle strength&#10;Improves workout performance&#10;Enhances muscle recovery"
                        rows={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      disabled
                      className="w-full px-6 py-3 text-white bg-gray-400 rounded-md cursor-not-allowed font-medium"
                    >
                      Generate Preview (coming later)
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={goBack}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 rounded-md font-medium ${
                    currentStep === 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  Back
                </button>

                <button
                  onClick={goNext}
                  disabled={!canGoNext() || currentStep === 3}
                  className={`px-6 py-2 rounded-md font-medium ${
                    !canGoNext() || currentStep === 3
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* Right side: Summary */}
          <div className="lg:w-96">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Live Summary
              </h3>

              {/* Template & basics */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Template & Basics
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Template:</span>{' '}
                    <span className="text-gray-900">Creatine Report (default)</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Product:</span>{' '}
                    <span className="text-gray-900">
                      {data.productName || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">URL:</span>{' '}
                    <span className="text-gray-900 break-all">
                      {data.productUrl || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Keyword:</span>{' '}
                    <span className="text-gray-900">
                      {data.mainKeyword || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Audience & tone */}
              <div className="mb-6 pb-6 border-b border-gray-200">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Audience & Tone
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">Age:</span>{' '}
                    <span className="text-gray-900">
                      {data.ageRange || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Gender:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.gender || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Country:</span>{' '}
                    <span className="text-gray-900">
                      {data.country || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Region:</span>{' '}
                    <span className="text-gray-900">
                      {data.region || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Tone:</span>{' '}
                    <span className="text-gray-900 capitalize">
                      {data.tone || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content draft */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Content Draft
                </h4>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-gray-600 block mb-1">Headline:</span>
                    <span className="text-gray-900">
                      {data.pageHeadline || <em className="text-gray-400">Not set yet</em>}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Intro:</span>
                    <span className="text-gray-900">
                      {data.introParagraph ? (
                        <span className="block text-xs leading-relaxed">
                          {data.introParagraph.substring(0, 100)}
                          {data.introParagraph.length > 100 && '...'}
                        </span>
                      ) : (
                        <em className="text-gray-400">Not set yet</em>
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600 block mb-1">Benefits:</span>
                    {data.mainBenefits ? (
                      <ul className="list-disc list-inside text-xs text-gray-900 space-y-1">
                        {data.mainBenefits.split('\n').filter(b => b.trim()).slice(0, 5).map((benefit, i) => (
                          <li key={i}>{benefit}</li>
                        ))}
                      </ul>
                    ) : (
                      <em className="text-gray-400">Not set yet</em>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

