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
import { SongService } from '../../shared/services/song.service';
import { Song } from '../../shared/models';
import { SongDialogComponent } from './song-dialog.component';
import { DeleteConfirmationDialogComponent } from '../../shared/components/delete-confirmation-dialog.component';

@Component({
  selector: 'app-songs',
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
  ],
  template: `
    <div class="songs-container">
      <!-- Header -->
      <mat-card class="header-card">
        <mat-card-header>
          <mat-card-title>Songs Management</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="header-actions">
            <mat-form-field appearance="outline" class="search-field">
              <mat-label>Search songs...</mat-label>
              <input
                matInput
                [(ngModel)]="searchTerm"
                (input)="onSearchChange()"
                placeholder="Search by name or artist"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              (click)="openSongDialog()"
            >
              <mat-icon>add</mat-icon>
              Add Song
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Songs Table -->
      <mat-card class="table-card">
        <mat-card-content>
          @if (songService.loading()) {
          <div class="loading-container">
            <p>Loading songs...</p>
          </div>
          } @else if (songService.songs().length === 0) {
          <div class="empty-state">
            <mat-icon class="empty-icon">music_note</mat-icon>
            <h3>No songs found</h3>
            <p>Get started by adding your first song!</p>
            <button
              mat-raised-button
              color="primary"
              (click)="openSongDialog()"
            >
              <mat-icon>add</mat-icon>
              Add Song
            </button>
          </div>
          } @else {
          <div class="table-container">
            <table
              mat-table
              [dataSource]="songService.songs()"
              matSort
              (matSortChange)="onSortChange($event)"
              class="songs-table"
            >
              <!-- Name Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
                <td mat-cell *matCellDef="let song">{{ song.name }}</td>
              </ng-container>

              <!-- Artist Column -->
              <ng-container matColumnDef="artist">
                <th mat-header-cell *matHeaderCellDef mat-sort-header>
                  Artist
                </th>
                <td mat-cell *matCellDef="let song">{{ song.artist }}</td>
              </ng-container>

              <!-- Genre Column -->
              <ng-container matColumnDef="genre">
                <th mat-header-cell *matHeaderCellDef>Genre</th>
                <td mat-cell *matCellDef="let song">{{ song.genre || '-' }}</td>
              </ng-container>

              <!-- Duration Column -->
              <ng-container matColumnDef="duration">
                <th mat-header-cell *matHeaderCellDef>Duration</th>
                <td mat-cell *matCellDef="let song">
                  {{ formatDuration(song.durationSeconds) }}
                </td>
              </ng-container>

              <!-- Readiness Status Column -->
              <ng-container matColumnDef="readinessStatus">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let song">
                  <span
                    [class]="'status-' + song.readinessStatus.toLowerCase()"
                  >
                    {{ getReadinessStatusText(song.readinessStatus) }}
                  </span>
                </td>
              </ng-container>

              <!-- Actions Column -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef>Actions</th>
                <td mat-cell *matCellDef="let song">
                  <button
                    mat-icon-button
                    (click)="openSongDialog(song)"
                    matTooltip="Edit song"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    color="warn"
                    (click)="deleteSong(song)"
                    matTooltip="Delete song"
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
              [length]="songService.pagination().totalCount"
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
      .songs-container {
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

      .songs-table {
        width: 100%;
      }

      .mat-mdc-table {
        border-radius: 8px;
      }

      .mat-mdc-header-cell {
        font-weight: 600;
      }

      .status-ready {
        color: #4caf50;
        font-weight: 500;
      }

      .status-inprogress {
        color: #ff9800;
        font-weight: 500;
      }

      .status-wishlist {
        color: #2196f3;
        font-weight: 500;
      }

      @media (max-width: 768px) {
        .songs-container {
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
export class SongsComponent implements OnInit {
  searchTerm = '';
  pageIndex = 0;
  pageSize = 25;

  displayedColumns: string[] = [
    'name',
    'artist',
    'genre',
    'duration',
    'readinessStatus',
    'actions',
  ];

  constructor(
    public songService: SongService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadSongs();
  }

  loadSongs() {
    this.songService.loadSongs(
      this.pageIndex + 1, // API uses 1-based indexing
      this.pageSize,
      this.searchTerm || undefined
    );
  }

  onSearchChange() {
    this.pageIndex = 0; // Reset to first page when searching
    this.loadSongs();
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadSongs();
  }

  onSortChange(sort: Sort) {
    // For now, just reload - sorting can be implemented later
    this.loadSongs();
  }

  openSongDialog(song?: Song) {
    const dialogRef = this.dialog.open(SongDialogComponent, {
      width: '600px',
      data: song ? { ...song } : null,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        if (song) {
          // Update existing song
          this.songService.updateSong(song.id, result).then((updatedSong) => {
            if (updatedSong) {
              this.showMessage('Song updated successfully');
              this.loadSongs();
            } else {
              this.showMessage('Failed to update song', true);
            }
          });
        } else {
          // Create new song
          this.songService.createSong(result).then((createdSong) => {
            if (createdSong) {
              this.showMessage('Song created successfully');
              this.loadSongs();
            } else {
              this.showMessage('Failed to create song', true);
            }
          });
        }
      }
    });
  }

  deleteSong(song: Song) {
    const dialogRef = this.dialog.open(DeleteConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Song',
        message: `Are you sure you want to delete "${song.name}" by ${song.artist}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.songService.deleteSong(song.id).then((success) => {
          if (success) {
            this.showMessage('Song deleted successfully');
            this.loadSongs();
          } else {
            this.showMessage('Failed to delete song', true);
          }
        });
      }
    });
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getReadinessStatusText(status: number): string {
    switch (status) {
      case 0: // Ready
        return 'Ready';
      case 1: // InProgress
        return 'In Progress';
      case 2: // WishList
        return 'Wish List';
      default:
        return 'Unknown';
    }
  }

  private showMessage(message: string, isError = false) {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: isError ? 'error-snackbar' : 'success-snackbar',
    });
  }
}
