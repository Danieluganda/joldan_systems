const { app, BrowserWindow, Menu, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

let mainWindow;
let viteProcess;
let isDevServerReady = false;

// Auto-updater configuration
class AutoUpdater {
    constructor() {
        this.updateInterval = 60000; // Check every minute
        this.isUpdating = false;
        this.repoUrl = 'https://github.com/Danieluganda/joldan_systems.git';
        this.branch = 'main'; // or 'master' depending on your default branch
    }

    async checkForUpdates() {
        if (this.isUpdating) return;
        
        try {
            console.log('Checking for updates from:', this.repoUrl);
            this.isUpdating = true;
            
            // Initialize git repo if needed
            await this.ensureGitRepo();
            
            // Fetch latest changes
            await this.runCommand('git', ['fetch', 'origin', this.branch]);
            
            // Check if updates are available
            const result = await this.runCommand('git', ['rev-list', `HEAD...origin/${this.branch}`, '--count']);
            const updateCount = parseInt(result.stdout.trim());
            
            if (updateCount > 0) {
                console.log(`Found ${updateCount} updates available`);
                
                // Show update notification
                this.showUpdateNotification(`🔄 Found ${updateCount} updates! Updating now...`);
                
                await this.performUpdate();
                
                // Show success notification
                this.showUpdateNotification('✅ App updated successfully!', '#4CAF50');
            } else {
                console.log('App is up to date');
            }
        } catch (error) {
            console.error('Update check failed:', error.message);
            this.showUpdateNotification('⚠️ Update check failed', '#ff9800');
        } finally {
            this.isUpdating = false;
        }
    }

    async ensureGitRepo() {
        try {
            // Check if .git directory exists
            if (!fs.existsSync('.git')) {
                console.log('Initializing git repository...');
                await this.runCommand('git', ['init']);
                await this.runCommand('git', ['remote', 'add', 'origin', this.repoUrl]);
                await this.runCommand('git', ['fetch', 'origin', this.branch]);
                await this.runCommand('git', ['checkout', '-b', this.branch, `origin/${this.branch}`]);
                console.log('Git repository initialized successfully');
            } else {
                // Ensure we have the correct remote
                try {
                    const remoteResult = await this.runCommand('git', ['remote', 'get-url', 'origin']);
                    if (remoteResult.stdout.trim() !== this.repoUrl) {
                        await this.runCommand('git', ['remote', 'set-url', 'origin', this.repoUrl]);
                    }
                } catch (error) {
                    // Remote doesn't exist, add it
                    await this.runCommand('git', ['remote', 'add', 'origin', this.repoUrl]);
                }
            }
        } catch (error) {
            console.error('Failed to ensure git repository:', error.message);
            throw error;
        }
    }

    showUpdateNotification(message, color = '#2196F3') {
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                if (document.body) {
                    // Remove existing notifications
                    const existingNotifications = document.querySelectorAll('.electron-notification');
                    existingNotifications.forEach(n => n.remove());
                    
                    const notification = document.createElement('div');
                    notification.className = 'electron-notification';
                    notification.style.position = 'fixed';
                    notification.style.top = '20px';
                    notification.style.right = '20px';
                    notification.style.background = '${color}';
                    notification.style.color = 'white';
                    notification.style.padding = '15px 20px';
                    notification.style.borderRadius = '8px';
                    notification.style.zIndex = '10000';
                    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
                    notification.style.fontFamily = 'system-ui, -apple-system, sans-serif';
                    notification.style.fontSize = '14px';
                    notification.style.fontWeight = '500';
                    notification.style.maxWidth = '300px';
                    notification.style.animation = 'slideIn 0.3s ease-out';
                    notification.innerHTML = '${message}';
                    
                    // Add CSS animation if not exists
                    if (!document.querySelector('#electronNotificationStyles')) {
                        const style = document.createElement('style');
                        style.id = 'electronNotificationStyles';
                        style.textContent = \`
                            @keyframes slideIn {
                                from { transform: translateX(100%); opacity: 0; }
                                to { transform: translateX(0); opacity: 1; }
                            }
                        \`;
                        document.head.appendChild(style);
                    }
                    
                    document.body.appendChild(notification);
                    setTimeout(() => {
                        if (notification.parentNode) {
                            notification.style.animation = 'slideIn 0.3s ease-out reverse';
                            setTimeout(() => notification.remove(), 300);
                        }
                    }, 4000);
                }
            `).catch(() => {}); // Ignore errors if page isn't ready
        }
    }

    async performUpdate() {
        try {
            console.log('Updating application...');
            
            // Stash any local changes
            try {
                await this.runCommand('git', ['stash', 'push', '-m', 'Auto-stash before update']);
            } catch (error) {
                // No changes to stash, continue
            }
            
            // Pull latest changes
            await this.runCommand('git', ['pull', 'origin', this.branch]);
            
            console.log('Update completed successfully!');
            
            // Update dependencies and restart
            await this.updateDependencies();
            await this.restartDevServer();
            
        } catch (error) {
            console.error('Update failed:', error.message);
            this.showUpdateNotification('❌ Update failed: ' + error.message, '#f44336');
        }
    }

    async updateDependencies() {
        try {
            // Update client dependencies if package.json changed
            const clientDir = path.join(__dirname, 'client');
            if (fs.existsSync(path.join(clientDir, 'package.json'))) {
                console.log('Updating client dependencies...');
                await this.runCommand('npm', ['install'], { cwd: clientDir });
            }

            // Update server dependencies if package.json changed
            const serverDir = path.join(__dirname, 'server');
            if (fs.existsSync(path.join(serverDir, 'package.json'))) {
                console.log('Updating server dependencies...');
                await this.runCommand('npm', ['install'], { cwd: serverDir });
            }

            // Update root dependencies
            if (fs.existsSync(path.join(__dirname, 'package.json'))) {
                console.log('Updating root dependencies...');
                await this.runCommand('npm', ['install']);
            }
        } catch (error) {
            console.warn('Dependency update failed:', error.message);
            // Don't fail the entire update for dependency issues
        }
    }

    async runCommand(command, args, options = {}) {
        return new Promise((resolve, reject) => {
            const process = spawn(command, args, { 
                ...options,
                shell: true,
                stdio: 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    resolve({ stdout, stderr });
                } else {
                    reject(new Error(`Command failed with code ${code}: ${stderr}`));
                }
            });
        });
    }

    async restartDevServer() {
        console.log('Restarting development server...');
        
        // Kill existing process
        if (viteProcess) {
            viteProcess.kill();
            viteProcess = null;
        }
        
        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Start new process
        startDevServer();
        
        // Wait for server to be ready
        await waitForDevServer();
        
        // Reload the window
        if (mainWindow) {
            mainWindow.reload();
        }
    }

    startPeriodicChecks() {
        // Check for updates every minute
        setInterval(() => {
            this.checkForUpdates();
        }, this.updateInterval);
        
        // Initial check after 10 seconds
        setTimeout(() => {
            this.checkForUpdates();
        }, 10000);
    }
}

const autoUpdater = new AutoUpdater();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        },
        icon: path.join(__dirname, 'assets', 'icon.png'), // Add app icon if you have one
        show: false, // Don't show until ready
        titleBarStyle: 'default',
        autoHideMenuBar: false
    });

    // Create application menu
    createMenu();

    // Load the application
    if (isDevServerReady) {
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // Show loading page while dev server starts
        mainWindow.loadFile(path.join(__dirname, 'loading.html'));
    }

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    // Handle window closed
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (viteProcess) {
            viteProcess.kill();
        }
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Dev server ready handler
    mainWindow.webContents.on('did-finish-load', () => {
        if (!isDevServerReady) {
            waitForDevServer().then(() => {
                mainWindow.loadURL('http://localhost:5173');
            });
        }
    });
}

function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'Refresh App',
                    accelerator: 'F5',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    }
                },
                {
                    label: 'Check for Updates',
                    click: () => {
                        autoUpdater.checkForUpdates();
                    }
                },
                { type: 'separator' },
                {
                    role: 'quit'
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Procurement System',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About',
                            message: 'Procurement Discipline System',
                            detail: 'Version 1.0.0\\nSelf-updating desktop application\\nBuilt with Electron and React'
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

function startDevServer() {
    console.log('Starting Vite dev server...');
    
    const clientDir = path.join(__dirname, 'client');
    
    viteProcess = spawn('npm', ['run', 'dev'], {
        cwd: clientDir,
        shell: true,
        stdio: 'inherit'
    });

    viteProcess.on('error', (error) => {
        console.error('Failed to start dev server:', error);
    });

    viteProcess.on('close', (code) => {
        console.log(`Dev server exited with code ${code}`);
        viteProcess = null;
    });
}

async function waitForDevServer() {
    const maxAttempts = 30;
    const delay = 1000;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch('http://localhost:5173');
            if (response.ok) {
                console.log('Dev server is ready!');
                isDevServerReady = true;
                return true;
            }
        } catch (error) {
            // Server not ready yet
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Dev server failed to start within timeout period');
}

// App event handlers
app.whenReady().then(async () => {
    // Start the dev server first
    startDevServer();
    
    // Wait for dev server to be ready
    try {
        await waitForDevServer();
    } catch (error) {
        console.error('Dev server startup failed:', error);
    }
    
    // Create the main window
    createWindow();
    
    // Start auto-update checks
    autoUpdater.startPeriodicChecks();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.on('before-quit', () => {
    if (viteProcess) {
        viteProcess.kill();
    }
});

// Handle app updates
app.on('ready', () => {
    // Check for updates on startup (after initial delay)
    setTimeout(() => {
        autoUpdater.checkForUpdates();
    }, 5000);
});