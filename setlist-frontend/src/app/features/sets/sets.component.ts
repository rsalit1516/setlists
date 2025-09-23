import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-sets',
  imports: [MatCardModule],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Sets Management</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>Sets component placeholder. This will be implemented next.</p>
      </mat-card-content>
    </mat-card>
  `,
  styles: [
    `
      mat-card {
        margin: 1rem;
      }
    `,
  ],
})
export class SetsComponent {}
