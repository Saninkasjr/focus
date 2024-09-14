// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(async (registration) => {
            console.log('Service Worker registered with scope:', registration.scope);

            if ('periodicSync' in registration) {
                try {
                    const status = await navigator.permissions.query({
                        name: 'periodic-background-sync',
                    });
                    if (status.state === 'granted') {
                        await registration.periodicSync.register('update-cache', {
                            minInterval: 24 * 60 * 60 * 1000 // Sync once a day
                        });
                        console.log('Periodic Sync registered');
                    }
                } catch (error) {
                    console.error('Periodic Sync registration failed:', error);
                }
            }
        })
        .catch((error) => {
            console.error('Service Worker registration failed:', error);
        });
}

// DOM Elements
const statusDisplay = document.getElementById('status');
const circle = document.querySelector('.progress-ring__circle');
const settingsPopup = document.getElementById('settingsPopup');
const focusDurationInput = document.getElementById('focusDuration');
const breakDurationInput = document.getElementById('breakDuration');
const themeSelect = document.getElementById('themeSelect');
const saveSettingsBtn = document.getElementById('saveSettings');
const closeSettingsBtn = document.getElementById('closeSettings');

// Constants
const radius = circle.r.baseVal.value;
const circumference = radius * 2 * Math.PI;

// State
let state = {
    isWorking: true,
    timer: null,
    timeLeft: 25 * 60,
    taps: 0,
    lastTap: 0,
    longPressTimer: null,
    audioPlayingTimer: null,
    focusDuration: 25,
    breakDuration: 5
};

// Sound
const sound = new Howl({ src: ['/music/noti.mp3'] });

// Initialize
function init() {
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    circle.style.strokeDashoffset = circumference;
    setTheme('dark');
    setupEventListeners();
    if ("Notification" in window) {
        Notification.requestPermission();
    }
}

// Event Listeners
function setupEventListeners() {
    document.body.addEventListener('touchstart', handleTouchStart);
    document.body.addEventListener('touchend', handleTouchEnd);
    saveSettingsBtn.addEventListener('click', saveSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
}

// Touch Handlers
function handleTouchStart(e) {
    state.longPressTimer = setTimeout(openSettings, 1000);
}

function handleTouchEnd(e) {
    clearTimeout(state.longPressTimer);
    const currentTime = new Date().getTime();
    const tapLength = currentTime - state.lastTap;
    if (tapLength < 500 && tapLength > 0) {
        state.taps++;
        if (state.taps === 2) {
            if (state.audioPlayingTimer) {
                clearTimeout(state.audioPlayingTimer);
                sound.stop();
                state.audioPlayingTimer = null;
            } else {
                startPauseTimer();
            }
            state.taps = 0;
            return;
        }
    } else {
        state.taps = 1;
    }
    state.lastTap = currentTime;
}

// Timer Functions
function startPauseTimer() {
    if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
        statusDisplay.textContent = 'Paused';
        document.body.classList.remove('timer-active');
    } else {
        state.timer = setInterval(updateTimer, 1000);
        statusDisplay.textContent = state.isWorking ? 'Focusing' : 'Taking a Break';
        document.body.classList.add('timer-active');
    }
}

function updateTimer() {
    state.timeLeft--;
    setProgress((state.timeLeft / (state.isWorking ? state.focusDuration * 60 : state.breakDuration * 60)) * 100);
    if (state.timeLeft <= 0) {
        state.isWorking = !state.isWorking;
        state.timeLeft = state.isWorking ? state.focusDuration * 60 : state.breakDuration * 60;
        statusDisplay.textContent = state.isWorking ? 'Focusing' : 'Taking a Break';
        playNotificationSound();
    } else {
        statusDisplay.textContent = state.isWorking ? 'Focusing' : 'Taking a Break';
    }
}

function setProgress(percent) {
    const offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDashoffset = offset;
}

// Sound Functions
function playNotificationSound() {
    sound.play();
    state.audioPlayingTimer = setTimeout(() => {
        sound.stop();
        state.audioPlayingTimer = null;
    }, 20000);
}

// Settings Functions
function openSettings() {
    settingsPopup.style.display = 'block';
    focusDurationInput.value = state.focusDuration;
    breakDurationInput.value = state.breakDuration;
}

function closeSettings() {
    settingsPopup.style.display = 'none';
}

function saveSettings() {
    state.focusDuration = parseInt(focusDurationInput.value);
    state.breakDuration = parseInt(breakDurationInput.value);
    const theme = themeSelect.value;
    setTheme(theme);
    closeSettings();
    state.timeLeft = state.isWorking ? state.focusDuration * 60 : state.breakDuration * 60;
    setProgress(100);
}

// Theme Functions
function setTheme(theme) {
    if (theme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
    } else if (theme === 'dark') {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
    } else {
        // System theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.body.classList.remove('light-mode');
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
            document.body.classList.add('light-mode');
        }
    }
}

// Initialize the app
init();