import apiClient from './client';
import { BillingInvoiceItem, PlanItem, SubscriptionItem } from './adminApi';

export interface CouponValidateResult {
  valid: boolean;
  discount_type?: string;
  discount_value?: number;
  discount_amount: number;
  final_price: number;
  message: string;
}

export interface PlanChangeResult {
  subscription: SubscriptionItem;
  prorated_charge: number;
  is_downgrade: boolean;
  message: string;
}

export const subscriptionApi = {
  getCurrentSubscription: async (): Promise<SubscriptionItem> => {
    const res = await apiClient.get<SubscriptionItem>('/api/v1/subscriptions/current');
    return res.data;
  },

  getPublicPlans: async (): Promise<PlanItem[]> => {
    const res = await apiClient.get<PlanItem[]>('/api/v1/subscriptions/plans');
    return res.data;
  },

  validateCoupon: async (code: string, planId: string): Promise<CouponValidateResult> => {
    const res = await apiClient.post<CouponValidateResult>('/api/v1/subscriptions/validate-coupon', {
      code,
      plan_id: planId,
    });
    return res.data;
  },

  changePlan: async (planId: string, billingCycle: string = 'monthly', couponCode?: string): Promise<PlanChangeResult> => {
    const res = await apiClient.post<PlanChangeResult>('/api/v1/subscriptions/change-plan', {
      plan_id: planId,
      billing_cycle: billingCycle,
      coupon_code: couponCode,
    });
    return res.data;
  },

  cancelSubscription: async (): Promise<SubscriptionItem> => {
    const res = await apiClient.post<SubscriptionItem>('/api/v1/subscriptions/cancel');
    return res.data;
  },

  getTenantInvoices: async (): Promise<BillingInvoiceItem[]> => {
    const res = await apiClient.get<BillingInvoiceItem[]>('/api/v1/subscriptions/invoices');
    return res.data;
  },
};
