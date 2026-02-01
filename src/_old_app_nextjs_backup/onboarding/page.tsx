'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Toast } from '@/components/ui/core';
import { Input, Textarea } from '@/components/ui/forms';
import { settingsService, productService, customerService } from '@/lib/services';
import { useSettings } from '@/contexts/SettingsContext';
import { 
  CheckCircleIcon,
  BuildingStorefrontIcon,
  CubeIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

export default function OnboardingPage() {
  const router = useRouter();
  const { } = useSettings();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1: Company Information
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState(15);

  // Step 2: Sample Products
  const [skipProducts, setSkipProducts] = useState(false);
  const [sampleProducts, setSampleProducts] = useState([
    { name: 'Sample Product 1', price: 100, stock: 10, category: 'Electronics' },
    { name: 'Sample Product 2', price: 200, stock: 5, category: 'Electronics' },
    { name: 'Sample Product 3', price: 150, stock: 8, category: 'Accessories' }
  ]);

  // Step 3: Sample Customer
  const [skipCustomer, setSkipCustomer] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const totalSteps = 4;

  const handleNext = async () => {
    if (currentStep === 1) {
      // Validate company info
      if (!companyName.trim()) {
        setToast({ message: 'Please enter your company name', type: 'error' });
        return;
      }
      
      // Save company settings
      setLoading(true);
      try {
        const response = await settingsService.updateCompanySettings({
          companyName,
          address,
          phone,
          email,
          taxRate: taxRate / 100,
          currency
        });
        
        if (response.success) {
          setCurrentStep(2);
        } else {
          setToast({ message: 'Failed to save company settings', type: 'error' });
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        setToast({ message: 'Failed to save company settings', type: 'error' });
      } finally {
        setLoading(false);
      }
    } else if (currentStep === 2) {
      // Save sample products
      if (!skipProducts) {
        setLoading(true);
        try {
          for (const product of sampleProducts) {
            if (product.name.trim()) {
              await productService.createProduct({
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category,
                description: 'Sample product for testing',
                isActive: true
              });
            }
          }
          setToast({ message: 'Sample products created!', type: 'success' });
        } catch (error) {
          console.error('Error creating products:', error);
        } finally {
          setLoading(false);
        }
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Save sample customer
      if (!skipCustomer && customerName.trim()) {
        setLoading(true);
        try {
          await customerService.createCustomer({
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            isActive: true
          });
          setToast({ message: 'Sample customer created!', type: 'success' });
        } catch (error) {
          console.error('Error creating customer:', error);
        } finally {
          setLoading(false);
        }
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      // Complete onboarding
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const completeOnboarding = async () => {
    try {
      // Save onboarding completion flag to database
      if (typeof window !== 'undefined' && window.electronAPI) {
        const electronAPI = window.electronAPI as Record<string, unknown>;
        if ('updatePreferences' in electronAPI && typeof electronAPI.updatePreferences === 'function') {
          await (electronAPI.updatePreferences as (prefs: { onboardingCompleted: boolean }) => Promise<unknown>)({ onboardingCompleted: true });
        }
      }
      
      setToast({ message: 'Welcome to House of Electronics Sales Manager!', type: 'success' });
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setToast({ message: 'Error saving onboarding status', type: 'error' });
    }
  };

  const updateSampleProduct = (index: number, field: string, value: string | number) => {
    const updated = [...sampleProducts];
    updated[index] = { ...updated[index], [field]: value };
    setSampleProducts(updated);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 rounded-full" style={{ backgroundColor: 'var(--accent)', opacity: 0.1 }}>
              <RocketLaunchIcon className="h-12 w-12" style={{ color: 'var(--accent)' }} />
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
            Welcome to House of Electronics Sales Manager
          </h1>
          <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
            Let&apos;s get your business set up in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                    step < currentStep 
                      ? 'bg-green-500 text-white' 
                      : step === currentStep
                      ? 'text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                  style={step === currentStep ? { backgroundColor: 'var(--accent)' } : {}}
                >
                  {step < currentStep ? <CheckCircleIcon className="h-6 w-6" /> : step}
                </div>
                {step < totalSteps && (
                  <div 
                    className="flex-1 h-1 mx-2"
                    style={{ 
                      backgroundColor: step < currentStep ? '#22c55e' : 'var(--border)'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm" style={{ color: 'var(--muted-foreground)' }}>
            <span>Company</span>
            <span>Products</span>
            <span>Customer</span>
            <span>Complete</span>
          </div>
        </div>

        {/* Content Card */}
        <div 
          className="p-8 rounded-xl shadow-lg"
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            border: '1px solid'
          }}
        >
          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <BuildingStorefrontIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    Company Information
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)' }}>
                    Tell us about your business
                  </p>
                </div>
              </div>

              <Input
                label="Company Name *"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="TopNotch Electronics"
                required
              />

              <Textarea
                label="Address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Business Street, City, State, ZIP"
                rows={3}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />

                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@company.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="USD"
                />

                <Input
                  label="Tax Rate (%)"
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  placeholder="15"
                  step="0.1"
                />
              </div>
            </div>
          )}

          {/* Step 2: Sample Products */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <CubeIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    Add Sample Products
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)' }}>
                    Start with some sample products (you can edit or delete these later)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="skipProducts"
                  checked={skipProducts}
                  onChange={(e) => setSkipProducts(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="skipProducts" style={{ color: 'var(--foreground)' }}>
                  Skip this step (I&apos;ll add products later)
                </label>
              </div>

              {!skipProducts && (
                <div className="space-y-4">
                  {sampleProducts.map((product, index) => (
                    <div 
                      key={index} 
                      className="p-4 rounded-lg border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <Input
                          label="Product Name"
                          value={product.name}
                          onChange={(e) => updateSampleProduct(index, 'name', e.target.value)}
                          placeholder="Product name"
                        />
                        <Input
                          label="Price"
                          type="number"
                          value={product.price}
                          onChange={(e) => updateSampleProduct(index, 'price', parseFloat(e.target.value) || 0)}
                          placeholder="100"
                          step="0.01"
                        />
                        <Input
                          label="Stock"
                          type="number"
                          value={product.stock}
                          onChange={(e) => updateSampleProduct(index, 'stock', parseInt(e.target.value) || 0)}
                          placeholder="10"
                        />
                        <Input
                          label="Category"
                          value={product.category}
                          onChange={(e) => updateSampleProduct(index, 'category', e.target.value)}
                          placeholder="Electronics"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Sample Customer */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <UserGroupIcon className="h-8 w-8" style={{ color: 'var(--accent)' }} />
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
                    Add a Sample Customer
                  </h2>
                  <p style={{ color: 'var(--muted-foreground)' }}>
                    Create your first customer (optional)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="skipCustomer"
                  checked={skipCustomer}
                  onChange={(e) => setSkipCustomer(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="skipCustomer" style={{ color: 'var(--foreground)' }}>
                  Skip this step (I&apos;ll add customers later)
                </label>
              </div>

              {!skipCustomer && (
                <div className="space-y-4">
                  <Input
                    label="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="customer@email.com"
                    />

                    <Input
                      label="Phone"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Complete */}
          {currentStep === 4 && (
            <div className="space-y-6 text-center">
              <div className="flex justify-center mb-6">
                <div className="p-6 rounded-full bg-green-100">
                  <CheckCircleIcon className="h-16 w-16 text-green-600" />
                </div>
              </div>

              <h2 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>
                You&apos;re All Set!
              </h2>
              
              <p className="text-lg" style={{ color: 'var(--muted-foreground)' }}>
                Your House of Electronics Sales Manager is ready to use
              </p>

              <div 
                className="p-6 rounded-lg text-left border"
                style={{ 
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--accent)'
                }}
              >
                <h3 className="font-semibold mb-3" style={{ color: 'var(--foreground)' }}>
                  Quick Tips to Get Started:
                </h3>
                <ul className="space-y-2" style={{ color: 'var(--foreground)' }}>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>Create your first sale from the <strong>Sales</strong> page</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>Add more products in <strong>Products</strong> or <strong>Inventory</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>Generate invoices from sales or create standalone invoices</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>Create purchase orders to restock inventory</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>Process returns to restore stock and manage refunds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                    <span>View analytics and reports on the <strong>Dashboard</strong></span>
                  </li>
                </ul>
              </div>

              <div 
                className="p-4 rounded-lg"
                style={{ 
                  backgroundColor: 'var(--card)',
                  border: '1px solid var(--border)'
                }}
              >
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  💡 <strong>Pro Tip:</strong> You can always access settings from the sidebar to customize your experience.
                </p>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || loading}
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Step {currentStep} of {totalSteps}
              </span>
              <Button
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? (
                  'Processing...'
                ) : currentStep === totalSteps ? (
                  <>
                    Go to Dashboard
                    <RocketLaunchIcon className="h-5 w-5 ml-2" />
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRightIcon className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Skip Onboarding */}
        {currentStep < 4 && (
          <div className="text-center mt-6">
            <button
              onClick={completeOnboarding}
              className="text-sm hover:underline"
              style={{ color: 'var(--muted-foreground)' }}
            >
              Skip onboarding and go straight to dashboard
            </button>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
      {toast && (
        <Toast
          title={toast.message}
          variant={toast.type}
          onClose={() => setToast(null)}
        >
          {toast.message}
        </Toast>
      )}
    </div>
  );
}

