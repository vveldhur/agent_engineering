import './style.css';

/* ==========================================================================
   State Management & Default Values
   ========================================================================= */

// Default settings
const DEFAULT_SETTINGS = {
  durations: {
    work: 25,    // in minutes
    short: 5,    // in minutes
    long: 15     // in minutes
  },
  autoStartBreaks: false,
  autoStartPomodoros: false,
  tickingSound: false,
  breathAnimation: true,
  dailyGoal: 4,
  longInterval: 4 // Long break after 4 focus sessions
};

// App State
let state = {
  // Timer State
  currentMode: 'work', // 'work', 'short', 'long'
  timerState: 'idle',  // 'idle', 'running', 'paused', 'finished'
  secondsRemaining: 25 * 60,
  timerIntervalId: null,
  startTime: null,
  timeLeftAtStart: 0,
  
  // Settings & Configuration
  settings: { ...DEFAULT_SETTINGS },
  
  // Tasks
  tasks: [],
  activeTaskId: null,
  
  // Daily Stats
  stats: {
    completedSessions: [], // timestamps of completed focus sessions
    totalFocusMins: 0,
    streakDays: 0,
    lastActiveDate: '' // 'YYYY-MM-DD'
  },
  
  // Aesthetic Theme
  aestheticTheme: 'theme-sage',
  colorMode: 'light'
};

/* ==========================================================================
   Web Audio API Engine (Procedural Ambient Sound & Synthesized Notification)
   ========================================================================= */

let audioCtx = null;
let masterGainNode = null;
const noiseBuffers = {};
const activeSoundGenerators = {};

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function getMasterGain() {
  const ctx = getAudioContext();
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.value = 0.8;
    masterGainNode.connect(ctx.destination);
  }
  return masterGainNode;
}

// Procedural Noise Buffer Generator
function getNoiseBuffer(type) {
  const ctx = getAudioContext();
  if (noiseBuffers[type]) return noiseBuffers[type];
  
  const bufferSize = 4 * ctx.sampleRate; // 4 seconds of loopable noise
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  if (type === 'white') {
    // White Noise (Ocean Wave base)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'brown' || type === 'campfire') {
    // Brown Noise (Rain / Campfire rumble base)
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Compensate volume
    }
  } else if (type === 'pink') {
    // Pink Noise (Forest wind base) - Paul Kellet refinement
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      data[i] *= 0.11;
      b6 = white * 0.115926;
    }
  }
  
  noiseBuffers[type] = buffer;
  return buffer;
}

// Sound Synthesizer Node Handler
class SoundGenerator {
  constructor(type, gainVal = 0.4) {
    this.type = type;
    this.gainVal = gainVal;
    this.playing = false;
    this.source = null;
    this.gainNode = null;
    this.filterNode = null;
    this.lfo = null;
    this.intervals = [];
  }
  
  start() {
    if (this.playing) return;
    const ctx = getAudioContext();
    const dest = getMasterGain();
    
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(this.gainVal, ctx.currentTime);
    
    this.source = ctx.createBufferSource();
    this.source.loop = true;
    
    if (this.type === 'rain') {
      // Deep brown noise low-pass filtered
      this.source.buffer = getNoiseBuffer('brown');
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 650;
      
      this.source.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
    } 
    else if (this.type === 'ocean') {
      // White noise with a sweeping bandpass filter modulated by LFO
      this.source.buffer = getNoiseBuffer('white');
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 400;
      this.filterNode.Q.value = 1.2;
      
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = 0.1; // 10 second wave cycle
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220; // Sweep frequency +-220Hz
      
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filterNode.frequency);
      
      this.source.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      
      this.lfo.start();
    } 
    else if (this.type === 'fire') {
      // Brown noise lowpassed + crackling highpass impulses
      this.source.buffer = getNoiseBuffer('brown');
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 350;
      
      this.source.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      
      this.startCampfireCrackles();
    } 
    else if (this.type === 'forest') {
      // Pink noise + sweeping LFO + bird calls
      this.source.buffer = getNoiseBuffer('pink');
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'bandpass';
      this.filterNode.frequency.value = 450;
      this.filterNode.Q.value = 0.6;
      
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfo.frequency.value = 0.07;
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 120;
      
      this.lfo.connect(lfoGain);
      lfoGain.connect(this.filterNode.frequency);
      
      this.source.connect(this.filterNode);
      this.filterNode.connect(this.gainNode);
      
      this.lfo.start();
      this.startForestBirds();
    }
    
    this.gainNode.connect(dest);
    this.source.start(0);
    this.playing = true;
  }
  
  stop() {
    if (!this.playing) return;
    try { this.source.stop(); } catch(e) {}
    if (this.lfo) {
      try { this.lfo.stop(); } catch(e) {}
    }
    this.intervals.forEach(id => clearInterval(id));
    this.intervals = [];
    this.playing = false;
  }
  
  setVolume(val) {
    this.gainVal = val;
    if (this.gainNode) {
      this.gainNode.gain.setValueAtTime(val, getAudioContext().currentTime);
    }
  }
  
  startCampfireCrackles() {
    const ctx = getAudioContext();
    const intervalId = setInterval(() => {
      if (!this.playing) return;
      if (Math.random() > 0.4) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(100 + Math.random() * 200, now);
        
        filter.type = 'highpass';
        filter.frequency.value = 1500;
        
        // Schedule tiny snap envelope
        gainNode.gain.setValueAtTime(0.012 * Math.random(), now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.gainNode);
        
        osc.start(now);
        osc.stop(now + 0.02);
      }
    }, 120);
    this.intervals.push(intervalId);
  }
  
  startForestBirds() {
    const ctx = getAudioContext();
    const intervalId = setInterval(() => {
      if (!this.playing) return;
      if (Math.random() > 0.88) {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        const startFreq = 1700 + Math.random() * 500;
        const endFreq = startFreq - 400 - Math.random() * 200;
        
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.18);
        
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(0.018 * Math.random(), now + 0.03);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        
        osc.connect(gainNode);
        gainNode.connect(this.gainNode);
        
        osc.start(now);
        osc.stop(now + 0.2);
      }
    }, 1800);
    this.intervals.push(intervalId);
  }
}

// Synthesize alert chime (Soothing Zen Gong/Bell)
function playChimeAlert() {
  try {
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const now = ctx.currentTime;
    
    // Soothing bell frequencies (harmonious)
    const freqs = [293.66, 440.00, 587.33, 659.25, 880.00]; // D4, A4, D5, E5, A5
    const gains = [0.45, 0.25, 0.18, 0.12, 0.06];
    
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(0, now);
    bellGain.gain.linearRampToValueAtTime(0.5, now + 0.02);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
    bellGain.connect(dest);
    
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      
      oscGain.gain.setValueAtTime(gains[idx], now);
      
      osc.connect(oscGain);
      oscGain.connect(bellGain);
      
      osc.start(now);
      osc.stop(now + 4.2);
    });
  } catch (error) {
    console.error("Could not play chime alert:", error);
  }
}

// Synthesize ticking block (Soft focus metronome)
function playTickMetronome() {
  try {
    const ctx = getAudioContext();
    const dest = getMasterGain();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(580, now);
    
    gainNode.gain.setValueAtTime(0.015, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
    
    osc.connect(gainNode);
    gainNode.connect(dest);
    
    osc.start(now);
    osc.stop(now + 0.04);
  } catch (error) {
    console.error("Could not play ticking:", error);
  }
}

/* ==========================================================================
   Timer Logic (Absolute Clock Sync / No-drift Mechanism)
   ========================================================================= */

function updateTimeDisplay() {
  const mins = Math.floor(state.secondsRemaining / 60);
  const secs = state.secondsRemaining % 60;
  const formattedTime = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  
  // Update UI Elements
  document.getElementById('time-display').textContent = formattedTime;
  
  // Title Bar Update
  const modeEmoji = state.currentMode === 'work' ? '🌸' : '🍃';
  const stateLabel = state.timerState === 'running' ? 'Active' : 'Paused';
  document.title = `${formattedTime} | ${modeEmoji} SereneFlow (${stateLabel})`;
  
  // Circle Countdown Path Dashoffset
  const totalSeconds = state.settings.durations[state.currentMode] * 60;
  const progressBar = document.getElementById('progress-bar');
  const circumference = 552.92; // 2 * Math.PI * 88
  
  if (totalSeconds > 0) {
    const fraction = state.secondsRemaining / totalSeconds;
    const offset = circumference * (1 - fraction);
    progressBar.style.strokeDashoffset = offset;
  } else {
    progressBar.style.strokeDashoffset = 0;
  }
}

function handleTimerTick() {
  if (state.timerState !== 'running') return;
  
  // No-Drift Time delta calculation
  const elapsedMs = Date.now() - state.startTime;
  const elapsedSecs = Math.floor(elapsedMs / 1000);
  state.secondsRemaining = Math.max(0, state.timeLeftAtStart - elapsedSecs);
  
  updateTimeDisplay();
  
  // Play ticking sound if configured and in focus mode
  if (state.settings.tickingSound && state.currentMode === 'work' && state.secondsRemaining > 0) {
    // play tick once a second (matches elapsedSecs changes)
    const currentTickSecond = Math.floor(elapsedMs / 1000);
    if (this.lastTickSecond !== currentTickSecond) {
      playTickMetronome();
      this.lastTickSecond = currentTickSecond;
    }
  }
  
  if (state.secondsRemaining <= 0) {
    completeSession();
  }
}

function startTimer() {
  if (state.timerState === 'running') return;
  
  // Resume or start
  state.timerState = 'running';
  state.startTime = Date.now();
  state.timeLeftAtStart = state.secondsRemaining;
  
  // Set up tick loop
  const tickContext = { lastTickSecond: -1 };
  state.timerIntervalId = setInterval(handleTimerTick.bind(tickContext), 200);
  
  // Audio context initialization
  getAudioContext();
  
  // UI Updates
  document.getElementById('play-icon').classList.add('hidden');
  document.getElementById('pause-icon').classList.remove('hidden');
  document.getElementById('timer-status-text').textContent = state.currentMode === 'work' ? 'Flowing...' : 'Resting...';
  
  // Guided breath breathing class
  const glow = document.getElementById('timer-glow');
  glow.classList.remove('breathing-inhale', 'breathing-hold', 'breathing-exhale');
  if (state.settings.breathAnimation && state.currentMode === 'work') {
    startBreathingCycle();
  }
}

function pauseTimer() {
  if (state.timerState !== 'running') return;
  
  state.timerState = 'paused';
  clearInterval(state.timerIntervalId);
  state.timerIntervalId = null;
  
  // UI Updates
  document.getElementById('play-icon').classList.remove('hidden');
  document.getElementById('pause-icon').classList.add('hidden');
  document.getElementById('timer-status-text').textContent = 'Paused';
  
  // Stop breath guide
  const glow = document.getElementById('timer-glow');
  glow.classList.remove('breathing-inhale', 'breathing-hold', 'breathing-exhale');
  const guide = document.getElementById('breathing-guide');
  guide.classList.add('hidden');
}

function resetTimer() {
  pauseTimer();
  state.timerState = 'idle';
  state.secondsRemaining = state.settings.durations[state.currentMode] * 60;
  updateTimeDisplay();
  
  document.getElementById('timer-status-text').textContent = state.currentMode === 'work' ? 'Ready to Focus' : 'Time to Rest';
}

function setTimerMode(mode) {
  pauseTimer();
  state.currentMode = mode;
  state.secondsRemaining = state.settings.durations[mode] * 60;
  
  // UI Mode Button Toggle
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  
  // Theme styling adjustments or breathing settings
  resetTimer();
}

function skipSession() {
  pauseTimer();
  
  // Determine next mode
  let nextMode = 'work';
  if (state.currentMode === 'work') {
    // Check how many focus sessions we completed to choose short vs long break
    const completedWorkSessionsCount = state.stats.completedSessions.length;
    if (completedWorkSessionsCount > 0 && completedWorkSessionsCount % state.settings.longInterval === 0) {
      nextMode = 'long';
    } else {
      nextMode = 'short';
    }
  } else {
    nextMode = 'work';
  }
  
  setTimerMode(nextMode);
  
  // Auto-start next session if enabled
  const shouldAutoStart = nextMode === 'work' ? state.settings.autoStartPomodoros : state.settings.autoStartBreaks;
  if (shouldAutoStart) {
    setTimeout(startTimer, 500); // Tiny visual buffer
  }
}

function completeSession() {
  pauseTimer();
  playChimeAlert();
  
  if (state.currentMode === 'work') {
    // 1. Record statistic
    const nowTimestamp = Date.now();
    state.stats.completedSessions.push(nowTimestamp);
    state.stats.totalFocusMins += state.settings.durations.work;
    
    // 2. Increment active task if exists
    if (state.activeTaskId) {
      const task = state.tasks.find(t => t.id === state.activeTaskId);
      if (task) {
        task.completedPoms += 1;
        saveTasks();
        renderTasks();
        updateActiveTaskBanner();
      }
    }
    
    updateStatsDashboard();
    saveStats();
  }
  
  // Trigger notification if supported
  sendBrowserNotification();
  
  // Go to next mode
  skipSession();
}

// Guided breathing cycle helper (4s Inhale, 4s Hold, 4s Exhale, 4s Hold)
function startBreathingCycle() {
  if (state.timerState !== 'running' || state.currentMode !== 'work' || !state.settings.breathAnimation) {
    document.getElementById('breathing-guide').classList.add('hidden');
    return;
  }
  
  const guide = document.getElementById('breathing-guide');
  const glow = document.getElementById('timer-glow');
  const breathText = guide.querySelector('.breath-text');
  
  guide.classList.remove('hidden');
  
  let cycleState = 0; // 0: inhale, 1: hold, 2: exhale, 3: hold
  const cycleTexts = ["Inhale...", "Hold...", "Exhale...", "Rest..."];
  const animationClasses = ["breathing-inhale", "breathing-hold", "breathing-exhale", "breathing-hold"];
  
  const breathInterval = () => {
    if (state.timerState !== 'running' || state.currentMode !== 'work') {
      guide.classList.add('hidden');
      return;
    }
    
    breathText.textContent = cycleTexts[cycleState];
    
    glow.classList.remove('breathing-inhale', 'breathing-hold', 'breathing-exhale');
    // Force reflow
    void glow.offsetWidth;
    glow.classList.add(animationClasses[cycleState]);
    
    cycleState = (cycleState + 1) % 4;
    this.breathTimeoutId = setTimeout(breathInterval, 4000);
  };
  
  // Clear any existing timeout
  if (this.breathTimeoutId) clearTimeout(this.breathTimeoutId);
  breathInterval();
}

/* ==========================================================================
   Tasks Manager Code
   ========================================================================= */

function saveTasks() {
  localStorage.setItem('serene-tasks-list', JSON.stringify(state.tasks));
}

function loadTasks() {
  const data = localStorage.getItem('serene-tasks-list');
  if (data) {
    try {
      state.tasks = JSON.parse(data);
    } catch (e) {
      state.tasks = [];
    }
  }
  
  // Restore active task id if exists
  const activeTask = state.tasks.find(t => t.active);
  if (activeTask) {
    state.activeTaskId = activeTask.id;
  }
}

function renderTasks() {
  const listEl = document.getElementById('task-list');
  listEl.innerHTML = '';
  
  if (state.tasks.length === 0) {
    listEl.innerHTML = `<li class="task-empty-state" style="text-align:center; padding:1.5rem; color:var(--text-secondary); font-size:0.85rem; font-style:italic;">No tasks created. Start by adding one below.</li>`;
    document.getElementById('tasks-remaining-badge').textContent = `0 tasks`;
    return;
  }
  
  const incompleteTasks = state.tasks.filter(t => !t.completed);
  document.getElementById('tasks-remaining-badge').textContent = `${incompleteTasks.length} left`;
  
  // Sort tasks: Active first, then incomplete, then completed
  const sortedTasks = [...state.tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return 0;
  });
  
  sortedTasks.forEach(task => {
    const li = document.createElement('li');
    li.className = `task-item ${task.active ? 'active' : ''} ${task.completed ? 'completed' : ''}`;
    li.dataset.id = task.id;
    
    // Draw pomodoros indicators
    let seedsHTML = '';
    for (let i = 0; i < task.estPoms; i++) {
      if (i < task.completedPoms) {
        seedsHTML += '●'; // Completed interval
      } else {
        seedsHTML += '○'; // Estimated interval remaining
      }
    }
    
    li.innerHTML = `
      <div class="task-left">
        <button class="checkbox-btn" aria-label="Toggle Complete">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="feather feather-check"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </button>
        <div>
          <span class="task-title" title="${task.title}">${task.title}</span>
          <div class="task-seeds" title="Intervals completed">${seedsHTML}</div>
        </div>
      </div>
      <div class="task-right">
        ${!task.completed ? `
          <button class="task-play-btn" aria-label="Focus on Task" title="Focus on this task">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-play"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </button>
        ` : ''}
        <button class="task-delete-btn" aria-label="Delete Task" title="Delete task">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-trash"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>
    `;
    
    // Add Click listeners
    li.querySelector('.checkbox-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTaskCompletion(task.id);
    });
    
    const playBtn = li.querySelector('.task-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectActiveTask(task.id);
      });
    }
    
    li.querySelector('.task-delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    });
    
    // Selecting task as active on double clicking item
    li.addEventListener('dblclick', () => {
      if (!task.completed) {
        selectActiveTask(task.id);
      }
    });
    
    listEl.appendChild(li);
  });
}

function addTask(title, estPoms) {
  const newTask = {
    id: 'task_' + Date.now(),
    title: title.trim(),
    estPoms: estPoms,
    completedPoms: 0,
    completed: false,
    active: state.tasks.length === 0 // Make active if it's the first task
  };
  
  state.tasks.push(newTask);
  if (newTask.active) {
    state.activeTaskId = newTask.id;
  }
  
  saveTasks();
  renderTasks();
  updateActiveTaskBanner();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  if (state.activeTaskId === id) {
    state.activeTaskId = null;
    // Auto-pick another incomplete task if available
    const fallback = state.tasks.find(t => !t.completed);
    if (fallback) {
      fallback.active = true;
      state.activeTaskId = fallback.id;
    }
  }
  
  saveTasks();
  renderTasks();
  updateActiveTaskBanner();
}

function selectActiveTask(id) {
  state.tasks.forEach(t => {
    t.active = (t.id === id);
  });
  state.activeTaskId = id;
  
  saveTasks();
  renderTasks();
  updateActiveTaskBanner();
}

function toggleTaskCompletion(id) {
  const task = state.tasks.find(t => t.id === id);
  if (!task) return;
  
  task.completed = !task.completed;
  if (task.completed) {
    task.active = false;
    if (state.activeTaskId === id) {
      state.activeTaskId = null;
      // Auto-assign active to next available task
      const nextTask = state.tasks.find(t => !t.completed);
      if (nextTask) {
        nextTask.active = true;
        state.activeTaskId = nextTask.id;
      }
    }
  } else {
    // If unmarked complete and no active task exists, make it active
    if (!state.activeTaskId) {
      task.active = true;
      state.activeTaskId = id;
    }
  }
  
  saveTasks();
  renderTasks();
  updateActiveTaskBanner();
}

function updateActiveTaskBanner() {
  const banner = document.getElementById('active-task-banner');
  if (!state.activeTaskId) {
    banner.classList.add('hidden');
    return;
  }
  
  const activeTask = state.tasks.find(t => t.id === state.activeTaskId);
  if (!activeTask || activeTask.completed) {
    banner.classList.add('hidden');
    state.activeTaskId = null;
    return;
  }
  
  document.getElementById('active-task-title').textContent = activeTask.title;
  document.getElementById('active-task-poms').textContent = `Intervals Completed: 🍅 ${activeTask.completedPoms} / ${activeTask.estPoms}`;
  banner.classList.remove('hidden');
}

/* ==========================================================================
   Dashboard & Statistics Code
   ========================================================================= */

function saveStats() {
  localStorage.setItem('serene-stats', JSON.stringify(state.stats));
}

function loadStats() {
  const data = localStorage.getItem('serene-stats');
  if (data) {
    try {
      state.stats = JSON.parse(data);
    } catch (e) {
      state.stats = {
        completedSessions: [],
        totalFocusMins: 0,
        streakDays: 0,
        lastActiveDate: ''
      };
    }
  }
  
  // Calculate focus streak
  checkFocusStreak();
}

function checkFocusStreak() {
  const todayStr = getTodayDateString();
  const lastDate = state.stats.lastActiveDate;
  
  if (!lastDate) {
    state.stats.streakDays = 0;
    return;
  }
  
  if (lastDate === todayStr) {
    // Already active today, streak holds
    return;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = getFormattedDateString(yesterday);
  
  if (lastDate === yesterdayStr) {
    // Active yesterday, streak continues when session finishes today
    // Do nothing for now
  } else {
    // Missed a day, reset streak
    state.stats.streakDays = 0;
    saveStats();
  }
}

function updateStatsDashboard() {
  const todayStr = getTodayDateString();
  
  // Update last active date string
  state.stats.lastActiveDate = todayStr;
  
  // Filter sessions completed today
  const todaySessions = state.stats.completedSessions.filter(timestamp => {
    const d = new Date(timestamp);
    return getFormattedDateString(d) === todayStr;
  });
  
  const countToday = todaySessions.length;
  const goal = state.settings.dailyGoal;
  
  // Update texts
  document.getElementById('completed-sessions-count').textContent = countToday;
  document.getElementById('sessions-goal-denominator').textContent = `/${goal}`;
  document.getElementById('total-focus-mins').textContent = state.stats.totalFocusMins;
  
  // Recalculate streak
  const completedCountAll = state.stats.completedSessions.length;
  if (completedCountAll > 0) {
    // If they completed a session today, ensure streak is at least 1
    if (state.stats.streakDays === 0) {
      state.stats.streakDays = 1;
    } else {
      // If last completed session date is yesterday, increment streak
      const lastSessionTimestamp = state.stats.completedSessions[completedCountAll - 2];
      if (lastSessionTimestamp) {
        const lastSessionDate = getFormattedDateString(new Date(lastSessionTimestamp));
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        if (lastSessionDate === getFormattedDateString(yesterday)) {
          state.stats.streakDays += 1;
        }
      }
    }
  }
  document.getElementById('streak-days').textContent = state.stats.streakDays;
  
  // Render goal progress ring
  const ring = document.getElementById('daily-progress-ring');
  const circumference = 263.89; // 2 * Math.PI * 42
  const progressPercent = Math.min(100, (countToday / goal) * 100);
  const offset = circumference * (1 - (progressPercent / 100));
  
  ring.style.strokeDashoffset = offset;
  document.getElementById('stat-goal-reached').textContent = `Goal: ${Math.round(progressPercent)}% completed`;
}

function getTodayDateString() {
  return getFormattedDateString(new Date());
}

function getFormattedDateString(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/* ==========================================================================
   Notification System
   ========================================================================= */

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendBrowserNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  
  const title = state.currentMode === 'work' ? 'Focus Session Completed!' : 'Break Completed!';
  const options = {
    body: state.currentMode === 'work' ? 'Take a moment to breathe and rest.' : 'Ready to start focusing again?',
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌸</text></svg>'
  };
  
  new Notification(title, options);
}

/* ==========================================================================
   Theme Management
   ========================================================================= */

function setTheme(themeName) {
  state.aestheticTheme = themeName;
  document.documentElement.className = themeName;
  localStorage.setItem('serene-aesthetic-theme', themeName);
  
  // Highlight active option in popover
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.classList.toggle('active-choice', btn.dataset.theme === themeName);
  });
}

function toggleColorMode() {
  const currentMode = document.documentElement.getAttribute('data-color-mode') || 'light';
  const nextMode = currentMode === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-color-mode', nextMode);
  document.documentElement.style.colorScheme = nextMode;
  state.colorMode = nextMode;
  localStorage.setItem('serene-color-mode', nextMode);
  
  // Update button text and icon
  const modeIcon = document.querySelector('.mode-icon');
  const modeText = document.getElementById('mode-text');
  if (nextMode === 'dark') {
    modeIcon.textContent = '☀️';
    modeText.textContent = 'Light Mode';
  } else {
    modeIcon.textContent = '🌙';
    modeText.textContent = 'Dark Mode';
  }
}

/* ==========================================================================
   Settings Dialog Handler
   ========================================================================= */

function loadSettings() {
  const data = localStorage.getItem('serene-settings');
  if (data) {
    try {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (e) {
      state.settings = { ...DEFAULT_SETTINGS };
    }
  }
}

function saveSettings() {
  localStorage.setItem('serene-settings', JSON.stringify(state.settings));
}

function openSettingsDialog() {
  const dialog = document.getElementById('settings-dialog');
  
  // Populate form fields
  document.getElementById('settings-duration-work').value = state.settings.durations.work;
  document.getElementById('settings-duration-short').value = state.settings.durations.short;
  document.getElementById('settings-duration-long').value = state.settings.durations.long;
  
  document.getElementById('settings-auto-start-breaks').checked = state.settings.autoStartBreaks;
  document.getElementById('settings-auto-start-pomodoros').checked = state.settings.autoStartPomodoros;
  document.getElementById('settings-ticking-sound').checked = state.settings.tickingSound;
  document.getElementById('settings-breath-animation').checked = state.settings.breathAnimation;
  
  document.getElementById('settings-daily-goal').value = state.settings.dailyGoal;
  document.getElementById('settings-long-interval').value = state.settings.longInterval;
  
  dialog.showModal();
}

function saveSettingsFromForm(e) {
  e.preventDefault();
  
  state.settings.durations.work = parseInt(document.getElementById('settings-duration-work').value, 10);
  state.settings.durations.short = parseInt(document.getElementById('settings-duration-short').value, 10);
  state.settings.durations.long = parseInt(document.getElementById('settings-duration-long').value, 10);
  
  state.settings.autoStartBreaks = document.getElementById('settings-auto-start-breaks').checked;
  state.settings.autoStartPomodoros = document.getElementById('settings-auto-start-pomodoros').checked;
  state.settings.tickingSound = document.getElementById('settings-ticking-sound').checked;
  state.settings.breathAnimation = document.getElementById('settings-breath-animation').checked;
  
  state.settings.dailyGoal = parseInt(document.getElementById('settings-daily-goal').value, 10);
  state.settings.longInterval = parseInt(document.getElementById('settings-long-interval').value, 10);
  
  saveSettings();
  
  // Apply changes instantly
  resetTimer();
  updateStatsDashboard();
  
  document.getElementById('settings-dialog').close();
}

function resetSettingsToDefaults() {
  state.settings = { ...DEFAULT_SETTINGS };
  saveSettings();
  
  // Re-populate settings inputs
  document.getElementById('settings-duration-work').value = DEFAULT_SETTINGS.durations.work;
  document.getElementById('settings-duration-short').value = DEFAULT_SETTINGS.durations.short;
  document.getElementById('settings-duration-long').value = DEFAULT_SETTINGS.durations.long;
  
  document.getElementById('settings-auto-start-breaks').checked = DEFAULT_SETTINGS.autoStartBreaks;
  document.getElementById('settings-auto-start-pomodoros').checked = DEFAULT_SETTINGS.autoStartPomodoros;
  document.getElementById('settings-ticking-sound').checked = DEFAULT_SETTINGS.tickingSound;
  document.getElementById('settings-breath-animation').checked = DEFAULT_SETTINGS.breathAnimation;
  
  document.getElementById('settings-daily-goal').value = DEFAULT_SETTINGS.dailyGoal;
  document.getElementById('settings-long-interval').value = DEFAULT_SETTINGS.longInterval;
  
  resetTimer();
  updateStatsDashboard();
}

/* ==========================================================================
   Ambient Sounds Mixer Code
   ========================================================================= */

function initAmbientSoundButtons() {
  const sounds = ['rain', 'ocean', 'fire', 'forest'];
  
  sounds.forEach(sound => {
    // Create synthesizer generator instance
    activeSoundGenerators[sound] = new SoundGenerator(sound, 0.4);
    
    const playBtn = document.getElementById(`play-${sound}-btn`);
    const volSlider = document.getElementById(`${sound}-volume`);
    
    playBtn.addEventListener('click', () => {
      // Trigger user gesture activation for Web Audio Context
      getAudioContext();
      
      const gen = activeSoundGenerators[sound];
      if (gen.playing) {
        gen.stop();
        playBtn.textContent = 'Play';
        playBtn.classList.remove('playing');
      } else {
        gen.start();
        playBtn.textContent = 'Mute';
        playBtn.classList.add('playing');
      }
    });
    
    volSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      activeSoundGenerators[sound].setVolume(vol);
    });
  });
  
  // Master Volume Control
  const masterVol = document.getElementById('master-volume');
  masterVol.addEventListener('input', (e) => {
    const vol = parseFloat(e.target.value);
    if (masterGainNode) {
      masterGainNode.gain.setValueAtTime(vol, getAudioContext().currentTime);
    }
  });
}

/* ==========================================================================
   Initialization & Event Listeners Wiring
   ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load Local State
  loadSettings();
  loadTasks();
  loadStats();
  
  // Restore Mode (light/dark) values in UI
  const currentMode = document.documentElement.getAttribute('data-color-mode') || 'light';
  state.colorMode = currentMode;
  const modeIcon = document.querySelector('.mode-icon');
  const modeText = document.getElementById('mode-text');
  if (currentMode === 'dark') {
    modeIcon.textContent = '☀️';
    modeText.textContent = 'Light Mode';
  }
  
  // Restore Aesthetic Theme
  const currentTheme = document.documentElement.className || 'theme-sage';
  setTheme(currentTheme);
  
  // 2. Setup initial display values
  state.secondsRemaining = state.settings.durations.work * 60;
  updateTimeDisplay();
  renderTasks();
  updateActiveTaskBanner();
  updateStatsDashboard();
  
  // 3. Initialize Ambient Mixer
  initAmbientSoundButtons();
  
  // 4. Timer Action Buttons
  document.getElementById('play-timer-btn').addEventListener('click', () => {
    if (state.timerState === 'running') {
      pauseTimer();
    } else {
      startTimer();
      // Prompt for notifications on first interaction
      requestNotificationPermission();
    }
  });
  
  document.getElementById('reset-timer-btn').addEventListener('click', resetTimer);
  document.getElementById('skip-timer-btn').addEventListener('click', skipSession);
  
  // Timer Mode Navigation Tabs
  document.getElementById('mode-work').addEventListener('click', () => setTimerMode('work'));
  document.getElementById('mode-short').addEventListener('click', () => setTimerMode('short'));
  document.getElementById('mode-long').addEventListener('click', () => setTimerMode('long'));
  
  // Active task completion button inside focus card
  document.getElementById('complete-active-task-btn').addEventListener('click', () => {
    if (state.activeTaskId) {
      toggleTaskCompletion(state.activeTaskId);
    }
  });
  
  // 5. Task Form Submit Listener
  let newTaskPoms = 2;
  const newPomsDisplay = document.getElementById('new-task-poms-display');
  
  document.getElementById('decrease-poms-btn').addEventListener('click', () => {
    if (newTaskPoms > 1) {
      newTaskPoms--;
      newPomsDisplay.textContent = newTaskPoms;
    }
  });
  
  document.getElementById('increase-poms-btn').addEventListener('click', () => {
    if (newTaskPoms < 10) {
      newTaskPoms++;
      newPomsDisplay.textContent = newTaskPoms;
    }
  });
  
  document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('new-task-input');
    if (input.value.trim() !== '') {
      addTask(input.value, newTaskPoms);
      input.value = '';
      newTaskPoms = 2; // reset
      newPomsDisplay.textContent = 2;
    }
  });
  
  // 6. Settings Modal Dialog Wiring
  const settingsBtn = document.getElementById('settings-btn');
  const closeSettingsBtn = document.getElementById('close-settings-dialog-btn');
  const settingsForm = document.getElementById('settings-form');
  const resetDefaultsBtn = document.getElementById('reset-defaults-settings-btn');
  
  settingsBtn.addEventListener('click', openSettingsDialog);
  closeSettingsBtn.addEventListener('click', () => document.getElementById('settings-dialog').close());
  settingsForm.addEventListener('submit', saveSettingsFromForm);
  resetDefaultsBtn.addEventListener('click', resetSettingsToDefaults);
  
  // 7. Popovers Show/Hide Event Logic (Theme and Ambient Mixers)
  const themeBtn = document.getElementById('theme-btn');
  const themePopover = document.getElementById('theme-popover');
  const ambientMixerBtn = document.getElementById('ambient-mixer-btn');
  const ambientPopover = document.getElementById('ambient-popover');
  
  themeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    themePopover.classList.toggle('hidden');
    ambientPopover.classList.add('hidden'); // hide other
  });
  
  ambientMixerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    ambientPopover.classList.toggle('hidden');
    themePopover.classList.add('hidden'); // hide other
  });
  
  // Theme options selector action clicks
  document.querySelectorAll('.theme-option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const selectedThemeName = btn.dataset.theme;
      setTheme(selectedThemeName);
    });
  });
  
  // Light/Dark mode click toggler inside theme popover
  document.getElementById('dark-mode-toggle').addEventListener('click', () => {
    toggleColorMode();
  });
  
  // Click outside popovers dismisses them
  document.addEventListener('click', (e) => {
    // If click is not inside the popovers or their respective triggers, hide them
    if (!themePopover.contains(e.target) && e.target !== themeBtn && !themeBtn.contains(e.target)) {
      themePopover.classList.add('hidden');
    }
    
    if (!ambientPopover.contains(e.target) && e.target !== ambientMixerBtn && !ambientMixerBtn.contains(e.target)) {
      ambientPopover.classList.add('hidden');
    }
  });
  
  // Prevent clicks inside popovers from reaching the window listener
  themePopover.addEventListener('click', (e) => e.stopPropagation());
  ambientPopover.addEventListener('click', (e) => e.stopPropagation());
});
