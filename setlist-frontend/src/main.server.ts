import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';

export default function bootstrap(context?: any) {
  try {
    return bootstrapApplication(App, {
      ...config,
      ...(context && { context }),
    });
  } catch (error) {
    console.warn('SSR bootstrap failed:', error);
    return bootstrapApplication(App, config);
  }
}
