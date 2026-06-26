import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../shared/auth.service';

@Component({
  selector: 'app-home-redirect',
  template: '',
})
export class HomeRedirectComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  constructor() {
    void this.router.navigateByUrl(
      this.authService.isAuthenticated() ? '/files' : '/login',
      { replaceUrl: true },
    );
  }
}
