(function () {
  'use strict';

  var LS_TIMER = 'tutortime_timer_stats';
  var LS_TASKS = 'tutortime_tasks';
  var LS_PLAN_PREFIX = 'tutortime_planner_';
  var LS_CUSTOM_MIN = 'tutortime_custom_focus_min';

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function formatTime(totalSec) {
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return pad(m) + ':' + pad(s);
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function loadCustomMinutes() {
    try {
      var v = parseInt(localStorage.getItem(LS_CUSTOM_MIN), 10);
      if (isNaN(v)) return 25;
      return clamp(v, 1, 180);
    } catch (e) {
      return 25;
    }
  }

  function saveCustomMinutes(mins) {
    try {
      localStorage.setItem(LS_CUSTOM_MIN, String(mins));
    } catch (e) {}
  }

  function initTimer() {
    var modes = {
      pomodoro: { label: 'Pomodoro', seconds: 25 * 60 },
      short: { label: 'Short break', seconds: 5 * 60 },
      long: { label: 'Long break', seconds: 15 * 60 },
      custom: { label: 'Custom focus', seconds: loadCustomMinutes() * 60 },
    };

    var modeKey = 'pomodoro';
    var remaining = modes.pomodoro.seconds;
    var total = modes.pomodoro.seconds;
    var running = false;
    var tickId = null;

    var elTime = document.getElementById('timer-time');
    var elRing = document.getElementById('timer-ring');
    var elModeLabel = document.getElementById('timer-mode-label');
    var elCompleted = document.getElementById('stat-completed');
    var chips = document.querySelectorAll('.mode-chip');
    var btnPlay = document.getElementById('btn-timer-play');
    var btnPause = document.getElementById('btn-timer-pause');
    var btnReset = document.getElementById('btn-timer-reset');
    var customPanel = document.getElementById('timer-custom-panel');
    var customInput = document.getElementById('custom-focus-min');
    var btnCustomApply = document.getElementById('btn-custom-apply');

    function syncCustomSecondsFromStorage() {
      var m = loadCustomMinutes();
      if (customInput) customInput.value = String(m);
      modes.custom.seconds = m * 60;
      modes.custom.label = 'Custom focus · ' + m + ' min';
    }

    function loadStats() {
      try {
        var raw = localStorage.getItem(LS_TIMER);
        return raw ? JSON.parse(raw) : { completed: 0 };
      } catch (e) {
        return { completed: 0 };
      }
    }

    function saveStats(stats) {
      try {
        localStorage.setItem(LS_TIMER, JSON.stringify(stats));
      } catch (e) {}
    }

    var stats = loadStats();
    if (elCompleted) elCompleted.textContent = String(stats.completed);

    function setMode(key) {
      if (key === 'custom') {
        syncCustomSecondsFromStorage();
      }
      modeKey = key;
      total = modes[key].seconds;
      remaining = total;
      running = false;
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
      if (elModeLabel) elModeLabel.textContent = modes[key].label;
      chips.forEach(function (c) {
        c.classList.toggle('active', c.getAttribute('data-mode') === key);
      });
      if (customPanel) {
        customPanel.classList.toggle('is-visible', key === 'custom');
      }
      updateDisplay();
      syncButtons();
    }

    function updateDisplay() {
      if (elTime) elTime.textContent = formatTime(remaining);
      if (elRing) {
        var p = total > 0 ? ((total - remaining) / total) * 100 : 0;
        elRing.style.setProperty('--p', String(p));
      }
    }

    function syncButtons() {
      if (btnPlay) btnPlay.style.display = running ? 'none' : 'inline-flex';
      if (btnPause) btnPause.style.display = running ? 'inline-flex' : 'none';
    }

    function onComplete() {
      running = false;
      if (tickId) {
        clearInterval(tickId);
        tickId = null;
      }
      if (modeKey === 'pomodoro' || modeKey === 'custom') {
        stats.completed += 1;
        saveStats(stats);
        if (elCompleted) elCompleted.textContent = String(stats.completed);
      }
      remaining = total;
      updateDisplay();
      syncButtons();
    }

    function tick() {
      if (remaining <= 0) {
        onComplete();
        return;
      }
      remaining -= 1;
      updateDisplay();
      if (remaining <= 0) onComplete();
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        var key = chip.getAttribute('data-mode');
        if (key && modes[key]) setMode(key);
      });
    });

    if (btnCustomApply && customInput) {
      btnCustomApply.addEventListener('click', function () {
        var m = clamp(parseInt(customInput.value, 10) || 25, 1, 180);
        customInput.value = String(m);
        saveCustomMinutes(m);
        syncCustomSecondsFromStorage();
        if (modeKey === 'custom') {
          total = modes.custom.seconds;
          remaining = total;
          running = false;
          if (tickId) {
            clearInterval(tickId);
            tickId = null;
          }
          if (elModeLabel) elModeLabel.textContent = modes.custom.label;
          updateDisplay();
          syncButtons();
        }
      });
    }

    if (btnPlay) {
      btnPlay.addEventListener('click', function () {
        if (modeKey === 'custom') syncCustomSecondsFromStorage();
        if (remaining <= 0) remaining = total;
        running = true;
        syncButtons();
        if (tickId) clearInterval(tickId);
        tickId = setInterval(tick, 1000);
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', function () {
        running = false;
        if (tickId) {
          clearInterval(tickId);
          tickId = null;
        }
        syncButtons();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', function () {
        running = false;
        if (tickId) {
          clearInterval(tickId);
          tickId = null;
        }
        if (modeKey === 'custom') syncCustomSecondsFromStorage();
        total = modes[modeKey].seconds;
        remaining = total;
        updateDisplay();
        syncButtons();
      });
    }

    syncCustomSecondsFromStorage();
    setMode('pomodoro');
  }

  function uid() {
    return 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normalizePriority(p) {
    if (p === 'high' || p === 'low') return p;
    return 'medium';
  }

  function prioRank(p) {
    if (p === 'high') return 0;
    if (p === 'medium') return 1;
    return 2;
  }

  function initTasks() {
    var input = document.getElementById('task-input');
    var btnAdd = document.getElementById('task-add');
    var list = document.getElementById('task-list');
    var empty = document.getElementById('task-empty');
    var prioButtons = document.querySelectorAll('.priority-segment button');
    var selectedPriority = 'medium';

    prioButtons.forEach(function (b) {
      b.addEventListener('click', function () {
        selectedPriority = b.getAttribute('data-priority') || 'medium';
        prioButtons.forEach(function (x) {
          x.classList.toggle('is-on', x === b);
        });
      });
    });

    function load() {
      try {
        var raw = localStorage.getItem(LS_TASKS);
        var arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        return arr.map(function (item) {
          item.priority = normalizePriority(item.priority);
          return item;
        });
      } catch (e) {
        return [];
      }
    }

    function save(items) {
      try {
        localStorage.setItem(LS_TASKS, JSON.stringify(items));
      } catch (e) {}
    }

    var items = load();

    function sortedItems() {
      return items.slice().sort(function (a, b) {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return prioRank(a.priority) - prioRank(b.priority);
      });
    }

    function render() {
      if (!list) return;
      list.innerHTML = '';
      if (items.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }
      if (empty) empty.hidden = true;

      sortedItems().forEach(function (item) {
        var li = document.createElement('li');
        li.className =
          'task-item task-item--' +
          item.priority +
          (item.done ? ' done' : '');
        li.dataset.id = item.id;

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !!item.done;
        cb.setAttribute('aria-label', 'Mark complete');
        cb.addEventListener('change', function () {
          item.done = cb.checked;
          save(items);
          render();
        });

        var main = document.createElement('div');
        main.className = 'task-main';

        var span = document.createElement('span');
        span.className = 'task-title';
        span.textContent = item.title;

        var badge = document.createElement('span');
        badge.className = 'task-badge task-badge--' + item.priority;
        badge.textContent =
          item.priority === 'high'
            ? 'High'
            : item.priority === 'low'
              ? 'Low'
              : 'Medium';

        main.appendChild(span);
        main.appendChild(badge);

        var sel = document.createElement('select');
        sel.className = 'task-priority-select';
        sel.setAttribute('aria-label', 'Priority');
        ['high', 'medium', 'low'].forEach(function (p) {
          var o = document.createElement('option');
          o.value = p;
          o.textContent =
            p === 'high' ? 'High' : p === 'low' ? 'Low' : 'Medium';
          if (item.priority === p) o.selected = true;
          sel.appendChild(o);
        });
        sel.addEventListener('change', function () {
          item.priority = normalizePriority(sel.value);
          save(items);
          render();
        });

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'task-delete';
        del.setAttribute('aria-label', 'Delete task');
        del.innerHTML =
          '<svg class="icon" aria-hidden="true"><use href="#i-delete"></use></svg>';
        del.addEventListener('click', function () {
          items = items.filter(function (x) {
            return x.id !== item.id;
          });
          save(items);
          render();
        });

        li.appendChild(cb);
        li.appendChild(main);
        li.appendChild(sel);
        li.appendChild(del);
        list.appendChild(li);
      });
    }

    function addTask() {
      if (!input) return;
      var title = input.value.trim();
      if (!title) return;
      items.push({
        id: uid(),
        title: title,
        done: false,
        priority: normalizePriority(selectedPriority),
      });
      save(items);
      input.value = '';
      render();
    }

    if (btnAdd) btnAdd.addEventListener('click', addTask);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          addTask();
        }
      });
    }

    render();
  }

  function initPlanner() {
    var dateEl = document.getElementById('planner-date');
    var morning = document.getElementById('planner-morning');
    var afternoon = document.getElementById('planner-afternoon');
    var evening = document.getElementById('planner-evening');
    var btnSave = document.getElementById('planner-save');

    function todayStr() {
      var d = new Date();
      return d.toISOString().slice(0, 10);
    }

    function loadForDate(dateStr) {
      try {
        var raw = localStorage.getItem(LS_PLAN_PREFIX + dateStr);
        if (!raw) return { morning: '', afternoon: '', evening: '' };
        return JSON.parse(raw);
      } catch (e) {
        return { morning: '', afternoon: '', evening: '' };
      }
    }

    function saveForDate(dateStr, data) {
      try {
        localStorage.setItem(LS_PLAN_PREFIX + dateStr, JSON.stringify(data));
      } catch (e) {}
    }

    function fill() {
      var ds = dateEl && dateEl.value ? dateEl.value : todayStr();
      var data = loadForDate(ds);
      if (morning) morning.value = data.morning || '';
      if (afternoon) afternoon.value = data.afternoon || '';
      if (evening) evening.value = data.evening || '';
    }

    if (dateEl && !dateEl.value) dateEl.value = todayStr();

    if (dateEl) {
      dateEl.addEventListener('change', fill);
    }

    if (btnSave) {
      btnSave.addEventListener('click', function () {
        var ds = dateEl && dateEl.value ? dateEl.value : todayStr();
        saveForDate(ds, {
          morning: morning ? morning.value : '',
          afternoon: afternoon ? afternoon.value : '',
          evening: evening ? evening.value : '',
        });
        btnSave.textContent = 'Saved';
        setTimeout(function () {
          btnSave.textContent = 'Save day';
        }, 1500);
      });
    }

    fill();
  }

  function initFocusMode() {
    var btnEnter = document.getElementById('btn-focus-enter');
    var overlay = document.getElementById('focus-overlay');
    var btnExit = document.getElementById('btn-focus-exit');
    var btnExit2 = document.getElementById('btn-focus-exit-2');

    function open() {
      if (!overlay) return;
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }

    function close() {
      if (!overlay) return;
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }

    if (btnEnter) btnEnter.addEventListener('click', open);
    if (btnExit) btnExit.addEventListener('click', close);
    if (btnExit2) btnExit2.addEventListener('click', close);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay && overlay.classList.contains('is-open')) close();
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var page = document.body.getAttribute('data-page');
    if (page === 'timer') initTimer();
    else if (page === 'tasks') initTasks();
    else if (page === 'planner') initPlanner();
    else if (page === 'focus') initFocusMode();
  });
})();
