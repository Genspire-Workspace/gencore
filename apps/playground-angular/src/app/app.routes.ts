// file: apps\playground-angular\src\app\app.routes.ts

import type { Routes } from '@angular/router';
import { authGuard } from './features/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/auth/home-redirect.component').then(
        (module) => module.HomeRedirectComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register-page.component').then(
        (module) => module.RegisterPageComponent,
      ),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/files/files-page.component').then(
        (module) => module.FilesPageComponent,
      ),
  },
  {
    path: 'ai/sessions',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ai/sessions/ai-session-page.component').then(
        (module) => module.AiSessionPageComponent,
      ),
  },
  {
    path: 'ai/prompts',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ai/prompts/ai-prompt-page.component').then(
        (module) => module.AiPromptPageComponent,
      ),
  },
  {
    path: 'ai/skills',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/ai/skills/ai-skill-page.component').then(
        (module) => module.AiSkillPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
