/**
 * WAITER ATTENDANCE REGISTER - CORE APPLICATION LOGIC
 * Strict Constraints: Sharp 0px Corners, Authority Blue Palette, Zero Emojis
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'waiter_attendance_register_v1';

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
      businessName: 'EXECUTIVE RESTAURANT & BAR',
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
            const displayHeader = document.getElementById('display-business-name');
            if (displayHeader && AppState.settings.businessName) {
              displayHeader.textContent = AppState.settings.businessName;
            }
          }

          // Update header manager indicator
          const managerIndicator = document.getElementById('manager-session-indicator');
          if (managerIndicator) {
            managerIndicator.textContent = data.manager ? `Manager: ${data.manager.email}` : 'Manager: Authenticated';
          }

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

  function saveState() {
    try {
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
          }
        }).catch(err => {
          console.warn('[SYNC] Could not reach backend:', err);
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
  // VIEW 3: END-OF-MONTH ABSENTEE REPORT
  // =========================================================================
  function renderAbsenteeReport() {
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
            <span class="card-stat-title">Days Late</span>
            <span class="card-stat-num">${item.lateDays}</span>
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
        <div class="staff-row-actions">
          <button type="button" class="btn-small btn-secondary btn-edit-staff" data-id="${staff.id}">Edit</button>
          <button type="button" class="btn-small btn-danger btn-delete-staff" data-id="${staff.id}">Delete</button>
        </div>
      `;

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
      if (title) title.textContent = 'EDIT WAITER RECORD';
      if (inputId) inputId.value = staff.id;
      if (inputName) inputName.value = staff.name;
      if (inputCode) inputCode.value = staff.code;
      if (inputStation) inputStation.value = staff.station || '';
      if (inputShift) inputShift.value = staff.shift || 'Morning';
      if (inputPhone) inputPhone.value = staff.phone || '';
    } else {
      if (title) title.textContent = 'ADD NEW WAITER';
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

    if (modal) modal.classList.add('active');
    loadPasskeys();
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('active');
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
      { id: 'booth_1', name: 'Booth 1', section: 'Booths', capacity: 4, shape: 'booth' },
      { id: 'booth_2', name: 'Booth 2', section: 'Booths', capacity: 4, shape: 'booth' },
      { id: 'booth_3', name: 'Booth 3', section: 'Booths', capacity: 4, shape: 'booth' },
      { id: 'booth_4', name: 'Booth 4', section: 'Booths', capacity: 4, shape: 'booth' },
      { id: 'table_1', name: 'Table 1', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_2', name: 'Table 2', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_3', name: 'Table 3', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_4', name: 'Table 4', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_5', name: 'Table 5', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_6', name: 'Table 6', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_7', name: 'Table 7', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'table_8', name: 'Table 8', section: 'Main Dining', capacity: 4, shape: 'square' },
      { id: 'section_a_1', name: 'Table A1', section: 'Section A', capacity: 6, shape: 'rect' },
      { id: 'section_a_2', name: 'Table A2', section: 'Section A', capacity: 6, shape: 'rect' },
      { id: 'section_b_1', name: 'Table B1', section: 'Section B', capacity: 6, shape: 'rect' },
      { id: 'bar', name: 'Bar Counter', section: 'Bar Area', capacity: 4, shape: 'bar' }
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

    // Helper to generate station badge SVG
    function renderBadgeSvg(st, cx, cy) {
      const asgn = st.assignment;
      const isAssigned = asgn && asgn.staff_id && asgn.staff_name;
      const isHighlighted = highlightedStaffId && asgn && asgn.staff_id === highlightedStaffId;
      const highlightClass = isHighlighted ? 'highlighted' : '';

      if (isAssigned) {
        const rawName = asgn.staff_name.split(' ')[0] || asgn.staff_code || 'Assigned';
        const name = escapeHtml(rawName);
        const staffColor = asgn.color || '#2563EB';
        const stat = FP_STATUS_MAP[asgn.status] || FP_STATUS_MAP['P'];

        return `
          <g class="fp-station ${highlightClass}" data-station-id="${st.id}" style="cursor: pointer;">
            <!-- Badge Pill -->
            <rect x="${cx - 43}" y="${cy - 9}" width="86" height="18" rx="0" fill="#0F172A" stroke="${isHighlighted ? '#F59E0B' : '#334155'}" stroke-width="${isHighlighted ? 2.5 : 1}"/>
            <!-- Staff Color Dot -->
            <circle cx="${cx - 33}" cy="${cy}" r="4" fill="${staffColor}"/>
            <!-- Staff Name -->
            <text x="${cx - 24}" y="${cy + 3.5}" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" fill="#FFFFFF">${name}</text>
            <!-- Attendance Status Indicator Dot -->
            <circle cx="${cx + 33}" cy="${cy}" r="3.5" fill="${stat.color}" stroke="#0F172A" stroke-width="1"/>
          </g>
        `;
      } else {
        return `
          <g class="fp-station ${highlightClass}" data-station-id="${st.id}" style="cursor: pointer;">
            <rect x="${cx - 35}" y="${cy - 8}" width="70" height="16" rx="0" fill="#FFFFFF" stroke="#94A3B8" stroke-width="1" stroke-dasharray="2 2" opacity="0.95"/>
            <text x="${cx}" y="${cy + 3}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8.5" font-weight="700" fill="#64748B">+ Assign</text>
          </g>
        `;
      }
    }

    // Helper for booth item
    function renderBooth(id, bx, labelText) {
      const st = stationMap[id] || { id, name: labelText, assignment: null };
      const cx = bx + 56;
      const cy = 88;
      const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;

      return `
        <!-- Booth: ${id} -->
        <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
          <!-- Left Bench -->
          <rect x="${bx}" y="48" width="18" height="66" rx="2" fill="#991B1B" stroke="#7F1D1D" stroke-width="1.5"/>
          <!-- Right Bench -->
          <rect x="${bx + 94}" y="48" width="18" height="66" rx="2" fill="#991B1B" stroke="#7F1D1D" stroke-width="1.5"/>
          <!-- Dining Table Center -->
          <rect x="${bx + 22}" y="52" width="68" height="58" rx="2" fill="#D97706" stroke="${isHighlighted ? '#F59E0B' : '#92400E'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
          <!-- Booth Label -->
          <text x="${cx}" y="67" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#78350F">${labelText}</text>
          ${renderBadgeSvg(st, cx, cy)}
        </g>
      `;
    }

    // Helper for square 4-seater dining table
    function renderSquareTable(id, tx, ty, labelText) {
      const st = stationMap[id] || { id, name: labelText, assignment: null };
      const cx = tx + 30;
      const cy = ty + 30;
      const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;

      return `
        <!-- Table: ${id} -->
        <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
          <!-- 4 Surrounding Chairs -->
          <rect x="${tx + 16}" y="${ty - 12}" width="28" height="9" rx="2" fill="#78350F"/>
          <rect x="${tx + 16}" y="${ty + 63}" width="28" height="9" rx="2" fill="#78350F"/>
          <rect x="${tx - 11}" y="${ty + 16}" width="9" height="28" rx="2" fill="#78350F"/>
          <rect x="${tx + 62}" y="${ty + 16}" width="9" height="28" rx="2" fill="#78350F"/>
          <!-- Table Surface -->
          <rect x="${tx}" y="${ty}" width="60" height="60" rx="2" fill="#B45309" stroke="${isHighlighted ? '#F59E0B' : '#78350F'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
          <!-- Table Title -->
          <text x="${cx}" y="${ty + 17}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#FFFFFF">${labelText}</text>
          ${renderBadgeSvg(st, cx, ty + 38)}
        </g>
      `;
    }

    // Assemble complete vector blueprint SVG
    const svgHtml = `
      <svg viewBox="0 0 830 480" class="fp-svg-canvas" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Restaurant Architectural Floor Plan Blueprint">
        <defs>
          <!-- Floor Tile Pattern -->
          <pattern id="fp-tile" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E2E8F0" stroke-width="0.5"/>
          </pattern>
          <pattern id="kitchen-tile" width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M 14 0 L 0 0 0 14" fill="none" stroke="#CBD5E1" stroke-width="0.6"/>
          </pattern>
        </defs>

        <!-- Floor Background -->
        <rect x="8" y="8" width="814" height="464" fill="#FDFBF7" stroke="#0F172A" stroke-width="4"/>
        <rect x="8" y="8" width="814" height="464" fill="url(#fp-tile)" opacity="0.6"/>

        <!-- Top Planters along ledge -->
        <g fill="#15803D" stroke="#14532D" stroke-width="1">
          <circle cx="24" cy="22" r="9"/>
          <circle cx="158" cy="22" r="9"/>
          <circle cx="292" cy="22" r="9"/>
          <circle cx="426" cy="22" r="9"/>
          <circle cx="560" cy="22" r="9"/>
        </g>

        <!-- ================= BOOTHS 1 - 4 (TOP ROW) ================= -->
        ${renderBooth('booth_1', 38, 'Booth 1')}
        ${renderBooth('booth_2', 172, 'Booth 2')}
        ${renderBooth('booth_3', 306, 'Booth 3')}
        ${renderBooth('booth_4', 440, 'Booth 4')}

        <!-- ================= MAIN DINING TABLES 1 - 4 (ROW 1) ================= -->
        ${renderSquareTable('table_1', 65, 148, 'Table 1')}
        ${renderSquareTable('table_2', 200, 148, 'Table 2')}
        ${renderSquareTable('table_3', 335, 148, 'Table 3')}
        ${renderSquareTable('table_4', 470, 148, 'Table 4')}

        <!-- ================= MAIN DINING TABLES 5 - 8 (ROW 2) ================= -->
        ${renderSquareTable('table_5', 65, 245, 'Table 5')}
        ${renderSquareTable('table_6', 200, 245, 'Table 6')}
        ${renderSquareTable('table_7', 335, 245, 'Table 7')}
        ${renderSquareTable('table_8', 470, 245, 'Table 8')}

        <!-- ================= KITCHEN & PREP AREA (TOP RIGHT) ================= -->
        <rect x="595" y="10" width="225" height="160" fill="#F1F5F9" stroke="#334155" stroke-width="3"/>
        <rect x="595" y="10" width="225" height="160" fill="url(#kitchen-tile)" opacity="0.4"/>
        <text x="707" y="28" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#475569" letter-spacing="1">KITCHEN & PREP</text>
        
        <!-- Kitchen Cooktop (4 Burners) -->
        <rect x="612" y="38" width="56" height="34" fill="#334155" rx="2"/>
        <circle cx="626" cy="47" r="5" fill="#475569" stroke="#94A3B8" stroke-width="1"/>
        <circle cx="654" cy="47" r="5" fill="#475569" stroke="#94A3B8" stroke-width="1"/>
        <circle cx="626" cy="63" r="5" fill="#475569" stroke="#94A3B8" stroke-width="1"/>
        <circle cx="654" cy="63" r="5" fill="#475569" stroke="#94A3B8" stroke-width="1"/>
        <text x="640" y="80" text-anchor="middle" font-size="7" font-weight="700" fill="#64748B">RANGE</text>

        <!-- Kitchen Double Sink -->
        <rect x="682" y="38" width="50" height="34" fill="#CBD5E1" stroke="#475569" stroke-width="1.5"/>
        <line x1="707" y1="38" x2="707" y2="72" stroke="#475569" stroke-width="1.5"/>
        <circle cx="694" cy="55" r="3" fill="#64748B"/>
        <circle cx="720" cy="55" r="3" fill="#64748B"/>
        <text x="707" y="80" text-anchor="middle" font-size="7" font-weight="700" fill="#64748B">SINKS</text>

        <!-- Kitchen Prep Counter -->
        <rect x="746" y="38" width="60" height="34" fill="#E2E8F0" stroke="#94A3B8" stroke-width="1.5"/>
        <text x="776" y="58" text-anchor="middle" font-size="8" font-weight="700" fill="#64748B">PREP</text>

        <!-- Service Pass Window -->
        <line x1="615" y1="170" x2="720" y2="170" stroke="#B45309" stroke-width="4"/>
        <text x="667" y="165" text-anchor="middle" font-size="8" font-weight="800" fill="#B45309">SERVICE PASS</text>

        <!-- Storage Shelf -->
        <rect x="612" y="98" width="194" height="24" fill="#E2E8F0" stroke="#94A3B8" stroke-dasharray="3 2"/>
        <text x="709" y="114" text-anchor="middle" font-size="8" font-weight="700" fill="#64748B">STORAGE / DRY GOODS</text>

        <!-- ================= SECTION A: PRIVATE DINING ROOM ================= -->
        <rect x="595" y="174" width="225" height="162" fill="#F5EBE1" stroke="#334155" stroke-width="3"/>
        <text x="707" y="193" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#78350F" letter-spacing="1">SECTION A (PRIVATE)</text>

        <!-- Table A1 (Upper 6-Seater) -->
        ${(() => {
          const st = stationMap['section_a_1'] || { id: 'section_a_1', name: 'Table A1', assignment: null };
          const cx = 707;
          const cy = 236;
          const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
              <!-- 6 Chairs (3 Top, 3 Bottom) -->
              <rect x="645" y="196" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="694" y="196" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="743" y="196" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="645" y="252" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="694" y="252" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="743" y="252" width="26" height="8" rx="2" fill="#78350F"/>
              <!-- Long Table -->
              <rect x="630" y="206" width="154" height="44" rx="2" fill="#D97706" stroke="${isHighlighted ? '#F59E0B' : '#92400E'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
              <text x="${cx}" y="221" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#FFFFFF">Table A1 (6-Seat)</text>
              ${renderBadgeSvg(st, cx, cy)}
            </g>
          `;
        })()}

        <!-- Table A2 (Lower 6-Seater) -->
        ${(() => {
          const st = stationMap['section_a_2'] || { id: 'section_a_2', name: 'Table A2', assignment: null };
          const cx = 707;
          const cy = 305;
          const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
              <!-- 6 Chairs (3 Top, 3 Bottom) -->
              <rect x="645" y="266" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="694" y="266" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="743" y="266" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="645" y="322" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="694" y="322" width="26" height="8" rx="2" fill="#78350F"/>
              <rect x="743" y="322" width="26" height="8" rx="2" fill="#78350F"/>
              <!-- Long Table -->
              <rect x="630" y="276" width="154" height="44" rx="2" fill="#D97706" stroke="${isHighlighted ? '#F59E0B' : '#92400E'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
              <text x="${cx}" y="291" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#FFFFFF">Table A2 (6-Seat)</text>
              ${renderBadgeSvg(st, cx, cy)}
            </g>
          `;
        })()}

        <!-- ================= SECTION B: LOWER DINING ROOM ================= -->
        <rect x="415" y="342" width="175" height="126" fill="#F8FAFC" stroke="#334155" stroke-width="3"/>
        <!-- Door Gap -->
        <line x1="415" y1="365" x2="415" y2="405" stroke="#FDFBF7" stroke-width="4"/>
        <text x="502" y="360" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#64748B" letter-spacing="1">SECTION B</text>

        <!-- Table B1 (6-Seater) -->
        ${(() => {
          const st = stationMap['section_b_1'] || { id: 'section_b_1', name: 'Table B1', assignment: null };
          const cx = 502;
          const cy = 413;
          const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
              <!-- 6 Chairs -->
              <rect x="445" y="369" width="25" height="8" rx="2" fill="#78350F"/>
              <rect x="490" y="369" width="25" height="8" rx="2" fill="#78350F"/>
              <rect x="535" y="369" width="25" height="8" rx="2" fill="#78350F"/>
              <rect x="445" y="428" width="25" height="8" rx="2" fill="#78350F"/>
              <rect x="490" y="428" width="25" height="8" rx="2" fill="#78350F"/>
              <rect x="535" y="428" width="25" height="8" rx="2" fill="#78350F"/>
              <!-- Long Table -->
              <rect x="432" y="379" width="140" height="46" rx="2" fill="#D97706" stroke="${isHighlighted ? '#F59E0B' : '#92400E'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
              <text x="${cx}" y="396" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="900" fill="#FFFFFF">Table B1 (6-Seat)</text>
              ${renderBadgeSvg(st, cx, cy)}
            </g>
          `;
        })()}

        <!-- ================= BAR AREA (BOTTOM LEFT) ================= -->
        <rect x="25" y="342" width="255" height="126" fill="#F1F5F9" stroke="#94A3B8" stroke-dasharray="3 3"/>
        <text x="152" y="360" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="900" fill="#64748B" letter-spacing="1">BAR & COCKTAIL AREA</text>

        <!-- Curved Wooden Bar Counter -->
        <path d="M 40 376 L 225 376 Q 248 376 248 398 L 248 450 L 230 450 L 230 394 L 40 394 Z" fill="#78350F" stroke="#451A03" stroke-width="2"/>

        <!-- 4 Bar Stools -->
        <circle cx="65" cy="412" r="8.5" fill="#CBD5E1" stroke="#64748B" stroke-width="1.5"/>
        <circle cx="115" cy="412" r="8.5" fill="#CBD5E1" stroke="#64748B" stroke-width="1.5"/>
        <circle cx="165" cy="412" r="8.5" fill="#CBD5E1" stroke="#64748B" stroke-width="1.5"/>
        <circle cx="215" cy="412" r="8.5" fill="#CBD5E1" stroke="#64748B" stroke-width="1.5"/>

        <!-- Back Counter & Prep -->
        <rect x="40" y="448" width="180" height="14" fill="#334155"/>
        <rect x="115" y="450" width="30" height="9" fill="#94A3B8" stroke="#475569" stroke-width="1"/>

        <!-- Bar Interactive Station -->
        ${(() => {
          const st = stationMap['bar'] || { id: 'bar', name: 'Bar Counter', assignment: null };
          const cx = 135;
          const cy = 428;
          const isHighlighted = highlightedStaffId && st.assignment && st.assignment.staff_id === highlightedStaffId;
          return `
            <g class="fp-station ${isHighlighted ? 'highlighted' : ''}" data-station-id="${st.id}" style="cursor: pointer;">
              <rect x="55" y="396" width="160" height="46" rx="2" fill="rgba(15, 23, 42, 0.75)" stroke="${isHighlighted ? '#F59E0B' : '#38BDF8'}" stroke-width="${isHighlighted ? 2.5 : 1.5}"/>
              <text x="${cx}" y="411" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9.5" font-weight="900" fill="#F8FAFC">BAR STATION</text>
              ${renderBadgeSvg(st, cx, cy)}
            </g>
          `;
        })()}

        <!-- ================= RESTROOMS (BOTTOM RIGHT) ================= -->
        <rect x="595" y="342" width="225" height="126" fill="#F8FAFC" stroke="#334155" stroke-width="3"/>
        <line x1="707" y1="342" x2="707" y2="468" stroke="#334155" stroke-width="2"/>
        
        <!-- Men Restroom -->
        <text x="651" y="360" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#64748B">MEN</text>
        <rect x="610" y="375" width="36" height="38" fill="#E2E8F0" stroke="#94A3B8"/>
        <circle cx="628" cy="394" r="8" fill="#FFFFFF" stroke="#64748B"/>
        <!-- Urinal -->
        <rect x="660" y="375" width="14" height="20" rx="4" fill="#FFFFFF" stroke="#64748B"/>
        <!-- Sink -->
        <rect x="660" y="425" width="28" height="18" fill="#CBD5E1" stroke="#64748B"/>

        <!-- Women Restroom -->
        <text x="763" y="360" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="900" fill="#64748B">WOMEN</text>
        <rect x="720" y="375" width="36" height="38" fill="#E2E8F0" stroke="#94A3B8"/>
        <circle cx="738" cy="394" r="8" fill="#FFFFFF" stroke="#64748B"/>
        <rect x="770" y="375" width="36" height="38" fill="#E2E8F0" stroke="#94A3B8"/>
        <circle cx="788" cy="394" r="8" fill="#FFFFFF" stroke="#64748B"/>
        <!-- Sinks -->
        <rect x="735" y="425" width="55" height="18" fill="#CBD5E1" stroke="#64748B"/>

        <!-- ================= MAIN ENTRANCE (BOTTOM CENTER) ================= -->
        <g>
          <!-- Entrance Opening -->
          <rect x="290" y="452" width="100" height="24" fill="#FDFBF7"/>
          <line x1="290" y1="466" x2="330" y2="445" stroke="#0F172A" stroke-width="3"/>
          <path d="M 330 445 A 35 35 0 0 1 330 466" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>
          <line x1="390" y1="466" x2="350" y2="445" stroke="#0F172A" stroke-width="3"/>
          <path d="M 350 445 A 35 35 0 0 0 350 466" fill="none" stroke="#64748B" stroke-dasharray="2 2"/>
          <text x="340" y="475" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="8" font-weight="900" fill="#0F172A" letter-spacing="1">MAIN ENTRANCE</text>
        </g>
      </svg>
    `;

    container.innerHTML = svgHtml;

    // Attach click handlers to all stations
    container.querySelectorAll('.fp-station').forEach(el => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const stationId = el.getAttribute('data-station-id');
        if (stationId) {
          openTableAssignModal(stationId);
        }
      });
    });
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

  function openTableAssignModal(stationId) {
    const stations = AppState.floorPlanData.stations || [];
    const station = stations.find(s => s.id === stationId);
    if (!station) return;

    const modal = document.getElementById('modal-table-assign');
    const titleEl = document.getElementById('modal-table-assign-title');
    const nameEl = document.getElementById('assign-modal-station-name');
    const sectionEl = document.getElementById('assign-modal-section-info');
    const idInput = document.getElementById('assign-modal-station-id');
    const selectStaff = document.getElementById('select-assign-staff');
    const notesInput = document.getElementById('input-assign-notes');

    if (titleEl) titleEl.textContent = `ASSIGN WAITER - ${station.name.toUpperCase()}`;
    if (nameEl) nameEl.textContent = `${station.name} (${station.section})`;
    if (sectionEl) sectionEl.textContent = `Capacity: ${station.capacity || 4} Guests · Shift: ${AppState.floorPlanShift}`;
    if (idInput) idInput.value = stationId;

    const currentStaffId = station.assignment ? station.assignment.staff_id : null;
    const currentNotes = station.assignment ? station.assignment.notes : '';

    if (notesInput) notesInput.value = currentNotes || '';

    // Populate active staff options
    if (selectStaff) {
      const employees = AppState.floorPlanData.employees || [];
      let optionsHtml = '<option value="unassigned">[ Unassigned / None ]</option>';
      employees.forEach(emp => {
        const stat = FP_STATUS_MAP[emp.status] || FP_STATUS_MAP['P'];
        const isSelected = emp.id === currentStaffId ? 'selected' : '';
        optionsHtml += `<option value="${emp.id}" ${isSelected}>${escapeHtml(emp.code)} - ${escapeHtml(emp.name)} (${stat.label})</option>`;
      });
      selectStaff.innerHTML = optionsHtml;
    }

    if (modal) modal.classList.add('active');
  }

  function closeTableAssignModal() {
    const modal = document.getElementById('modal-table-assign');
    if (modal) modal.classList.remove('active');
  }

  async function saveTableAssignment() {
    const idInput = document.getElementById('assign-modal-station-id');
    const selectStaff = document.getElementById('select-assign-staff');
    const notesInput = document.getElementById('input-assign-notes');

    const stationId = idInput ? idInput.value : '';
    const staffId = selectStaff ? selectStaff.value : 'unassigned';
    const notes = notesInput ? notesInput.value.trim() : '';

    if (!stationId) return;

    try {
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
        showToast('Station assignment saved.');
        closeTableAssignModal();
        loadFloorPlanData();
      } else {
        showToast(data.message || 'Error saving assignment.');
      }
    } catch (err) {
      console.error(err);
      showToast('Could not save station assignment.');
    }
  }

  async function unassignTable() {
    const idInput = document.getElementById('assign-modal-station-id');
    const stationId = idInput ? idInput.value : '';
    if (!stationId) return;

    try {
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
        const code = document.getElementById('staff-input-code').value.trim();
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
            showToast(`New staff "${name}" (${data.staff.code}) created in database!`);
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

    if (btnSettingsOpen) btnSettingsOpen.addEventListener('click', openSettingsModal);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const inputName = document.getElementById('settings-business-name');

        if (inputName && inputName.value.trim()) {
          AppState.settings.businessName = inputName.value.trim();
          const displayHeader = document.getElementById('display-business-name');
          if (displayHeader) displayHeader.textContent = AppState.settings.businessName;
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

    const displayHeader = document.getElementById('display-business-name');
    if (displayHeader && AppState.settings.businessName) {
      displayHeader.textContent = AppState.settings.businessName;
    }

    initEventListeners();
    initFloorPlan();
    renderDailyView();
    renderMonthlyMatrix();
    renderAbsenteeReport();
    renderStaffDirectory();
    renderReminders();
    
    // Check due reminders every 15s
    setInterval(pollDueReminders, 15000);
    pollDueReminders();

    // Initial server state sync & reminders load
    syncFromDatabase();
    loadRemindersFromDatabase();

    // Register service worker for offline PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(err => {
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
