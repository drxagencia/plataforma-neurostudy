
declare global {
  interface Window {
    fbq: any;
  }
}

export const PixelService = {
  // Base track method
  track: (event: string, data?: any) => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', event, data);
    }
  },

  // Standard Events Shortcuts
  trackPageView: () => {
    PixelService.track('PageView');
  },

  trackViewContent: (contentName: string, contentIds?: string[]) => {
    PixelService.track('ViewContent', {
      content_name: contentName,
      content_ids: contentIds,
      content_type: 'product'
    });
  },

  trackInitiateCheckout: (value?: number, currency: string = 'BRL') => {
    PixelService.track('InitiateCheckout', {
      value: value,
      currency: currency
    });
  },

  trackPurchase: (value: number, currency: string = 'BRL', orderId?: string) => {
    PixelService.track('Purchase', {
      value: value,
      currency: currency,
      order_id: orderId
    });
  }
};
