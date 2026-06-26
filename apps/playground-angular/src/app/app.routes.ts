import { Routes } from '@angular/router';
import { authGuard } from './shared/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/home-redirect.component').then(
        (module) => module.HomeRedirectComponent,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login-page.component').then(
        (module) => module.LoginPageComponent,
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register-page.component').then(
        (module) => module.RegisterPageComponent,
      ),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/files-page.component').then(
        (module) => module.FilesPageComponent,
      ),
  },
  {
    path: 'ai-session',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/ai-session-page.component').then(
        (module) => module.AiSessionPageComponent,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
