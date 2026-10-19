// core/auth/has-role.ts
import { Directive, TemplateRef, ViewContainerRef, inject, effect, input } from '@angular/core';
import { AuthService } from './auth.service';
import { UserRole } from './role.model';

@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRole {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef);
  private viewContainer = inject(ViewContainerRef);
  hasRole = input<UserRole | UserRole[]>();
  mode = input<'hide'>('hide', { alias: 'hasRoleMode' });

  constructor() {
    effect(() => this.updateView());
  }

  private updateView(): void {
    const roles = this.hasRole();
    const allowedRoles = roles === undefined ? [] : Array.isArray(roles) ? roles : [roles];
    const hasAccess = this.authService.hasRole(allowedRoles);
    this.viewContainer.clear();

    if (hasAccess) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }

    // OLD: 'disable' mode, replaced by disabling the form control
    // } else {
    //   if (this.mode() === 'hide') {
    //     return;
    //   }
    //
    //   if (this.mode() === 'disable') {
    //     const embeddedView = this.viewContainer.createEmbeddedView(this.templateRef);
    //     const nativeElement = embeddedView.rootNodes[0] as HTMLElement;
    //
    //     if (nativeElement && nativeElement.nodeType === Node.ELEMENT_NODE) {
    //       this.renderer.setAttribute(nativeElement, 'readonly', 'true');
    //       this.renderer.setAttribute(nativeElement, 'disabled', 'true');
    //       this.renderer.setStyle(nativeElement, 'opacity', '0.6');
    //     }
    //   }
    // }
  }
}
