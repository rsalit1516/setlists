import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { GigService } from '../../shared/services/gig.service';
import { Gig } from '../../shared/models';
import { DeleteConfirmationDialogComponent } from '../../shared/components/delete-confirmation-dialog.component';
import { GigDialogComponent, GigDialogData } from './gig-dialog.component';

@Component({
  selector: 'app-gigs',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatInputModule,
    MatFormFieldModule,
    MatCardModule,
    MatToolbarModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  template: `
    <div class="gigs-container">
      <!-- Header -->
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Gigs Management</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="header-actions">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search gigs...</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                (input)="onSearchChange()"
                placeholder="Search by name or venue"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="openGigDialog()">
              <mat-icon>add</mat-icon>
              Add Gig
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Gigs Table -->
      <mat-card class="table-card">
        <mat-card-content>
          @if (gigService.loading()) {
          <div class="loading-container">
            <p>Loading gigs...</p>
          </div>
          } @else if (gigService.gigs().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">event</mat-icon>
            <h3>No gigs found</h3>
            <p>Get started by adding your first gig!</p>
            <button mat-raised-button color="primary" (click)="openGigDialog()">
              <mat-icon>add</mat-icon>
              Add Gig
            </button>
          </div>
          } @else {
          <div class="table-container">
            <table
              mat-table
              [dataSource]="gigService.gigs()"
              matSort
              (matSortChange)="onSortChange($event)"
              class="gigs-table"
            >
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let gig">{{ gig.name }}</td>
              </ng-container>

              <!-- Date Column -->
              <ng-container matColumnDef="date">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Date</th>
                <td mat-cell *matCellDef="let gig">
                  {{ formatDate(gig.date) }}
                </td>
              </ng-container>

              <!-- Venue Column -->
              <ng-container matColumnDef="venue">
                <th mat-header-cell *matHeaderCellDef>Venue</th>
                <td mat-cell *matCellDef="let gig">{{ gig.venue || '-' }}</td>
              </ng-container>

              <!-- Sets Count Column -->
              <ng-container matColumnDef="setsCount">
                <th mat-header-cell *matHeaderCellDef>Sets</th>
                <td mat-cell *matCellDef="let gig">
                  <mat-chip class="sets-chip">{{
                    gig.sets?.length || 0
                  }}</mat-chip>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let gig">
                  <button
                    mat-icon-button
                    (click)="openGigDialog(gig)"
                    matTooltip="Edit gig"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="deleteGig(gig)"
                    matTooltip="Delete gig"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
            </table>

            <!-- Pagination -->
            <mat-paginator
              [length]="gigService.pagination().totalCount"
              [pageSize]="pageSize"
              [pageSizeOptions]="[10, 25, 50, 100]"
              [pageIndex]="pageIndex"
              (page)="onPageChange($event)"
              showFirstLastButtons
            >
            </mat-paginator>
          </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .gigs-container {
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
      }

      .header-card {
        margin-bottom: 1rem;
      }

      .header-actions {
        display: flex;
        gap: 1rem;
        align-items: center;
        flex-wrap: wrap;
      }

      .search-field {
        flex: 1;
        min-width: 250px;
      }

      .table-card {
        margin-bottom: 1rem;
      }

      .loading-container {
        text-align: center;
        padding: 2rem;
      }

      .empty-state {
        text-align: center;
        padding: 3rem;
      }

      .empty-icon {
        font-size: 4rem;
        height: 4rem;
        width: 4rem;
        color: #666;
        margin-bottom: 1rem;
      }

      .table-container {
        overflow-x: auto;
      }

      .gigs-table {
        width: 100%;
      }

      .mat-mdc-table {
        border-radius: 8px;
      }

      .mat-mdc-header-cell {
        font-weight: 600;
      }

      .sets-chip {
        background-color: #e3f2fd;
        color: #1976d2;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .gigs-container {
          padding: 0.5rem;
        }

        .header-actions {
          flex-direction: column;
          align-items: stretch;
        }

        .search-field {
          min-width: auto;
        }
      }
    `,
  ],
})
export class GigsComponent implements OnInit {
  searchTerm = '';
  pageIndex = 0;
  pageSize = 25;

  displayedColumns: string[] = [
    'name',
    'date',
    'venue',
    'setsCount',
    'actions',
  ];

  constructor(
    public gigService: GigService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadGigs();
  }

  loadGigs() {
    this.gigService.loadGigs(
      this.pageIndex + 1, // API uses 1-based indexing
      this.pageSize
    );
  }

  onSearchChange() {
    this.pageIndex = 0; // Reset to first page when searching
    this.loadGigs();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadGigs();
  }

  onSortChange(sort: Sort) {
    // For now, just reload - sorting can be implemented later
    this.loadGigs();
  }

  openGigDialog(gig?: Gig) {
    const dialogRef = this.dialog.open(GigDialogComponent, {
      width: '500px',
      data: {
        gig: gig,
        mode: gig ? 'edit' : 'create',
      } as GigDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (gig) {
          // Edit existing gig
          this.updateGig(gig.id, result);
        } else {
          // Create new gig
          this.createGig(result);
        }
      }
    });
  }

  deleteGig(gig: Gig) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Gig',
        message: `Are you sure you want to delete "${gig.name}"? This will also delete all associated sets.`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.gigService.deleteGig(gig.id).then((success) => {
          if (success) {
            this.showMessage('Gig deleted successfully');
            this.loadGigs();
          } else {
            this.showMessage('Failed to delete gig', true);
          }
        });
      }
    });
  }

  createGig(gigData: Partial<Gig>) {
    const createData = {
      name: gigData.name!,
      date: gigData.date!,
      venue: gigData.venue,
      notes: gigData.notes,
    };

    this.gigService.createGig(createData).then((success) => {
      if (success) {
        this.showMessage('Gig created successfully');
        this.loadGigs();
      } else {
        this.showMessage('Failed to create gig', true);
      }
    });
  }

  updateGig(id: number, gigData: Partial<Gig>) {
    const updateData = {
      name: gigData.name!,
      date: gigData.date!,
      venue: gigData.venue,
      notes: gigData.notes,
    };

    this.gigService.updateGig(id, updateData).then((success) => {
      if (success) {
        this.showMessage('Gig updated successfully');
        this.loadGigs();
      } else {
        this.showMessage('Failed to update gig', true);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  private showMessage(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: isError ? 'error-snackbar' : 'success-snackbar',
    });
  }
}
