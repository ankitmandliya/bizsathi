import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Users,
  ArrowUpRight,
  Tag,
  XCircle,
} from 'lucide-react';
import { subscriptionApi, CouponValidateResult } from '../../services/api/subscriptionApi';
import { BillingInvoiceItem, PlanItem, SubscriptionItem } from '../../services/api/adminApi';
import { getErrorMessage } from '../../utils/error';

import apiClient from '../../services/api/client';

const MODULE_DISPLAY_NAMES: Record<string, string> = {
  crm: 'CRM (Leads & Deals)',
  customers: 'Customer Management & Credit',
  vendors: 'Vendor Directory',
  sales: 'Sales (Invoices & Quotes)',
  inventory: 'Inventory & Stock Control',
  hrm: 'HRM (Employees, Attendance, Leave)',
  expenses: 'Expense Management',
  marketing: 'Marketing Campaigns (WhatsApp/Email)',
  reports: 'Business Reports & Analytics',
};

interface UsageMetric {
  used: number;
  limit: number | null;
}

interface TenantUsageSummary {
  users: UsageMetric;
  customers: UsageMetric;
  employees: UsageMetric;
  invoices_this_month: UsageMetric;
}

export function SubscriptionsPage() {
  const [sub, setSub] = useState<SubscriptionItem | null>(null);
  const [publicPlans, setPublicPlans] = useState<PlanItem[]>([]);
  const [invoices, setInvoices] = useState<BillingInvoiceItem[]>([]);
  const [usage, setUsage] = useState<TenantUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Upgrade/Downgrade Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [couponCode, setCouponCode] = useState('');
  const [couponRes, setCouponRes] = useState<CouponValidateResult | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sData, pData, invData, uData] = await Promise.all([
        subscriptionApi.getCurrentSubscription(),
        subscriptionApi.getPublicPlans(),
        subscriptionApi.getTenantInvoices(),
        apiClient.get<TenantUsageSummary>('/api/v1/tenant/usage').then((r) => r.data).catch(() => null),
      ]);
      setSub(sData);
      setPublicPlans(pData);
      setInvoices(invData);
      setUsage(uData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpgrade = (planId?: string) => {
    const targetId = planId || publicPlans.find((p) => p.slug === 'business')?.id || publicPlans[0]?.id || '';
    setSelectedPlanId(targetId);
    setBillingCycle('monthly');
    setCouponCode('');
    setCouponRes(null);
    setShowModal(true);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlanId) return;
    try {
      setValidatingCoupon(true);
      const res = await subscriptionApi.validateCoupon(couponCode, selectedPlanId);
      setCouponRes(res);
    } catch (err) {
      setCouponRes({ valid: false, discount_amount: 0, final_price: 0, message: getErrorMessage(err) });
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleConfirmPlanChange = async () => {
    if (!selectedPlanId) return;
    try {
      setProcessing(true);
      const res = await subscriptionApi.changePlan(selectedPlanId, billingCycle, couponRes?.valid ? couponCode : undefined);
      alert(res.message);
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelSub = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? Access will continue until the end of your billing period.')) return;
    try {
      await subscriptionApi.cancelSubscription();
      alert('Subscription set to cancel at period end.');
      await loadData();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>Loading Subscription Details…</div>;
  }

  const selectedPlanObj = publicPlans.find((p) => p.id === selectedPlanId);
  const rawBasePrice = selectedPlanObj ? (billingCycle === 'yearly' ? selectedPlanObj.price_yearly : selectedPlanObj.price_monthly) : 0;
  const finalPrice = couponRes?.valid ? couponRes.final_price : rawBasePrice;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
            Plans & Billing
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
            Manage your subscription plan, module entitlements, team user limits, and invoice history
          </p>
        </div>

        <button
          onClick={() => handleOpenUpgrade()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
          }}
        >
          <ArrowUpRight size={18} />
          <span>Upgrade / Change Plan</span>
        </button>
      </div>

      {error && (
        <div style={{ padding: '14px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px' }}>
          {error}
        </div>
      )}

      {/* Current Subscription Card */}
      {sub && (
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '16px',
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  {sub.plan?.name || 'Growth Plan'}
                </h2>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background:
                      sub.status === 'ACTIVE'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : sub.status === 'TRIAL'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    color:
                      sub.status === 'ACTIVE'
                        ? '#10b981'
                        : sub.status === 'TRIAL'
                        ? '#3b82f6'
                        : '#ef4444',
                  }}
                >
                  {sub.status}
                </span>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                {sub.plan?.description || 'Full platform access'}
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>
                ₹{(sub.plan?.price_monthly ?? 0).toLocaleString('en-IN')}
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}> / month</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Next billing renewal:{' '}
                <strong style={{ color: 'var(--text)' }}>
                  {sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString() : 'Unlimited'}
                </strong>
              </div>
            </div>
          </div>

          {/* User Limits Usage Bar */}
          <div style={{ padding: '16px', background: 'var(--bg, #0f172a)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#818cf8" /> Workspace Team Members Usage
              </span>
              <span>
                {sub.user_count} of {sub.user_limit ? sub.user_limit : 'Unlimited'} seats used
              </span>
            </div>
            {sub.user_limit && (
              <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (sub.user_count / sub.user_limit) * 100)}%`,
                    height: '100%',
                    background: sub.user_count >= sub.user_limit ? '#ef4444' : '#6366f1',
                    borderRadius: '4px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            )}
          </div>

          {/* Module Entitlements Grid */}
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '12px' }}>
              Your Active Plan Entitlements
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
              {Object.entries(MODULE_DISPLAY_NAMES).map(([modKey, modName]) => {
                const isIncluded = sub.included_modules.includes(modKey.toLowerCase());
                return (
                  <div
                    key={modKey}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isIncluded ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isIncluded ? '1px solid rgba(99,102,241,0.3)' : '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      opacity: isIncluded ? 1 : 0.4,
                    }}
                  >
                    {isIncluded ? <CheckCircle2 size={16} color="#10b981" /> : <XCircle size={16} color="var(--muted)" />}
                    <span style={{ fontSize: '13px', fontWeight: 600, color: isIncluded ? 'var(--text)' : 'var(--muted)' }}>
                      {modName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cancellation note */}
          {sub.cancel_at_period_end ? (
            <div style={{ padding: '12px 16px', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
              Your subscription is scheduled for cancellation at the end of the current period. Access will remain active until then.
            </div>
          ) : (
            <div style={{ textAlign: 'right', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                onClick={handleCancelSub}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Cancel Subscription
              </button>
            </div>
          )}
        </div>
      )}

      {/* Real-time Usage Summary Card */}
      {usage && (
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            border: '1px solid var(--border-color, #334155)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={20} color="#6366f1" /> Current Usage & Capacity
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
              Updated real-time
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', background: 'var(--bg, #0f172a)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Active Users</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                {usage.users.used}
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}>
                  {' '} / {usage.users.limit !== null ? usage.users.limit : '∞'}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: usage.users.limit && usage.users.used >= usage.users.limit ? '#ef4444' : '#10b981', marginTop: '4px' }}>
                {usage.users.limit ? (usage.users.used >= usage.users.limit ? 'Limit Reached' : `${usage.users.limit - usage.users.used} seats remaining`) : 'Unlimited Seats'}
              </div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg, #0f172a)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Total Customers</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                {usage.customers.used}
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}> / ∞</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Customer Records</div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg, #0f172a)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Total Employees</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>
                {usage.employees.used}
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}> / ∞</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>HRM Roster</div>
            </div>

            <div style={{ padding: '16px', background: 'var(--bg, #0f172a)', borderRadius: '12px', border: '1px solid var(--border-color, #334155)' }}>
              <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' }}>Invoices (This Month)</div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#10b981' }}>
                {usage.invoices_this_month.used}
                <span style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 500 }}> / ∞</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>Monthly Volume</div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice History */}
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', marginBottom: '14px' }}>
          Billing Invoice History
        </h3>
        <div
          style={{
            background: 'var(--card-bg, #1e293b)',
            borderRadius: '12px',
            border: '1px solid var(--border-color, #334155)',
            overflow: 'hidden',
          }}
        >
          {invoices.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--muted)' }}>
              No billing invoices issued yet.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Invoice #</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Date</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Billing Period</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Total Amount</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--muted)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#818cf8' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--text)' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '14px 16px', color: 'var(--muted)', fontSize: '13px' }}>
                      {inv.period_start ? new Date(inv.period_start).toLocaleDateString() : '—'} to{' '}
                      {inv.period_end ? new Date(inv.period_end).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: '#10b981' }}>₹{inv.total.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          background: inv.status === 'PAID' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                          color: inv.status === 'PAID' ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg, #1e293b)',
              border: '1px solid var(--border-color, #334155)',
              borderRadius: '20px',
              maxWidth: '850px',
              width: '100%',
              padding: '28px',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                  Upgrade or Change Subscription Plan
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0 0' }}>
                  Upgrades take effect immediately with automatic prorated charges. Downgrades take effect at period end.
                </p>
              </div>

              {/* Monthly vs Yearly Toggle */}
              <div style={{ display: 'flex', background: 'var(--bg)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <button
                  onClick={() => setBillingCycle('monthly')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    background: billingCycle === 'monthly' ? '#6366f1' : 'transparent',
                    color: billingCycle === 'monthly' ? '#ffffff' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: 'none',
                    background: billingCycle === 'yearly' ? '#6366f1' : 'transparent',
                    color: billingCycle === 'yearly' ? '#ffffff' : 'var(--muted)',
                    cursor: 'pointer',
                  }}
                >
                  Yearly (Save 15%)
                </button>
              </div>
            </div>

            {/* Plan Tier Selection Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {publicPlans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    style={{
                      border: isSelected ? '2px solid #6366f1' : '1px solid var(--border-color)',
                      background: isSelected ? 'rgba(99,102,241,0.1)' : 'var(--bg)',
                      borderRadius: '14px',
                      padding: '20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                          {plan.name}
                        </h3>
                        {isSelected && <CheckCircle2 size={18} color="#6366f1" />}
                      </div>

                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '12px 0 4px 0' }}>
                        ₹{price.toLocaleString('en-IN')}{' '}
                        <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 500 }}>
                          /{billingCycle === 'yearly' ? 'yr' : 'mo'}
                        </span>
                      </div>

                      <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, minHeight: '32px' }}>
                        {plan.description}
                      </p>
                    </div>

                    <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text)' }}>
                      <div>• {plan.user_limit ? `Up to ${plan.user_limit} Users` : 'Unlimited Users'}</div>
                      <div>• Includes {(plan.entitlements || []).filter((e) => e.included).length} Modules</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coupon Code Section */}
            <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
                <Tag size={16} color="#6366f1" /> Apply Discount Coupon
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Enter Promo Code (e.g. OFF50)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text)',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                  }}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {validatingCoupon ? 'Validating…' : 'Apply'}
                </button>
              </div>

              {couponRes && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: couponRes.valid ? '#10b981' : '#ef4444',
                  }}
                >
                  {couponRes.message}
                </div>
              )}
            </div>

            {/* Checkout Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 600 }}>Total Payable</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981' }}>
                  ₹{finalPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleConfirmPlanChange}
                  disabled={processing}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: '15px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {processing ? 'Processing Plan Change…' : 'Confirm Plan Change'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
