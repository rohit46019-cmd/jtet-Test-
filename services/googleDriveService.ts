// Google Drive Sync Service for QuizFlash AI
// Handles Google Drive OAuth token client, backup upload, and restore sync.

declare global {
  interface Window {
    google?: any;
  }
}

const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';
const BACKUP_FILENAME = 'QuizFlash_Drive_Database.json';

export class GoogleDriveService {
  private tokenClient: any = null;
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('qf_gdrive_token');
  }

  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  public setToken(token: string) {
    this.accessToken = token;
    localStorage.setItem('qf_gdrive_token', token);
  }

  public logout() {
    this.accessToken = null;
    localStorage.removeItem('qf_gdrive_token');
  }

  public async authenticate(clientId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        // Load GIS script dynamically if not present
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => this.requestToken(resolve, reject, clientId);
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this.requestToken(resolve, reject, clientId);
      }
    });
  }

  private requestToken(resolve: (token: string) => void, reject: (err: any) => void, clientId?: string) {
    try {
      const id = clientId || '355984271022-3s9g7s2vbgq00000000000000000000.apps.googleusercontent.com';
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: id,
        scope: SCOPES,
        callback: (resp: any) => {
          if (resp.error) {
            reject(resp);
          } else {
            this.setToken(resp.access_token);
            resolve(resp.access_token);
          }
        },
      });
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      reject(e);
    }
  }

  public async backupData(data: object): Promise<boolean> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (searchRes.status === 401) {
      this.logout();
      throw new Error('Google Drive session expired. Please reconnect.');
    }

    const searchData = await searchRes.json();
    const files = searchData.files || [];
    const fileId = files.length > 0 ? files[0].id : null;

    const fileContent = JSON.stringify(data, null, 2);
    const fileMetadata = {
      name: BACKUP_FILENAME,
      mimeType: 'application/json',
    };

    if (fileId) {
      const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
      const updateRes = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: fileContent,
      });
      return updateRes.ok;
    } else {
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(fileMetadata)], { type: 'application/json' }));
      form.append('file', new Blob([fileContent], { type: 'application/json' }));

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: form,
      });
      return createRes.ok;
    }
  }

  public async restoreData(): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Drive');
    }

    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${BACKUP_FILENAME}' and trashed=false`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (searchRes.status === 401) {
      this.logout();
      throw new Error('Google Drive session expired. Please reconnect.');
    }

    const searchData = await searchRes.json();
    const files = searchData.files || [];
    if (files.length === 0) {
      throw new Error('No backup found in Google Drive yet.');
    }

    const fileId = files[0].id;
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });

    if (!downloadRes.ok) {
      throw new Error('Failed to download backup file from Google Drive.');
    }

    return await downloadRes.json();
  }
}

export const googleDriveService = new GoogleDriveService();
