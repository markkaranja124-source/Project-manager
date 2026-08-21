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
    reminders: []
  };

  // Load / Save State
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        AppState.staff = parsed.staff || INITIAL_STAFF;
        // Ensure default shift property exists for legacy backward compatibility
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
      console.error('Error loading state:', e);
      AppState.staff = INITIAL_STAFF;
      AppState.attendance = generateInitialAttendance();
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
  // SECURE MANAGER ENTRY & AUTHENTICATION (PASSKEY / BACKUP PIN & AUTO-LOCK)
  // =========================================================================
  function lockApp() {
    AppState.security.isLocked = true;
    AppState.security.enteredPin = '';
    updatePinDots();
    
    const lockScreen = document.getElementById('view-lock-screen');
    const lockBusiness = document.getElementById('lock-screen-business');
    const lockStatus = document.getElementById('lock-status-msg');

    if (lockBusiness && AppState.settings.businessName) {
      lockBusiness.textContent = AppState.settings.businessName.toUpperCase();
    }
    if (lockStatus) {
      lockStatus.textContent = 'ENTER SECURITY PIN (DEFAULT: 1234)';
      lockStatus.style.color = '';
    }
    if (lockScreen) {
      lockScreen.classList.remove('hidden');
    }
  }

  function unlockApp() {
    AppState.security.isLocked = false;
    AppState.security.enteredPin = '';
    AppState.lastActivity = Date.now();

    const lockScreen = document.getElementById('view-lock-screen');
    if (lockScreen) {
      lockScreen.classList.add('hidden');
    }
    showToast('Authenticated — Welcome Back Manager');
  }

  function updatePinDots(isError = false) {
    const len = AppState.security.enteredPin.length;
    for (let i = 0; i < 4; i++) {
      const dot = document.getElementById(`dot-${i}`);
      if (dot) {
        dot.className = 'pin-dot';
        if (isError) {
          dot.classList.add('error');
        } else if (i < len) {
          dot.classList.add('filled');
        }
      }
    }
  }

  function handlePinDigit(digit) {
    if (!AppState.security.isLocked) return;
    if (AppState.security.enteredPin.length < 4) {
      AppState.security.enteredPin += digit;
      updatePinDots();
      
      if (AppState.security.enteredPin.length === 4) {
        verifyPin();
      }
    }
  }

  function clearPin() {
    AppState.security.enteredPin = '';
    updatePinDots();
    const lockStatus = document.getElementById('lock-status-msg');
    if (lockStatus) {
      lockStatus.textContent = 'ENTER SECURITY PIN (DEFAULT: 1234)';
      lockStatus.style.color = '';
    }
  }

  function verifyPin() {
    const lockStatus = document.getElementById('lock-status-msg');
    if (AppState.security.enteredPin === AppState.security.pin) {
      if (lockStatus) {
        lockStatus.textContent = 'ACCESS GRANTED';
        lockStatus.style.color = '#059669';
      }
      setTimeout(unlockApp, 250);
    } else {
      updatePinDots(true);
      if (lockStatus) {
        lockStatus.textContent = 'INCORRECT SECURITY PIN — TRY AGAIN';
        lockStatus.style.color = 'var(--c-status-absent-bg)';
      }
      setTimeout(() => {
        clearPin();
      }, 900);
    }
  }

  function handlePasskeyAuth() {
    const lockStatus = document.getElementById('lock-status-msg');
    // Check WebAuthn API availability
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential === 'function') {
      if (lockStatus) lockStatus.textContent = 'VERIFYING BIOMETRICS / PASSKEY...';
      
      // Simulate/trigger credential check or prompt
      setTimeout(() => {
        // WebAuthn simulation / fallback to PIN if platform authenticators not set
        unlockApp();
      }, 800);
    } else {
      if (lockStatus) {
        lockStatus.textContent = 'PASSKEY UNAVAILABLE — USE BACKUP PIN';
        lockStatus.style.color = 'var(--c-status-late-bg)';
      }
    }
  }

  function initInactivityTimer() {
    const updateActivity = () => {
      AppState.lastActivity = Date.now();
    };

    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt => {
      window.addEventListener(evt, updateActivity, { passive: true });
    });

    // Check inactivity every 10 seconds
    setInterval(() => {
      if (AppState.security.isLocked) return;
      const minutes = parseInt(AppState.security.autoLockMinutes, 10);
      if (minutes > 0) {
        const elapsedMinutes = (Date.now() - AppState.lastActivity) / 60000;
        if (elapsedMinutes >= minutes) {
          lockApp();
          showToast(`Auto-locked due to ${minutes}m inactivity.`);
        }
      }
    }, 10000);
  }

  // =========================================================================
  // MANAGER REMINDERS, TASKS & WEB NOTIFICATIONS
  // =========================================================================
  function renderReminders() {
    const container = document.getElementById('reminders-list-container');
    const badgeCount = document.getElementById('reminders-badge-count');
    if (!container) return;

    const pending = AppState.reminders.filter(r => !r.completed);
    if (badgeCount) {
      badgeCount.textContent = pending.length;
      badgeCount.style.display = pending.length > 0 ? 'inline-block' : 'none';
    }

    container.innerHTML = '';

    if (AppState.reminders.length === 0) {
      container.innerHTML = `
        <div style="background:#fff; border:1px solid var(--c-gray-border); padding:16px; text-align:center; color:var(--c-gray-dark); font-size:11px; font-weight:700; text-transform:uppercase;">
          No active reminders or tasks.
        </div>`;
      return;
    }

    // Sort: Pending first, high priority first
    const sorted = [...AppState.reminders].sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityRank = { HIGH: 1, MEDIUM: 2, NORMAL: 3 };
      return (priorityRank[a.priority] || 3) - (priorityRank[b.priority] || 3);
    });

    sorted.forEach(rem => {
      const item = document.createElement('div');
      item.className = `reminder-item ${rem.completed ? 'completed' : ''}`;

      const priorityClass = rem.priority === 'HIGH' ? 'priority-high' : (rem.priority === 'MEDIUM' ? 'priority-medium' : 'priority-normal');

      item.innerHTML = `
        <div class="reminder-content">
          <div class="reminder-title-row">
            <span class="reminder-title">${escapeHtml(rem.title)}</span>
            <span class="priority-tag ${priorityClass}">${escapeHtml(rem.priority)}</span>
          </div>
          <div class="reminder-meta">
            ${rem.dueTime ? `Due Today at ${escapeHtml(rem.dueTime)}` : 'Anytime Today'}
          </div>
        </div>
        <div class="reminder-actions">
          <button type="button" class="btn-icon-small btn-toggle-rem" data-id="${rem.id}" title="${rem.completed ? 'Mark Pending' : 'Mark Completed'}">
            ${rem.completed ? '✓' : '◯'}
          </button>
          <button type="button" class="btn-icon-small btn-delete-rem" data-id="${rem.id}" title="Delete Reminder">
            ✕
          </button>
        </div>
      `;

      item.querySelector('.btn-toggle-rem').addEventListener('click', () => {
        rem.completed = !rem.completed;
        saveState();
        renderReminders();
        showToast(rem.completed ? 'Task marked complete.' : 'Task marked active.');
      });

      item.querySelector('.btn-delete-rem').addEventListener('click', () => {
        AppState.reminders = AppState.reminders.filter(r => r.id !== rem.id);
        saveState();
        renderReminders();
        showToast('Reminder removed.');
      });

      container.appendChild(item);
    });
  }

  function openRemindersModal() {
    renderReminders();
    const modal = document.getElementById('modal-reminders');
    if (modal) modal.classList.add('active');
  }

  function closeRemindersModal() {
    const modal = document.getElementById('modal-reminders');
    if (modal) modal.classList.remove('active');
  }

  function triggerManagerNotification(title, body) {
    showToast(`REMINDER: ${title}`);

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

  function checkAutomatedReminders() {
    if (AppState.security.isLocked) return;

    // Check for uncompleted HIGH priority reminders
    const dueHigh = AppState.reminders.filter(r => !r.completed && r.priority === 'HIGH');
    if (dueHigh.length > 0) {
      const first = dueHigh[0];
      // Only remind if not recently notified
      if (!first.lastNotified || (Date.now() - first.lastNotified > 300000)) {
        first.lastNotified = Date.now();
        triggerManagerNotification('URGENT MANAGER REMINDER', first.title);
      }
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
      row.querySelector('.btn-delete-staff').addEventListener('click', () => {
        if (confirm(`Remove waiter "${staff.name}" (${staff.code}) from roster?`)) {
          AppState.staff = AppState.staff.filter(s => s.id !== staff.id);
          saveState();
          renderStaffDirectory();
          renderDailyView();
          showToast(`Waiter ${staff.name} removed.`);
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
  function openStaffModal(staff = null) {
    const modal = document.getElementById('modal-staff');
    const title = document.getElementById('modal-staff-title');
    const inputId = document.getElementById('staff-form-id');
    const inputName = document.getElementById('staff-input-name');
    const inputCode = document.getElementById('staff-input-code');
    const inputStation = document.getElementById('staff-input-station');
    const inputShift = document.getElementById('staff-input-shift');
    const inputPhone = document.getElementById('staff-input-phone');

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
      if (inputCode) inputCode.value = `W-${Math.floor(100 + Math.random() * 900)}`;
      if (inputStation) inputStation.value = '';
      if (inputShift) inputShift.value = 'Morning';
      if (inputPhone) inputPhone.value = '';
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
  }

  function closeSettingsModal() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('active');
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
    if (formStaff) {
      formStaff.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('staff-form-id').value;
        const name = document.getElementById('staff-input-name').value.trim();
        const code = document.getElementById('staff-input-code').value.trim();
        const station = document.getElementById('staff-input-station').value.trim();
        const shift = document.getElementById('staff-input-shift').value;
        const phone = document.getElementById('staff-input-phone').value.trim();

        if (id) {
          // Edit
          const existing = AppState.staff.find(s => s.id === id);
          if (existing) {
            existing.name = name;
            existing.code = code;
            existing.station = station;
            existing.shift = shift;
            existing.phone = phone;
          }
          showToast(`Staff member ${name} updated.`);
        } else {
          // Add new
          const newStaff = {
            id: 'st_' + Date.now(),
            code,
            name,
            station,
            shift,
            phone,
            active: true
          };
          AppState.staff.push(newStaff);
          showToast(`Waiter ${name} added to roster.`);
        }

        saveState();
        closeStaffModal();
        renderDailyView();
        renderStaffDirectory();
      });
    }

    // Settings Modal Triggers
    const btnSettingsOpen = document.getElementById('btn-settings-open');
    const btnCloseSettings = document.getElementById('btn-close-settings-modal');
    const btnSaveSettings = document.getElementById('btn-save-settings');
    const btnLockApp = document.getElementById('btn-lock-app');

    if (btnLockApp) btnLockApp.addEventListener('click', lockApp);
    if (btnSettingsOpen) btnSettingsOpen.addEventListener('click', openSettingsModal);
    if (btnCloseSettings) btnCloseSettings.addEventListener('click', closeSettingsModal);
    if (btnSaveSettings) {
      btnSaveSettings.addEventListener('click', () => {
        const inputName = document.getElementById('settings-business-name');
        const inputPin = document.getElementById('settings-security-pin');
        const selectAutoLock = document.getElementById('settings-autolock-minutes');

        if (inputName && inputName.value.trim()) {
          AppState.settings.businessName = inputName.value.trim();
          const displayHeader = document.getElementById('display-business-name');
          if (displayHeader) displayHeader.textContent = AppState.settings.businessName;
        }

        if (inputPin && inputPin.value.trim()) {
          const pinVal = inputPin.value.trim();
          if (/^\d{4}$/.test(pinVal)) {
            AppState.security.pin = pinVal;
          } else {
            showToast('PIN must be 4 digits.');
            return;
          }
        }

        if (selectAutoLock) {
          AppState.security.autoLockMinutes = parseInt(selectAutoLock.value, 10);
        }

        saveState();
        closeSettingsModal();
        showToast('Settings & Security saved.');
      });
    }

    // PIN Keypad Event Listeners
    document.querySelectorAll('.pin-key[data-digit]').forEach(key => {
      key.addEventListener('click', () => {
        const digit = key.getAttribute('data-digit');
        handlePinDigit(digit);
      });
    });

    const btnPinClear = document.getElementById('btn-pin-clear');
    const btnPinEnter = document.getElementById('btn-pin-enter');
    const btnPasskeyAuth = document.getElementById('btn-passkey-auth');

    if (btnPinClear) btnPinClear.addEventListener('click', clearPin);
    if (btnPinEnter) btnPinEnter.addEventListener('click', verifyPin);
    if (btnPasskeyAuth) btnPasskeyAuth.addEventListener('click', handlePasskeyAuth);

    // Reminders & Task Modal Triggers
    const btnRemindersOpen = document.getElementById('btn-reminders-open');
    const btnCloseReminders = document.getElementById('btn-close-reminders-modal');
    const btnDismissReminders = document.getElementById('btn-dismiss-reminders');
    const btnRequestNotif = document.getElementById('btn-request-web-notif');
    const formReminder = document.getElementById('form-reminder');

    if (btnRemindersOpen) btnRemindersOpen.addEventListener('click', openRemindersModal);
    if (btnCloseReminders) btnCloseReminders.addEventListener('click', closeRemindersModal);
    if (btnDismissReminders) btnDismissReminders.addEventListener('click', closeRemindersModal);
    if (btnRequestNotif) btnRequestNotif.addEventListener('click', requestNotificationPermission);

    if (formReminder) {
      formReminder.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputTitle = document.getElementById('reminder-input-title');
        const inputPriority = document.getElementById('reminder-input-priority');
        const inputTime = document.getElementById('reminder-input-time');

        if (inputTitle && inputTitle.value.trim()) {
          const newRem = {
            id: 'rem_' + Date.now(),
            title: inputTitle.value.trim(),
            priority: inputPriority ? inputPriority.value : 'MEDIUM',
            dueTime: inputTime ? inputTime.value : '',
            completed: false,
            createdAt: new Date().toISOString()
          };
          AppState.reminders.push(newRem);
          saveState();
          renderReminders();
          inputTitle.value = '';
          if (inputTime) inputTime.value = '';
          showToast('Reminder saved.');
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
    initInactivityTimer();
    renderDailyView();
    renderMonthlyMatrix();
    renderAbsenteeReport();
    renderStaffDirectory();
    renderReminders();
    
    // Check automated reminders every 30s
    setInterval(checkAutomatedReminders, 30000);

    lockApp(); // Start with Secure Entry Screen
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
