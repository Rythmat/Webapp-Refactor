import { telemetryClient } from '../client';
import { ProductEvents } from '../types';

export function trackSessionStarted(): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.SESSION_STARTED,
    });
  } catch {
    // Silent failure
  }
}

export function trackPageViewed(route: string): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.PAGE_VIEWED,
      route,
    });
  } catch {
    // Silent failure
  }
}

export function trackLessonStarted(
  lessonId: string,
  attrs?: { mode?: string; rootNote?: string; difficulty?: string },
): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.LESSON_STARTED,
      lessonId,
      attributesJson: attrs ?? null,
    });
  } catch {
    // Silent failure
  }
}

export function trackActivityStarted(
  lessonId: string,
  activityId: string,
  attrs?: { mode?: string; rootNote?: string },
): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.ACTIVITY_STARTED,
      lessonId,
      activityId,
      attributesJson: attrs ?? null,
    });
  } catch {
    // Silent failure
  }
}

export function trackActivityCompleted(
  lessonId: string,
  activityId: string,
  attrs?: { durationMs?: number; attemptNumber?: number },
): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.ACTIVITY_COMPLETED,
      lessonId,
      activityId,
      durationMs: attrs?.durationMs ?? null,
      attributesJson: attrs?.attemptNumber != null ? { attemptNumber: attrs.attemptNumber } : null,
    });
  } catch {
    // Silent failure
  }
}

export function trackActivityFailed(
  lessonId: string,
  activityId: string,
  attrs?: { errorName?: string; attemptNumber?: number },
): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.ACTIVITY_FAILED,
      lessonId,
      activityId,
      errorName: attrs?.errorName ?? null,
      attributesJson: attrs?.attemptNumber != null ? { attemptNumber: attrs.attemptNumber } : null,
    });
  } catch {
    // Silent failure
  }
}

export function trackLessonCompleted(
  lessonId: string,
  attrs?: { durationMs?: number },
): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.LESSON_COMPLETED,
      lessonId,
      durationMs: attrs?.durationMs ?? null,
    });
  } catch {
    // Silent failure
  }
}

export function trackPaywallViewed(route: string): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.PAYWALL_VIEWED,
      route,
    });
  } catch {
    // Silent failure
  }
}

export function trackCheckoutStarted(): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.CHECKOUT_STARTED,
    });
  } catch {
    // Silent failure
  }
}

export function trackSubscriptionActivated(): void {
  try {
    telemetryClient.track({
      category: 'product',
      eventName: ProductEvents.SUBSCRIPTION_ACTIVATED,
    });
  } catch {
    // Silent failure
  }
}
