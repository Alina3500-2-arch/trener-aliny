/* Shared by the planner and its widgets. One-off tasks stay on their original date
   and appear in today's list while overdue. Recurring tasks are generated from a
   schedule, with completion and skips saved independently for each date. */
window.PlannerCore = (function () {
  'use strict';
  var KEY = 'alina-daily-tasks-v1';
  var NOTES_KEY = 'alina-planner-notes-v1';
  var SERIES = '$series';
  var NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parse(k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
  function shift(k, days) {
    var date = parse(k);
    date.setDate(date.getDate() + days);
    return key(date);
  }
  function short(k) { return SHORT[parse(k).getDay()]; }

  function weekDays(now) {
    now = now || new Date();
    var monday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    return NAMES.map(function (name, i) {
      var d = new Date(monday); d.setDate(monday.getDate() + i);
      return { name: name, num: d.getDate(), date: key(d) };
    });
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(db) { localStorage.setItem(KEY, JSON.stringify(db)); }

  function taskDates(db) { return Object.keys(db).filter(function (day) { return Array.isArray(db[day]); }); }
  function series(db) { return db[SERIES] || {}; }

  function occurrence(rule, day) {
    if (!rule || day < rule.from || (rule.until && day >= rule.until) || rule.skipped?.[day]) return null;
    if (!rule.weekdays.includes(parse(day).getDay())) return null;
    return { id: rule.id, title: rule.title, time: rule.time, link: rule.link, done: !!rule.done?.[day], recurring: true };
  }

  function startSeries(db, day, task, weekdays, done) {
    var rules = db[SERIES] ||= {};
    var id = 'repeat:' + task.id;
    rules[id] = { ...task, id: id, from: day, weekdays: weekdays, done: done || {} };
    return id;
  }

  function reviseSeries(db, day, id, task, weekdays) {
    var rules = series(db), rule = rules[id];
    var until = rule.until;
    var done = Object.fromEntries(Object.entries(rule.done || {}).filter(function ([date]) { return date >= day; }));
    var skipped = Object.fromEntries(Object.entries(rule.skipped || {}).filter(function ([date]) { return date >= day; }));
    if (day <= rule.from) delete rules[id];
    else rule.until = day;
    var newId = startSeries(db, day, task, weekdays, done);
    rules[newId].historyId = rule.historyId || rule.id;
    rules[newId].skipped = skipped;
    rules[newId].until = until;
  }

  function removeOccurrence(db, day, id, wholeSeries) {
    var rules = series(db), rule = rules[id];
    if (!rule) return;
    if (wholeSeries) {
      if (day <= rule.from) delete rules[id];
      else rule.until = day;
    } else {
      (rule.skipped ||= {})[day] = true;
    }
  }

  function monthHistory(db, id, month, today) {
    var rule = series(db)[id];
    if (!rule) return [];
    var historyId = rule.historyId || rule.id;
    var versions = Object.values(series(db)).filter(function (r) { return (r.historyId || r.id) === historyId; });
    var first = parse(month + '-01');
    var length = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return Array.from({ length: length }, function (_, index) {
      var day = month + '-' + String(index + 1).padStart(2, '0');
      var task = versions.map(function (version) { return occurrence(version, day); }).find(Boolean);
      return { date: day, state: !task ? 'none' : task.done ? 'done' : day < today ? 'missed' : 'open' };
    });
  }

  function notes() {
    try {
      var data = JSON.parse(localStorage.getItem(NOTES_KEY) || 'null');
      if (data && Array.isArray(data.notes) && Array.isArray(data.folders)) return data;
    } catch (e) {}
    return { notes: [], folders: [], pinned: null };
  }

  // Folds the old «carry-…» copies back into their originals (one-time cleanup).
  function migrate(db) {
    var changed = false, copies = [];
    taskDates(db).forEach(function (day) {
      (db[day] || []).forEach(function (t) { if (t && (t.origin || /^carry-/.test(String(t.id)))) copies.push({ day: day, t: t }); });
    });
    copies.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    function findOriginal(id) {
      var found = null;
      taskDates(db).forEach(function (day) { (db[day] || []).forEach(function (t) { if (String(t.id) === String(id) && !t.origin) found = t; }); });
      return found;
    }
    copies.forEach(function (c) {
      var orig = findOriginal(c.t.origin || String(c.t.id).replace(/^carry-(.*)-\d{4}-\d{2}-\d{2}$/, '$1'));
      if (orig && c.t.done && !orig.done) { orig.done = true; orig.doneDate = c.day; }
      else if (orig && c.t.done && orig.done && !orig.doneDate) { orig.doneDate = c.day; }
    });
    taskDates(db).forEach(function (day) {
      var before = (db[day] || []).length;
      db[day] = (db[day] || []).filter(function (t) { return t && !(t.origin || /^carry-/.test(String(t.id))); });
      if (db[day].length !== before) changed = true;
      db[day].forEach(function (t) {
        if ('carriedTo' in t) { delete t.carriedTo; changed = true; }
        if ('overdue' in t) { delete t.overdue; changed = true; }
      });
    });
    if (copies.length) changed = true;
    return changed;
  }

  function byTime(arr) {
    return arr.map(function (t, n) { return { t: t, n: n }; }).sort(function (a, b) {
      var ta = a.t.time || '', tb = b.t.time || '';
      return ((ta ? 0 : 1) - (tb ? 0 : 1)) || (ta < tb ? -1 : ta > tb ? 1 : 0) || a.n - b.n;
    }).map(function (x) { return x.t; });
  }

  // What each tile of the week shows. state: open | done | overdue | missed.
  function view(db, today, days) {
    today = today || key(new Date());
    days = days || weekDays(parse(today));
    var all = [];
    taskDates(db).forEach(function (day) { (db[day] || []).forEach(function (t) { if (t && t.title) all.push({ day: day, t: t }); }); });
    function item(day, t, state, note, tappable) {
      return { id: String(t.id), day: day, title: String(t.title), time: t.time || '', state: state, note: note || '', tappable: !!tappable, source: t.source || '' };
    }
    return days.map(function (D) {
      var repeated = Object.values(series(db)).map(function (rule) {
        var t = occurrence(rule, D.date);
        if (!t) return null;
        var state = t.done ? 'done' : D.date < today ? 'missed' : 'open';
        var schedule = rule.weekdays.length === 7 ? 'Каждый день' :
          NAMES.filter(function (_, i) { return rule.weekdays.includes((i + 1) % 7); }).join(' · ');
        return { ...item(D.date, t, state, '', D.date >= today), recurring: true, schedule: schedule };
      }).filter(Boolean);
      var items = [];
      (db[D.date] || []).forEach(function (t) {
        if (!t || !t.title) return;
        var doneOn = t.done ? (t.doneDate || D.date) : null;
        if (D.date < today) {
          if (t.done && doneOn <= D.date) items.push(item(D.date, t, 'done', '', false));
          else items.push(item(D.date, t, 'missed', t.done ? '→ ' + short(doneOn) : '→ сегодня', false));
        } else {
          items.push(item(D.date, t, t.done ? 'done' : 'open', '', true));
        }
      });
      if (D.date === today) {
        all.forEach(function (x) {
          if (x.day >= today) return;
          if (!x.t.done) items.push(item(x.day, x.t, 'overdue', 'с ' + short(x.day), true));
          else if (x.t.doneDate === today) items.push(item(x.day, x.t, 'done', 'с ' + short(x.day), true));
        });
      } else if (D.date < today) {
        all.forEach(function (x) {
          if (x.day < D.date && x.t.done && x.t.doneDate === D.date) items.push(item(x.day, x.t, 'done', 'с ' + short(x.day), false));
        });
      }
      return { date: D.date, label: D.name, num: D.num, isToday: D.date === today, items: byTime(repeated).concat(byTime(items)) };
    });
  }

  // Done / total over this week's tasks plus anything still overdue.
  function counts(view) {
    var seen = {}, done = 0, total = 0;
    view.forEach(function (d) {
      d.items.forEach(function (i) {
        if (i.state === 'missed' && !i.recurring) return;
        var k = i.day + '|' + i.id; if (seen[k]) return; seen[k] = 1;
        total++; if (i.state === 'done') done++;
      });
    });
    return { done: done, total: total };
  }

  function find(db, day, id) {
    return occurrence(series(db)[id], day) || (db[day] || []).find(function (t) { return String(t.id) === String(id); }) || null;
  }

  function setDone(db, day, id, value, today) {
    var t = find(db, day, id); if (!t) return null;
    t.done = !!value;
    if (t.recurring) {
      var done = series(db)[id].done ||= {};
      if (value) done[day] = true;
      else delete done[day];
      return t;
    }
    if (t.done) t.doneDate = (today || key(new Date())) > day ? (today || key(new Date())) : day;
    else delete t.doneDate;
    return t;
  }

  // Payload for the iOS widget: same tiles, ready to draw.
  function payload(db, today) {
    today = today || key(new Date());
    var days = weekDays(parse(today)).concat(weekDays(parse(shift(today, 7))));
    var v = view(db, today, days), noteData = notes();
    var pinned = noteData.notes.find(function (n) { return n.id === noteData.pinned; });
    return {
      pinnedNote: pinned ? { title: pinned.title || pinned.body.slice(0, 80), body: pinned.body.slice(0, 160) } : null,
      days: v.map(function (d) {
        return {
          date: d.date, label: d.label,
          tasks: d.items.map(function (i) {
            var o = { id: i.id, title: i.title, done: i.state === 'done', overdue: i.state === 'overdue', state: i.state, day: i.day, tappable: i.tappable, recurring: !!i.recurring };
            if (i.time) o.time = i.time;
            if (i.note) o.note = i.note;
            if (i.schedule) o.schedule = i.schedule;
            return o;
          })
        };
      })
    };
  }

  return { KEY: KEY, NOTES_KEY: NOTES_KEY, notes: notes, key: key, short: short, weekDays: weekDays, load: load, save: save, migrate: migrate, taskDates: taskDates, view: view, counts: counts, find: find, series: series, monthHistory: monthHistory, startSeries: startSeries, reviseSeries: reviseSeries, removeOccurrence: removeOccurrence, setDone: setDone, payload: payload };
})();
