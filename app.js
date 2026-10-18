/**
 * WAITER ATTENDANCE REGISTER - CORE APPLICATION LOGIC
 * Strict Constraints: Sharp 0px Corners, Authority Blue Palette, Zero Emojis
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'waiter_attendance_register_v1';
  const AVATAR_KEY = 'executive_manager_avatar_v1';
  const MANAGER_INFO_KEY = 'executive_manager_info_v1';

  // Helper to extract 2-letter uppercase initials from manager name or email
  function getManagerInitials(name, email) {
    if (name && typeof name === 'string' && name.trim()) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      } else if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase();
      } else if (parts.length === 1) {
        return parts[0][0].toUpperCase();
      }
    }
    if (email && typeof email === 'string' && email.trim()) {
      const localPart = email.split('@')[0].replace(/[^a-zA-Z]/g, '');
      if (localPart.length >= 2) {
        return localPart.substring(0, 2).toUpperCase();
      } else if (localPart.length === 1) {
        return localPart.toUpperCase();
      }
    }
    return 'AR';
  }

  // Update header and modal avatar display
  function updateManagerAvatarUI(avatarUrl, initials) {
    const initialsSpan = document.getElementById('manager-initials-text');
    const avatarImg = document.getElementById('manager-avatar-img');
    const modalAvatarImg = document.getElementById('settings-avatar-preview-img');
    const modalAvatarInitials = document.getElementById('settings-avatar-preview-initials');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

    const cleanInitials = initials || 'AR';
    if (initialsSpan) initialsSpan.textContent = cleanInitials;
    if (modalAvatarInitials) modalAvatarInitials.textContent = cleanInitials;

    if (avatarUrl) {
      if (avatarImg) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
      }
      if (initialsSpan) initialsSpan.style.display = 'none';

      if (modalAvatarImg) {
        modalAvatarImg.src = avatarUrl;
        modalAvatarImg.style.display = 'block';
      }
      if (modalAvatarInitials) modalAvatarInitials.style.display = 'none';
      if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'inline-block';
    } else {
      if (avatarImg) {
        avatarImg.src = '';
        avatarImg.style.display = 'none';
      }
      if (initialsSpan) initialsSpan.style.display = 'inline';

      if (modalAvatarImg) {
        modalAvatarImg.src = '';
        modalAvatarImg.style.display = 'none';
      }
      if (modalAvatarInitials) modalAvatarInitials.style.display = 'inline';
      if (btnRemoveAvatar) btnRemoveAvatar.style.display = 'none';
    }
  }

  // Dynamic Contextual Section Titles based on where the manager is on the app
  const SECTION_TITLES = {
    'view-daily': {
      title: 'Daily Attendance Register',
      context: 'Daily Shift Turnout'
    },
    'view-floorplan': {
      title: 'Floor Plan & Station Assignments',
      context: 'Table Layout & Stations'
    },
    'view-monthly': {
      title: 'Monthly Attendance Matrix',
      context: '31-Day Attendance Ledger'
    },
    'view-absentee': {
      title: 'Absentee & Audit Report',
      context: 'Absence Rate Analysis'
    },
    'view-staff': {
      title: 'Waitstaff Directory & Roster',
      context: 'Active Staff Records'
    },
    'view-reports': {
      title: 'Attendance Reports & Dispatch',
      context: 'PDF & WhatsApp Archive'
    }
  };

  function updateHeaderForActiveTab(targetId) {
    const titleEl = document.getElementById('display-business-name');
    if (!titleEl) return;

    const id = targetId || AppState.activeTab || 'view-daily';
    const sectionInfo = SECTION_TITLES[id] || { title: 'Attendance Register' };

    if (titleEl.textContent === sectionInfo.title) return;

    titleEl.style.opacity = '0';
    titleEl.style.transform = 'translateY(-2px)';
    setTimeout(() => {
      titleEl.textContent = sectionInfo.title;
      titleEl.style.opacity = '1';
      titleEl.style.transform = 'translateY(0)';
    }, 100);
  }

  // Initial Sample Data for Instant Ready-to-Use Experience
  const INITIAL_STAFF = [
    { id: 'st_101', code: 'W-101', name: 'Marcus Vance', station: 'Section A - Front', shift: 'Morning', phone: '+1 (555) 012-8811', active: true },
    { id: 'st_102', code: 'W-102', name: 'Elena Rostova', station: 'Main Dining Floor', shift: 'Morning', phone: '+1 (555) 014-9922', active: true },
    { id: 'st_103', code: 'W-103', name: 'David Kim', station: 'VIP Lounge / Private', shift: 'Evening', phone: '+1 (555) 017-3344', active: true },
    { id: 'st_104', code: 'W-104', name: 'Sophie Laurent', station: 'Terrace & Patio', shift: 'Evening', phone: '+1 (555) 019-5566', active: true },
    { id: 'st_105', code: 'W-105', name: 'Tariq Al-Mansoor', station: 'Main Dining Floor', shift: 'Night', phone: '+1 (555) 011-7788', active: true },
    { id: 'st_106', code: 'W-106', name: 'Chloe Bennett', station: 'Bar & Cocktail Area', shift: 'Night', phone: '+1 (555) 013-4411', active: true },
    { id: 'st_107', code: 'W-107', name: 'Lucas Silva', station: 'Section B Floor', shift: 'Double', phone: '+1 (555) 016-2233', active: true },
    { id: 'st_108', code: 'W-108', name: 'Maya Patel', station: 'Section C Floor', shift: 'Morning', phone: '+1 (555) 018-6677', active: true }
  ];

  const INITIAL_REMINDERS = [
    { id: 'rem_101', title: 'Review Morning Shift Turnout & Unmarked Waiters', dueTime: '10:00', priority: 'HIGH', completed: false, createdAt: new Date().toISOString() },
    { id: 'rem_102', title: 'Audit End-of-Month Absentee Report Sheet', dueTime: '17:00', priority: 'MEDIUM', completed: false, createdAt: new Date().toISOString() }
  ];

  // Helper to format Date to YYYY-MM-DD
  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Generate realistic initial month records
  function generateInitialAttendance() {
    const records = {};
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Fill records up to today
    for (let day = 1; day <= Math.min(today.getDate(), daysInMonth); day++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      records[dateKey] = {};

      INITIAL_STAFF.forEach((staff, index) => {
        // Deterministic realistic patterns for testing absences
        let status = 'P';
        let note = '';

        if (index === 0 && (day === 4 || day === 12)) {
          status = 'A';
          note = 'Sick Leave';
        } else if (index === 1 && (day === 7 || day === 18 || day === 19)) {
          status = 'A';
          note = 'Family Emergency';
        } else if (index === 2 && day === 10) {
          status = 'L';
          note = 'Late 30m - Traffic';
        } else if (index === 3 && (day === 2 || day === 15)) {
          status = 'A';
          note = 'Unexcused';
        } else if (index === 4 && day === 8) {
          status = 'O';
          note = 'Scheduled Rest Day';
        } else if (index === 6 && (day === 5 || day === 14)) {
          status = 'A';
          note = 'Medical Appointment';
        } else if (day % 7 === (index % 7)) {
          status = 'O';
          note = 'Roster Day Off';
        }

        records[dateKey][staff.id] = { status, note };
      });
    }

    return records;
  }

  // Application State
  const AppState = {
    staff: [],
    attendance: {},
    settings: {
      businessName: 'Ribhouse Restaurant',
      branch: 'Main Service Operations'
    },
    currentDate: new Date(),
    matrixMonth: new Date().getMonth(),
    matrixYear: new Date().getFullYear(),
    absenteeMonth: new Date().getMonth(),
    absenteeYear: new Date().getFullYear(),
    activeTab: 'view-daily',
    searchQuery: '',
    staffSearchQuery: '',
    shiftFilter: 'ALL',
    security: {
      pin: '1234',
      autoLockMinutes: 5,
      isLocked: true,
      enteredPin: ''
    },
    lastActivity: Date.now(),
    reminders: [],
    manager: {
      id: '',
      name: 'Manager',
      email: '',
      initials: 'G',
      avatar: null
    },
    floorPlanDate: new Date().toISOString().split('T')[0],
    floorPlanShift: 'Morning',
    floorPlanData: { stations: [], employees: [] },
    floorPlanHighlightedStaffId: null
  };

  // Load / Save State
  let syncTimeout = null;

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        AppState.staff = parsed.staff || INITIAL_STAFF;
        AppState.staff.forEach(s => {
          if (!s.shift) s.shift = 'Morning';
        });
        AppState.attendance = parsed.attendance || {};
        AppState.settings = parsed.settings || AppState.settings;
        AppState.reminders = parsed.reminders || INITIAL_REMINDERS;
        if (parsed.security) {
          AppState.security.pin = parsed.security.pin || '1234';
          AppState.security.autoLockMinutes = parsed.security.autoLockMinutes !== undefined ? parsed.security.autoLockMinutes : 5;
        }
      } else {
        AppState.staff = INITIAL_STAFF;
        AppState.attendance = generateInitialAttendance();
        AppState.reminders = INITIAL_REMINDERS;
        saveState();
      }

      // Restore cached manager profile & avatar
      try {
        const rawMgr = localStorage.getItem(MANAGER_INFO_KEY);
        if (rawMgr) {
          AppState.manager = Object.assign(AppState.manager, JSON.parse(rawMgr));
        }
        const cachedAvatar = localStorage.getItem(AVATAR_KEY);
        if (cachedAvatar) {
          AppState.manager.avatar = cachedAvatar;
        }
        updateManagerAvatarUI(AppState.manager.avatar, AppState.manager.initials);

        const managerIndicator = document.getElementById('manager-session-indicator');
        if (managerIndicator && AppState.manager.email) {
          managerIndicator.textContent = `Manager: ${AppState.manager.email}`;
        }
      } catch (err) {}
    } catch (e) {
      console.error('Error loading state from cache:', e);
      AppState.staff = INITIAL_STAFF;
      AppState.attendance = generateInitialAttendance();
    }
  }

  // Fetch verified state from MySQL Backend
  async function syncFromDatabase() {
    try {
      const res = await fetch('/api/state');
      if (res.status === 401) {
        window.location.replace('/login.html?unauthorized=1');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.state) {
          if (Array.isArray(data.state.staff) && data.state.staff.length > 0) {
            AppState.staff = data.state.staff;
          }
          if (data.state.attendance) {
            AppState.attendance = data.state.attendance;
          }
          if (Array.isArray(data.state.reminders)) {
            AppState.reminders = data.state.reminders;
          }
          if (data.state.settings) {
            AppState.settings = Object.assign(AppState.settings, data.state.settings);
            updateHeaderForActiveTab(AppState.activeTab || 'view-daily');
          }

          // Update header manager indicator and avatar
          if (data.manager) {
            const initials = getManagerInitials(data.manager.name, data.manager.email);
            const avatar = data.manager.avatar || localStorage.getItem(AVATAR_KEY) || null;
            AppState.manager = {
              id: data.manager.id || '',
              name: data.manager.name || 'Manager',
              email: data.manager.email || '',
              initials: initials,
              avatar: avatar
            };

            localStorage.setItem(MANAGER_INFO_KEY, JSON.stringify({
              id: AppState.manager.id,
              name: AppState.manager.name,
              email: AppState.manager.email,
              initials: AppState.manager.initials
            }));

            if (avatar) {
              localStorage.setItem(AVATAR_KEY, avatar);
            } else {
              localStorage.removeItem(AVATAR_KEY);
            }

            updateManagerAvatarUI(AppState.manager.avatar, AppState.manager.initials);

            const managerIndicator = document.getElementById('manager-session-indicator');
            if (managerIndicator) {
              const displayName = data.manager.name || data.manager.email.split('@')[0];
              managerIndicator.textContent = `Duty Manager: ${displayName}`;
            }

            const nameEl = document.getElementById('settings-manager-name');
            const emailEl = document.getElementById('settings-manager-email');
            if (nameEl) nameEl.textContent = AppState.manager.name;
            if (emailEl) emailEl.textContent = AppState.manager.email;
          }

          cleanOrphanAttendance();

          // Persist to local cache and re-render views
          localStorage.setItem(STORAGE_KEY, JSON.stringify({
            staff: AppState.staff,
            attendance: AppState.attendance,
            settings: AppState.settings,
            reminders: AppState.reminders
          }));

          renderDailyView();
          renderMonthlyMatrix();
          renderAbsenteeReport();
          renderStaffDirectory();
          renderReminders();
        }
      }
    } catch (err) {
      console.warn('[SYNC] Running in offline cached mode:', err);
    }
  }

  function cleanOrphanAttendance() {
    if (!AppState.attendance || !Array.isArray(AppState.staff)) return;
    const activeStaffIds = new Set(AppState.staff.map(s => s.id));
    Object.keys(AppState.attendance).forEach(dateKey => {
      if (AppState.attendance[dateKey] && typeof AppState.attendance[dateKey] === 'object') {
        Object.keys(AppState.attendance[dateKey]).forEach(staffId => {
          if (!activeStaffIds.has(staffId)) {
            delete AppState.attendance[dateKey][staffId];
          }
        });
      }
    });
  }

  function updateSyncStatusUI(status, customTime = null) {
    const dot = document.getElementById('sync-dot-live');
    const text = document.getElementById('sync-status-text');
    const time = document.getElementById('sync-status-time');
    if (!dot || !text) return;

    if (status === 'syncing') {
      dot.className = 'sync-dot-live syncing';
      text.textContent = 'Saving to database...';
      if (time) time.textContent = 'Syncing';
    } else if (status === 'saved') {
      dot.className = 'sync-dot-live';
      text.textContent = 'All changes saved to database';
      if (time) {
        const d = new Date();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        time.textContent = customTime || `${hh}:${mm}:${ss}`;
      }
    } else if (status === 'error') {
      dot.className = 'sync-dot-live error';
      text.textContent = 'Saved locally (Offline mode)';
      if (time) time.textContent = 'Cached';
    }
  }

  async function forceSaveDailyRecords() {
    const btnSave = document.getElementById('btn-save-daily-records');
    const btnText = document.getElementById('btn-save-daily-text');
    const dateKey = formatDateKey(AppState.currentDate);

    if (btnSave) btnSave.disabled = true;
    if (btnText) btnText.textContent = 'Saving...';
    updateSyncStatusUI('syncing');

    cleanOrphanAttendance();

    try {
      // 1. Immediate local cache write
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        staff: AppState.staff,
        attendance: AppState.attendance,
        settings: AppState.settings,
        security: {
          pin: AppState.security.pin,
          autoLockMinutes: AppState.security.autoLockMinutes
        },
        reminders: AppState.reminders
      }));

      // 2. Direct immediate backend flush
      clearTimeout(syncTimeout);
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff: AppState.staff,
          attendance: AppState.attendance,
          settings: AppState.settings,
          reminders: AppState.reminders
        })
      });

      if (res.status === 401) {
        window.location.replace('/login.html?unauthorized=1');
        return;
      }

      if (res.ok) {
        updateSyncStatusUI('saved');
        showToast(`Shift records for ${dateKey} saved to database`);
      } else {
        updateSyncStatusUI('error');
        showToast('Saved locally. Database sync failed.');
      }
    } catch (err) {
      console.warn('[SAVE] Direct save fallback:', err);
      updateSyncStatusUI('error');
      showToast('Saved locally. Offline mode.');
    } finally {
      if (btnSave) btnSave.disabled = false;
      if (btnText) btnText.textContent = 'Save Shift';
    }
  }

  function saveState() {
    try {
      cleanOrphanAttendance();

      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        staff: AppState.staff,
        attendance: AppState.attendance,
        settings: AppState.settings,
        security: {
          pin: AppState.security.pin,
          autoLockMinutes: AppState.security.autoLockMinutes
        },
        reminders: AppState.reminders
      }));

      updateSyncStatusUI('syncing');

      // Asynchronous, debounced persistence to MySQL backend
      clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        fetch('/api/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff: AppState.staff,
            attendance: AppState.attendance,
            settings: AppState.settings,
            reminders: AppState.reminders
          })
        }).then(res => {
          if (res.status === 401) {
            window.location.replace('/login.html?unauthorized=1');
            return;
          }
          if (res.ok) {
            updateSyncStatusUI('saved');
          } else {
            updateSyncStatusUI('error');
          }
        }).catch(err => {
          console.warn('[SYNC] Could not reach backend:', err);
          updateSyncStatusUI('error');
        });
      }, 400);

    } catch (e) {
      console.error('Error saving state:', e);
      showToast('Error saving data to local storage.');
    }
  }

  // UI Toast Notification
  function showToast(message) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message.toUpperCase();

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 200);
    }, 2400);
  }



  // =========================================================================
  // MANAGER REMINDERS, ALARM SYSTEM & WEB AUDIO API
  // =========================================================================
  let alarmAudioCtx = null;
  let alarmOscInterval = null;
  let activeAlarmReminder = null;

  function startAlarmSound() {
    stopAlarmSound();
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      alarmAudioCtx = new AudioCtxClass();

      function playChime() {
        if (!alarmAudioCtx || alarmAudioCtx.state === 'closed') return;
        const now = alarmAudioCtx.currentTime;

        const osc1 = alarmAudioCtx.createOscillator();
        const gain1 = alarmAudioCtx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now); // A5 note
        gain1.gain.setValueAtTime(0.25, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc1.connect(gain1);
        gain1.connect(alarmAudioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.35);

        const osc2 = alarmAudioCtx.createOscillator();
        const gain2 = alarmAudioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1174.66, now + 0.18); // D6 note
        gain2.gain.setValueAtTime(0.3, now + 0.18);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc2.connect(gain2);
        gain2.connect(alarmAudioCtx.destination);
        osc2.start(now + 0.18);
        osc2.stop(now + 0.6);
      }

      playChime();
      alarmOscInterval = setInterval(playChime, 1600);
    } catch (err) {
      console.warn('Web Audio API error:', err);
    }
  }

  function stopAlarmSound() {
    if (alarmOscInterval) {
      clearInterval(alarmOscInterval);
      alarmOscInterval = null;
    }
    if (alarmAudioCtx) {
      try { alarmAudioCtx.close(); } catch (e) {}
      alarmAudioCtx = null;
    }
  }

  function playTestChime() {
    startAlarmSound();
    showToast('Testing alarm chime sound...');
    setTimeout(() => {
      stopAlarmSound();
    }, 3300);
  }

  function triggerManagerNotification(title, body) {
    showToast(`ALARM: ${title}`);
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: 'manifest.json'
        });
      } catch (e) {
        console.log('Notification trigger error:', e);
      }
    }
  }

  function requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showToast('Desktop Notifications Enabled!');
          triggerManagerNotification('Executive Attendance System', 'Desktop notifications are active for manager alerts.');
        } else {
          showToast('Notification permission denied.');
        }
      });
    } else {
      showToast('Notifications not supported in browser.');
    }
  }

  async function pollDueReminders() {
    try {
      const res = await fetch('/api/reminders/due');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.due) && data.due.length > 0) {
        const topDue = data.due[0];
        const modal = document.getElementById('alarm-modal-overlay');
        if (modal && modal.classList.contains('active') && activeAlarmReminder && activeAlarmReminder.id === topDue.id) {
          return;
        }
        activeAlarmReminder = topDue;
        triggerAlarmModal(topDue);
      }
    } catch (err) {
      // Backend not reached or offline
    }
  }

  function triggerAlarmModal(reminder) {
    const modal = document.getElementById('alarm-modal-overlay');
    const titleEl = document.getElementById('alarm-display-title');
    const descEl = document.getElementById('alarm-display-desc');
    const timeEl = document.getElementById('alarm-due-time');
    const idEl = document.getElementById('active-alarm-id');

    if (titleEl) titleEl.textContent = reminder.title;
    if (descEl) descEl.textContent = reminder.description || 'Executive manager reminder due for action.';
    if (timeEl) timeEl.textContent = reminder.reminder_time ? reminder.reminder_time.substring(0, 5) : 'NOW';
    if (idEl) idEl.value = reminder.id;

    if (modal) modal.classList.add('active');

    const notifType = reminder.notification_type || 'both';
    if (notifType === 'both' || notifType === 'sound') {
      startAlarmSound();
    }
    if (notifType === 'both' || notifType === 'desktop') {
      triggerManagerNotification(`MANAGER ALARM: ${reminder.title}`, reminder.description || 'Scheduled reminder due now.');
    }
  }

  async function dismissAlarm(reminderId) {
    stopAlarmSound();
    const modal = document.getElementById('alarm-modal-overlay');
    if (modal) modal.classList.remove('active');
    activeAlarmReminder = null;

    if (reminderId) {
      try {
        await fetch(`/api/reminders/${reminderId}/dismiss`, { method: 'POST' });
        showToast('Reminder dismissed.');
        loadRemindersFromDatabase();
      } catch (err) {
        console.error('Dismiss error:', err);
      }
    }
  }

  async function snoozeAlarm(reminderId, minutes) {
    stopAlarmSound();
    const modal = document.getElementById('alarm-modal-overlay');
    if (modal) modal.classList.remove('active');
    activeAlarmReminder = null;

    if (reminderId) {
      try {
        await fetch(`/api/reminders/${reminderId}/snooze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes })
        });
        showToast(`Alarm snoozed for ${minutes} minutes.`);
        loadRemindersFromDatabase();
      } catch (err) {
        console.error('Snooze error:', err);
      }
    }
  }

  async function loadRemindersFromDatabase() {
    try {
      const res = await fetch('/api/reminders');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.reminders)) {
          AppState.reminders = data.reminders;
          renderReminders();
        }
      }
    } catch (err) {
      console.warn('Could not fetch reminders from API:', err);
    }
  }

  function renderReminders() {
    const container = document.getElementById('reminders-list-container');
    const badgeCount = document.getElementById('reminders-badge-count');
    if (!container) return;

    const active = AppState.reminders.filter(r => r.is_active);
    if (badgeCount) {
      badgeCount.textContent = active.length;
      badgeCount.style.display = active.length > 0 ? 'inline-block' : 'none';
    }

    container.innerHTML = '';

    if (AppState.reminders.length === 0) {
      container.innerHTML = `
        <div style="background:#fff; border:1px solid var(--c-gray-border); padding:16px; text-align:center; color:var(--c-gray-dark); font-size:11px; font-weight:700; text-transform:uppercase;">
          No active reminders or scheduled alarms.
        </div>`;
      return;
    }

    AppState.reminders.forEach(rem => {
      const isSnoozed = rem.snooze_until && new Date(rem.snooze_until) > new Date();
      const item = document.createElement('div');
      item.className = `reminder-item-row ${!rem.is_active ? 'paused' : ''} ${isSnoozed ? 'snoozed' : ''}`;

      let repeatLabel = 'One-Time';
      if (rem.repeat_type === 'daily') repeatLabel = 'Daily';
      else if (rem.repeat_type === 'weekly') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        repeatLabel = `Weekly (${days[rem.repeat_day] || 'Sun'})`;
      } else if (rem.repeat_type === 'monthly') {
        repeatLabel = `Monthly (${rem.repeat_day || 1}th)`;
      }

      const timeLabel = rem.reminder_time ? rem.reminder_time.substring(0, 5) : '--:--';
      const dateLabel = rem.reminder_date ? rem.reminder_date.substring(0, 10) : '';

      item.innerHTML = `
        <div style="flex: 1; padding-right: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
            <span style="font-size: 12px; font-weight: 800; color: var(--c-navy-primary);">${escapeHtml(rem.title)}</span>
            <span class="report-badge weekly" style="font-size: 8px;">${escapeHtml(repeatLabel)}</span>
            ${isSnoozed ? '<span class="report-badge monthly" style="font-size: 8px; background: #FEF3C7; color: #92400E; border-color: #FDE68A;">SNOOZED</span>' : ''}
          </div>
          ${rem.description ? `<div style="font-size: 10px; color: var(--c-gray-dark); margin-bottom: 2px;">${escapeHtml(rem.description)}</div>` : ''}
          <div style="font-size: 9px; color: var(--c-gray-dark); font-weight: 700;">
            TIME: ${escapeHtml(timeLabel)} ${rem.repeat_type === 'none' ? `| DATE: ${escapeHtml(dateLabel)}` : ''} | NOTIF: ${escapeHtml((rem.notification_type || 'both').toUpperCase())}
          </div>
        </div>
        <div style="display: flex; gap: 4px; align-items: center;">
          <button type="button" class="btn-small btn-secondary btn-toggle-reminder-status" data-id="${rem.id}" style="padding: 3px 6px; font-size: 9px;">
            ${rem.is_active ? 'Pause' : 'Activate'}
          </button>
          <button type="button" class="btn-small btn-danger btn-delete-reminder" data-id="${rem.id}" style="padding: 3px 6px; font-size: 9px;">
            Delete
          </button>
        </div>
      `;

      item.querySelector('.btn-toggle-reminder-status').addEventListener('click', async () => {
        try {
          await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...rem,
              is_active: rem.is_active ? 0 : 1
            })
          });
          showToast(rem.is_active ? 'Reminder paused.' : 'Reminder activated.');
          loadRemindersFromDatabase();
        } catch (err) {
          showToast('Error updating reminder.');
        }
      });

      item.querySelector('.btn-delete-reminder').addEventListener('click', async () => {
        if (confirm(`Delete reminder "${rem.title}"?`)) {
          try {
            await fetch(`/api/reminders/${rem.id}`, { method: 'DELETE' });
            showToast('Reminder deleted.');
            loadRemindersFromDatabase();
          } catch (err) {
            showToast('Error deleting reminder.');
          }
        }
      });

      container.appendChild(item);
    });
  }

  function openRemindersModal() {
    const dateInput = document.getElementById('reminder-input-date');
    if (dateInput && !dateInput.value) {
      dateInput.value = formatDateKey(new Date());
    }
    loadRemindersFromDatabase();
    const modal = document.getElementById('modal-reminders');
    if (modal) modal.classList.add('active');
  }

  function closeRemindersModal() {
    const modal = document.getElementById('modal-reminders');
    if (modal) modal.classList.remove('active');
  }

  // =========================================================================
  // VIEW 5: ATTENDANCE REPORTS & DISPATCH LOGIC
  // =========================================================================
  async function renderReportsView() {
    loadReportHistory();
    loadReportSettings();
  }

  async function loadReportHistory() {
    const container = document.getElementById('reports-history-container');
    if (!container) return;

    try {
      const res = await fetch('/api/reports');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !Array.isArray(data.reports)) return;

      if (data.reports.length === 0) {
        container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: var(--c-gray-dark); font-size: 11px; font-weight: 700; text-transform: uppercase;">
            No attendance reports generated yet. Use the On-Demand buttons above or wait for automated schedule.
          </div>`;
        return;
      }

      container.innerHTML = '';
      data.reports.forEach(report => {
        const row = document.createElement('div');
        row.className = 'report-row-item';

        const typeBadgeClass = report.report_type === 'weekly' ? 'weekly' : 'monthly';
        let statusBadgeClass = 'status-none';
        let statusLabel = 'LOCAL PDF ONLY';
        if (report.whatsapp_status === 'sent') {
          statusBadgeClass = 'status-sent';
          statusLabel = 'WHATSAPP SENT';
        } else if (report.whatsapp_status === 'failed') {
          statusBadgeClass = 'status-failed';
          statusLabel = 'WHATSAPP FAILED';
        }

        const genTime = new Date(report.generated_at).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        row.innerHTML = `
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px;">
              <span class="report-badge ${typeBadgeClass}">${escapeHtml(report.report_type)}</span>
              <span style="font-size: 12px; font-weight: 800; color: var(--c-navy-primary);">
                ${escapeHtml(report.period_start)} to ${escapeHtml(report.period_end)}
              </span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--c-gray-dark);">
              <span>GENERATED: ${escapeHtml(genTime)}</span>
              <span class="report-badge ${statusBadgeClass}">${escapeHtml(statusLabel)}</span>
            </div>
          </div>
          <div>
            <a href="/api/reports/${report.id}/download" target="_blank" class="btn-small btn-primary" style="text-decoration: none; padding: 6px 10px; font-size: 10px; display: inline-flex; align-items: center; gap: 4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Download PDF
            </a>
          </div>
        `;
        container.appendChild(row);
      });

    } catch (err) {
      console.error('Failed to load report history:', err);
    }
  }

  async function loadReportSettings() {
    try {
      const res = await fetch('/api/reports/settings');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success || !data.settings) return;

      const s = data.settings;
      const weeklyEnabled = document.getElementById('setting-weekly-enabled');
      const weeklyDay = document.getElementById('setting-weekly-day');
      const weeklyTime = document.getElementById('setting-weekly-time');
      const monthlyEnabled = document.getElementById('setting-monthly-enabled');
      const monthlyDay = document.getElementById('setting-monthly-day');
      const monthlyTime = document.getElementById('setting-monthly-time');
      const waProvider = document.getElementById('setting-whatsapp-provider');
      const waPhone = document.getElementById('setting-whatsapp-phone');
      const waFrom = document.getElementById('setting-whatsapp-from');

      if (weeklyEnabled) weeklyEnabled.checked = Boolean(s.weekly_enabled);
      if (weeklyDay) weeklyDay.value = s.weekly_day !== undefined ? s.weekly_day : 0;
      if (weeklyTime && s.weekly_time) weeklyTime.value = s.weekly_time.substring(0, 5);
      if (monthlyEnabled) monthlyEnabled.checked = Boolean(s.monthly_enabled);
      if (monthlyDay) monthlyDay.value = s.monthly_day || 1;
      if (monthlyTime && s.monthly_time) monthlyTime.value = s.monthly_time.substring(0, 5);
      if (waProvider) waProvider.value = s.whatsapp_provider || 'disabled';
      if (waPhone) waPhone.value = s.whatsapp_recipient_phone || '';
      if (waFrom) waFrom.value = s.whatsapp_from_phone || '';

    } catch (err) {
      console.error('Failed to load report settings:', err);
    }
  }

  // Date Label Formatter
  function updateDateHeaderLabels() {
    const optionsDate = { month: 'short', day: 'numeric', year: 'numeric' };
    const optionsDay = { weekday: 'long' };

    const dateStr = AppState.currentDate.toLocaleDateString('en-US', optionsDate);
    const dayStr = AppState.currentDate.toLocaleDateString('en-US', optionsDay);

    const isToday = formatDateKey(AppState.currentDate) === formatDateKey(new Date());

    const dateLabel = document.getElementById('daily-date-label');
    const dayLabel = document.getElementById('daily-day-label');
    const nativePicker = document.getElementById('native-date-selector');

    if (dateLabel) dateLabel.textContent = isToday ? `Today (${dateStr})` : dateStr;
    if (dayLabel) dayLabel.textContent = dayStr;
    if (nativePicker) nativePicker.value = formatDateKey(AppState.currentDate);
  }

  // Get status for specific staff on specific date
  function getStaffAttendance(dateKey, staffId) {
    if (AppState.attendance[dateKey] && AppState.attendance[dateKey][staffId]) {
      return AppState.attendance[dateKey][staffId];
    }
    return { status: 'U', note: '' }; // U = Unmarked
  }

  // Set status for specific staff on specific date
  function setStaffAttendance(dateKey, staffId, status, note = null) {
    if (!AppState.attendance[dateKey]) {
      AppState.attendance[dateKey] = {};
    }
    if (!AppState.attendance[dateKey][staffId]) {
      AppState.attendance[dateKey][staffId] = { status: 'U', note: '' };
    }

    if (status !== null) {
      AppState.attendance[dateKey][staffId].status = status;
    }
    if (note !== null) {
      AppState.attendance[dateKey][staffId].note = note;
    }

    saveState();
    renderDailyView();
  }

  // =========================================================================
  // VIEW 1: DAILY ATTENDANCE REGISTER
  // =========================================================================
  function renderDailyView() {
    updateDateHeaderLabels();
    const dateKey = formatDateKey(AppState.currentDate);
    const container = document.getElementById('waiter-cards-list');
    if (!container) return;

    const query = AppState.searchQuery.toLowerCase().trim();
    const activeStaff = AppState.staff.filter(s => s.active);
    const filteredStaff = activeStaff.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(query) || 
        s.code.toLowerCase().includes(query) ||
        (s.station && s.station.toLowerCase().includes(query));
      const matchesShift = AppState.shiftFilter === 'ALL' || (s.shift || 'Morning') === AppState.shiftFilter;
      return matchesSearch && matchesShift;
    });

    // Calculate metrics
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let offCount = 0;
    let totalMarked = 0;

    activeStaff.forEach(s => {
      const record = getStaffAttendance(dateKey, s.id);
      if (record.status === 'P') { presentCount++; totalMarked++; }
      else if (record.status === 'A') { absentCount++; totalMarked++; }
      else if (record.status === 'L') { lateCount++; totalMarked++; }
      else if (record.status === 'O') { offCount++; totalMarked++; }
    });

    const totalActive = activeStaff.length;
    const turnoutRate = totalActive > 0 ? Math.round((presentCount / totalActive) * 100) : 0;

    // Update metric cards
    const elPresent = document.getElementById('stat-daily-present');
    const elAbsent = document.getElementById('stat-daily-absent');
    const elOther = document.getElementById('stat-daily-other');
    const elRate = document.getElementById('stat-daily-rate');

    if (elPresent) elPresent.textContent = presentCount;
    if (elAbsent) elAbsent.textContent = absentCount;
    if (elOther) elOther.textContent = `${lateCount + offCount}`;
    if (elRate) elRate.textContent = `${turnoutRate}%`;

    // Render cards
    container.innerHTML = '';

    if (filteredStaff.length === 0) {
      container.innerHTML = `
        <div style="background:#fff; border:1px solid var(--c-gray-border); padding:24px; text-align:center; color:var(--c-gray-dark); font-weight:700; font-size:12px; text-transform:uppercase;">
          No staff records match the current filter.
        </div>`;
      return;
    }

    filteredStaff.forEach(staff => {
      const record = getStaffAttendance(dateKey, staff.id);
      const card = document.createElement('div');
      card.className = 'waiter-card';

      let statusBadgeHtml = '<span class="current-status-badge badge-unmarked">UNMARKED</span>';
      if (record.status === 'P') statusBadgeHtml = '<span class="current-status-badge badge-present">PRESENT</span>';
      else if (record.status === 'A') statusBadgeHtml = '<span class="current-status-badge badge-absent">ABSENT</span>';
      else if (record.status === 'L') statusBadgeHtml = '<span class="current-status-badge badge-late">LATE</span>';
      else if (record.status === 'O') statusBadgeHtml = '<span class="current-status-badge badge-off">OFF</span>';

      const shiftName = staff.shift || 'Morning';
      const shiftClass = shiftName.toLowerCase();
      let shiftTimeText = '07:00-15:00';
      if (shiftName === 'Evening') shiftTimeText = '15:00-23:00';
      else if (shiftName === 'Night') shiftTimeText = '23:00-07:00';
      else if (shiftName === 'Double') shiftTimeText = 'FULL DAY';

      card.innerHTML = `
        <div class="waiter-card-header">
          <div class="waiter-info">
            <div class="waiter-name-row">
              <span class="waiter-name">${escapeHtml(staff.name)}</span>
              <span class="waiter-id-tag">${escapeHtml(staff.code)}</span>
              <span class="shift-tag shift-${shiftClass}">${escapeHtml(shiftName).toUpperCase()} (${shiftTimeText})</span>
            </div>
            <div class="waiter-meta">${escapeHtml(staff.station || 'General Floor')}</div>
          </div>
          <div>${statusBadgeHtml}</div>
        </div>

        <div class="attendance-actions-grid">
          <button type="button" class="status-btn ${record.status === 'P' ? 'selected-present' : ''}" data-staff-id="${staff.id}" data-status="P">
            PRESENT
          </button>
          <button type="button" class="status-btn ${record.status === 'A' ? 'selected-absent' : ''}" data-staff-id="${staff.id}" data-status="A">
            ABSENT
          </button>
          <button type="button" class="status-btn ${record.status === 'L' ? 'selected-late' : ''}" data-staff-id="${staff.id}" data-status="L">
            LATE
          </button>
          <button type="button" class="status-btn ${record.status === 'O' ? 'selected-off' : ''}" data-staff-id="${staff.id}" data-status="O">
            OFF
          </button>
        </div>

        <div class="waiter-card-footer">
          <input type="text" class="notes-input" data-staff-id="${staff.id}" value="${escapeHtml(record.note || '')}" placeholder="Add remark / reason for absence or tardiness...">
        </div>
      `;

      // Event: Status Button Taps
      card.querySelectorAll('.status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const sId = btn.getAttribute('data-staff-id');
          const targetStatus = btn.getAttribute('data-status');
          setStaffAttendance(dateKey, sId, targetStatus);
        });
      });

      // Event: Note change
      const notesInput = card.querySelector('.notes-input');
      notesInput.addEventListener('change', () => {
        const sId = notesInput.getAttribute('data-staff-id');
        setStaffAttendance(dateKey, sId, null, notesInput.value.trim());
      });

      container.appendChild(card);
    });
  }

  // Mark all active staff present
  function markAllPresent() {
    const dateKey = formatDateKey(AppState.currentDate);
    const activeStaff = AppState.staff.filter(s => s.active);

    if (!AppState.attendance[dateKey]) {
      AppState.attendance[dateKey] = {};
    }

    activeStaff.forEach(s => {
      const current = AppState.attendance[dateKey][s.id] || { status: 'U', note: '' };
      AppState.attendance[dateKey][s.id] = {
        status: 'P',
        note: current.note || ''
      };
    });

    saveState();
    renderDailyView();
    showToast('All active waiters marked present.');
  }

  // =========================================================================
  // VIEW 2: MONTHLY ATTENDANCE MATRIX
  // =========================================================================
  function renderMonthlyMatrix() {
    const container = document.getElementById('matrix-container');
    const labelPeriod = document.getElementById('matrix-active-period');
    if (!container) return;

    const monthIndex = parseInt(AppState.matrixMonth, 10);
    const year = parseInt(AppState.matrixYear, 10);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (labelPeriod) labelPeriod.textContent = `${monthNames[monthIndex]} ${year}`.toUpperCase();

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const activeStaff = AppState.staff.filter(s => s.active);

    let html = `
      <table class="matrix-table">
        <thead>
          <tr>
            <th class="sticky-col">STAFF MEMBER</th>
    `;

    // Header Day numbers & weekday initials
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, monthIndex, day);
      const weekdayInitial = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dateObj.getDay()];
      html += `<th>${day}<br><span style="font-size:8px; opacity:0.8;">${weekdayInitial}</span></th>`;
    }

    html += `
            <th style="background-color: var(--c-navy-dark); min-width:35px;">P</th>
            <th style="background-color: #7F1D1D; min-width:35px;">A</th>
            <th style="background-color: #78350F; min-width:35px;">L</th>
            <th style="background-color: var(--c-black); min-width:50px;">RATE</th>
          </tr>
        </thead>
        <tbody>
    `;

    activeStaff.forEach(staff => {
      let countP = 0;
      let countA = 0;
      let countL = 0;
      let countO = 0;

      html += `
        <tr>
          <td class="sticky-col">
            <div style="font-size:12px; font-weight:700; color:var(--c-navy-primary);">${escapeHtml(staff.name)}</div>
            <div style="font-size:9px; color:var(--c-gray-dark);">${escapeHtml(staff.code)}</div>
          </td>
      `;

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = getStaffAttendance(dateKey, staff.id);
        const status = record.status || 'U';

        if (status === 'P') countP++;
        else if (status === 'A') countA++;
        else if (status === 'L') countL++;
        else if (status === 'O') countO++;

        html += `
          <td style="padding: 2px;">
            <span class="cell-status ${status}" title="${dateKey}: ${escapeHtml(staff.name)} - ${status} ${record.note ? `(${escapeHtml(record.note)})` : ''}">
              ${status !== 'U' ? status : '-'}
            </span>
          </td>
        `;
      }

      const totalRecorded = countP + countA + countL;
      const rate = totalRecorded > 0 ? Math.round((countP / totalRecorded) * 100) : 0;

      html += `
          <td style="font-weight:800; color:var(--c-navy-primary);">${countP}</td>
          <td style="font-weight:800; color:var(--c-status-absent-bg);">${countA}</td>
          <td style="font-weight:800; color:var(--c-status-late-bg);">${countL}</td>
          <td style="font-weight:900; background-color:#F8FAFC;">${rate}%</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  // =========================================================================
  // VIEW 3: WAITER ATTENDANCE SUMMARY & ABSENTEE REPORT
  // =========================================================================
  let summaryScope = 'MONTH'; // 'MONTH' or 'WEEK'
  let summaryShiftFilter = 'ALL';

  function calculateAttendanceSummaryData() {
    const activeStaff = AppState.staff.filter(s => s.active);
    const filteredStaff = (summaryShiftFilter === 'ALL')
      ? activeStaff
      : activeStaff.filter(s => (s.shift || 'Morning') === summaryShiftFilter);

    let dateList = [];
    let periodTitle = '';

    if (summaryScope === 'WEEK') {
      const days = getWeekDaysList(new Date());
      dateList = days.map(d => d.dateKey);
      const f = days[0];
      const l = days[6];
      periodTitle = `Week of ${f.weekday} ${f.dayNumber} ${f.monthShort} - ${l.weekday} ${l.dayNumber} ${l.monthShort} ${l.dateObj.getFullYear()}`;
    } else {
      const monthIndex = parseInt(AppState.absenteeMonth, 10);
      const year = parseInt(AppState.absenteeYear, 10);
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      periodTitle = `${monthNames[monthIndex]} ${year}`;
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        dateList.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }

    let grandPresent = 0;
    let grandAbsent = 0;
    let grandLate = 0;
    let grandOff = 0;

    const rosterSummary = filteredStaff.map(staff => {
      let p = 0;
      let a = 0;
      let l = 0;
      let o = 0;

      dateList.forEach(dateKey => {
        const record = getStaffAttendance(dateKey, staff.id);
        const st = record.status || 'U';
        if (st === 'P') p++;
        else if (st === 'A') a++;
        else if (st === 'L') l++;
        else if (st === 'O') o++;
      });

      const totalRecorded = p + a + l;
      const turnoutRate = totalRecorded > 0 ? Math.round((p / totalRecorded) * 100) : 0;

      grandPresent += p;
      grandAbsent += a;
      grandLate += l;
      grandOff += o;

      return {
        staff,
        presentDays: p,
        absentDays: a,
        lateDays: l,
        offDays: o,
        turnoutRate
      };
    });

    const grandTotalRecorded = grandPresent + grandAbsent + grandLate;
    const grandTurnoutRate = grandTotalRecorded > 0 ? Math.round((grandPresent / grandTotalRecorded) * 100) : 0;

    return {
      periodTitle,
      rosterSummary,
      totals: {
        present: grandPresent,
        absent: grandAbsent,
        late: grandLate,
        off: grandOff,
        turnoutRate: grandTurnoutRate
      }
    };
  }

  function renderAttendanceSummaryTable() {
    const tableContainer = document.getElementById('attendance-summary-table-container');
    const labelPeriod = document.getElementById('summary-active-period-label');
    if (!tableContainer) return;

    const data = calculateAttendanceSummaryData();
    if (labelPeriod) labelPeriod.textContent = data.periodTitle.toUpperCase();

    let html = `
      <table class="matrix-table" style="width: 100%;">
        <thead>
          <tr>
            <th class="sticky-col" style="min-width: 140px;">WAITER NAME & ID</th>
            <th style="min-width: 80px;">SHIFT</th>
            <th style="background-color: #064E3B; min-width: 60px;" title="Total Days Present">PRESENT (P)</th>
            <th style="background-color: #7F1D1D; min-width: 60px;" title="Total Days Absent">ABSENT (A)</th>
            <th style="background-color: #78350F; min-width: 60px;" title="Total Days Late">LATE (L)</th>
            <th style="background-color: #334155; min-width: 60px;" title="Total Days Off">OFF (O)</th>
            <th style="background-color: var(--c-navy-dark); min-width: 60px;">TURNOUT %</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (data.rosterSummary.length === 0) {
      html += `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: var(--c-gray-dark); font-weight: 700;">
            No active waiters match the selected filter.
          </td>
        </tr>
      `;
    } else {
      data.rosterSummary.forEach(item => {
        const staff = item.staff;
        const shiftName = staff.shift || 'Morning';
        const shiftClass = shiftName.toLowerCase();

        html += `
          <tr>
            <td class="sticky-col">
              <div style="font-size: 12px; font-weight: 800; color: var(--c-navy-primary);">${escapeHtml(staff.name)}</div>
              <div style="font-size: 9px; color: var(--c-gray-dark); font-weight: 700;">${escapeHtml(staff.code)}</div>
            </td>
            <td><span class="shift-tag shift-${shiftClass}">${escapeHtml(shiftName)}</span></td>
            <td class="summary-stat-cell present">${item.presentDays}</td>
            <td class="summary-stat-cell absent">${item.absentDays}</td>
            <td class="summary-stat-cell late">${item.lateDays}</td>
            <td class="summary-stat-cell off">${item.offDays}</td>
            <td style="font-weight: 800; font-size: 11px; color: var(--c-black);">${item.turnoutRate}%</td>
          </tr>
        `;
      });

      // Grand Totals Row
      html += `
        </tbody>
        <tfoot>
          <tr class="summary-totals-row">
            <td class="sticky-col" style="background-color: #E2E8F0; font-weight: 900; color: var(--c-navy-primary);">
              TOTALS (ROSTER - ${data.rosterSummary.length})
            </td>
            <td>--</td>
            <td class="summary-stat-cell present" style="font-size: 12px; font-weight: 900;">${data.totals.present}</td>
            <td class="summary-stat-cell absent" style="font-size: 12px; font-weight: 900;">${data.totals.absent}</td>
            <td class="summary-stat-cell late" style="font-size: 12px; font-weight: 900;">${data.totals.late}</td>
            <td class="summary-stat-cell off" style="font-size: 12px; font-weight: 900;">${data.totals.off}</td>
            <td style="font-size: 12px; font-weight: 900; color: var(--c-navy-primary);">${data.totals.turnoutRate}%</td>
          </tr>
        </tfoot>
      `;
    }

    html += `</table>`;
    tableContainer.innerHTML = html;
  }

  function downloadAttendanceCsv() {
    const data = calculateAttendanceSummaryData();
    if (!data.rosterSummary || data.rosterSummary.length === 0) {
      showToast('No waiter records available to export.');
      return;
    }

    const businessName = AppState.settings?.businessName || 'Executive Waiter Management';

    // CSV Header Lines
    const lines = [
      `"${businessName.replace(/"/g, '""')} - WAITER ATTENDANCE SUMMARY"`,
      `"Report Period: ${data.periodTitle.replace(/"/g, '""')}"`,
      `"Export Date: ${new Date().toLocaleString().replace(/"/g, '""')}"`,
      `""`,
      `"Employee ID","Waiter Name","Assigned Shift","Days Present (P)","Days Absent (A)","Days Late (L)","Days Off (O)","Attendance Turnout %"`
    ];

    // Data Rows
    data.rosterSummary.forEach(item => {
      const s = item.staff;
      const row = [
        `"${(s.code || '').replace(/"/g, '""')}"`,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.shift || 'Morning').replace(/"/g, '""')}"`,
        item.presentDays,
        item.absentDays,
        item.lateDays,
        item.offDays,
        `"${item.turnoutRate}%"`
      ];
      lines.push(row.join(','));
    });

    // Totals Row
    lines.push(`""`);
    lines.push([
      `"TOTALS"`,
      `"All Waitstaff (${data.rosterSummary.length})"`,
      `"--"`,
      data.totals.present,
      data.totals.absent,
      data.totals.late,
      data.totals.off,
      `"${data.totals.turnoutRate}%"`
    ].join(','));

    // UTF-8 BOM + CSV string
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    const cleanPeriod = data.periodTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.setAttribute('href', url);
    link.setAttribute('download', `waiter-attendance-summary-${cleanPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Downloaded: waiter-attendance-summary-${cleanPeriod}.csv`);
  }

  function renderAbsenteeReport() {
    renderAttendanceSummaryTable();

    const container = document.getElementById('absentee-cards-list');
    if (!container) return;

    const monthIndex = parseInt(AppState.absenteeMonth, 10);
    const year = parseInt(AppState.absenteeYear, 10);
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthLabel = monthShortNames[monthIndex];

    const activeStaff = AppState.staff.filter(s => s.active);

    container.innerHTML = '';

    // Calculate absentee metrics for each staff
    const reportData = activeStaff.map(staff => {
      let presentDays = 0;
      let absentDays = 0;
      let lateDays = 0;
      let offDays = 0;
      const absentDates = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = getStaffAttendance(dateKey, staff.id);

        if (record.status === 'P') presentDays++;
        else if (record.status === 'A') {
          absentDays++;
          absentDates.push(`${currentMonthLabel} ${day}`);
        } else if (record.status === 'L') lateDays++;
        else if (record.status === 'O') offDays++;
      }

      const totalWorkedOrAbsent = presentDays + absentDays + lateDays;
      const turnoutRate = totalWorkedOrAbsent > 0 ? Math.round((presentDays / totalWorkedOrAbsent) * 100) : 0;

      return {
        staff,
        presentDays,
        absentDays,
        lateDays,
        offDays,
        absentDates,
        turnoutRate
      };
    });

    // Sort by highest absences first to prioritize actionable attention
    reportData.sort((a, b) => b.absentDays - a.absentDays);

    reportData.forEach(item => {
      const card = document.createElement('div');
      let cardClass = 'absentee-card';
      if (item.absentDays >= 3) cardClass += ' critical';
      else if (item.absentDays > 0) cardClass += ' warning';

      card.className = cardClass;

      let badgeHtml = '';
      if (item.absentDays === 0) {
        badgeHtml = `<span class="absentee-stat-badge zero">0 ABSENCES (100% ATTENDANCE)</span>`;
      } else {
        badgeHtml = `<span class="absentee-stat-badge">${item.absentDays} ${item.absentDays === 1 ? 'DAY' : 'DAYS'} ABSENT</span>`;
      }

      let datesHtml = '';
      if (item.absentDates.length > 0) {
        datesHtml = `
          <div class="absentee-dates-label">DATES RECORDED AS ABSENT:</div>
          <div class="absent-dates-list">
            ${item.absentDates.map(d => `<span class="absent-date-chip">${d}</span>`).join('')}
          </div>
        `;
      } else {
        datesHtml = `
          <div class="no-absences-text">PERFECT ATTENDANCE - NO ABSENCES RECORDED</div>
        `;
      }

      card.innerHTML = `
        <div class="absentee-card-header">
          <div>
            <div style="font-size:14px; font-weight:800; color:var(--c-black);">${escapeHtml(item.staff.name)}</div>
            <div style="font-size:10px; font-weight:700; color:var(--c-gray-dark); margin-top:2px;">
              ID: ${escapeHtml(item.staff.code)} | ${escapeHtml(item.staff.station || 'Floor Staff')}
            </div>
          </div>
          <div>${badgeHtml}</div>
        </div>

        <div class="absentee-dates-box">
          ${datesHtml}
        </div>

        <div class="absentee-card-stats">
          <div class="card-stat-item">
            <span class="card-stat-title">Days Present</span>
            <span class="card-stat-num">${item.presentDays}</span>
          </div>
          <div class="card-stat-item">
            <span class="card-stat-title">Days Absent</span>
            <span class="card-stat-num" style="color:var(--c-status-absent-bg);">${item.absentDays}</span>
          </div>
          <div class="card-stat-item">
            <span class="card-stat-title">Days Late</span>
            <span class="card-stat-num" style="color:var(--c-status-late-bg);">${item.lateDays}</span>
          </div>
          <div class="card-stat-item">
            <span class="card-stat-title">Days Off</span>
            <span class="card-stat-num" style="color:var(--c-status-off-bg);">${item.offDays}</span>
          </div>
          <div class="card-stat-item">
            <span class="card-stat-title">Attendance Rate</span>
            <span class="card-stat-num">${item.turnoutRate}%</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  // =========================================================================
  // PROGRAMMATIC TAB NAVIGATION
  // =========================================================================
  function navigateToTab(targetId) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
      if (tab.getAttribute('data-target') === targetId) {
        tab.click();
      }
    });
  }

  // =========================================================================
  // WEEKLY ATTENDANCE REGISTER MODAL
  // =========================================================================
  let weekModalRefDate = new Date();
  let weekModalSelectedStaffId = 'ALL';

  function getWeekDaysList(referenceDate) {
    const d = new Date(referenceDate);
    const day = d.getDay(); // 0 is Sun, 1 is Mon...
    const diffToMonday = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const dayNum = String(cur.getDate()).padStart(2, '0');
      days.push({
        dateObj: cur,
        dateKey: `${y}-${m}-${dayNum}`,
        weekday: weekdayNames[i],
        dayNumber: cur.getDate(),
        monthShort: cur.toLocaleString('default', { month: 'short' })
      });
    }
    return days;
  }

  function openWeekAttendanceModal(initialStaffId = 'ALL') {
    weekModalRefDate = new Date(AppState.currentDate || new Date());
    weekModalSelectedStaffId = initialStaffId;

    const modal = document.getElementById('modal-week-attendance');
    if (modal) modal.classList.add('active');

    populateWeekStaffFilterOptions();
    renderWeekAttendanceModal();
  }

  function closeWeekAttendanceModal() {
    const modal = document.getElementById('modal-week-attendance');
    if (modal) modal.classList.remove('active');
  }

  function populateWeekStaffFilterOptions() {
    const select = document.getElementById('select-week-staff-filter');
    if (!select) return;

    const activeStaff = AppState.staff.filter(s => s.active);
    let html = `<option value="ALL">ALL EMPLOYEES (FULL ROSTER - ${activeStaff.length})</option>`;
    activeStaff.forEach(s => {
      const selected = (s.id === weekModalSelectedStaffId) ? 'selected' : '';
      html += `<option value="${s.id}" ${selected}>${escapeHtml(s.name)} (${escapeHtml(s.code)}) - ${escapeHtml(s.shift || 'Morning')}</option>`;
    });
    select.innerHTML = html;
  }

  function renderWeekAttendanceModal() {
    const container = document.getElementById('week-attendance-table-container');
    const labelRange = document.getElementById('week-range-label');
    if (!container) return;

    const days = getWeekDaysList(weekModalRefDate);
    const firstDay = days[0];
    const lastDay = days[6];

    if (labelRange) {
      labelRange.textContent = `${firstDay.weekday}, ${firstDay.monthShort} ${firstDay.dayNumber} – ${lastDay.weekday}, ${lastDay.monthShort} ${lastDay.dayNumber}, ${lastDay.dateObj.getFullYear()}`;
    }

    // Determine staff to display
    const activeStaff = AppState.staff.filter(s => s.active);
    const displayStaff = (weekModalSelectedStaffId === 'ALL')
      ? activeStaff
      : activeStaff.filter(s => s.id === weekModalSelectedStaffId);

    // Metrics calculation across displayed staff for the 7 days
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalOff = 0;
    let totalPossible = 0;

    activeStaff.forEach(s => {
      days.forEach(d => {
        const record = getStaffAttendance(d.dateKey, s.id);
        if (record.status === 'P') { totalPresent++; totalPossible++; }
        else if (record.status === 'A') { totalAbsent++; totalPossible++; }
        else if (record.status === 'L') { totalLate++; totalPossible++; }
        else if (record.status === 'O') { totalOff++; }
      });
    });

    const turnoutRate = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

    const elP = document.getElementById('stat-week-present');
    const elA = document.getElementById('stat-week-absent');
    const elO = document.getElementById('stat-week-other');
    const elR = document.getElementById('stat-week-rate');
    if (elP) elP.textContent = totalPresent;
    if (elA) elA.textContent = totalAbsent;
    if (elO) elO.textContent = `${totalLate + totalOff}`;
    if (elR) elR.textContent = `${turnoutRate}%`;

    // Render Weekly Matrix Table
    let html = `
      <table class="matrix-table" style="width: 100%;">
        <thead>
          <tr>
            <th class="sticky-col" style="min-width: 140px;">STAFF MEMBER</th>
    `;

    days.forEach(d => {
      const isToday = formatDateKey(new Date()) === d.dateKey;
      const todayHighlight = isToday ? 'style="background-color: var(--c-navy-light); color: #fff;"' : '';
      html += `
        <th ${todayHighlight}>
          ${escapeHtml(d.weekday)}<br>
          <span style="font-size: 8px; opacity: 0.85;">${d.dayNumber} ${escapeHtml(d.monthShort)}</span>
        </th>
      `;
    });

    html += `
            <th style="background-color: var(--c-navy-dark); min-width: 32px;" title="Total Present">P</th>
            <th style="background-color: #7F1D1D; min-width: 32px;" title="Total Absent">A</th>
            <th style="background-color: #78350F; min-width: 32px;" title="Total Late">L</th>
            <th style="background-color: var(--c-black); min-width: 48px;" title="Weekly Turnout Rate">RATE</th>
          </tr>
        </thead>
        <tbody>
    `;

    if (displayStaff.length === 0) {
      html += `
        <tr>
          <td colspan="12" style="text-align: center; padding: 24px; color: var(--c-gray-dark); font-weight: 700;">
            No staff records found for this selection.
          </td>
        </tr>
      `;
    } else {
      displayStaff.forEach(staff => {
        let staffP = 0;
        let staffA = 0;
        let staffL = 0;
        let staffO = 0;

        html += `
          <tr>
            <td class="sticky-col">
              <div style="font-size: 12px; font-weight: 700; color: var(--c-navy-primary);">${escapeHtml(staff.name)}</div>
              <div style="font-size: 9px; color: var(--c-gray-dark);">${escapeHtml(staff.code)} · <span class="shift-tag shift-${(staff.shift || 'Morning').toLowerCase()}">${escapeHtml(staff.shift || 'Morning')}</span></div>
            </td>
        `;

        days.forEach(d => {
          const record = getStaffAttendance(d.dateKey, staff.id);
          const status = record.status || 'U';

          if (status === 'P') staffP++;
          else if (status === 'A') staffA++;
          else if (status === 'L') staffL++;
          else if (status === 'O') staffO++;

          const noteTooltip = record.note ? ` - Note: ${escapeHtml(record.note)}` : '';
          html += `
            <td style="padding: 2px;">
              <span class="cell-status ${status}" title="${d.dateKey}: ${escapeHtml(staff.name)} [${status}]${noteTooltip}">
                ${status !== 'U' ? status : '-'}
              </span>
            </td>
          `;
        });

        const staffTotalDays = staffP + staffA + staffL;
        const staffRate = staffTotalDays > 0 ? Math.round((staffP / staffTotalDays) * 100) : 0;

        html += `
            <td style="font-weight: 800; color: var(--c-navy-primary);">${staffP}</td>
            <td style="font-weight: 800; color: var(--c-status-absent-bg);">${staffA}</td>
            <td style="font-weight: 800; color: var(--c-status-late-bg);">${staffL}</td>
            <td style="font-weight: 800; color: var(--c-black);">${staffRate}%</td>
          </tr>
        `;
      });
    }

    html += `
        </tbody>
      </table>
    `;

    container.innerHTML = html;
  }

  // =========================================================================
  // VIEW 4: STAFF DIRECTORY & ROSTER
  // =========================================================================
  function renderStaffDirectory() {
    const container = document.getElementById('staff-directory-list');
    if (!container) return;

    const query = AppState.staffSearchQuery.toLowerCase().trim();
    const filtered = AppState.staff.filter(s =>
      s.name.toLowerCase().includes(query) ||
      s.code.toLowerCase().includes(query) ||
      (s.station && s.station.toLowerCase().includes(query)) ||
      (s.phone && s.phone.toLowerCase().includes(query))
    );

    container.innerHTML = '';

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="background:#fff; border:1px solid var(--c-gray-border); padding:24px; text-align:center; color:var(--c-gray-dark); font-weight:700; font-size:12px; text-transform:uppercase;">
          No staff members found.
        </div>`;
      return;
    }

    filtered.forEach(staff => {
      const row = document.createElement('div');
      row.className = 'staff-row-item';

      row.innerHTML = `
        <div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:14px; font-weight:700; color:var(--c-black);">${escapeHtml(staff.name)}</span>
            <span class="waiter-id-tag">${escapeHtml(staff.code)}</span>
            ${!staff.active ? '<span style="background:#CBD5E1; color:#333; font-size:9px; font-weight:700; padding:2px 4px;">ARCHIVED</span>' : ''}
          </div>
          <div style="font-size:11px; color:var(--c-gray-dark); margin-top:2px;">
            Station: ${escapeHtml(staff.station || 'General')} | Shift: <span class="shift-tag shift-${(staff.shift || 'Morning').toLowerCase()}">${escapeHtml(staff.shift || 'Morning')}</span> | Phone: ${escapeHtml(staff.phone || 'N/A')}
          </div>
        </div>
        <div class="staff-row-actions" style="display:flex; flex-wrap:wrap; gap:4px; align-items:center;">
          <button type="button" class="btn-small btn-secondary btn-staff-week-att" data-id="${staff.id}" title="View this waiter's week attendance">📅 Week</button>
          <button type="button" class="btn-small btn-secondary btn-staff-month-att" data-id="${staff.id}" title="View this waiter's monthly attendance">🗓️ Month</button>
          <button type="button" class="btn-small btn-secondary btn-edit-staff" data-id="${staff.id}">Edit</button>
          <button type="button" class="btn-small btn-danger btn-delete-staff" data-id="${staff.id}">Delete</button>
        </div>
      `;

      // Event: View waiter's week attendance
      const btnStaffWeek = row.querySelector('.btn-staff-week-att');
      if (btnStaffWeek) {
        btnStaffWeek.addEventListener('click', () => {
          openWeekAttendanceModal(staff.id);
        });
      }

      // Event: View waiter's monthly attendance
      const btnStaffMonth = row.querySelector('.btn-staff-month-att');
      if (btnStaffMonth) {
        btnStaffMonth.addEventListener('click', () => {
          navigateToTab('view-monthly');
          showToast(`Monthly Register for ${staff.name}`);
        });
      }

      // Event: Edit staff
      row.querySelector('.btn-edit-staff').addEventListener('click', () => {
        openStaffModal(staff);
      });

      // Event: Delete staff
      row.querySelector('.btn-delete-staff').addEventListener('click', async () => {
        if (confirm(`Remove waiter "${staff.name}" (${staff.code}) from roster and database?`)) {
          try {
            const res = await fetch(`/api/staff/${encodeURIComponent(staff.id)}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) {
              showToast(data.message || 'Could not delete staff from database.');
              return;
            }
            AppState.staff = AppState.staff.filter(s => s.id !== staff.id);
            saveState();
            renderStaffDirectory();
            renderDailyView();
            renderMonthlyMatrix();
            renderAbsenteeReport();
            showToast(`Waiter ${staff.name} removed from database.`);
          } catch (err) {
            console.error('Error deleting staff:', err);
            showToast('Network error deleting staff from database.');
          }
        }
      });

      container.appendChild(row);
    });
  }

  // =========================================================================
  // PRINT REGISTER SHEET GENERATION (@media print)
  // =========================================================================
  function prepareAndPrintRegister(monthIndex, year) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const monthName = monthNames[monthIndex];
    const currentMonthLabel = monthShortNames[monthIndex];
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const activeStaff = AppState.staff.filter(s => s.active);

    // Update Print Header Details
    const printOrg = document.getElementById('print-org-name-text');
    const printPeriod = document.getElementById('print-period-title');
    const printDate = document.getElementById('print-date-generated');

    if (printOrg) printOrg.textContent = AppState.settings.businessName.toUpperCase();
    if (printPeriod) printPeriod.textContent = `MONTHLY WAITER ATTENDANCE REGISTER - ${monthName.toUpperCase()} ${year}`;
    if (printDate) printDate.textContent = new Date().toLocaleString('en-US');

    const printManager = document.getElementById('print-manager-on-duty');
    if (printManager) {
      const mgrName = AppState.manager?.name || 'Executive Duty Manager';
      printManager.textContent = `${mgrName} (General Manager)`;
    }

    // Populate Section 1: Staff Absentee Table with Specific Dates
    const tbodyAbsentee = document.getElementById('print-absentee-table-body');
    if (tbodyAbsentee) {
      tbodyAbsentee.innerHTML = '';

      activeStaff.forEach(staff => {
        let presentDays = 0;
        let absentDays = 0;
        const absentDates = [];

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = getStaffAttendance(dateKey, staff.id);

          if (record.status === 'P' || record.status === 'L') presentDays++;
          else if (record.status === 'A') {
            absentDays++;
            absentDates.push(`${currentMonthLabel} ${day}`);
          }
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${escapeHtml(staff.code)}</strong></td>
          <td><strong>${escapeHtml(staff.name)}</strong><br><small style="color:#555;">${escapeHtml(staff.station || 'Service Floor')}</small></td>
          <td style="text-align: center; font-weight: bold;">${presentDays}</td>
          <td style="text-align: center; font-weight: bold; ${absentDays > 0 ? 'color: #991B1B;' : ''}">${absentDays}</td>
          <td>
            ${absentDates.length > 0
              ? `<span class="print-absent-dates">${absentDates.join(', ')}</span>`
              : '<span style="color: #059669; font-weight: bold;">None (Full Attendance)</span>'
            }
          </td>
        `;
        tbodyAbsentee.appendChild(tr);
      });
    }

    // Populate Section 2: Complete Attendance Matrix
    const printMatrixContainer = document.getElementById('print-matrix-container');
    if (printMatrixContainer) {
      let tableHtml = `
        <table class="print-table" style="font-size: 8px;">
          <thead>
            <tr>
              <th style="width: 18%;">STAFF NAME</th>
      `;

      for (let day = 1; day <= daysInMonth; day++) {
        tableHtml += `<th style="text-align:center; padding: 2px 1px;">${day}</th>`;
      }

      tableHtml += `
              <th style="text-align:center;">P</th>
              <th style="text-align:center;">A</th>
              <th style="text-align:center;">%</th>
            </tr>
          </thead>
          <tbody>
      `;

      activeStaff.forEach(staff => {
        let countP = 0;
        let countA = 0;
        let countL = 0;

        tableHtml += `
          <tr>
            <td><strong>${escapeHtml(staff.name)}</strong> (${escapeHtml(staff.code)})</td>
        `;

        for (let day = 1; day <= daysInMonth; day++) {
          const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const record = getStaffAttendance(dateKey, staff.id);
          const status = record.status || '-';

          if (status === 'P') countP++;
          else if (status === 'A') countA++;
          else if (status === 'L') countL++;

          let cellColor = '#000000';
          if (status === 'A') cellColor = '#991B1B; font-weight:bold;';
          else if (status === 'P') cellColor = '#0A2540; font-weight:bold;';

          tableHtml += `<td style="text-align:center; padding: 2px 1px; color: ${cellColor}">${status}</td>`;
        }

        const totalActiveDays = countP + countA + countL;
        const rate = totalActiveDays > 0 ? Math.round((countP / totalActiveDays) * 100) : 0;

        tableHtml += `
            <td style="text-align:center; font-weight:bold;">${countP}</td>
            <td style="text-align:center; font-weight:bold; color:#991B1B;">${countA}</td>
            <td style="text-align:center; font-weight:bold;">${rate}%</td>
          </tr>
        `;
      });

      tableHtml += `
          </tbody>
        </table>
      `;

      printMatrixContainer.innerHTML = tableHtml;
    }

    // Trigger Print Dialog
    window.print();
  }

  // =========================================================================
  // MODAL MANAGEMENT
  // =========================================================================
  function getNextStaffCode() {
    let maxNum = 100;
    const allStaff = AppState.staff || [];
    allStaff.forEach(s => {
      if (s.code) {
        const match = s.code.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    });
    return `W-${maxNum + 1}`;
  }

  function openStaffModal(staff = null) {
    const modal = document.getElementById('modal-staff');
    const title = document.getElementById('modal-staff-title');
    const inputId = document.getElementById('staff-form-id');
    const inputName = document.getElementById('staff-input-name');
    const inputCode = document.getElementById('staff-input-code');
    const inputStation = document.getElementById('staff-input-station');
    const inputShift = document.getElementById('staff-input-shift');
    const inputPhone = document.getElementById('staff-input-phone');
    const errorBox = document.getElementById('staff-form-error');

    if (errorBox) {
      errorBox.style.display = 'none';
      errorBox.textContent = '';
    }

    if (staff) {
      if (title) title.textContent = 'EDIT STAFF MEMBER';
      if (inputId) inputId.value = staff.id;
      if (inputName) inputName.value = staff.name;
      if (inputCode) inputCode.value = staff.code;
      if (inputStation) inputStation.value = staff.station || '';
      if (inputShift) inputShift.value = staff.shift || 'Morning';
      if (inputPhone) inputPhone.value = staff.phone || '';
    } else {
      if (title) title.textContent = 'ADD NEW STAFF MEMBER';
      if (inputId) inputId.value = '';
      if (inputName) inputName.value = '';
      if (inputCode) inputCode.value = getNextStaffCode();
      if (inputStation) inputStation.value = '';
      if (inputShift) inputShift.value = 'Morning';
      if (inputPhone) inputPhone.value = '';

      // Async check server for latest next code to prevent concurrent duplicate codes
      fetch('/api/staff/next-code')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.nextCode && inputCode && !inputId.value) {
            inputCode.value = data.nextCode;
          }
        })
        .catch(() => {});
    }

    if (modal) modal.classList.add('active');
  }

  function closeStaffModal() {
    const modal = document.getElementById('modal-staff');
    if (modal) modal.classList.remove('active');
  }

  function openSettingsModal() {
    const modal = document.getElementById('modal-settings');
    const inputName = document.getElementById('settings-business-name');
    const inputPin = document.getElementById('settings-security-pin');
    const selectAutoLock = document.getElementById('settings-autolock-minutes');

    if (inputName) inputName.value = AppState.settings.businessName;
    if (inputPin) inputPin.value = AppState.security.pin;
    if (selectAutoLock) selectAutoLock.value = AppState.security.autoLockMinutes;

    const nameEl = document.getElementById('settings-manager-name');
    const emailEl = document.getElementById('settings-manager-email');
    if (nameEl && AppState.manager.name) nameEl.textContent = AppState.manager.name;
    if (emailEl && AppState.manager.email) emailEl.textContent = AppState.manager.email;

    updateManagerAvatarUI(AppState.manager.avatar, AppState.manager.initials);

    if (modal) modal.classList.add('active');
    loadPasskeys();
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('active');
  }

  // =========================================================================
  // EXECUTIVE MANAGER SESSION DROPDOWN & SHIFT HANDOVER
  // =========================================================================
  function toggleManagerProfileDropdown(forceState) {
    const dropdown = document.getElementById('manager-profile-dropdown');
    const pill = document.getElementById('btn-manager-session-menu');
    if (!dropdown) return;

    const shouldShow = (typeof forceState === 'boolean') ? forceState : (dropdown.style.display === 'none' || !dropdown.style.display);

    if (shouldShow) {
      // Sync dynamic manager data into dropdown
      const nameEl = document.getElementById('mp-dropdown-name');
      const emailEl = document.getElementById('mp-dropdown-email');
      const initialsEl = document.getElementById('mp-dropdown-initials');
      const avatarImg = document.getElementById('mp-dropdown-avatar-img');
      const shiftEl = document.getElementById('mp-tel-shift');

      if (nameEl) nameEl.textContent = AppState.manager.name || 'Manager';
      if (emailEl) emailEl.textContent = AppState.manager.email || '';
      if (initialsEl) initialsEl.textContent = AppState.manager.initials || 'G';

      if (avatarImg) {
        if (AppState.manager.avatar) {
          avatarImg.src = AppState.manager.avatar;
          avatarImg.style.display = 'block';
          if (initialsEl) initialsEl.style.display = 'none';
        } else {
          avatarImg.style.display = 'none';
          if (initialsEl) initialsEl.style.display = 'inline';
        }
      }

      if (shiftEl) {
        const activeShiftName = AppState.currentShift || 'Morning';
        shiftEl.textContent = `${activeShiftName} Shift`;
      }

      dropdown.style.display = 'block';
      if (pill) pill.classList.add('active');
    } else {
      dropdown.style.display = 'none';
      if (pill) pill.classList.remove('active');
    }
  }

  function closeManagerProfileDropdown() {
    toggleManagerProfileDropdown(false);
  }

  // Shift Handover Certification Modal
  let currentCertificationDocRef = 'ER-CERT-2026-X89';

  function openShiftHandoverModal() {
    closeManagerProfileDropdown();
    const modal = document.getElementById('modal-shift-handover');
    if (!modal) return;

    // Generate shift handover reference ID if needed
    currentCertificationDocRef = `HO-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const docRefEl = document.getElementById('cert-doc-ref');
    if (docRefEl) docRefEl.textContent = currentCertificationDocRef;

    // Shift Date & Name
    const dateEl = document.getElementById('cert-shift-date');
    const shiftEl = document.getElementById('cert-shift-name');
    const mgrEl = document.getElementById('cert-manager-name');

    const formattedDate = AppState.currentDate.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    if (dateEl) dateEl.textContent = formattedDate;

    const currentShift = AppState.currentShift || 'Morning';
    if (shiftEl) shiftEl.textContent = `${currentShift} Shift`;
    if (mgrEl) mgrEl.textContent = AppState.manager.name || 'Mark Kamau';

    // Calculate attendance turnout for current date
    const dateKey = formatDateKey(AppState.currentDate);
    const activeStaff = AppState.staff.filter(s => s.active);
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;

    activeStaff.forEach(staff => {
      const rec = getStaffAttendance(dateKey, staff.id);
      if (rec.status === 'P') presentCount++;
      else if (rec.status === 'A') absentCount++;
      else if (rec.status === 'L' || rec.status === 'O') lateCount++;
    });

    const turnoutPct = activeStaff.length > 0 ? Math.round((presentCount / activeStaff.length) * 100) : 0;

    const statPresent = document.getElementById('cert-stat-present');
    const statAbsent = document.getElementById('cert-stat-absent');
    const statLate = document.getElementById('cert-stat-late');
    const turnoutPill = document.getElementById('cert-turnout-pill');

    if (statPresent) statPresent.textContent = presentCount;
    if (statAbsent) statAbsent.textContent = absentCount;
    if (statLate) statLate.textContent = lateCount;
    if (turnoutPill) turnoutPill.textContent = `Turnout: ${turnoutPct}%`;

    // Evaluate station coverage
    const shiftAssignments = (floorPlanState.assignments[dateKey] && floorPlanState.assignments[dateKey][currentShift]) || {};
    const assignedStationCount = Object.keys(shiftAssignments).length;
    const statCoverage = document.getElementById('cert-stat-coverage');
    if (statCoverage) statCoverage.textContent = `${assignedStationCount}/71 Points`;

    // Check Cashier Suite (dual staff)
    const chkCashier = document.getElementById('cert-cashier-val');
    const hasCashier1 = !!shiftAssignments['station_cashier'];
    const hasCashier2 = !!shiftAssignments['station_cashier_2'];
    if (chkCashier) {
      if (hasCashier1 && hasCashier2) {
        const name1 = AppState.staff.find(s => s.id === shiftAssignments['station_cashier'].staff_id)?.name || 'Staff 1';
        const name2 = AppState.staff.find(s => s.id === shiftAssignments['station_cashier_2'].staff_id)?.name || 'Staff 2';
        chkCashier.innerHTML = `<span style="color: #059669; font-weight: 800;">Both Tills Allocated (${escapeHtml(name1)} & ${escapeHtml(name2)})</span>`;
      } else if (hasCashier1 || hasCashier2) {
        chkCashier.innerHTML = `<span style="color: #D97706; font-weight: 700;">Partial Coverage (1/2 Staff Assigned)</span>`;
      } else {
        chkCashier.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Unassigned (Needs 2 Staff)</span>`;
      }
    }

    // Check Front Mini Shop (dual staff)
    const chkMiniShop = document.getElementById('cert-minishop-val');
    const hasMini1 = !!shiftAssignments['station_minishop'];
    const hasMini2 = !!shiftAssignments['station_minishop_2'];
    if (chkMiniShop) {
      if (hasMini1 && hasMini2) {
        const name1 = AppState.staff.find(s => s.id === shiftAssignments['station_minishop'].staff_id)?.name || 'Staff 1';
        const name2 = AppState.staff.find(s => s.id === shiftAssignments['station_minishop_2'].staff_id)?.name || 'Staff 2';
        chkMiniShop.innerHTML = `<span style="color: #059669; font-weight: 800;">Both Attendants Allocated (${escapeHtml(name1)} & ${escapeHtml(name2)})</span>`;
      } else if (hasMini1 || hasMini2) {
        chkMiniShop.innerHTML = `<span style="color: #D97706; font-weight: 700;">Partial Coverage (1/2 Staff Assigned)</span>`;
      } else {
        chkMiniShop.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Unassigned (Needs 2 Staff)</span>`;
      }
    }

    // Check Dining Rows 1-6
    const chkRows = document.getElementById('cert-rows-val');
    let rowsCovered = 0;
    ['row1', 'row2', 'row3', 'row4', 'row5', 'row6'].forEach(rowId => {
      const section = TABLE_ROW_SECTIONS[rowId];
      if (section && section.tables.some(tId => shiftAssignments[tId])) {
        rowsCovered++;
      }
    });
    if (chkRows) {
      if (rowsCovered === 6) {
        chkRows.innerHTML = `<span style="color: #059669; font-weight: 800;">All 6 Rows Assigned</span>`;
      } else {
        chkRows.innerHTML = `<span style="color: #D97706; font-weight: 700;">${rowsCovered}/6 Rows Allocated</span>`;
      }
    }

    // Check Upper Tier E Section
    const chkESection = document.getElementById('cert-esection-val');
    const eSection = TABLE_ROW_SECTIONS['esection'];
    const hasEAssigned = eSection && eSection.tables.some(tId => shiftAssignments[tId]);
    if (chkESection) {
      if (hasEAssigned) {
        chkESection.innerHTML = `<span style="color: #059669; font-weight: 800;">Allocated to 1 Staff</span>`;
      } else {
        chkESection.innerHTML = `<span style="color: #DC2626; font-weight: 700;">Unassigned</span>`;
      }
    }

    // Handover timestamp
    const sealTime = document.getElementById('cert-timestamp-seal');
    if (sealTime) {
      sealTime.textContent = `Prepared by ${AppState.manager.name || 'Duty Manager'} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }

    modal.classList.add('active');
  }

  function closeShiftHandoverModal() {
    const modal = document.getElementById('modal-shift-handover');
    if (modal) modal.classList.remove('active');
  }

  function buildWhatsAppCertificationMessage() {
    const dateKey = formatDateKey(AppState.currentDate);
    const currentShift = AppState.currentShift || 'Morning';
    const mgrName = AppState.manager?.name || 'Executive Duty Manager';
    const notesInput = document.getElementById('cert-handover-notes');
    const notes = (notesInput && notesInput.value.trim()) ? notesInput.value.trim() : 'Routine shift handover completed with standard floor operations.';

    const activeStaff = AppState.staff.filter(s => s.active);
    let presentCount = 0;
    let absentCount = 0;
    activeStaff.forEach(staff => {
      const rec = getStaffAttendance(dateKey, staff.id);
      if (rec.status === 'P') presentCount++;
      else if (rec.status === 'A') absentCount++;
    });
    const turnoutPct = activeStaff.length > 0 ? Math.round((presentCount / activeStaff.length) * 100) : 0;

    const shiftAssignments = (floorPlanState.assignments[dateKey] && floorPlanState.assignments[dateKey][currentShift]) || {};

    const cashier1 = shiftAssignments['station_cashier'] ? (AppState.staff.find(s => s.id === shiftAssignments['station_cashier'].staff_id)?.name || 'Assigned') : 'Unassigned';
    const cashier2 = shiftAssignments['station_cashier_2'] ? (AppState.staff.find(s => s.id === shiftAssignments['station_cashier_2'].staff_id)?.name || 'Assigned') : 'Unassigned';

    const mini1 = shiftAssignments['station_minishop'] ? (AppState.staff.find(s => s.id === shiftAssignments['station_minishop'].staff_id)?.name || 'Assigned') : 'Unassigned';
    const mini2 = shiftAssignments['station_minishop_2'] ? (AppState.staff.find(s => s.id === shiftAssignments['station_minishop_2'].staff_id)?.name || 'Assigned') : 'Unassigned';

    const lines = [
      '*Ribhouse Restaurant Floor & Service Duty Roster*',
      '*Shift Handover Report*',
      `Reference: ${currentCertificationDocRef}`,
      `Date: ${dateKey}`,
      `Shift: ${currentShift} Shift`,
      `Duty Manager: ${mgrName}`,
      '',
      '*STAFF ATTENDANCE*',
      `- Present Staff: ${presentCount} of ${activeStaff.length}`,
      `- Absent Staff: ${absentCount}`,
      `- Turnout Rate: ${turnoutPct}%`,
      '',
      '*KEY DEPARTMENT COVERAGE*',
      `- Cashier Suite (2 Staff): ${cashier1} & ${cashier2}`,
      `- Front Mini Shop (2 Staff): ${mini1} & ${mini2}`,
      '',
      '*DUTY MANAGER HANDOVER NOTES*',
      notes,
      '',
      `_Shift handover submitted by ${mgrName}_`
    ];

    return lines.join('\n');
  }

  // =========================================================================
  // MANAGER BIOMETRIC / WEBAUTHN PASSKEYS MANAGEMENT
  // =========================================================================
  async function loadPasskeys() {
    const container = document.getElementById('passkeys-list-container');
    if (!container) return;

    container.innerHTML = '<div style="font-size: 11px; color: var(--c-gray-dark); padding: 6px 0;">Loading registered passkeys...</div>';

    try {
      const res = await fetch('/api/auth/passkeys');
      if (res.status === 401) {
        container.innerHTML = '<div style="font-size: 11px; color: #DC2626;">Session expired. Please log in again.</div>';
        return;
      }
      const data = await res.json();
      if (!data.success) {
        container.innerHTML = `<div style="font-size: 11px; color: #DC2626;">Error: ${escapeHtml(data.message)}</div>`;
        return;
      }

      const passkeys = data.passkeys || [];
      if (passkeys.length === 0) {
        container.innerHTML = `
          <div style="font-size: 11px; color: var(--c-gray-dark); padding: 10px; background: #F8FAFC; border: 1px dashed var(--c-gray-border); text-align: center;">
            No passkeys registered yet. Register this device above to enable instant biometric login.
          </div>
        `;
        return;
      }

      container.innerHTML = passkeys.map(pk => {
        const createdDate = pk.created_at ? new Date(pk.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown';
        const lastUsed = pk.last_used_at ? new Date(pk.last_used_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never';
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: #FFFFFF; border: 1px solid var(--c-gray-border); margin-bottom: 6px;" id="passkey-row-${pk.id}">
            <div style="display: flex; align-items: center; gap: 8px; min-width: 0;">
              <div style="width: 28px; height: 28px; background: #EEF2F6; display: flex; align-items: center; justify-content: center; color: var(--c-navy-primary); flex-shrink: 0;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 2l-2 2m-1.5 1.5L10 13m-2 2l-5 5h4l2-2v-2h2l2-2v-2l2.5-2.5"></path>
                  <circle cx="15.5" cy="8.5" r="3.5"></circle>
                </svg>
              </div>
              <div style="min-width: 0;">
                <div style="font-size: 11px; font-weight: 700; color: var(--c-navy-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${escapeHtml(pk.device_name || 'Biometric Passkey')}
                </div>
                <div style="font-size: 9px; color: var(--c-gray-dark);">
                  Added: ${createdDate} · Last used: ${lastUsed}
                </div>
              </div>
            </div>
            <button type="button" class="btn-danger btn-revoke-passkey" data-id="${pk.id}" data-name="${escapeHtml(pk.device_name || 'Passkey')}" style="padding: 4px 8px; font-size: 10px; flex-shrink: 0; margin-left: 8px;">
              Revoke
            </button>
          </div>
        `;
      }).join('');

      // Attach revoke handlers
      container.querySelectorAll('.btn-revoke-passkey').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.preventDefault();
          const pkId = btn.getAttribute('data-id');
          const pkName = btn.getAttribute('data-name');
          await revokePasskey(pkId, pkName);
        });
      });

    } catch (err) {
      console.error('Error loading passkeys:', err);
      container.innerHTML = '<div style="font-size: 11px; color: #DC2626;">Failed to load registered passkeys.</div>';
    }
  }

  async function registerPasskey() {
    if (!window.SimpleWebAuthnBrowser || !SimpleWebAuthnBrowser.browserSupportsWebAuthn()) {
      showToast('Your browser or device does not support WebAuthn / Passkeys.');
      return;
    }

    const inputDevice = document.getElementById('input-passkey-device-name');
    const btnRegister = document.getElementById('btn-register-passkey');
    let deviceName = inputDevice ? inputDevice.value.trim() : '';

    if (!deviceName) {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const isMac = /Macintosh/i.test(navigator.userAgent);
      const isWindows = /Windows/i.test(navigator.userAgent);
      if (isMobile) deviceName = 'Manager Mobile Phone';
      else if (isMac) deviceName = 'Manager Mac (Touch ID)';
      else if (isWindows) deviceName = 'Manager Windows PC (Hello)';
      else deviceName = 'Manager Hardware Device';
    }

    if (btnRegister) {
      btnRegister.disabled = true;
      btnRegister.textContent = 'Verifying...';
    }

    try {
      // 1. Get registration options from server
      const optRes = await fetch('/api/auth/passkey/register-options');
      if (optRes.status === 401) {
        showToast('Session expired. Please log in first.');
        window.location.replace('/login.html');
        return;
      }
      const optData = await optRes.json();
      if (!optData.success) {
        showToast('Error getting passkey options: ' + (optData.message || 'Server error'));
        return;
      }

      // 2. Prompt local device / biometric sensor using WebAuthn browser API
      let attResp;
      try {
        attResp = await SimpleWebAuthnBrowser.startRegistration(optData.options);
      } catch (clientErr) {
        console.error('WebAuthn registration canceled/failed:', clientErr);
        if (clientErr.name === 'NotAllowedError') {
          showToast('Passkey registration canceled or timed out.');
        } else {
          showToast('Passkey setup error: ' + clientErr.message);
        }
        return;
      }

      // 3. Send cryptographic credential to server for verification
      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attResp,
          deviceName: deviceName
        })
      });

      const verifyData = await verifyRes.json();
      if (verifyData.success) {
        showToast(`Passkey "${deviceName}" registered successfully!`);
        if (inputDevice) inputDevice.value = '';
        await loadPasskeys();
      } else {
        showToast('Registration verification failed: ' + (verifyData.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Register passkey error:', err);
      showToast('Network error while registering passkey.');
    } finally {
      if (btnRegister) {
        btnRegister.disabled = false;
        btnRegister.textContent = '+ Set Up Passkey';
      }
    }
  }

  async function revokePasskey(id, deviceName) {
    if (!confirm(`Are you sure you want to revoke "${deviceName}"?\nThis device will no longer be able to sign into the manager dashboard.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/auth/passkeys/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`Passkey "${deviceName}" revoked.`);
        await loadPasskeys();
      } else {
        showToast('Failed to revoke passkey: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      console.error('Revoke passkey error:', err);
      showToast('Error contacting server to revoke passkey.');
    }
  }

  // =========================================================================
  // BACKUP, CSV & EXPORT HELPERS
  // =========================================================================
  function exportJsonBackup() {
    const dataStr = JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      staff: AppState.staff,
      attendance: AppState.attendance,
      settings: AppState.settings
    }, null, 2);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waiter_register_backup_${formatDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup JSON file downloaded.');
  }

  function exportMonthlyCsv() {
    const monthIndex = AppState.matrixMonth;
    const year = AppState.matrixYear;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const activeStaff = AppState.staff.filter(s => s.active);

    const headers = ['Staff ID', 'Waiter Name', 'Station', 'Shift', 'Phone'];
    for (let day = 1; day <= daysInMonth; day++) {
      headers.push(`Day ${day}`);
    }
    headers.push('Total Present', 'Total Absent', 'Total Late', 'Attendance Rate %', 'Absent Dates');

    const monthShortNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthLabel = monthShortNames[monthIndex];

    const rows = [headers.join(',')];

    activeStaff.forEach(staff => {
      let countP = 0;
      let countA = 0;
      let countL = 0;
      const absentDates = [];
      const row = [
        `"${staff.code}"`,
        `"${staff.name}"`,
        `"${staff.station || ''}"`,
        `"${staff.shift || 'Morning'}"`,
        `"${staff.phone || ''}"`
      ];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const record = getStaffAttendance(dateKey, staff.id);
        const status = record.status || '-';
        row.push(`"${status}"`);

        if (status === 'P') countP++;
        else if (status === 'A') {
          countA++;
          absentDates.push(`${currentMonthLabel} ${day}`);
        } else if (status === 'L') countL++;
      }

      const totalMarked = countP + countA + countL;
      const rate = totalMarked > 0 ? Math.round((countP / totalMarked) * 100) : 0;

      row.push(countP, countA, countL, `${rate}%`, `"${absentDates.join('; ')}"`);
      rows.push(row.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(rows.join('\n'));
    const a = document.createElement('a');
    a.href = csvContent;
    a.download = `waiter_attendance_${year}_${monthIndex + 1}.csv`;
    a.click();
    showToast('CSV Register downloaded.');
  }

  function handleRestoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (data.staff && data.attendance) {
          AppState.staff = data.staff;
          AppState.attendance = data.attendance;
          if (data.settings) AppState.settings = data.settings;
          saveState();
          renderDailyView();
          renderMonthlyMatrix();
          renderAbsenteeReport();
          renderStaffDirectory();
          closeSettingsModal();
          showToast('Data restored successfully!');
        } else {
          showToast('Invalid backup file format.');
        }
      } catch (err) {
        console.error(err);
        showToast('Error parsing backup file.');
      }
    };
    reader.readAsText(file);
  }

  // Utility to escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // =========================================================================
  // RESTAURANT FLOOR PLAN & STAFF ASSIGNMENT BLUEPRINT MODULE
  // =========================================================================

  const FP_STATUS_MAP = {
    'P': { label: 'Present', color: '#10B981', class: 'fp-status-present' },
    'A': { label: 'Absent', color: '#EF4444', class: 'fp-status-absent' },
    'L': { label: 'Late', color: '#F59E0B', class: 'fp-status-late' },
    'O': { label: 'Off / Rest', color: '#94A3B8', class: 'fp-status-off' },
    'unassigned': { label: 'Unassigned', color: '#CBD5E1', class: 'fp-status-unassigned' }
  };

  async function loadFloorPlanData() {
    try {
      const dateInput = document.getElementById('fp-date-selector');
      const shiftSelect = document.getElementById('fp-shift-selector');
      
      const dateVal = dateInput && dateInput.value ? dateInput.value : AppState.floorPlanDate;
      const shiftVal = shiftSelect && shiftSelect.value ? shiftSelect.value : AppState.floorPlanShift;

      AppState.floorPlanDate = dateVal;
      AppState.floorPlanShift = shiftVal;

      if (dateInput) dateInput.value = dateVal;
      if (shiftSelect) shiftSelect.value = shiftVal;

      const res = await fetch(`/api/floorplan/assignments?date=${encodeURIComponent(dateVal)}&shift=${encodeURIComponent(shiftVal)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success) {
        AppState.floorPlanData = {
          stations: data.stations || [],
          employees: data.employees || []
        };
      } else {
        throw new Error(data.message || 'Failed to load assignments');
      }
    } catch (err) {
      console.warn('[FLOORPLAN] Loading from server failed, using local fallback:', err);
      // Fallback using local AppState.staff and attendance
      buildLocalFloorPlanFallback();
    }

    renderFloorPlanBlueprint();
    renderFloorPlanSidebar();
    updateFloorPlanSummary();
  }

  function buildLocalFloorPlanFallback() {
    const stationsCatalog = [
      // 1. MAIN DINING - LEFT SECTION (18 TABLES: 3x6 GRID)
      { id: 'table_1', name: 'Table 1', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_2', name: 'Table 2', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_3', name: 'Table 3', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_4', name: 'Table 4', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_5', name: 'Table 5', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_6', name: 'Table 6', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_7', name: 'Table 7', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_8', name: 'Table 8', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_9', name: 'Table 9', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_10', name: 'Table 10', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_11', name: 'Table 11', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_12', name: 'Table 12', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_13', name: 'Table 13', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_14', name: 'Table 14', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_15', name: 'Table 15', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_16', name: 'Table 16', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_17', name: 'Table 17', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_18', name: 'Table 18', section: 'Main Dining (Left)', type: 'table', capacity: 4, shape: 'square' },

      // 2. MAIN DINING - RIGHT SECTION (18 TABLES: 3x6 GRID)
      { id: 'table_19', name: 'Table 19', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_20', name: 'Table 20', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_21', name: 'Table 21', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_22', name: 'Table 22', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_23', name: 'Table 23', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_24', name: 'Table 24', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_25', name: 'Table 25', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_26', name: 'Table 26', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_27', name: 'Table 27', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_28', name: 'Table 28', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_29', name: 'Table 29', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_30', name: 'Table 30', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_31', name: 'Table 31', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_32', name: 'Table 32', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_33', name: 'Table 33', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_34', name: 'Table 34', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_35', name: 'Table 35', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_36', name: 'Table 36', section: 'Main Dining (Right)', type: 'table', capacity: 4, shape: 'square' },

      // 3. UPPER DINING (STEPPED / TIERED TABLES)
      { id: 'table_37', name: 'Table 37', section: 'Upper Dining (Tier 1)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_38', name: 'Table 38', section: 'Upper Dining (Tier 1)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_39', name: 'Table 39', section: 'Upper Dining (Tier 1)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_40', name: 'Table 40', section: 'Upper Dining (Tier 1)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_41', name: 'Table 41', section: 'Upper Dining (Tier 1)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_42', name: 'Table 42', section: 'Upper Dining (Tier 2)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_43', name: 'Table 43', section: 'Upper Dining (Tier 2)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_44', name: 'Table 44', section: 'Upper Dining (Tier 2)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_45', name: 'Table 45', section: 'Upper Dining (Tier 3)', type: 'table', capacity: 4, shape: 'square' },
      { id: 'table_46', name: 'Table 46', section: 'Upper Dining (Tier 3)', type: 'table', capacity: 4, shape: 'square' },

      // 4. SERVICE, PRODUCTION & RETAIL STATIONS
      { id: 'station_samosa', name: 'Samosa & Kababs Maker', section: 'Snacks & Grill', type: 'kitchen', capacity: 2, shape: 'rect' },
      { id: 'station_chef_prep', name: 'Chef Station (Left)', section: 'Kitchen Prep', type: 'kitchen', capacity: 2, shape: 'rect' },
      { id: 'station_barista', name: 'Barista Counter', section: 'Beverages', type: 'bar', capacity: 2, shape: 'bar' },
      { id: 'station_kitchen_butchery', name: 'Kitchen Butchery (Prep)', section: 'Meat Prep', type: 'kitchen', capacity: 2, shape: 'rect' },
      { id: 'station_cashier', name: 'Cashier 1', section: 'Accounts & POS', type: 'service', capacity: 1, shape: 'rect' },
      { id: 'station_cashier_2', name: 'Cashier 2', section: 'Accounts & POS', type: 'service', capacity: 1, shape: 'rect' },
      { id: 'station_main_office', name: 'Main Office', section: 'Management', type: 'office', capacity: 2, shape: 'rect' },
      { id: 'station_jiko', name: 'Jiko (Main Cooking)', section: 'Kitchen Core', type: 'kitchen', capacity: 4, shape: 'rect' },
      { id: 'station_chips_chicken', name: 'Chips Chicken Sausage Display', section: 'Carvery & Display', type: 'kitchen', capacity: 2, shape: 'rect' },
      { id: 'station_store', name: 'Store & Inventory', section: 'Inventory', type: 'inventory', capacity: 2, shape: 'rect' },
      { id: 'station_nyama_cook', name: 'Nyama Cook (Grill Master)', section: 'Grill Station', type: 'kitchen', capacity: 2, shape: 'rect' },
      { id: 'station_stock_guy', name: 'Stock Guy', section: 'Inventory', type: 'inventory', capacity: 1, shape: 'rect' },
      { id: 'station_dishes', name: 'Dishes (Scullery)', section: 'Sanitation', type: 'service', capacity: 2, shape: 'rect' },
      { id: 'station_kitchen_orders', name: 'Kitchen Orders Pickup Pass', section: 'Order Pass', type: 'service', capacity: 2, shape: 'rect' },
      { id: 'station_minishop', name: 'Mini Shop 1', section: 'Retail Wing', type: 'retail', capacity: 1, shape: 'rect' },
      { id: 'station_minishop_2', name: 'Mini Shop 2', section: 'Retail Wing', type: 'retail', capacity: 1, shape: 'rect' },
      { id: 'station_butchery', name: 'Butchery (Retail Counter)', section: 'Retail Wing', type: 'retail', capacity: 2, shape: 'rect' },

      // 5. LEGACY BACKWARD-COMPATIBILITY ALIASES
      { id: 'booth_1', name: 'Booth 1 (Legacy)', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
      { id: 'booth_2', name: 'Booth 2 (Legacy)', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
      { id: 'booth_3', name: 'Booth 3 (Legacy)', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
      { id: 'booth_4', name: 'Booth 4 (Legacy)', section: 'Booths', type: 'booth', capacity: 4, shape: 'booth' },
      { id: 'section_a_1', name: 'Section A - Upper (Legacy)', section: 'Section A', type: 'large_table', capacity: 6, shape: 'rect' },
      { id: 'section_a_2', name: 'Section A - Lower (Legacy)', section: 'Section A', type: 'large_table', capacity: 6, shape: 'rect' },
      { id: 'section_b_1', name: 'Section B (Legacy)', section: 'Section B', type: 'large_table', capacity: 6, shape: 'rect' },
      { id: 'bar', name: 'Bar Counter (Legacy)', section: 'Bar Area', type: 'bar', capacity: 4, shape: 'bar' }
    ];

    const PALETTE = ['#2563EB', '#16A34A', '#EA580C', '#9333EA', '#DC2626', '#EAB308', '#06B6D4', '#EC4899'];
    const activeStaff = (AppState.staff || []).filter(s => s.active);
    const dateKey = AppState.floorPlanDate;
    const dayAttendance = AppState.attendance[dateKey] || {};

    const employees = activeStaff.map((s, idx) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      station: s.station,
      shift: s.shift,
      color: PALETTE[idx % PALETTE.length],
      status: (dayAttendance[s.id] && dayAttendance[s.id].status) || 'P',
      assignedStations: []
    }));

    const stations = stationsCatalog.map(st => ({
      ...st,
      assignment: {
        station_id: st.id,
        staff_id: null,
        staff_name: null,
        staff_code: null,
        notes: '',
        status: 'unassigned',
        color: null
      }
    }));

    AppState.floorPlanData = { stations, employees };
  }

  function updateFloorPlanSummary() {
    const statsEl = document.getElementById('fp-summary-stats');
    if (!statsEl) return;
    const stations = AppState.floorPlanData.stations || [];
    const assignedCount = stations.filter(s => s.assignment && s.assignment.staff_id).length;
    statsEl.textContent = `${assignedCount} / ${stations.length} Assigned`;
  }

  function renderFloorPlanBlueprint() {
    const container = document.getElementById('fp-svg-container');
    if (!container) return;

    const stations = AppState.floorPlanData.stations || [];
    const stationMap = {};
    stations.forEach(st => { stationMap[st.id] = st; });

    const highlightedStaffId = AppState.floorPlanHighlightedStaffId;

    // Helper to generate station assignment badge SVG pill
    function renderBadgeSvg(st, cx, cy) {
      const asgn = st ? st.assignment : null;
      const isAssigned = asgn && asgn.staff_id && asgn.staff_name;
      const isHighlighted = highlightedStaffId && asgn && asgn.staff_id === highlightedStaffId;

      if (isAssigned) {
        const rawName = asgn.staff_name.split(' ')[0] || asgn.staff_code || 'Assigned';
        const name = escapeHtml(rawName);
        const staffColor = asgn.color || '#2563EB';
        const stat = FP_STATUS_MAP[asgn.status] || FP_STATUS_MAP['P'];

        return `
          <g class="fp-badge-assigned">
            <rect x="${cx - 38}" y="${cy - 8}" width="76" height="16" rx="3" fill="#0F172A" stroke="${isHighlighted ? '#F59E0B' : '#334155'}" stroke-width="${isHighlighted ? 2.5 : 1}"/>
            <circle cx="${cx - 29}" cy="${cy}" r="3.5" fill="${staffColor}"/>
            <text x="${cx - 21}" y="${cy + 3}" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="800" fill="#FFFFFF">${name}</text>
            <circle cx="${cx + 29}" cy="${cy}" r="3" fill="${stat.color}" stroke="#0F172A" stroke-width="0.8"/>
          </g>
        `;
      } else {
        return `
          <g class="fp-badge-unassigned">
            <rect x="${cx - 30}" y="${cy - 7}" width="60" height="14" rx="3" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1" stroke-dasharray="2 2" opacity="0.95"/>
            <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#64748B">+ Assign</text>
          </g>
        `;
      }
    }

    // Helper to render standard 4-seater dining table (square wooden table + 4 chairs)
    function renderDiningTable(id, cx, cy, labelNum) {
      const st = stationMap[id] || { id, name: `Table ${labelNum}`, assignment: null };
      const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;

      return `
        <!-- Table ${labelNum} (${id}) -->
        <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
          <!-- 4 Chairs -->
          <rect x="${cx - 15}" y="${cy - 35}" width="30" height="7" rx="2" fill="#78350F"/>
          <rect x="${cx - 15}" y="${cy + 28}" width="30" height="7" rx="2" fill="#78350F"/>
          <rect x="${cx - 35}" y="${cy - 15}" width="7" height="30" rx="2" fill="#78350F"/>
          <rect x="${cx + 28}" y="${cy - 15}" width="7" height="30" rx="2" fill="#78350F"/>
          <!-- Wooden Tabletop Surface -->
          <rect x="${cx - 26}" y="${cy - 26}" width="52" height="52" rx="3" fill="#D97706" stroke="${isHighlighted ? '#F59E0B' : '#92400E'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
          <rect x="${cx - 22}" y="${cy - 22}" width="44" height="44" rx="2" fill="none" stroke="#B45309" stroke-width="1" opacity="0.6"/>
          <!-- Table Title -->
          <text x="${cx}" y="${cy - 9}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="900" fill="#FFFFFF">Tbl ${labelNum}</text>
          <!-- Badge -->
          ${renderBadgeSvg(st, cx, cy + 9)}
        </g>
      `;
    }

    // Helper for Upper Stepped Dining Table
    function renderUpperTable(id, cx, cy, labelNum, isRedBox) {
      const st = stationMap[id] || { id, name: `Table ${labelNum}`, assignment: null };
      const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
      const borderColor = isRedBox ? '#DC2626' : (isHighlighted ? '#F59E0B' : '#92400E');
      const tableFill = isRedBox ? '#B45309' : '#D97706';

      return `
        <!-- Upper Table ${labelNum} (${id}) -->
        <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
          <!-- 4 Chairs -->
          <rect x="${cx - 14}" y="${cy - 33}" width="28" height="6" rx="2" fill="#78350F"/>
          <rect x="${cx - 14}" y="${cy + 27}" width="28" height="6" rx="2" fill="#78350F"/>
          <rect x="${cx - 33}" y="${cy - 14}" width="6" height="28" rx="2" fill="#78350F"/>
          <rect x="${cx + 27}" y="${cy - 14}" width="6" height="28" rx="2" fill="#78350F"/>
          <!-- Table Surface -->
          <rect x="${cx - 25}" y="${cy - 25}" width="50" height="50" rx="3" fill="${tableFill}" stroke="${borderColor}" stroke-width="${isRedBox ? 2.5 : (isHighlighted ? 2.5 : 1.5)}"/>
          <text x="${cx}" y="${cy - 9}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#FFFFFF">Tbl ${labelNum}</text>
          ${renderBadgeSvg(st, cx, cy + 9)}
        </g>
      `;
    }

    // Assemble Master Architectural Floor Plan SVG
    const svgHtml = `
      <svg viewBox="0 0 1020 1260" class="fp-svg-canvas" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Restaurant Architectural Floor Plan Blueprint">
        <defs>
          <!-- Blueprint Grid -->
          <pattern id="bp-tile" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.5"/>
          </pattern>
          <!-- Kitchen Tile -->
          <pattern id="kitchen-tile" width="16" height="16" patternUnits="userSpaceOnUse">
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke="#CBD5E1" stroke-width="0.6"/>
          </pattern>
          <!-- Restroom Tile -->
          <pattern id="restroom-tile" width="12" height="12" patternUnits="userSpaceOnUse">
            <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#CBD5E1" stroke-width="0.5"/>
          </pattern>
          <!-- Butcher Tile -->
          <pattern id="butcher-tile" width="15" height="15" patternUnits="userSpaceOnUse">
            <path d="M 15 0 L 0 0 0 15" fill="none" stroke="#FECDD3" stroke-width="0.5"/>
          </pattern>
        </defs>

        <!-- Floor Background -->
        <rect x="25" y="30" width="970" height="1200" rx="4" fill="#FCFBFA" stroke="#0F172A" stroke-width="4"/>
        <rect x="25" y="30" width="970" height="1200" fill="url(#bp-tile)" opacity="0.65"/>
        <rect x="29" y="34" width="962" height="1192" rx="2" fill="none" stroke="#64748B" stroke-width="1" stroke-dasharray="8 4"/>

        <!-- ================= MASTER ARCHITECTURAL HEADER STRIP ================= -->
        <g id="master-header-strip">
          <rect x="25" y="8" width="970" height="24" fill="#0F172A" rx="3"/>
          <text x="40" y="24" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" fill="#38BDF8" letter-spacing="1.5">RESTAURANT ARCHITECTURAL FLOOR PLAN · MASTER BLUEPRINT</text>
          <text x="980" y="24" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#94A3B8">NORTH ↑</text>
        </g>

        <!-- ================= TOP: BACK ENTRANCE / EXIT ================= -->
        <g id="back-entrance">
          <rect x="515" y="35" width="70" height="48" fill="#FEF2F2" stroke="#EF4444" stroke-width="2"/>
          <!-- Double Exit Doors Swing -->
          <line x1="515" y1="50" x2="540" y2="38" stroke="#DC2626" stroke-width="2.5"/>
          <path d="M 540 38 A 25 25 0 0 1 540 54" fill="none" stroke="#EF4444" stroke-dasharray="2 2"/>
          <line x1="585" y1="50" x2="560" y2="38" stroke="#DC2626" stroke-width="2.5"/>
          <path d="M 560 38 A 25 25 0 0 0 560 54" fill="none" stroke="#EF4444" stroke-dasharray="2 2"/>
          <!-- Egress Arrow & Text -->
          <polygon points="550,37 555,44 545,44" fill="#DC2626"/>
          <text x="550" y="67" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" fill="#DC2626">Back entrance</text>
          <text x="550" y="77" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" fill="#DC2626">exit</text>
        </g>

        <!-- ================= 1. STORE (FAR TOP-LEFT CORNER) ================= -->
        <g id="room-store">
          <!-- Room Perimeter: Spans from outer west wall to corridor wall (x: 25 to 515, y: 35 to 195) -->
          <rect x="25" y="35" width="490" height="160" fill="#F1F5F9" stroke="#334155" stroke-width="3"/>
          <rect x="25" y="35" width="490" height="160" fill="url(#kitchen-tile)" opacity="0.15"/>
          
          <!-- Diagonal architectural watermarked label matching sketch -->
          <text x="270" y="110" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#CBD5E1" letter-spacing="8" opacity="0.55" transform="rotate(-7 270 110)">STORE</text>

          <!-- Main Clear Store Room Title Header -->
          <text x="270" y="68" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#1E293B" letter-spacing="3">STORE</text>
          <text x="270" y="82" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#64748B">CENTRAL DRY STORAGE & INVENTORY SUITE</text>

          <!-- Storage Shelving Units & Logistics Racks -->
          <!-- Rack A: Along top wall -->
          <rect x="40" y="45" width="180" height="20" fill="#E2E8F0" stroke="#94A3B8" stroke-dasharray="3 2" rx="2"/>
          <text x="130" y="58" text-anchor="middle" font-size="7.5" font-weight="800" fill="#475569">RACK A · DRY GOODS & INGREDIENTS</text>

          <!-- Pallets Zone: West wall -->
          <rect x="40" y="90" width="105" height="90" fill="#E2E8F0" stroke="#94A3B8" stroke-dasharray="3 2" rx="2"/>
          <text x="92" y="132" text-anchor="middle" font-size="8" font-weight="800" fill="#64748B">PALLET BAYS</text>
          <text x="92" y="145" text-anchor="middle" font-size="7" font-weight="600" fill="#94A3B8">BULK SACKS & OIL</text>

          <!-- Rack B: East wall near corridor -->
          <rect x="420" y="45" width="80" height="135" fill="#E2E8F0" stroke="#94A3B8" stroke-dasharray="3 2" rx="2"/>
          <text x="460" y="105" text-anchor="middle" font-size="8" font-weight="800" fill="#64748B" transform="rotate(90 460 105)">RACK B · BOXES & PACKAGING</text>

          <!-- Store Door Swing to Corridor -->
          <line x1="515" y1="120" x2="495" y2="105" stroke="#334155" stroke-width="2.5"/>
          <path d="M 495 105 A 20 20 0 0 1 515 135" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>

          <!-- Interactive Station: Store Attendant -->
          ${(() => {
            const st = stationMap['station_store'] || { id: 'station_store', name: 'Store', assignment: null };
            const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
                <rect x="200" y="115" width="140" height="46" rx="3" fill="#FFFFFF" stroke="${isHigh ? '#F59E0B' : '#94A3B8'}" stroke-width="${isHigh ? 2.5 : 1.5}"/>
                <text x="270" y="132" text-anchor="middle" font-size="9.5" font-weight="900" fill="#1E293B">STORE KEEPER</text>
                ${renderBadgeSvg(st, 270, 148)}
              </g>
            `;
          })()}
        </g>

        <!-- ================= 2. CHIPS CHICKEN SAUSAGE CHEF DISPLAY ZONE ================= -->
        <g id="room-chef-display">
          <!-- Room Perimeter: Directly underneath Store (x: 25 to 515, y: 195 to 330) -->
          <rect x="25" y="195" width="490" height="135" fill="#FFFBEB" stroke="#B45309" stroke-width="3"/>
          <text x="270" y="218" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12.5" font-weight="900" fill="#92400E" letter-spacing="1.5">CHIPS CHICKEN SAUSAGE</text>
          <text x="270" y="233" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="800" fill="#B45309">CHEF DISPLAY ZONE</text>
          
          <!-- Hot Warmer Glass Case & Commercial Deep Fryers -->
          <rect x="40" y="248" width="180" height="42" fill="#FEF3C7" stroke="#D97706" stroke-width="1.5" rx="2"/>
          <text x="130" y="267" text-anchor="middle" font-size="8.5" font-weight="800" fill="#92400E">HOT FOOD DISPLAY WARMER</text>
          <circle cx="70" cy="278" r="4" fill="#F59E0B"/>
          <circle cx="100" cy="278" r="4" fill="#F59E0B"/>
          <circle cx="130" cy="278" r="4" fill="#F59E0B"/>
          <circle cx="160" cy="278" r="4" fill="#F59E0B"/>
          <circle cx="190" cy="278" r="4" fill="#F59E0B"/>
          
          <!-- Fryer Battery -->
          <rect x="40" y="295" width="110" height="28" fill="#334155" rx="2"/>
          <text x="95" y="313" text-anchor="middle" font-size="7.5" font-weight="800" fill="#F1F5F9">COMMERCIAL DEEP FRYERS</text>

          <!-- Interactive Station: Chips Chicken Sausage Attendant -->
          ${(() => {
            const st = stationMap['station_chips_chicken'] || { id: 'station_chips_chicken', name: 'Chips Chicken Sausage', assignment: null };
            const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
                <rect x="270" y="250" width="200" height="48" rx="3" fill="#FFFFFF" stroke="${isHigh ? '#F59E0B' : '#D97706'}" stroke-width="${isHigh ? 2.5 : 1.5}"/>
                <text x="370" y="270" text-anchor="middle" font-size="9" font-weight="900" fill="#B45309">DISPLAY ZONE ATTENDANT</text>
                ${renderBadgeSvg(st, 370, 287)}
              </g>
            `;
          })()}
        </g>

        <!-- ================= 3. JIKO (MAIN COOKING KITCHEN) ================= -->
        <g id="room-jiko">
          <!-- Room Perimeter: Below Display Zone, right of Samosa/Chef (x: 180 to 515, y: 330 to 480) -->
          <rect x="180" y="330" width="335" height="150" fill="#F8FAFC" stroke="#334155" stroke-width="3"/>
          <rect x="180" y="330" width="335" height="150" fill="url(#kitchen-tile)" opacity="0.3"/>
          <text x="270" y="358" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="900" fill="#1E293B" letter-spacing="3">JIKO</text>
          <text x="270" y="373" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="800" fill="#64748B">MAIN COOKING CORE</text>
          
          <!-- Commercial Range (6 Burners) -->
          <rect x="195" y="388" width="75" height="45" fill="#1E293B" rx="2"/>
          <circle cx="209" cy="400" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <circle cx="232" cy="400" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <circle cx="255" cy="400" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <circle cx="209" cy="420" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <circle cx="232" cy="420" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <circle cx="255" cy="420" r="4.5" fill="#475569" stroke="#94A3B8"/>
          <text x="232" y="428" text-anchor="middle" font-size="7" font-weight="800" fill="#94A3B8">HEAVY RANGE</text>

          <!-- Stainless Prep Island -->
          <rect x="290" y="388" width="85" height="45" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5" rx="2"/>
          <text x="332" y="408" text-anchor="middle" font-size="8" font-weight="800" fill="#475569">CHEF PREP</text>
          <text x="332" y="421" text-anchor="middle" font-size="7" font-weight="700" fill="#64748B">ISLAND</text>

          <!-- Double Kitchen Sink -->
          <rect x="445" y="345" width="60" height="35" fill="#CBD5E1" stroke="#475569" stroke-width="1.5"/>
          <line x1="475" y1="345" x2="475" y2="380" stroke="#475569" stroke-width="1.5"/>
          <text x="475" y="390" text-anchor="middle" font-size="7" font-weight="700" fill="#64748B">WASH SINK</text>

          <!-- Interactive Station: Jiko Cook -->
          ${(() => {
            const st = stationMap['station_jiko'] || { id: 'station_jiko', name: 'Jiko', assignment: null };
            const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
                <rect x="395" y="395" width="110" height="42" rx="3" fill="#FFFFFF" stroke="${isHigh ? '#F59E0B' : '#334155'}" stroke-width="${isHigh ? 2.5 : 1.5}"/>
                <text x="450" y="411" text-anchor="middle" font-size="9" font-weight="900" fill="#0F172A">JIKO HEAD CHEF</text>
                ${renderBadgeSvg(st, 450, 427)}
              </g>
            `;
          })()}
        </g>

        <!-- ================= 4. KITCHEN ORDERS PASS & KITCHEN ENTRANCE ================= -->
        <!-- Kitchen Orders Counter -->
        ${(() => {
          const st = stationMap['station_kitchen_orders'] || { id: 'station_kitchen_orders', name: 'Kitchen Orders', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="pass-kitchen-orders">
              <rect x="180" y="480" width="285" height="50" fill="#FEF3C7" stroke="#B45309" stroke-width="3"/>
              <text x="270" y="502" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#92400E" letter-spacing="1">Kitchen Orders</text>
              <text x="270" y="516" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#B45309">DISPATCH PASS-THROUGH</text>
              ${renderBadgeSvg(st, 395, 505)}
            </g>
          `;
        })()}

        <!-- Kitchen Entrance Doorway -->
        <g id="door-kitchen-entrance">
          <rect x="465" y="480" width="50" height="50" fill="#F8FAFC" stroke="#334155" stroke-width="2"/>
          <line x1="465" y1="505" x2="485" y2="488" stroke="#0F172A" stroke-width="2.5"/>
          <path d="M 485 488 A 20 20 0 0 1 485 513" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>
          <line x1="515" y1="505" x2="495" y2="522" stroke="#0F172A" stroke-width="2.5"/>
          <path d="M 495 522 A 20 20 0 0 1 495 497" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>
          <text x="490" y="534" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="900" fill="#0F172A">Kitchen</text>
          <text x="490" y="543" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="900" fill="#0F172A">Entrance</text>
        </g>

        <!-- ================= 5. CENTRAL SERVICE COLUMN (NYAMA COOK, STOCK, CHANGING ROOM, DISHES) ================= -->
        <!-- Nyama Cook Station -->
        ${(() => {
          const st = stationMap['station_nyama_cook'] || { id: 'station_nyama_cook', name: 'Nyama Cook', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-nyama-cook">
              <rect x="515" y="83" width="55" height="170" fill="#FEF2F2" stroke="#DC2626" stroke-width="2.5"/>
              <!-- Charcoal Grill -->
              <rect x="522" y="93" width="41" height="40" fill="#1E293B" rx="2"/>
              <line x1="525" y1="101" x2="560" y2="101" stroke="#EF4444" stroke-width="1.5"/>
              <line x1="525" y1="111" x2="560" y2="111" stroke="#EF4444" stroke-width="1.5"/>
              <line x1="525" y1="121" x2="560" y2="121" stroke="#EF4444" stroke-width="1.5"/>
              <text x="542" y="148" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#DC2626">Nyama</text>
              <text x="542" y="160" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#DC2626">cook</text>
              ${renderBadgeSvg(st, 542, 198)}
            </g>
          `;
        })()}

        <!-- Stock Guy -->
        ${(() => {
          const st = stationMap['station_stock_guy'] || { id: 'station_stock_guy', name: 'Stock Guy', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-stock-guy">
              <rect x="570" y="83" width="60" height="75" fill="#F8FAFC" stroke="#334155" stroke-width="2"/>
              <text x="600" y="103" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#334155">Stock guy</text>
              ${renderBadgeSvg(st, 600, 129)}
            </g>
          `;
        })()}

        <!-- Waiters, Cashier & Minishop Changing Room -->
        <g id="room-changing">
          <rect x="570" y="158" width="60" height="172" fill="#F1F5F9" stroke="#64748B" stroke-width="2"/>
          <text x="600" y="180" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="800" fill="#475569">Waiters,</text>
          <text x="600" y="193" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="800" fill="#475569">cashier</text>
          <text x="600" y="206" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="800" fill="#475569">& minishop</text>
          <text x="600" y="222" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#1E293B">changing</text>
          <text x="600" y="235" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#1E293B">room</text>
          <!-- Locker icons -->
          <rect x="575" y="255" width="50" height="65" fill="#E2E8F0" stroke="#94A3B8" stroke-dasharray="2 2"/>
          <text x="600" y="292" text-anchor="middle" font-size="7" font-weight="700" fill="#64748B">LOCKERS</text>
        </g>

        <!-- Dishes / Scullery Area -->
        ${(() => {
          const st = stationMap['station_dishes'] || { id: 'station_dishes', name: 'Dishes', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-dishes">
              <rect x="515" y="330" width="115" height="150" fill="#F0FDF4" stroke="#16A34A" stroke-width="2.5"/>
              <text x="572" y="358" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#15803D" letter-spacing="2">Dishes</text>
              <text x="572" y="375" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#16A34A">SCULLERY & WASH-UP</text>
              <!-- Triple Sink -->
              <rect x="525" y="390" width="95" height="32" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.5"/>
              <line x1="556" y1="390" x2="556" y2="422" stroke="#16A34A" stroke-width="1"/>
              <line x1="588" y1="390" x2="588" y2="422" stroke="#16A34A" stroke-width="1"/>
              <text x="572" y="410" text-anchor="middle" font-size="7" font-weight="700" fill="#15803D">TRIPLE SINK</text>
              ${renderBadgeSvg(st, 572, 450)}
            </g>
          `;
        })()}

        <!-- ================= 6. LADIES WASHROOM (UPPER RIGHT) ================= -->
        <g id="room-washroom">
          <rect x="630" y="35" width="225" height="255" fill="#FDF2F8" stroke="#DB2777" stroke-width="3"/>
          <rect x="630" y="35" width="225" height="255" fill="url(#restroom-tile)" opacity="0.3"/>
          <!-- Title text (rendered clearly right-side up for easy reading) -->
          <text x="742" y="65" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#9D174D" letter-spacing="1">Ladies</text>
          <text x="742" y="81" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#9D174D" letter-spacing="1">washroom</text>
          <!-- Restroom Stalls -->
          <rect x="710" y="100" width="65" height="70" fill="#FCE7F3" stroke="#F472B6" stroke-width="1.5"/>
          <circle cx="742" cy="135" r="12" fill="#FFFFFF" stroke="#DB2777" stroke-width="1.5"/>
          <text x="742" y="139" text-anchor="middle" font-size="8" font-weight="900" fill="#DB2777">WC 1</text>
          <rect x="780" y="100" width="65" height="70" fill="#FCE7F3" stroke="#F472B6" stroke-width="1.5"/>
          <circle cx="812" cy="135" r="12" fill="#FFFFFF" stroke="#DB2777" stroke-width="1.5"/>
          <text x="812" y="139" text-anchor="middle" font-size="8" font-weight="900" fill="#DB2777">WC 2</text>
          <!-- Vanity Basins -->
          <rect x="645" y="105" width="50" height="70" fill="#FCE7F3" stroke="#F472B6" stroke-width="1.5"/>
          <ellipse cx="670" cy="125" rx="14" ry="10" fill="#FFFFFF" stroke="#DB2777"/>
          <ellipse cx="670" cy="157" rx="14" ry="10" fill="#FFFFFF" stroke="#DB2777"/>
          <text x="670" y="173" text-anchor="middle" font-size="6.5" font-weight="700" fill="#9D174D">SINKS</text>
          <!-- Entry Doorway marked with brackets and swing arc -->
          <g id="washroom-entry">
            <rect x="630" y="245" width="60" height="45" fill="#FDF2F8"/>
            <line x1="630" y1="265" x2="655" y2="250" stroke="#DB2777" stroke-width="2.5"/>
            <path d="M 655 250 A 25 25 0 0 1 655 275" fill="none" stroke="#F472B6" stroke-dasharray="2 2"/>
            <text x="660" y="280" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#BE185D">[ entry ]</text>
          </g>
        </g>

        <!-- ================= 7. UPPER ELEVATED / STEPPED DINING TABLES ================= -->
        <g id="upper-tiered-tables">
          <!-- Stepped Zone Background Outline -->
          <path d="M 480 535 L 855 535 L 855 470 L 785 470 L 785 400 L 785 330 L 630 330 L 630 400 L 555 400 L 480 470 Z" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1" stroke-dasharray="4 2"/>
          
          <text x="670" y="324" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="800" fill="#64748B" letter-spacing="1">ELEVATED DINING SECTION (TIERS 1 - 3)</text>

          <!-- TIER 3 (TOP STEP - RED PEN OUTLINE FROM SKETCH) -->
          <rect x="625" y="330" width="150" height="66" fill="#FEF2F2" stroke="#DC2626" stroke-width="2.5" rx="2"/>
          <text x="700" y="342" text-anchor="middle" font-size="8" font-weight="900" fill="#DC2626">TIER 3 (TOP PLATFORM)</text>
          ${renderUpperTable('table_45', 665, 365, 45, true)}
          ${renderUpperTable('table_46', 740, 365, 46, true)}

          <!-- TIER 2 (MIDDLE STEP - 3 TABLES) -->
          <rect x="555" y="400" width="225" height="66" fill="#F8FAFC" stroke="#64748B" stroke-width="1.5" rx="2"/>
          <text x="560" y="412" font-size="7.5" font-weight="800" fill="#64748B">TIER 2</text>
          ${renderUpperTable('table_42', 590, 435, 42, false)}
          ${renderUpperTable('table_43', 665, 435, 43, false)}
          ${renderUpperTable('table_44', 740, 435, 44, false)}

          <!-- TIER 1 (BASE ROW - 5 TABLES HORIZONTAL) -->
          <rect x="480" y="470" width="375" height="65" fill="#F8FAFC" stroke="#64748B" stroke-width="1.5" rx="2"/>
          <text x="485" y="482" font-size="7.5" font-weight="800" fill="#64748B">TIER 1</text>
          ${renderUpperTable('table_37', 515, 505, 37, false)}
          ${renderUpperTable('table_38', 590, 505, 38, false)}
          ${renderUpperTable('table_39', 665, 505, 39, false)}
          ${renderUpperTable('table_40', 740, 505, 40, false)}
          ${renderUpperTable('table_41', 815, 505, 41, false)}
        </g>

        <!-- ================= 8. LEFT SERVICE STRIP (VERTICAL ALONG WEST WALL) ================= -->
        <!-- Wall separating left strip from dining / corridor -->
        <line x1="180" y1="330" x2="180" y2="1230" stroke="#0F172A" stroke-width="3"/>

        <!-- A. Samosa & Kababs Maker (Located directly below Chips Display Zone) -->
        ${(() => {
          const st = stationMap['station_samosa'] || { id: 'station_samosa', name: 'Samosa & Kababs Maker', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-samosa">
              <rect x="25" y="330" width="155" height="110" fill="#FFF7ED" stroke="#EA580C" stroke-width="2.5"/>
              <!-- 3 Sub Compartments -->
              <rect x="30" y="336" width="145" height="28" fill="#FFEDD5" stroke="#F97316"/>
              <text x="102" y="354" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#9A3412">Samosa</text>
              <rect x="30" y="366" width="145" height="28" fill="#FFEDD5" stroke="#F97316"/>
              <text x="102" y="384" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#9A3412">Kababs</text>
              <rect x="30" y="396" width="145" height="38" fill="#FFEDD5" stroke="#F97316"/>
              <text x="102" y="411" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#9A3412">Maker</text>
              ${renderBadgeSvg(st, 102, 423)}
            </g>
          `;
        })()}

        <!-- B. Chef Station -->
        ${(() => {
          const st = stationMap['station_chef_prep'] || { id: 'station_chef_prep', name: 'Chef Station', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-chef-prep">
              <rect x="25" y="440" width="155" height="110" fill="#F8FAFC" stroke="#475569" stroke-width="2.5"/>
              <text x="102" y="470" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#1E293B" letter-spacing="1">Chef</text>
              <text x="102" y="485" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#64748B">PREP STATION</text>
              <!-- Cutting board & knife -->
              <rect x="45" y="495" width="115" height="16" fill="#E2E8F0" stroke="#94A3B8" rx="2"/>
              ${renderBadgeSvg(st, 102, 532)}
            </g>
          `;
        })()}

        <!-- C. Barista Counter -->
        ${(() => {
          const st = stationMap['station_barista'] || { id: 'station_barista', name: 'Barista', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-barista">
              <rect x="25" y="550" width="155" height="130" fill="#FEFCE8" stroke="#CA8A04" stroke-width="2.5"/>
              <text x="102" y="582" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#854D0E" letter-spacing="1">Barista</text>
              <text x="102" y="597" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#A16207">ESPRESSO & DRINKS</text>
              <!-- Espresso machine -->
              <rect x="45" y="605" width="115" height="26" fill="#1E293B" rx="2"/>
              <circle cx="75" cy="618" r="5" fill="#E2E8F0"/>
              <circle cx="102" cy="618" r="5" fill="#E2E8F0"/>
              <circle cx="129" cy="618" r="5" fill="#E2E8F0"/>
              ${renderBadgeSvg(st, 102, 656)}
            </g>
          `;
        })()}

        <!-- D. Kitchen Butchery -->
        ${(() => {
          const st = stationMap['station_kitchen_butchery'] || { id: 'station_kitchen_butchery', name: 'Kitchen Butchery', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-kitchen-butchery">
              <rect x="25" y="680" width="155" height="140" fill="#FFF1F2" stroke="#E11D48" stroke-width="2.5"/>
              <text x="102" y="712" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#BE123C">Kitchen</text>
              <text x="102" y="728" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#BE123C">Butchery</text>
              <text x="102" y="742" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#E11D48">MEAT PREPARATION</text>
              <!-- Butcher block -->
              <rect x="50" y="752" width="105" height="26" fill="#FDE047" stroke="#CA8A04" rx="2"/>
              <text x="102" y="769" text-anchor="middle" font-size="7.5" font-weight="800" fill="#713F12">BUTCHER BLOCK</text>
              ${renderBadgeSvg(st, 102, 802)}
            </g>
          `;
        })()}

        <!-- E. Cashier Station (Always 2 Staff: Cashier 1 & Cashier 2) -->
        <g id="room-cashier-suite">
          <rect x="25" y="820" width="155" height="140" fill="#EFF6FF" stroke="#2563EB" stroke-width="2.5"/>
          <text x="102" y="840" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#1E40AF" letter-spacing="1">Cashier (2)</text>
          <text x="102" y="853" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="700" fill="#3B82F6">DUAL POS TILLS</text>

          <!-- Cashier 1 (Till 1) -->
          ${(() => {
            const st1 = stationMap['station_cashier'] || { id: 'station_cashier', name: 'Cashier 1', assignment: null };
            const isHigh1 = highlightedStaffId && st1.assignment && st1.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh1 ? 'highlighted' : ''}" data-station-id="${st1.id}" style="cursor: pointer;" id="station-cashier">
                <rect x="35" y="860" width="135" height="42" rx="4" fill="#FFFFFF" stroke="${isHigh1 ? '#F59E0B' : '#93C5FD'}" stroke-width="${isHigh1 ? 2.5 : 1.5}"/>
                <rect x="42" y="868" width="28" height="26" rx="2" fill="#1E293B"/>
                <rect x="46" y="872" width="20" height="12" rx="1" fill="#38BDF8"/>
                <text x="42" y="884" font-size="0"></text>
                <text x="74" y="885" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#1E40AF">TILL 1</text>
                ${renderBadgeSvg(st1, 126, 881)}
              </g>
            `;
          })()}

          <!-- Cashier 2 (Till 2) -->
          ${(() => {
            const st2 = stationMap['station_cashier_2'] || { id: 'station_cashier_2', name: 'Cashier 2', assignment: null };
            const isHigh2 = highlightedStaffId && st2.assignment && st2.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh2 ? 'highlighted' : ''}" data-station-id="${st2.id}" style="cursor: pointer;" id="station-cashier-2">
                <rect x="35" y="908" width="135" height="42" rx="4" fill="#FFFFFF" stroke="${isHigh2 ? '#F59E0B' : '#93C5FD'}" stroke-width="${isHigh2 ? 2.5 : 1.5}"/>
                <rect x="42" y="916" width="28" height="26" rx="2" fill="#1E293B"/>
                <rect x="46" y="920" width="20" height="12" rx="1" fill="#38BDF8"/>
                <text x="74" y="933" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#1E40AF">TILL 2</text>
                ${renderBadgeSvg(st2, 126, 929)}
              </g>
            `;
          })()}
        </g>

        <!-- F. Main Office -->
        ${(() => {
          const st = stationMap['station_main_office'] || { id: 'station_main_office', name: 'Main Office', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-main-office">
              <rect x="25" y="960" width="155" height="270" fill="#F8FAFC" stroke="#0F172A" stroke-width="3"/>
              <text x="102" y="995" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#0F172A" letter-spacing="1">Main office</text>
              <text x="102" y="1010" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#64748B">MANAGEMENT SUITE</text>
              <!-- Executive Desk -->
              <rect x="40" y="1025" width="125" height="60" fill="#78350F" stroke="#451A03" stroke-width="2" rx="3"/>
              <rect x="75" y="1035" width="55" height="30" fill="#0F172A" rx="2"/>
              <text x="102" y="1054" text-anchor="middle" font-size="8" font-weight="800" fill="#F8FAFC">DESK</text>
              <!-- Office Chair -->
              <circle cx="102" cy="1110" r="14" fill="#334155" stroke="#1E293B"/>
              <!-- Office Door Swing -->
              <line x1="180" y1="975" x2="155" y2="960" stroke="#0F172A" stroke-width="2.5"/>
              <path d="M 155 960 A 25 25 0 0 1 180 985" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>
              ${renderBadgeSvg(st, 102, 1155)}
            </g>
          `;
        })()}

        <!-- ================= 9. MAIN DINING HALL (LEFT 3x6 GRID = 18 TABLES) ================= -->
        <g id="dining-left-grid">
          <text x="365" y="580" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" fill="#475569" letter-spacing="1">MAIN DINING (LEFT SECTION · 18 TABLES)</text>

          <!-- Row 1: Tables 1, 2, 3 -->
          ${renderDiningTable('table_1', 265, 625, 1)}
          ${renderDiningTable('table_2', 365, 625, 2)}
          ${renderDiningTable('table_3', 465, 625, 3)}

          <!-- Row 2: Tables 4, 5, 6 -->
          ${renderDiningTable('table_4', 265, 725, 4)}
          ${renderDiningTable('table_5', 365, 725, 5)}
          ${renderDiningTable('table_6', 465, 725, 6)}

          <!-- Row 3: Tables 7, 8, 9 -->
          ${renderDiningTable('table_7', 265, 825, 7)}
          ${renderDiningTable('table_8', 365, 825, 8)}
          ${renderDiningTable('table_9', 465, 825, 9)}

          <!-- Row 4: Tables 10, 11, 12 -->
          ${renderDiningTable('table_10', 265, 925, 10)}
          ${renderDiningTable('table_11', 365, 925, 11)}
          ${renderDiningTable('table_12', 465, 925, 12)}

          <!-- Row 5: Tables 13, 14, 15 -->
          ${renderDiningTable('table_13', 265, 1025, 13)}
          ${renderDiningTable('table_14', 365, 1025, 14)}
          ${renderDiningTable('table_15', 465, 1025, 15)}

          <!-- Row 6: Tables 16, 17, 18 -->
          ${renderDiningTable('table_16', 265, 1125, 16)}
          ${renderDiningTable('table_17', 365, 1125, 17)}
          ${renderDiningTable('table_18', 465, 1125, 18)}
        </g>

        <!-- ================= 10. CENTRAL RUNWAY / PROMENADE ================= -->
        <g id="central-runway">
          <line x1="510" y1="565" x2="510" y2="1200" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 4"/>
          <line x1="550" y1="565" x2="550" y2="1200" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="6 4"/>
          <text x="530" y="880" text-anchor="middle" transform="rotate(-90 530 880)" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="800" fill="#94A3B8" letter-spacing="2">CENTRAL SERVICE RUNWAY</text>
        </g>

        <!-- ================= 11. MAIN DINING HALL (RIGHT 3x6 GRID = 18 TABLES) ================= -->
        <g id="dining-right-grid">
          <text x="705" y="580" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10.5" font-weight="900" fill="#475569" letter-spacing="1">MAIN DINING (RIGHT SECTION · 18 TABLES)</text>

          <!-- Row 1: Tables 19, 20, 21 -->
          ${renderDiningTable('table_19', 605, 625, 19)}
          ${renderDiningTable('table_20', 705, 625, 20)}
          ${renderDiningTable('table_21', 805, 625, 21)}

          <!-- Row 2: Tables 22, 23, 24 -->
          ${renderDiningTable('table_22', 605, 725, 22)}
          ${renderDiningTable('table_23', 705, 725, 23)}
          ${renderDiningTable('table_24', 805, 725, 24)}

          <!-- Row 3: Tables 25, 26, 27 -->
          ${renderDiningTable('table_25', 605, 825, 25)}
          ${renderDiningTable('table_26', 705, 825, 26)}
          ${renderDiningTable('table_27', 805, 825, 27)}

          <!-- Row 4: Tables 28, 29, 30 -->
          ${renderDiningTable('table_28', 605, 925, 28)}
          ${renderDiningTable('table_29', 705, 925, 29)}
          ${renderDiningTable('table_30', 805, 925, 30)}

          <!-- Row 5: Tables 31, 32, 33 -->
          ${renderDiningTable('table_31', 605, 1025, 31)}
          ${renderDiningTable('table_32', 705, 1025, 32)}
          ${renderDiningTable('table_33', 805, 1025, 33)}

          <!-- Row 6: Tables 34, 35, 36 -->
          ${renderDiningTable('table_34', 605, 1125, 34)}
          ${renderDiningTable('table_35', 705, 1125, 35)}
          ${renderDiningTable('table_36', 805, 1125, 36)}
        </g>

        <!-- ================= 12. EAST RETAIL & ENTRY WING ================= -->
        <!-- Elevated Promenade / East Walkway Corridor connecting Restrooms & Dining -->
        <g id="east-walkway-corridor">
          <rect x="855" y="290" width="140" height="170" fill="#F8FAFC" stroke="#CBD5E1" stroke-dasharray="3 3"/>
          <line x1="855" y1="290" x2="855" y2="460" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4 2"/>
          <text x="925" y="375" text-anchor="middle" transform="rotate(-90 925 375)" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="800" fill="#94A3B8" letter-spacing="2">NORTH-EAST SERVICE WALKWAY</text>
        </g>

        <!-- A. MAIN RESTAURANT ENTRANCE (DIRECTLY ABOVE MINI SHOP ON EAST WALL) -->
        <g id="main-front-entrance">
          <!-- Entrance Vestibule / Foyer -->
          <rect x="855" y="460" width="140" height="105" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="4 2"/>
          <rect x="870" y="472" width="115" height="82" rx="4" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.5"/>

          <!-- East Exterior Wall Portal Break -->
          <rect x="990" y="475" width="10" height="80" fill="#FCFBFA"/>
          <line x1="995" y1="460" x2="995" y2="475" stroke="#0F172A" stroke-width="4"/>
          <line x1="995" y1="555" x2="995" y2="565" stroke="#0F172A" stroke-width="4"/>

          <!-- Double Glass Swing Doors (Swinging inward from East Wall) -->
          <!-- Top Door Leaf & Arc -->
          <line x1="995" y1="485" x2="962" y2="508" stroke="#0F172A" stroke-width="3"/>
          <path d="M 962 508 A 40 40 0 0 1 995 522" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>

          <!-- Bottom Door Leaf & Arc -->
          <line x1="995" y1="545" x2="962" y2="522" stroke="#0F172A" stroke-width="3"/>
          <path d="M 962 522 A 40 40 0 0 0 995 508" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>

          <!-- Directional Inward Entry Arrows -->
          <polygon points="948,513 956,508 956,518" fill="#1D4ED8"/>
          <line x1="956" y1="513" x2="978" y2="513" stroke="#1D4ED8" stroke-width="2.5" stroke-linecap="round"/>

          <!-- Architectural Typography -->
          <text x="912" y="498" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="900" fill="#0F172A" letter-spacing="0.8">MAIN RESTAURANT</text>
          <text x="912" y="513" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="900" fill="#1D4ED8" letter-spacing="1.5">ENTRANCE</text>
          <text x="912" y="528" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7" font-weight="800" fill="#64748B" letter-spacing="0.5">PRIMARY GUEST ENTRY</text>
          <text x="912" y="542" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="800" fill="#3B82F6">◄ STEP INSIDE</text>

          <!-- Threshold Line into Dining Hall -->
          <line x1="855" y1="460" x2="855" y2="565" stroke="#3B82F6" stroke-width="2" stroke-dasharray="4 3"/>
        </g>

        <!-- Wall separating dining room from right retail wing -->
        <line x1="855" y1="565" x2="855" y2="1225" stroke="#0F172A" stroke-width="3"/>

        <!-- B. Mini Shop (Always 2 Staff: Attendant 1 & Attendant 2) -->
        <g id="room-minishop-suite">
          <rect x="855" y="565" width="140" height="195" fill="#EFF6FF" stroke="#3B82F6" stroke-width="2.5"/>
          <text x="925" y="588" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="14" font-weight="900" fill="#1D4ED8">Mini shop (2)</text>
          <text x="925" y="602" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="7.5" font-weight="700" fill="#3B82F6">FRONT SHOP · 2 ATTENDANTS</text>

          <!-- Retail Shelves -->
          <rect x="865" y="612" width="120" height="16" fill="#DBEAFE" stroke="#93C5FD"/>
          <text x="925" y="623" text-anchor="middle" font-size="7" font-weight="700" fill="#1E40AF">RETAIL SHELF & SNACKS</text>
          <rect x="865" y="632" width="120" height="16" fill="#DBEAFE" stroke="#93C5FD"/>
          <text x="925" y="643" text-anchor="middle" font-size="7" font-weight="700" fill="#1E40AF">DRINKS COOLER</text>

          <!-- Attendant 1 -->
          ${(() => {
            const st1 = stationMap['station_minishop'] || { id: 'station_minishop', name: 'Mini Shop 1', assignment: null };
            const isHigh1 = highlightedStaffId && st1.assignment && st1.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh1 ? 'highlighted' : ''}" data-station-id="${st1.id}" style="cursor: pointer;" id="station-minishop">
                <rect x="865" y="655" width="120" height="44" rx="4" fill="#FFFFFF" stroke="${isHigh1 ? '#F59E0B' : '#93C5FD'}" stroke-width="${isHigh1 ? 2.5 : 1.5}"/>
                <text x="925" y="669" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" fill="#1D4ED8">ATTENDANT 1</text>
                ${renderBadgeSvg(st1, 925, 686)}
              </g>
            `;
          })()}

          <!-- Attendant 2 -->
          ${(() => {
            const st2 = stationMap['station_minishop_2'] || { id: 'station_minishop_2', name: 'Mini Shop 2', assignment: null };
            const isHigh2 = highlightedStaffId && st2.assignment && st2.assignment.staff_id === highlightedStaffId;
            return `
              <g class="fp-station ${isHigh2 ? 'highlighted' : ''}" data-station-id="${st2.id}" style="cursor: pointer;" id="station-minishop-2">
                <rect x="865" y="705" width="120" height="44" rx="4" fill="#FFFFFF" stroke="${isHigh2 ? '#F59E0B' : '#93C5FD'}" stroke-width="${isHigh2 ? 2.5 : 1.5}"/>
                <text x="925" y="719" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" fill="#1D4ED8">ATTENDANT 2</text>
                ${renderBadgeSvg(st2, 925, 736)}
              </g>
            `;
          })()}
        </g>

        <!-- C. Butchery Entrance -->
        <g id="door-butchery-entrance">
          <rect x="855" y="760" width="140" height="70" fill="#FFF1F2" stroke="#FDA4AF" stroke-width="1.5"/>
          <line x1="855" y1="795" x2="880" y2="780" stroke="#E11D48" stroke-width="2.5"/>
          <path d="M 880 780 A 25 25 0 0 1 880 805" fill="none" stroke="#FDA4AF" stroke-dasharray="2 2"/>
          <text x="925" y="792" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#BE123C">Butchery</text>
          <text x="925" y="805" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#BE123C">Entrance</text>
        </g>

        <!-- D. Butchery (Retail Meat Counter) -->
        ${(() => {
          const st = stationMap['station_butchery'] || { id: 'station_butchery', name: 'Butchery', assignment: null };
          const isHigh = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHigh ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;" id="station-butchery">
              <rect x="855" y="830" width="140" height="395" fill="#FFF1F2" stroke="#E11D48" stroke-width="3"/>
              <rect x="855" y="830" width="140" height="395" fill="url(#butcher-tile)" opacity="0.35"/>
              <text x="925" y="875" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="900" fill="#BE123C" letter-spacing="1">Butchery</text>
              <text x="925" y="895" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#E11D48">RETAIL MEAT COUNTER</text>
              <!-- Meat Display Chiller Case -->
              <rect x="865" y="915" width="120" height="85" fill="#FFE4E6" stroke="#FB7185" stroke-width="2" rx="3"/>
              <text x="925" y="955" text-anchor="middle" font-size="8" font-weight="900" fill="#9F1239">MEAT DISPLAY</text>
              <text x="925" y="968" text-anchor="middle" font-size="7.5" font-weight="700" fill="#BE123C">CHILLER CASE</text>
              <!-- Butcher Chopping Block -->
              <rect x="880" y="1025" width="90" height="40" fill="#78350F" stroke="#451A03" rx="2"/>
              <text x="925" y="1048" text-anchor="middle" font-size="7.5" font-weight="800" fill="#FEF3C7">CHOPPING BLOCK</text>
              ${renderBadgeSvg(st, 925, 1120)}
            </g>
          `;
        })()}
      </svg>
    `;

    container.innerHTML = svgHtml;

    // Attach click and hover handlers to all stations
    container.querySelectorAll('.fp-station').forEach(el => {
      const stationId = el.getAttribute('data-station-id');
      const sec = getSectionForTable(stationId);

      // Row hover illumination
      el.addEventListener('mouseenter', () => {
        if (sec && sec.tables) {
          sec.tables.forEach(tid => {
            const rowEl = container.querySelector(`.fp-station[data-station-id="${tid}"]`);
            if (rowEl) rowEl.classList.add('row-hover');
          });
        }
      });

      el.addEventListener('mouseleave', () => {
        container.querySelectorAll('.fp-station.row-hover').forEach(h => h.classList.remove('row-hover'));
      });

      // Click to open Fast Waiter Selection
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (stationId) {
          openTableAssignModal(stationId);
        }
      });
    });

    // Reapply active zoom & section filter
    if (window.currentZoomLevel && window.currentZoomLevel !== 1) {
      const svg = container.querySelector('.fp-svg-canvas');
      if (svg) svg.style.transform = `scale(${window.currentZoomLevel})`;
    }
    if (window.currentSectionFilter && window.currentSectionFilter !== 'all') {
      applySectionFilter(window.currentSectionFilter);
    }
  }

  // =========================================================================
  // TABLE ROW / ZONE DEFINITIONS (COLUMNS & UPPER TIER E-SECTION)
  // =========================================================================
  const TABLE_ROW_SECTIONS = {
    // Left Dining Grid (1-18)
    'left_line_1': {
      id: 'left_line_1',
      name: 'Row 1 (Tables 1, 4, 7, 10, 13, 16)',
      shortName: 'Row 1',
      tables: ['table_1', 'table_4', 'table_7', 'table_10', 'table_13', 'table_16'],
      label: 'Tables 1, 4, 7, 10, 13, 16'
    },
    'left_line_2': {
      id: 'left_line_2',
      name: 'Row 2 (Tables 2, 5, 8, 11, 14, 17)',
      shortName: 'Row 2',
      tables: ['table_2', 'table_5', 'table_8', 'table_11', 'table_14', 'table_17'],
      label: 'Tables 2, 5, 8, 11, 14, 17'
    },
    'left_line_3': {
      id: 'left_line_3',
      name: 'Row 3 (Tables 3, 6, 9, 12, 15, 18)',
      shortName: 'Row 3',
      tables: ['table_3', 'table_6', 'table_9', 'table_12', 'table_15', 'table_18'],
      label: 'Tables 3, 6, 9, 12, 15, 18'
    },

    // Right Dining Grid (19-36)
    'right_line_1': {
      id: 'right_line_1',
      name: 'Row 4 (Tables 19, 22, 25, 28, 31, 34)',
      shortName: 'Row 4',
      tables: ['table_19', 'table_22', 'table_25', 'table_28', 'table_31', 'table_34'],
      label: 'Tables 19, 22, 25, 28, 31, 34'
    },
    'right_line_2': {
      id: 'right_line_2',
      name: 'Row 5 (Tables 20, 23, 26, 29, 32, 35)',
      shortName: 'Row 5',
      tables: ['table_20', 'table_23', 'table_26', 'table_29', 'table_32', 'table_35'],
      label: 'Tables 20, 23, 26, 29, 32, 35'
    },
    'right_line_3': {
      id: 'right_line_3',
      name: 'Row 6 (Tables 21, 24, 27, 30, 33, 36)',
      shortName: 'Row 6',
      tables: ['table_21', 'table_24', 'table_27', 'table_30', 'table_33', 'table_36'],
      label: 'Tables 21, 24, 27, 30, 33, 36'
    },

    // Upper Tier ("E Section" / Elevated Balcony - 37-46)
    'upper_tier_all': {
      id: 'upper_tier_all',
      name: 'E Section (Upper Tier · All 10 Tables)',
      shortName: 'E Section',
      tables: ['table_37', 'table_38', 'table_39', 'table_40', 'table_41', 'table_42', 'table_43', 'table_44', 'table_45', 'table_46'],
      label: 'Tables 37 to 46 (Tiers 1, 2 & 3)'
    }
  };

  function getSectionForTable(stationId) {
    if (!stationId) return null;
    for (const sec of Object.values(TABLE_ROW_SECTIONS)) {
      if (sec.tables.includes(stationId)) {
        return sec;
      }
    }
    return null;
  }

  function renderFloorPlanSidebar() {
    const listEl = document.getElementById('fp-employees-list');
    if (!listEl) return;

    const employees = AppState.floorPlanData.employees || [];
    if (employees.length === 0) {
      listEl.innerHTML = '<li style="padding: 12px; font-size: 11px; color: var(--c-gray-dark); text-align: center;">No active employees on roster.</li>';
      return;
    }

    const currentHighlight = AppState.floorPlanHighlightedStaffId;

    listEl.innerHTML = employees.map(emp => {
      const isHighlighted = currentHighlight === emp.id;
      const count = (emp.assignedStations && emp.assignedStations.length) || emp.assigned_count || 0;
      const stat = FP_STATUS_MAP[emp.status] || FP_STATUS_MAP['P'];

      return `
        <li class="fp-emp-item ${isHighlighted ? 'active-highlight' : ''}" data-staff-id="${emp.id}" title="Click to highlight assigned stations">
          <div class="fp-emp-info">
            <span class="fp-emp-dot" style="background-color: ${emp.color || '#2563EB'};"></span>
            <span class="fp-emp-name">${escapeHtml(emp.name)}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${count > 0 ? `<span class="fp-emp-station-tag">${count} ${count === 1 ? 'Table' : 'Tables'}</span>` : ''}
            <span class="fp-status-indicator ${stat.class}" title="${stat.label}"></span>
          </div>
        </li>
      `;
    }).join('');

    // Attach employee click to toggle highlight
    listEl.querySelectorAll('.fp-emp-item').forEach(item => {
      item.addEventListener('click', () => {
        const staffId = item.getAttribute('data-staff-id');
        highlightStaffStations(staffId);
      });
    });
  }

  function highlightStaffStations(staffId) {
    if (AppState.floorPlanHighlightedStaffId === staffId) {
      AppState.floorPlanHighlightedStaffId = null;
    } else {
      AppState.floorPlanHighlightedStaffId = staffId;
    }
    renderFloorPlanBlueprint();
    renderFloorPlanSidebar();
  }

  // Active Assignment Dialog Context
  window.currentAssignContext = {
    stationId: '',
    sec: null,
    scope: 'row'
  };

  function openTableAssignModal(stationId) {
    const stations = AppState.floorPlanData.stations || [];
    let station = stations.find(s => s.id === stationId);
    if (!station) {
      const fallbackSec = getSectionForTable(stationId);
      station = {
        id: stationId,
        name: stationId.startsWith('table_') ? `Table ${stationId.replace('table_', '')}` : stationId,
        section: fallbackSec ? fallbackSec.name : 'Dining Section',
        assignment: null
      };
    }

    const sec = getSectionForTable(stationId);
    window.currentAssignContext = {
      stationId,
      sec,
      scope: sec ? 'row' : 'single'
    };

    const modal = document.getElementById('modal-table-assign');
    const titleEl = document.getElementById('modal-table-assign-title');
    const nameEl = document.getElementById('assign-modal-station-name');
    const sectionEl = document.getElementById('assign-modal-section-info');
    const idInput = document.getElementById('assign-modal-station-id');
    const badgeCountEl = document.getElementById('assign-badge-count');
    const scopeWrapper = document.getElementById('assign-scope-wrapper');
    const btnScopeRow = document.getElementById('btn-scope-row');
    const btnScopeSingle = document.getElementById('btn-scope-single');
    const scopeRowCount = document.getElementById('scope-row-count');
    const scopeSingleName = document.getElementById('scope-single-name');
    const cardsContainer = document.getElementById('assign-waiter-cards-list');
    const selectStaff = document.getElementById('select-assign-staff');
    const notesInput = document.getElementById('input-assign-notes');

    if (idInput) idInput.value = stationId;

    if (sec) {
      if (titleEl) titleEl.textContent = `ASSIGN WAITER - ${sec.shortName.toUpperCase()}`;
      if (nameEl) nameEl.textContent = sec.name;
      if (sectionEl) sectionEl.textContent = `Serving ${sec.label} · Shift: ${AppState.floorPlanShift}`;
      if (badgeCountEl) badgeCountEl.textContent = `${sec.tables.length} Tables`;

      if (scopeWrapper) scopeWrapper.style.display = 'block';
      if (scopeRowCount) scopeRowCount.textContent = sec.tables.length;
      if (scopeSingleName) scopeSingleName.textContent = station.name;

      updateScopeUI();
    } else {
      if (titleEl) titleEl.textContent = `ASSIGN STAFF - ${station.name.toUpperCase()}`;
      if (nameEl) nameEl.textContent = `${station.name} (${station.section})`;
      if (sectionEl) sectionEl.textContent = `Capacity: ${station.capacity || 4} Guests · Shift: ${AppState.floorPlanShift}`;
      if (badgeCountEl) badgeCountEl.textContent = `1 Station`;

      if (scopeWrapper) scopeWrapper.style.display = 'none';
      window.currentAssignContext.scope = 'single';
    }

    const currentNotes = station.assignment ? station.assignment.notes : '';
    if (notesInput) notesInput.value = currentNotes || '';

    // Scope toggle buttons
    if (btnScopeRow) {
      btnScopeRow.onclick = () => {
        window.currentAssignContext.scope = 'row';
        updateScopeUI();
      };
    }
    if (btnScopeSingle) {
      btnScopeSingle.onclick = () => {
        window.currentAssignContext.scope = 'single';
        updateScopeUI();
      };
    }

    function updateScopeUI() {
      const isRow = window.currentAssignContext.scope === 'row';
      if (btnScopeRow) btnScopeRow.classList.toggle('active', isRow);
      if (btnScopeSingle) btnScopeSingle.classList.toggle('active', !isRow);
    }

    // Populate Fast Waiter Cards
    const employees = AppState.floorPlanData.employees || [];
    if (cardsContainer) {
      if (employees.length === 0) {
        cardsContainer.innerHTML = '<div style="padding: 14px; font-size: 11px; color: var(--c-gray-dark); text-align: center;">No active employees on roster for this shift.</div>';
      } else {
        cardsContainer.innerHTML = employees.map(emp => {
          const stat = FP_STATUS_MAP[emp.status] || FP_STATUS_MAP['P'];
          const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'W';
          const assignedCount = (emp.assignedStations && emp.assignedStations.length) || 0;

          // Check if this waiter is already assigned to this row or table
          let isCurrent = false;
          if (sec && sec.tables) {
            isCurrent = sec.tables.some(tid => (emp.assignedStations || []).includes(tid));
          } else {
            isCurrent = (emp.assignedStations || []).includes(stationId);
          }

          let badgeHtml = '';
          if (isCurrent) {
            badgeHtml = `<span class="assign-waiter-badge" style="background: #2563EB; color: #FFFFFF;">Currently Assigned</span>`;
          } else if (assignedCount > 0) {
            badgeHtml = `<span class="assign-waiter-badge" style="background: #F1F5F9; color: #475569;">Serving ${assignedCount} ${assignedCount === 1 ? 'Table' : 'Tables'}</span>`;
          } else {
            badgeHtml = `<span class="assign-waiter-badge" style="background: #F0FDF4; color: #166534;">✅ Available</span>`;
          }

          return `
            <div class="assign-waiter-card ${isCurrent ? 'is-current' : ''}" data-staff-id="${emp.id}" title="Click to assign ${escapeHtml(emp.name)}">
              <div class="assign-waiter-card-left">
                <div class="assign-waiter-avatar" style="background-color: ${emp.color || '#2563EB'};">
                  ${escapeHtml(initials)}
                </div>
                <div>
                  <div class="assign-waiter-name">${escapeHtml(emp.name)}</div>
                  <div class="assign-waiter-role">${escapeHtml(emp.code)} · ${stat.label}</div>
                </div>
              </div>
              <div>${badgeHtml}</div>
            </div>
          `;
        }).join('');

        // Attach 1-click click handler to assign immediately!
        cardsContainer.querySelectorAll('.assign-waiter-card').forEach(card => {
          card.addEventListener('click', () => {
            const staffId = card.getAttribute('data-staff-id');
            assignWaiterToTarget(staffId);
          });
        });
      }
    }

    // Populate hidden native select fallback for tests
    if (selectStaff) {
      let optionsHtml = '<option value="unassigned">[ Unassigned / None ]</option>';
      employees.forEach(emp => {
        const stat = FP_STATUS_MAP[emp.status] || FP_STATUS_MAP['P'];
        optionsHtml += `<option value="${emp.id}">${escapeHtml(emp.code)} - ${escapeHtml(emp.name)} (${stat.label})</option>`;
      });
      selectStaff.innerHTML = optionsHtml;
    }

    if (modal) modal.classList.add('active');
  }

  function closeTableAssignModal() {
    const modal = document.getElementById('modal-table-assign');
    if (modal) modal.classList.remove('active');
  }

  async function assignWaiterToTarget(staffId) {
    const ctx = window.currentAssignContext || {};
    const stationId = ctx.stationId;
    const sec = ctx.sec;
    const scope = ctx.scope || 'row';
    const notesInput = document.getElementById('input-assign-notes');
    const notes = notesInput ? notesInput.value.trim() : '';

    if (!stationId) return;

    const employees = AppState.floorPlanData.employees || [];
    const emp = employees.find(e => e.id === staffId);
    const empName = emp ? emp.name : 'Waiter';

    try {
      if (scope === 'row' && sec && sec.tables && sec.tables.length > 0) {
        // Bulk Assign Entire Section / Row
        const assignments = sec.tables.map(tid => ({
          station_id: tid,
          staff_id: staffId === 'unassigned' ? null : staffId,
          notes
        }));

        const payload = {
          date: AppState.floorPlanDate,
          shift: AppState.floorPlanShift,
          assignments
        };

        const res = await fetch('/api/floorplan/assign-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(`⚡ ${empName} assigned to ${sec.shortName} (${sec.tables.length} tables)!`);
          closeTableAssignModal();
          loadFloorPlanData();
        } else {
          showToast(data.message || 'Error saving row assignment.');
        }
      } else {
        // Assign Single Table / Station
        const payload = {
          date: AppState.floorPlanDate,
          shift: AppState.floorPlanShift,
          station_id: stationId,
          staff_id: staffId === 'unassigned' ? null : staffId,
          notes
        };

        const res = await fetch('/api/floorplan/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(`${empName} assigned to station.`);
          closeTableAssignModal();
          loadFloorPlanData();
        } else {
          showToast(data.message || 'Error saving assignment.');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Could not save assignment.');
    }
  }

  async function saveTableAssignment() {
    const selectStaff = document.getElementById('select-assign-staff');
    const staffId = selectStaff ? selectStaff.value : 'unassigned';
    assignWaiterToTarget(staffId);
  }

  async function unassignTable() {
    const ctx = window.currentAssignContext || {};
    const stationId = ctx.stationId;
    const sec = ctx.sec;
    const scope = ctx.scope || 'row';

    if (!stationId) return;

    try {
      if (scope === 'row' && sec && sec.tables && sec.tables.length > 0) {
        // Bulk Clear Entire Row
        const assignments = sec.tables.map(tid => ({
          station_id: tid,
          staff_id: null,
          notes: ''
        }));

        const payload = {
          date: AppState.floorPlanDate,
          shift: AppState.floorPlanShift,
          assignments
        };

        const res = await fetch('/api/floorplan/assign-bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast(`Section ${sec.shortName} cleared.`);
          closeTableAssignModal();
          loadFloorPlanData();
        } else {
          showToast(data.message || 'Error clearing assignment.');
        }
      } else {
        // Clear Single Table
        const payload = {
          date: AppState.floorPlanDate,
          shift: AppState.floorPlanShift,
          station_id: stationId,
          staff_id: null,
          notes: ''
        };

        const res = await fetch('/api/floorplan/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          showToast('Table unassigned.');
          closeTableAssignModal();
          loadFloorPlanData();
        } else {
          showToast(data.message || 'Error clearing assignment.');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Could not clear assignment.');
    }
  }

  function openBulkAssignModal() {
    const modal = document.getElementById('modal-bulk-assignments');
    const container = document.getElementById('bulk-assign-table-container');
    if (!modal || !container) return;

    const stations = AppState.floorPlanData.stations || [];
    const employees = AppState.floorPlanData.employees || [];

    let tableHtml = `
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background: var(--c-gray-light); border-bottom: 2px solid var(--c-gray-border); text-align: left;">
            <th style="padding: 8px 6px;">Station</th>
            <th style="padding: 8px 6px;">Section</th>
            <th style="padding: 8px 6px;">Assigned Waiter</th>
          </tr>
        </thead>
        <tbody>
    `;

    stations.forEach(st => {
      const asgnStaffId = st.assignment ? st.assignment.staff_id : null;
      let optionsHtml = '<option value="unassigned">[ Unassigned ]</option>';
      employees.forEach(emp => {
        const isSelected = emp.id === asgnStaffId ? 'selected' : '';
        const stat = FP_STATUS_MAP[emp.status] || FP_STATUS_MAP['P'];
        optionsHtml += `<option value="${emp.id}" ${isSelected}>${escapeHtml(emp.name)} (${stat.label})</option>`;
      });

      tableHtml += `
        <tr style="border-bottom: 1px solid var(--c-gray-border);" data-station-id="${st.id}">
          <td style="padding: 6px; font-weight: 700; color: var(--c-navy-primary);">${escapeHtml(st.name)}</td>
          <td style="padding: 6px; color: var(--c-gray-dark);">${escapeHtml(st.section)}</td>
          <td style="padding: 6px;">
            <select class="bulk-station-select select-control" data-station-id="${st.id}" style="width: 100%; padding: 4px 6px; font-size: 11px;">
              ${optionsHtml}
            </select>
          </td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
    modal.classList.add('active');
  }

  function closeBulkAssignModal() {
    const modal = document.getElementById('modal-bulk-assignments');
    if (modal) modal.classList.remove('active');
  }

  async function saveBulkAssignments() {
    const container = document.getElementById('bulk-assign-table-container');
    if (!container) return;

    const selects = container.querySelectorAll('.bulk-station-select');
    const assignments = [];

    selects.forEach(sel => {
      const stationId = sel.getAttribute('data-station-id');
      const staffId = sel.value === 'unassigned' ? null : sel.value;
      assignments.push({
        station_id: stationId,
        staff_id: staffId,
        notes: ''
      });
    });

    try {
      const payload = {
        date: AppState.floorPlanDate,
        shift: AppState.floorPlanShift,
        assignments
      };

      const res = await fetch('/api/floorplan/assign-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('All floor plan assignments saved.');
        closeBulkAssignModal();
        loadFloorPlanData();
      } else {
        showToast(data.message || 'Error saving bulk assignments.');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not save assignments.');
    }
  }

  function autoAssignRoster() {
    const container = document.getElementById('bulk-assign-table-container');
    if (!container) return;

    const employees = AppState.floorPlanData.employees || [];
    if (employees.length === 0) {
      showToast('No active employees on roster.');
      return;
    }

    const presentEmployees = employees.filter(e => e.status === 'P' || e.status === 'L');
    const pool = presentEmployees.length > 0 ? presentEmployees : employees;

    const selects = container.querySelectorAll('.bulk-station-select');
    selects.forEach((sel, index) => {
      const emp = pool[index % pool.length];
      sel.value = emp.id;
    });

    showToast('Assignments auto-distributed. Click "Save All Assignments" to persist.');
  }

  function initFloorPlan() {
    const dateSelector = document.getElementById('fp-date-selector');
    const shiftSelector = document.getElementById('fp-shift-selector');

    if (dateSelector) {
      dateSelector.value = AppState.floorPlanDate;
      dateSelector.addEventListener('change', (e) => {
        AppState.floorPlanDate = e.target.value;
        loadFloorPlanData();
      });
    }

    if (shiftSelector) {
      shiftSelector.value = AppState.floorPlanShift;
      shiftSelector.addEventListener('change', (e) => {
        AppState.floorPlanShift = e.target.value;
        loadFloorPlanData();
      });
    }

    // Modal Triggers
    const btnOpenManage = document.getElementById('btn-open-manage-assignments');
    if (btnOpenManage) btnOpenManage.addEventListener('click', openBulkAssignModal);

    // Quick Assign Modal Controls
    const btnCloseTable = document.getElementById('btn-close-table-assign');
    const btnCancelTable = document.getElementById('btn-cancel-table-assign');
    const btnSaveTable = document.getElementById('btn-save-table-assign');
    const btnUnassignTable = document.getElementById('btn-unassign-table');

    if (btnCloseTable) btnCloseTable.addEventListener('click', closeTableAssignModal);
    if (btnCancelTable) btnCancelTable.addEventListener('click', closeTableAssignModal);
    if (btnSaveTable) btnSaveTable.addEventListener('click', saveTableAssignment);
    if (btnUnassignTable) btnUnassignTable.addEventListener('click', unassignTable);

    // Bulk Modal Controls
    const btnCloseBulk = document.getElementById('btn-close-bulk-assign');
    const btnCancelBulk = document.getElementById('btn-cancel-bulk-assign');
    const btnSaveBulk = document.getElementById('btn-save-bulk-assign');
    const btnAutoAssign = document.getElementById('btn-auto-assign-roster');

    if (btnCloseBulk) btnCloseBulk.addEventListener('click', closeBulkAssignModal);
    if (btnCancelBulk) btnCancelBulk.addEventListener('click', closeBulkAssignModal);
    if (btnSaveBulk) btnSaveBulk.addEventListener('click', saveBulkAssignments);
    if (btnAutoAssign) btnAutoAssign.addEventListener('click', autoAssignRoster);

    // Zoom Controls
    const btnZoomIn = document.getElementById('fp-zoom-in');
    const btnZoomOut = document.getElementById('fp-zoom-out');
    const btnZoomReset = document.getElementById('fp-zoom-reset');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => setFloorPlanZoom((window.currentZoomLevel || 1.0) + 0.15));
    if (btnZoomOut) btnZoomOut.addEventListener('click', () => setFloorPlanZoom((window.currentZoomLevel || 1.0) - 0.15));
    if (btnZoomReset) btnZoomReset.addEventListener('click', () => setFloorPlanZoom(1.0));

    // Section Filters
    const filterContainer = document.getElementById('fp-section-filters');
    if (filterContainer) {
      filterContainer.querySelectorAll('.fp-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const filter = btn.getAttribute('data-filter') || 'all';
          applySectionFilter(filter);
        });
      });
    }

    // Sidebar Staff Search
    const staffSearchInput = document.getElementById('fp-staff-search');
    if (staffSearchInput) {
      staffSearchInput.addEventListener('input', (e) => {
        filterSidebarEmployees(e.target.value);
      });
    }

    // Initialize WhatsApp Floor Plan Dispatch
    initWhatsAppFloorPlanFeature();
  }

  // =========================================================================
  // WHATSAPP FLOOR PLAN DISPATCH TO SUPERVISOR
  // =========================================================================
  const WA_PHONE_KEY = 'executive_supervisor_wa_phone';

  function initWhatsAppFloorPlanFeature() {
    const btnOpen = document.getElementById('btn-open-wa-floorplan');
    const btnClose = document.getElementById('btn-close-wa-floorplan');
    const btnCancel = document.getElementById('btn-cancel-wa-floorplan');
    const btnTomorrow = document.getElementById('btn-wa-select-tomorrow');
    const btnToday = document.getElementById('btn-wa-select-today');
    const inputDate = document.getElementById('wa-floorplan-date');
    const selectShift = document.getElementById('wa-floorplan-shift');
    const inputPhone = document.getElementById('wa-supervisor-phone');
    const btnCopy = document.getElementById('btn-wa-copy-text');
    const btnSendApi = document.getElementById('btn-send-wa-api');

    if (btnOpen) {
      btnOpen.addEventListener('click', openWhatsAppFloorPlanModal);
    }
    if (btnClose) {
      btnClose.addEventListener('click', closeWhatsAppFloorPlanModal);
    }
    if (btnCancel) {
      btnCancel.addEventListener('click', closeWhatsAppFloorPlanModal);
    }

    if (btnTomorrow) {
      btnTomorrow.addEventListener('click', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (inputDate) inputDate.value = formatDateKey(tomorrow);
        btnTomorrow.style.border = '1.5px solid #25D366';
        btnTomorrow.style.background = '#F0FDF4';
        btnTomorrow.style.color = '#166534';
        if (btnToday) {
          btnToday.style.border = '';
          btnToday.style.background = '';
          btnToday.style.color = '';
        }
        refreshWhatsAppFloorPlanPreview();
      });
    }

    if (btnToday) {
      btnToday.addEventListener('click', () => {
        if (inputDate) inputDate.value = formatDateKey(new Date());
        btnToday.style.border = '1.5px solid #25D366';
        btnToday.style.background = '#F0FDF4';
        btnToday.style.color = '#166534';
        if (btnTomorrow) {
          btnTomorrow.style.border = '';
          btnTomorrow.style.background = '';
          btnTomorrow.style.color = '';
        }
        refreshWhatsAppFloorPlanPreview();
      });
    }

    if (inputDate) {
      inputDate.addEventListener('change', refreshWhatsAppFloorPlanPreview);
    }

    if (selectShift) {
      selectShift.addEventListener('change', refreshWhatsAppFloorPlanPreview);
    }

    if (inputPhone) {
      inputPhone.addEventListener('input', () => {
        const val = inputPhone.value.trim();
        localStorage.setItem(WA_PHONE_KEY, val);
        updateWhatsAppDirectLink();
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', copyWhatsAppFloorPlanText);
    }

    if (btnSendApi) {
      btnSendApi.addEventListener('click', sendWhatsAppViaApi);
    }
  }

  function openWhatsAppFloorPlanModal() {
    const modal = document.getElementById('modal-whatsapp-floorplan');
    if (!modal) return;

    const inputDate = document.getElementById('wa-floorplan-date');
    const selectShift = document.getElementById('wa-floorplan-shift');
    const inputPhone = document.getElementById('wa-supervisor-phone');

    // Default to tomorrow per user request!
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (inputDate) inputDate.value = formatDateKey(tomorrow);

    if (selectShift) {
      selectShift.value = AppState.floorPlanShift || 'Morning';
    }

    if (inputPhone) {
      const saved = localStorage.getItem(WA_PHONE_KEY) || (AppState.settings && AppState.settings.whatsapp_recipient_phone) || '';
      inputPhone.value = saved;
    }

    modal.classList.add('active');
    refreshWhatsAppFloorPlanPreview();
  }

  function closeWhatsAppFloorPlanModal() {
    const modal = document.getElementById('modal-whatsapp-floorplan');
    if (modal) modal.classList.remove('active');
  }

  async function refreshWhatsAppFloorPlanPreview() {
    const previewEl = document.getElementById('wa-floorplan-preview');
    const inputDate = document.getElementById('wa-floorplan-date');
    const selectShift = document.getElementById('wa-floorplan-shift');

    const dateVal = inputDate && inputDate.value ? inputDate.value : formatDateKey(new Date());
    const shiftVal = selectShift && selectShift.value ? selectShift.value : 'Morning';

    if (previewEl) previewEl.value = 'Loading floor plan assignments...';

    let stations = [];
    let employees = [];

    // If matches currently loaded date & shift in AppState
    if (AppState.floorPlanDate === dateVal && AppState.floorPlanShift === shiftVal && AppState.floorPlanData.stations && AppState.floorPlanData.stations.length > 0) {
      stations = AppState.floorPlanData.stations;
      employees = AppState.floorPlanData.employees || [];
    } else {
      try {
        const res = await fetch(`/api/floorplan/assignments?date=${encodeURIComponent(dateVal)}&shift=${encodeURIComponent(shiftVal)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            stations = data.stations || [];
            employees = data.employees || [];
          }
        }
      } catch (err) {
        console.warn('Could not fetch assignments for preview:', err);
      }
      if (stations.length === 0) {
        stations = AppState.floorPlanData.stations || [];
        employees = AppState.floorPlanData.employees || [];
      }
    }

    const message = buildWhatsAppFloorPlanMessage(dateVal, shiftVal, stations, employees);
    if (previewEl) {
      previewEl.value = message;
    }

    updateWhatsAppDirectLink();
  }

  function updateWhatsAppDirectLink() {
    const linkDirect = document.getElementById('btn-open-wa-direct');
    const previewEl = document.getElementById('wa-floorplan-preview');
    const inputPhone = document.getElementById('wa-supervisor-phone');

    if (!linkDirect) return;

    const rawPhone = inputPhone ? inputPhone.value.trim() : '';
    let cleanPhone = rawPhone.replace(/[^0-9]/g, '');

    // Format Kenyan phone numbers: e.g. 0712345678 -> 254712345678
    if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
      cleanPhone = '254' + cleanPhone.substring(1);
    }

    const message = previewEl ? previewEl.value : '';
    const encoded = encodeURIComponent(message);

    if (cleanPhone) {
      linkDirect.href = `https://wa.me/${cleanPhone}?text=${encoded}`;
    } else {
      linkDirect.href = `https://wa.me/?text=${encoded}`;
    }
  }

  function buildWhatsAppFloorPlanMessage(dateVal, shiftVal, stations, employees) {
    let dateLabel = dateVal;
    try {
      const parts = dateVal.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      dateLabel = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {}

    const business = (AppState.settings && AppState.settings.businessName) || 'Ribhouse Restaurant';

    const stationMap = {};
    const serviceStations = [];
    stations.forEach(st => {
      stationMap[st.id] = st;
      if (st.id && st.id.startsWith('station_')) {
        serviceStations.push(st);
      }
    });

    // Helper to format Row 1 through Row 6 (e.g. "Row 1: Brian")
    function formatRowAssignment(rowKey) {
      const def = TABLE_ROW_SECTIONS[rowKey];
      if (!def) return '';

      const staffMap = {};
      let assignedTablesCount = 0;

      def.tables.forEach(tid => {
        const st = stationMap[tid];
        const asgn = st && st.assignment;
        if (asgn && asgn.staff_id && asgn.staff_name) {
          assignedTablesCount++;
          const name = asgn.staff_name.split(' ')[0] || asgn.staff_name;
          staffMap[name] = (staffMap[name] || 0) + 1;
        }
      });

      const staffEntries = Object.entries(staffMap);
      if (staffEntries.length === 0) {
        return `- *${def.shortName}*: _Unassigned_`;
      } else if (staffEntries.length === 1 && assignedTablesCount === def.tables.length) {
        // e.g. "Row 1: Brian"
        return `- *${def.shortName}*: ${staffEntries[0][0]}`;
      } else if (staffEntries.length === 1) {
        return `- *${def.shortName}*: ${staffEntries[0][0]} (${assignedTablesCount}/${def.tables.length} tables)`;
      } else {
        const splitText = staffEntries.map(([name, count]) => `${name} (${count} tables)`).join(', ');
        return `- *${def.shortName}*: ${splitText}`;
      }
    }

    // Helper to format E Section (allocated to one person)
    function formatESection() {
      const def = TABLE_ROW_SECTIONS['upper_tier_all'];
      if (!def) return '';

      const staffMap = {};
      let assignedTablesCount = 0;

      def.tables.forEach(tid => {
        const st = stationMap[tid];
        const asgn = st && st.assignment;
        if (asgn && asgn.staff_id && asgn.staff_name) {
          assignedTablesCount++;
          const name = asgn.staff_name.split(' ')[0] || asgn.staff_name;
          staffMap[name] = (staffMap[name] || 0) + 1;
        }
      });

      const staffEntries = Object.entries(staffMap);
      if (staffEntries.length === 0) {
        return `- *E Section*: _Unassigned_`;
      } else if (staffEntries.length === 1) {
        const waiterName = staffEntries[0][0];
        if (assignedTablesCount === def.tables.length) {
          return `- *E Section*: ${waiterName} (Allocated to 1 Person - Tables 37 to 46)`;
        } else {
          return `- *E Section*: ${waiterName} (${assignedTablesCount}/10 tables)`;
        }
      } else {
        staffEntries.sort((a, b) => b[1] - a[1]);
        const primary = staffEntries[0][0];
        const others = staffEntries.slice(1).map(([n, c]) => `${n} (${c})`).join(', ');
        return `- *E Section*: ${primary} (Primary) - ${others}`;
      }
    }

    function formatServiceStations(stationList) {
      if (!stationList || stationList.length === 0) return '  (None)';

      const getStaff = (id) => {
        const s = stationMap[id];
        return (s && s.assignment && s.assignment.staff_name) ? s.assignment.staff_name.split(' ')[0] : null;
      };

      const lines = [];

      // 1. Cashier (Always 2 Staff)
      const c1 = getStaff('station_cashier');
      const c2 = getStaff('station_cashier_2');
      if (c1 && c2) {
        lines.push(`- *Cashier (2 Staff)*: ${c1} & ${c2}`);
      } else if (c1 || c2) {
        lines.push(`- *Cashier (2 Staff)*: ${c1 || c2} (1/2 Assigned)`);
      } else {
        lines.push(`- *Cashier (2 Staff)*: _Unassigned_`);
      }

      // 2. Front Mini Shop (Always 2 Staff)
      const m1 = getStaff('station_minishop');
      const m2 = getStaff('station_minishop_2');
      if (m1 && m2) {
        lines.push(`- *Front Mini Shop (2 Staff)*: ${m1} & ${m2}`);
      } else if (m1 || m2) {
        lines.push(`- *Front Mini Shop (2 Staff)*: ${m1 || m2} (1/2 Assigned)`);
      } else {
        lines.push(`- *Front Mini Shop (2 Staff)*: _Unassigned_`);
      }

      // 3. Other Production & Kitchen Stations
      const otherStations = stationList.filter(s => 
        !['station_cashier', 'station_cashier_2', 'station_minishop', 'station_minishop_2', 'booth_1', 'booth_2', 'booth_3', 'booth_4', 'section_a_1', 'section_a_2', 'section_b_1', 'bar'].includes(s.id)
      );

      otherStations.forEach(st => {
        const staffName = st.assignment && st.assignment.staff_name;
        const staffLabel = staffName ? staffName.split(' ')[0] : '_Unassigned_';
        lines.push(`- *${st.name}*: ${staffLabel}`);
      });

      return lines.join('\n');
    }

    let assignedCount = 0;
    stations.forEach(st => {
      if (st.assignment && st.assignment.staff_id) assignedCount++;
    });

    const totalStations = stations.length;

    const rowLines = [
      formatRowAssignment('left_line_1'),
      formatRowAssignment('left_line_2'),
      formatRowAssignment('left_line_3'),
      formatRowAssignment('right_line_1'),
      formatRowAssignment('right_line_2'),
      formatRowAssignment('right_line_3')
    ].filter(Boolean).join('\n');

    const eSectionLine = formatESection();

    const message = 
`*Ribhouse Restaurant Floor & Service Duty Roster*
----------------------------------------
*Date*: ${dateLabel}
*Shift*: ${shiftVal} Shift
*Coverage*: ${assignedCount}/${totalStations} Stations Assigned

*MAIN DINING ROOM (ROWS 1 TO 6)*
${rowLines}

*E SECTION (UPPER TIER)*
${eSectionLine}

*KITCHEN & SERVICE STATIONS*
${formatServiceStations(serviceStations)}

----------------------------------------
*Supervisor Notice*: Please ensure all staff check in with attendance upon arrival. Station reassignments must be logged in the system.
_Dispatched by Ribhouse Restaurant Operations_`;

    return message;
  }

  async function copyWhatsAppFloorPlanText() {
    const previewEl = document.getElementById('wa-floorplan-preview');
    if (!previewEl || !previewEl.value) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(previewEl.value);
      } else {
        previewEl.select();
        document.execCommand('copy');
      }
      showToast('Floor plan duty roster copied to clipboard!');
    } catch (err) {
      console.error(err);
      previewEl.select();
      showToast('Text selected! Press Ctrl+C to copy.');
    }
  }

  async function sendWhatsAppViaApi() {
    const previewEl = document.getElementById('wa-floorplan-preview');
    const inputPhone = document.getElementById('wa-supervisor-phone');
    const inputDate = document.getElementById('wa-floorplan-date');
    const selectShift = document.getElementById('wa-floorplan-shift');
    const btnSendApi = document.getElementById('btn-send-wa-api');

    const phone = inputPhone ? inputPhone.value.trim() : '';
    if (!phone) {
      showToast('Please enter supervisor WhatsApp phone number.');
      if (inputPhone) inputPhone.focus();
      return;
    }

    const messageText = previewEl ? previewEl.value.trim() : '';
    if (!messageText) {
      showToast('No message content to send.');
      return;
    }

    if (btnSendApi) {
      btnSendApi.disabled = true;
      btnSendApi.textContent = 'Sending...';
    }

    try {
      const payload = {
        recipientPhone: phone,
        date: inputDate ? inputDate.value : '',
        shift: selectShift ? selectShift.value : '',
        messageText
      };

      const res = await fetch('/api/floorplan/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (data.success) {
        showToast('Floor plan sent successfully via WhatsApp!');
        closeWhatsAppFloorPlanModal();
      } else {
        showToast(data.message || 'API delivery not active. Opening direct WhatsApp chat...');
        if (data.fallbackUrl) {
          window.open(data.fallbackUrl, '_blank');
        } else {
          const clean = phone.replace(/[^0-9]/g, '');
          window.open(`https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`, '_blank');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error sending message. Opening direct WhatsApp...');
      const clean = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${clean}?text=${encodeURIComponent(messageText)}`, '_blank');
    } finally {
      if (btnSendApi) {
        btnSendApi.disabled = false;
        btnSendApi.textContent = '🚀 Send via API';
      }
    }
  }

  // Floor Plan Zoom & Section Filter Helpers
  window.currentZoomLevel = 1.0;
  window.currentSectionFilter = 'all';

  function setFloorPlanZoom(level) {
    window.currentZoomLevel = Math.max(0.65, Math.min(2.2, Math.round(level * 100) / 100));
    const svg = document.querySelector('.fp-svg-canvas');
    const levelText = document.getElementById('fp-zoom-level');
    if (svg) {
      svg.style.transform = `scale(${window.currentZoomLevel})`;
    }
    if (levelText) {
      levelText.textContent = `${Math.round(window.currentZoomLevel * 100)}%`;
    }
  }

  function applySectionFilter(filter) {
    window.currentSectionFilter = filter;
    document.querySelectorAll('.fp-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
    });

    const allStations = document.querySelectorAll('.fp-station');
    allStations.forEach(el => {
      const id = el.getAttribute('data-station-id') || '';
      if (filter === 'all') {
        el.classList.remove('dimmed');
      } else if (filter === 'left') {
        const num = parseInt(id.replace('table_', ''), 10);
        const match = !isNaN(num) && num >= 1 && num <= 18;
        el.classList.toggle('dimmed', !match);
      } else if (filter === 'right') {
        const num = parseInt(id.replace('table_', ''), 10);
        const match = !isNaN(num) && num >= 19 && num <= 36;
        el.classList.toggle('dimmed', !match);
      } else if (filter === 'upper') {
        const num = parseInt(id.replace('table_', ''), 10);
        const match = !isNaN(num) && num >= 37 && num <= 46;
        el.classList.toggle('dimmed', !match);
      } else if (filter === 'stations') {
        const match = id.startsWith('station_');
        el.classList.toggle('dimmed', !match);
      }
    });
  }

  function filterSidebarEmployees(query) {
    const q = (query || '').toLowerCase().trim();
    const items = document.querySelectorAll('.fp-emp-item');
    items.forEach(item => {
      const nameEl = item.querySelector('.fp-emp-name');
      const text = nameEl ? nameEl.textContent.toLowerCase() : '';
      item.style.display = (!q || text.includes(q)) ? '' : 'none';
    });
  }

  // =========================================================================
  // EVENT LISTENERS & INITIALIZATION
  // =========================================================================
  function initEventListeners() {
    // Bottom Tab Navigation
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.getAttribute('data-target');
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

        tab.classList.add('active');
        const targetSection = document.getElementById(targetId);
        if (targetSection) targetSection.classList.add('active');

        AppState.activeTab = targetId;
        updateHeaderForActiveTab(targetId);

        if (targetId === 'view-daily') renderDailyView();
        else if (targetId === 'view-monthly') renderMonthlyMatrix();
        else if (targetId === 'view-absentee') renderAbsenteeReport();
        else if (targetId === 'view-staff') renderStaffDirectory();
        else if (targetId === 'view-reports') renderReportsView();
        else if (targetId === 'view-floorplan') {
          document.body.classList.add('view-floorplan-active');
          loadFloorPlanData();
        }

        if (targetId !== 'view-floorplan') {
          document.body.classList.remove('view-floorplan-active');
        }
      });
    });

    // Date Navigation Buttons
    const btnPrev = document.getElementById('btn-prev-day');
    const btnNext = document.getElementById('btn-next-day');
    const nativePicker = document.getElementById('native-date-selector');

    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        AppState.currentDate.setDate(AppState.currentDate.getDate() - 1);
        renderDailyView();
      });
    }

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        AppState.currentDate.setDate(AppState.currentDate.getDate() + 1);
        renderDailyView();
      });
    }

    if (nativePicker) {
      nativePicker.addEventListener('change', (e) => {
        if (e.target.value) {
          const parts = e.target.value.split('-');
          AppState.currentDate = new Date(parts[0], parts[1] - 1, parts[2]);
          renderDailyView();
        }
      });
    }

    // Mark All Present Button
    const btnMarkAll = document.getElementById('btn-mark-all-present');
    if (btnMarkAll) {
      btnMarkAll.addEventListener('click', markAllPresent);
    }

    // Manual Save Daily Shift Records Button
    const btnSaveDaily = document.getElementById('btn-save-daily-records');
    if (btnSaveDaily) {
      btnSaveDaily.addEventListener('click', forceSaveDailyRecords);
    }

    // Search Daily Filter
    const searchDaily = document.getElementById('search-waiter-daily');
    if (searchDaily) {
      searchDaily.addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value;
        renderDailyView();
      });
    }

    // Search Staff Directory Filter
    const searchStaff = document.getElementById('search-staff-directory');
    if (searchStaff) {
      searchStaff.addEventListener('input', (e) => {
        AppState.staffSearchQuery = e.target.value;
        renderStaffDirectory();
      });
    }

    // Shift Filter Buttons
    document.querySelectorAll('.shift-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.shift-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        AppState.shiftFilter = btn.getAttribute('data-shift-filter');
        renderDailyView();
      });
    });

    // Month / Year Matrix Selectors
    const selMonthMatrix = document.getElementById('select-month-matrix');
    const selYearMatrix = document.getElementById('select-year-matrix');
    if (selMonthMatrix) {
      selMonthMatrix.value = AppState.matrixMonth;
      selMonthMatrix.addEventListener('change', (e) => {
        AppState.matrixMonth = parseInt(e.target.value, 10);
        renderMonthlyMatrix();
      });
    }
    if (selYearMatrix) {
      selYearMatrix.value = AppState.matrixYear;
      selYearMatrix.addEventListener('change', (e) => {
        AppState.matrixYear = parseInt(e.target.value, 10);
        renderMonthlyMatrix();
      });
    }

    // Month / Year Absentee Selectors
    const selMonthAbsentee = document.getElementById('select-month-absentee');
    const selYearAbsentee = document.getElementById('select-year-absentee');
    if (selMonthAbsentee) {
      selMonthAbsentee.value = AppState.absenteeMonth;
      selMonthAbsentee.addEventListener('change', (e) => {
        AppState.absenteeMonth = parseInt(e.target.value, 10);
        renderAbsenteeReport();
      });
    }
    if (selYearAbsentee) {
      selYearAbsentee.value = AppState.absenteeYear;
      selYearAbsentee.addEventListener('change', (e) => {
        AppState.absenteeYear = parseInt(e.target.value, 10);
        renderAbsenteeReport();
      });
    }

    // Attendance Summary Scope & Shift Filters
    const selSummaryScope = document.getElementById('select-summary-scope');
    const selSummaryShift = document.getElementById('select-summary-shift-filter');
    const btnDownloadCsv = document.getElementById('btn-download-attendance-csv');
    const btnViewSummaryTable = document.getElementById('btn-view-summary-table');

    if (selSummaryScope) {
      selSummaryScope.addEventListener('change', (e) => {
        summaryScope = e.target.value;
        const monthSel = document.getElementById('select-month-absentee');
        const yearSel = document.getElementById('select-year-absentee');
        if (monthSel) monthSel.style.display = summaryScope === 'WEEK' ? 'none' : 'block';
        if (yearSel) yearSel.style.display = summaryScope === 'WEEK' ? 'none' : 'block';
        renderAttendanceSummaryTable();
      });
    }

    if (selSummaryShift) {
      selSummaryShift.addEventListener('change', (e) => {
        summaryShiftFilter = e.target.value;
        renderAttendanceSummaryTable();
      });
    }

    if (btnDownloadCsv) {
      btnDownloadCsv.addEventListener('click', downloadAttendanceCsv);
    }

    if (btnViewSummaryTable) {
      btnViewSummaryTable.addEventListener('click', () => {
        navigateToTab('view-absentee');
        showToast('Viewing Waiter Attendance Summary List');
      });
    }

    // Print Buttons
    const btnPrintQuick = document.getElementById('btn-print-quick');
    const btnPrintMatrix = document.getElementById('btn-print-matrix-view');
    const btnPrintAbsentee = document.getElementById('btn-print-absentee-report');

    if (btnPrintQuick) {
      btnPrintQuick.addEventListener('click', () => {
        prepareAndPrintRegister(AppState.currentDate.getMonth(), AppState.currentDate.getFullYear());
      });
    }
    if (btnPrintMatrix) {
      btnPrintMatrix.addEventListener('click', () => {
        prepareAndPrintRegister(AppState.matrixMonth, AppState.matrixYear);
      });
    }
    if (btnPrintAbsentee) {
      btnPrintAbsentee.addEventListener('click', () => {
        prepareAndPrintRegister(AppState.absenteeMonth, AppState.absenteeYear);
      });
    }

    // Add Staff Modal Triggers
    const btnAddQuick = document.getElementById('btn-add-waiter-quick');
    const btnAddModal = document.getElementById('btn-add-staff-modal');
    if (btnAddQuick) btnAddQuick.addEventListener('click', () => openStaffModal());
    if (btnAddModal) btnAddModal.addEventListener('click', () => openStaffModal());

    // Staff View Toolbar: Week & Month Attendance buttons
    const btnViewWeekAtt = document.getElementById('btn-view-week-attendance');
    const btnViewMonthAtt = document.getElementById('btn-view-month-attendance');
    if (btnViewWeekAtt) btnViewWeekAtt.addEventListener('click', () => openWeekAttendanceModal('ALL'));
    if (btnViewMonthAtt) btnViewMonthAtt.addEventListener('click', () => navigateToTab('view-monthly'));

    // Week Attendance Modal Controls
    const btnCloseWeekModal = document.getElementById('btn-close-week-attendance-modal');
    if (btnCloseWeekModal) btnCloseWeekModal.addEventListener('click', closeWeekAttendanceModal);

    const btnPrevWeek = document.getElementById('btn-prev-week');
    if (btnPrevWeek) {
      btnPrevWeek.addEventListener('click', () => {
        weekModalRefDate.setDate(weekModalRefDate.getDate() - 7);
        renderWeekAttendanceModal();
      });
    }

    const btnNextWeek = document.getElementById('btn-next-week');
    if (btnNextWeek) {
      btnNextWeek.addEventListener('click', () => {
        weekModalRefDate.setDate(weekModalRefDate.getDate() + 7);
        renderWeekAttendanceModal();
      });
    }

    const btnTodayWeek = document.getElementById('btn-today-week');
    if (btnTodayWeek) {
      btnTodayWeek.addEventListener('click', () => {
        weekModalRefDate = new Date();
        renderWeekAttendanceModal();
      });
    }

    const selectWeekStaff = document.getElementById('select-week-staff-filter');
    if (selectWeekStaff) {
      selectWeekStaff.addEventListener('change', (e) => {
        weekModalSelectedStaffId = e.target.value;
        renderWeekAttendanceModal();
      });
    }

    const btnJumpToMonthly = document.getElementById('btn-jump-to-monthly');
    if (btnJumpToMonthly) {
      btnJumpToMonthly.addEventListener('click', () => {
        closeWeekAttendanceModal();
        navigateToTab('view-monthly');
      });
    }

    const btnPrintWeekModal = document.getElementById('btn-print-week-modal');
    if (btnPrintWeekModal) {
      btnPrintWeekModal.addEventListener('click', () => {
        const days = getWeekDaysList(weekModalRefDate);
        prepareAndPrintRegister(days[0].dateObj.getMonth(), days[0].dateObj.getFullYear());
      });
    }

    const btnCloseStaff = document.getElementById('btn-close-staff-modal');
    const btnCancelStaff = document.getElementById('btn-cancel-staff-modal');
    if (btnCloseStaff) btnCloseStaff.addEventListener('click', closeStaffModal);
    if (btnCancelStaff) btnCancelStaff.addEventListener('click', closeStaffModal);

    // Save Staff Form
    const formStaff = document.getElementById('form-staff');
    const btnSaveStaff = document.getElementById('btn-save-staff');

    if (formStaff) {
      formStaff.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('staff-form-id').value.trim();
        const name = document.getElementById('staff-input-name').value.trim();
        const codeInput = document.getElementById('staff-input-code');
        const code = (codeInput && codeInput.value ? codeInput.value.trim() : '') || getNextStaffCode();
        const station = document.getElementById('staff-input-station').value.trim();
        const shift = document.getElementById('staff-input-shift').value;
        const phone = document.getElementById('staff-input-phone').value.trim();
        const errorBox = document.getElementById('staff-form-error');

        if (!name) {
          showToast('Please enter the waiter full name.');
          return;
        }

        if (errorBox) {
          errorBox.style.display = 'none';
          errorBox.textContent = '';
        }

        if (btnSaveStaff) {
          btnSaveStaff.disabled = true;
          btnSaveStaff.textContent = 'Saving to Database...';
        }

        try {
          if (id) {
            // Edit existing staff entry: PUT /api/staff/:id
            const res = await fetch(`/api/staff/${encodeURIComponent(id)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, name, station, shift, phone })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              const msg = data.message || 'Failed to update staff record in database.';
              if (errorBox) {
                errorBox.textContent = msg;
                errorBox.style.display = 'block';
              }
              showToast(msg);
              return;
            }

            // Update in local state
            const existingIndex = AppState.staff.findIndex(s => s.id === id);
            if (existingIndex !== -1) {
              AppState.staff[existingIndex] = Object.assign(AppState.staff[existingIndex], data.staff);
            }
            saveState();
            closeStaffModal();
            renderDailyView();
            renderStaffDirectory();
            renderMonthlyMatrix();
            renderAbsenteeReport();
            showToast(`Staff member "${name}" updated in database.`);
          } else {
            // Add a whole new staff entry: POST /api/staff
            const res = await fetch('/api/staff', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, name, station, shift, phone })
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              const msg = data.message || 'Failed to create staff record in database.';
              if (errorBox) {
                errorBox.textContent = msg;
                errorBox.style.display = 'block';
              }
              showToast(msg);
              return;
            }

            // Append verified database record
            AppState.staff.push(data.staff);
            saveState();
            closeStaffModal();
            renderDailyView();
            renderStaffDirectory();
            renderMonthlyMatrix();
            renderAbsenteeReport();
            showToast(`Staff member "${name}" added successfully!`);
          }
        } catch (err) {
          console.error('Error saving staff:', err);
          const msg = 'Network error: could not connect to database server.';
          if (errorBox) {
            errorBox.textContent = msg;
            errorBox.style.display = 'block';
          }
          showToast(msg);
        } finally {
          if (btnSaveStaff) {
            btnSaveStaff.disabled = false;
            btnSaveStaff.textContent = 'Save Staff Record';
          }
        }
      });
    }

    // =========================================================================
    // MANAGER AVATAR / PROFILE PHOTO UPLOAD LOGIC
    // =========================================================================
    function processAndUploadAvatar(file) {
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showToast('Please select an image file (PNG, JPG, WebP).');
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        showToast('Image file too large (Max 8MB).');
        return;
      }

      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          try {
            const canvas = document.createElement('canvas');
            const targetSize = 256;
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');

            // Center square crop
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;

            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);

            const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

            // Update state & UI immediately
            AppState.manager.avatar = dataUrl;
            localStorage.setItem(AVATAR_KEY, dataUrl);
            updateManagerAvatarUI(dataUrl, AppState.manager.initials);
            showToast('Manager profile picture updated!');

            // Sync to MySQL backend
            fetch('/api/manager/avatar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatar: dataUrl })
            })
            .then(res => res.json())
            .then(d => {
              if (d && !d.success) console.warn('[AVATAR]', d.message);
            })
            .catch(err => {
              console.warn('[AVATAR] Could not sync to server:', err);
            });
          } catch (err) {
            console.error('Error processing image:', err);
            showToast('Error processing profile photo.');
          }
        };
        img.onerror = function () {
          showToast('Failed to load selected image.');
        };
        img.src = e.target.result;
      };
      reader.onerror = function () {
        showToast('Failed to read image file.');
      };
      reader.readAsDataURL(file);
    }

    function removeManagerAvatar() {
      AppState.manager.avatar = null;
      localStorage.removeItem(AVATAR_KEY);
      updateManagerAvatarUI(null, AppState.manager.initials);
      showToast('Photo removed. Displaying initials.');

      fetch('/api/manager/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: null })
      }).catch(() => {});
    }

    // Header brand avatar click trigger
    const brandAvatarBox = document.getElementById('manager-brand-avatar');
    const headerFileInput = document.getElementById('manager-avatar-file-input');
    const btnUploadSettings = document.getElementById('btn-upload-avatar-settings');
    const settingsFileInput = document.getElementById('settings-avatar-file-input');
    const btnRemoveAvatar = document.getElementById('btn-remove-avatar');

    if (brandAvatarBox && headerFileInput) {
      brandAvatarBox.addEventListener('click', () => {
        headerFileInput.click();
      });
      brandAvatarBox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          headerFileInput.click();
        }
      });
      headerFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          processAndUploadAvatar(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    if (btnUploadSettings && settingsFileInput) {
      btnUploadSettings.addEventListener('click', () => {
        settingsFileInput.click();
      });
      settingsFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          processAndUploadAvatar(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    if (btnRemoveAvatar) {
      btnRemoveAvatar.addEventListener('click', removeManagerAvatar);
    }

    // Settings Modal Triggers
    const btnSettingsOpen = document.getElementById('btn-settings-open');
    const btnCloseSettings = document.getElementById('btn-close-settings-modal');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnLockApp = document.getElementById('btn-lock-app');
    const btnLogoutHeader = document.getElementById('btn-logout-header');

    if (btnLogoutHeader) {
      btnLogoutHeader.addEventListener('click', async () => {
        if (confirm('Are you sure you want to log out of the manager portal?')) {
          try {
            await fetch('/api/auth/logout', { method: 'POST' });
          } catch (e) {
            console.error('Logout error:', e);
          }
          window.location.replace('/login.html?loggedout=1');
        }
      });
    }

    // Manager Session Pill & Executive Dropdown Menu
    const btnManagerSessionMenu = document.getElementById('btn-manager-session-menu');
    const dropdownProfile = document.getElementById('manager-profile-dropdown');
    const btnDropHandover = document.getElementById('btn-dropdown-handover');
    const btnDropPrint = document.getElementById('btn-dropdown-print');
    const btnDropPasskeys = document.getElementById('btn-dropdown-passkeys');
    const btnDropSettings = document.getElementById('btn-dropdown-settings');
    const btnDropLogout = document.getElementById('btn-dropdown-logout');

    if (btnManagerSessionMenu) {
      btnManagerSessionMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleManagerProfileDropdown();
      });
    }

    if (btnDropHandover) {
      btnDropHandover.addEventListener('click', () => {
        openShiftHandoverModal();
      });
    }

    if (btnDropPrint) {
      btnDropPrint.addEventListener('click', () => {
        closeManagerProfileDropdown();
        prepareAndPrintRegister(AppState.currentDate.getMonth(), AppState.currentDate.getFullYear());
      });
    }

    if (btnDropPasskeys) {
      btnDropPasskeys.addEventListener('click', () => {
        closeManagerProfileDropdown();
        openSettingsModal();
        setTimeout(() => {
          const passkeyBtn = document.getElementById('btn-register-passkey');
          if (passkeyBtn) passkeyBtn.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      });
    }

    if (btnDropSettings) {
      btnDropSettings.addEventListener('click', () => {
        closeManagerProfileDropdown();
        openSettingsModal();
      });
    }

    if (btnDropLogout) {
      btnDropLogout.addEventListener('click', () => {
        closeManagerProfileDropdown();
        if (btnLogoutHeader) btnLogoutHeader.click();
      });
    }

    // Close Dropdown on outside click
    document.addEventListener('click', (e) => {
      if (dropdownProfile && dropdownProfile.style.display !== 'none') {
        if (!dropdownProfile.contains(e.target) && !btnManagerSessionMenu.contains(e.target)) {
          closeManagerProfileDropdown();
        }
      }
    });

    // Shift Handover Modal Controls
    const btnCloseShiftHandover = document.getElementById('btn-close-shift-handover');
    const btnCertifyPrint = document.getElementById('btn-certify-print');
    const btnCertifyWhatsApp = document.getElementById('btn-certify-whatsapp');
    const btnCertifyComplete = document.getElementById('btn-certify-complete');

    if (btnCloseShiftHandover) btnCloseShiftHandover.addEventListener('click', closeShiftHandoverModal);
    if (btnCertifyPrint) {
      btnCertifyPrint.addEventListener('click', () => {
        prepareAndPrintRegister(AppState.currentDate.getMonth(), AppState.currentDate.getFullYear());
      });
    }
    if (btnCertifyWhatsApp) {
      btnCertifyWhatsApp.addEventListener('click', () => {
        const msg = buildWhatsAppCertificationMessage();
        const encoded = encodeURIComponent(msg);
        const supervisorPhone = (AppState.settings?.supervisorPhone || localStorage.getItem('supervisor_phone') || '').replace(/[^0-9]/g, '');
        let cleanPhone = supervisorPhone;
        if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
          cleanPhone = '254' + cleanPhone.substring(1);
        }
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(msg).catch(() => {});
        }
        window.open(waUrl, '_blank');
        showToast('Shift handover report copied & opening WhatsApp...');
      });
    }
    if (btnCertifyComplete) {
      btnCertifyComplete.addEventListener('click', () => {
        const badge = document.getElementById('cert-stamp-badge');
        if (badge) {
          badge.textContent = 'COMPLETED';
          badge.style.background = '#0284C7';
        }
        showToast(`Shift Handover completed by ${AppState.manager.name || 'Duty Manager'}`);
        setTimeout(() => {
          closeShiftHandoverModal();
        }, 600);
      });
    }

    if (btnSettingsOpen) btnSettingsOpen.addEventListener('click', openSettingsModal);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const inputName = document.getElementById('settings-business-name');

        if (inputName && inputName.value.trim()) {
          AppState.settings.businessName = inputName.value.trim();
        }

        saveState();
        closeSettingsModal();
        showToast('Settings saved.');
      });
    }

    // Passkey Management Triggers
    const btnRegisterPasskey = document.getElementById('btn-register-passkey');
    if (btnRegisterPasskey) {
      btnRegisterPasskey.addEventListener('click', registerPasskey);
    }

    // Reminders & Task Modal Triggers
    const btnRemindersOpen = document.getElementById('btn-reminders-open');
    const btnCloseReminders = document.getElementById('btn-close-reminders-modal');
    const btnDismissReminders = document.getElementById('btn-dismiss-reminders');
    const btnRequestNotif = document.getElementById('btn-request-web-notif');
    const btnTestSound = document.getElementById('btn-test-sound');
    const formReminder = document.getElementById('form-reminder');
    const selectRepeat = document.getElementById('reminder-input-repeat');
    const repeatDayWrapper = document.getElementById('repeat-day-wrapper');
    const repeatDaySelect = document.getElementById('reminder-input-repeat-day');
    const repeatDayLabel = document.getElementById('repeat-day-label');

    function updateRepeatDayUI() {
      if (!selectRepeat || !repeatDayWrapper || !repeatDaySelect) return;
      const val = selectRepeat.value;
      if (val === 'weekly') {
        repeatDayWrapper.style.display = 'block';
        if (repeatDayLabel) repeatDayLabel.textContent = 'Day of Week';
        repeatDaySelect.innerHTML = `
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        `;
      } else if (val === 'monthly') {
        repeatDayWrapper.style.display = 'block';
        if (repeatDayLabel) repeatDayLabel.textContent = 'Day of Month';
        let opts = '';
        for (let d = 1; d <= 31; d++) {
          opts += `<option value="${d}">${d}${d === 1 ? 'st' : (d === 2 ? 'nd' : (d === 3 ? 'rd' : 'th'))}</option>`;
        }
        repeatDaySelect.innerHTML = opts;
      } else {
        repeatDayWrapper.style.display = 'none';
      }
    }

    if (selectRepeat) {
      selectRepeat.addEventListener('change', updateRepeatDayUI);
      updateRepeatDayUI();
    }

    if (btnRemindersOpen) btnRemindersOpen.addEventListener('click', openRemindersModal);
    if (btnCloseReminders) btnCloseReminders.addEventListener('click', closeRemindersModal);
    if (btnDismissReminders) btnDismissReminders.addEventListener('click', closeRemindersModal);
    if (btnRequestNotif) btnRequestNotif.addEventListener('click', requestNotificationPermission);
    if (btnTestSound) btnTestSound.addEventListener('click', playTestChime);

    if (formReminder) {
      formReminder.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputTitle = document.getElementById('reminder-input-title');
        const inputDesc = document.getElementById('reminder-input-desc');
        const inputDate = document.getElementById('reminder-input-date');
        const inputTime = document.getElementById('reminder-input-time');
        const inputRepeat = document.getElementById('reminder-input-repeat');
        const inputRepeatDay = document.getElementById('reminder-input-repeat-day');
        const inputNotifType = document.getElementById('reminder-input-notif-type');
        const inputActive = document.getElementById('reminder-input-active');

        if (!inputTitle || !inputTitle.value.trim()) return;

        const payload = {
          title: inputTitle.value.trim(),
          description: inputDesc ? inputDesc.value.trim() : '',
          reminder_date: inputDate ? inputDate.value : formatDateKey(new Date()),
          reminder_time: inputTime ? inputTime.value : '09:00',
          repeat_type: inputRepeat ? inputRepeat.value : 'none',
          repeat_day: inputRepeatDay ? parseInt(inputRepeatDay.value, 10) : 0,
          notification_type: inputNotifType ? inputNotifType.value : 'both',
          is_active: inputActive && inputActive.checked ? 1 : 0
        };

        try {
          const res = await fetch('/api/reminders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            showToast('Reminder saved successfully!');
            inputTitle.value = '';
            if (inputDesc) inputDesc.value = '';
            loadRemindersFromDatabase();
          } else {
            showToast(data.error || 'Failed to save reminder.');
          }
        } catch (err) {
          showToast('Error communicating with server.');
        }
      });
    }

    // Active Alarm Modal Overlay Handlers
    const btnDismissAlarm = document.getElementById('btn-dismiss-alarm-modal');
    if (btnDismissAlarm) {
      btnDismissAlarm.addEventListener('click', () => {
        const id = document.getElementById('active-alarm-id').value;
        dismissAlarm(id);
      });
    }

    document.querySelectorAll('.btn-snooze-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const minutes = parseInt(btn.getAttribute('data-minutes'), 10) || 5;
        const id = document.getElementById('active-alarm-id').value;
        snoozeAlarm(id, minutes);
      });
    });

    // Reports View On-Demand Handlers
    const btnGenWeekly = document.getElementById('btn-generate-weekly-ondemand');
    if (btnGenWeekly) {
      btnGenWeekly.addEventListener('click', async () => {
        const period = document.getElementById('select-weekly-period').value;
        btnGenWeekly.disabled = true;
        btnGenWeekly.textContent = 'Generating PDF...';
        try {
          const res = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'weekly', option: period })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Weekly PDF report generated!');
            loadReportHistory();
            if (data.downloadUrl) {
              window.open(data.downloadUrl, '_blank');
            }
          } else {
            showToast(data.error || 'Weekly generation error.');
          }
        } catch (err) {
          showToast('Server communication error.');
        } finally {
          btnGenWeekly.disabled = false;
          btnGenWeekly.textContent = 'Generate Weekly PDF';
        }
      });
    }

    const btnGenMonthly = document.getElementById('btn-generate-monthly-ondemand');
    if (btnGenMonthly) {
      btnGenMonthly.addEventListener('click', async () => {
        const month = parseInt(document.getElementById('select-report-month').value, 10);
        const year = parseInt(document.getElementById('select-report-year').value, 10);
        btnGenMonthly.disabled = true;
        btnGenMonthly.textContent = 'Generating PDF...';
        try {
          const res = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'monthly', month, year })
          });
          const data = await res.json();
          if (data.success) {
            showToast('Monthly PDF register generated!');
            loadReportHistory();
            if (data.downloadUrl) {
              window.open(data.downloadUrl, '_blank');
            }
          } else {
            showToast(data.error || 'Monthly generation error.');
          }
        } catch (err) {
          showToast('Server communication error.');
        } finally {
          btnGenMonthly.disabled = false;
          btnGenMonthly.textContent = 'Generate Monthly PDF';
        }
      });
    }

    const btnRefreshReports = document.getElementById('btn-refresh-reports');
    if (btnRefreshReports) {
      btnRefreshReports.addEventListener('click', () => {
        loadReportHistory();
        showToast('Report archive refreshed.');
      });
    }

    const formReportSettings = document.getElementById('form-report-settings');
    if (formReportSettings) {
      formReportSettings.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
          weekly_enabled: document.getElementById('setting-weekly-enabled').checked ? 1 : 0,
          weekly_day: parseInt(document.getElementById('setting-weekly-day').value, 10),
          weekly_time: document.getElementById('setting-weekly-time').value,
          monthly_enabled: document.getElementById('setting-monthly-enabled').checked ? 1 : 0,
          monthly_day: parseInt(document.getElementById('setting-monthly-day').value, 10),
          monthly_time: document.getElementById('setting-monthly-time').value,
          whatsapp_provider: document.getElementById('setting-whatsapp-provider').value,
          whatsapp_recipient_phone: document.getElementById('setting-whatsapp-phone').value.trim(),
          whatsapp_account_sid: document.getElementById('setting-whatsapp-sid').value.trim(),
          whatsapp_auth_token: document.getElementById('setting-whatsapp-token').value.trim(),
          whatsapp_from_phone: document.getElementById('setting-whatsapp-from').value.trim()
        };

        try {
          const res = await fetch('/api/reports/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            showToast('Schedule & WhatsApp settings saved.');
          } else {
            showToast(data.error || 'Error saving settings.');
          }
        } catch (err) {
          showToast('Could not save settings to server.');
        }
      });
    }

    // Backup & Restore Handlers
    const btnExportBackup = document.getElementById('btn-export-backup');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const inputRestore = document.getElementById('input-restore-backup');
    const btnResetDemo = document.getElementById('btn-reset-demo');

    if (btnExportBackup) btnExportBackup.addEventListener('click', exportJsonBackup);
    if (btnExportCsv) btnExportCsv.addEventListener('click', exportMonthlyCsv);
    if (inputRestore) inputRestore.addEventListener('change', handleRestoreBackup);
    if (btnResetDemo) {
      btnResetDemo.addEventListener('click', () => {
        if (confirm('Load fresh sample roster and attendance records? This will replace current records.')) {
          AppState.staff = INITIAL_STAFF;
          AppState.attendance = generateInitialAttendance();
          saveState();
          renderDailyView();
          renderMonthlyMatrix();
          renderAbsenteeReport();
          renderStaffDirectory();
          closeSettingsModal();
          showToast('Sample roster loaded.');
        }
      });
    }

    // Close Modals on Overlay Click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('active');
        }
      });
    });
  }

  // App Startup
  function init() {
    loadState();
    updateHeaderForActiveTab(AppState.activeTab || 'view-daily');

    initEventListeners();
    initFloorPlan();
    renderDailyView();
    renderMonthlyMatrix();
    renderAbsenteeReport();
    renderStaffDirectory();
    renderReminders();

    // Auto-navigate to hash tab if present (e.g. #floorplan or #view-floorplan)
    const initialHash = (window.location.hash || '').replace('#', '');
    if (initialHash === 'floorplan' || initialHash === 'view-floorplan') {
      const fpTab = document.querySelector('.nav-tab[data-target="view-floorplan"]');
      if (fpTab) fpTab.click();
    }
    
    // Check due reminders every 15s
    setInterval(pollDueReminders, 15000);
    pollDueReminders();

    // Initial server state sync & reminders load
    syncFromDatabase();
    loadRemindersFromDatabase();

    // Register service worker for offline PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.update();
      }).catch(err => {
        console.log('SW registration skipped:', err);
      });
    }
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
