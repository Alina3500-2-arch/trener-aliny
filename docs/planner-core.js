/* Planner rules shared by the «Дела» tab (tasks.html) and the widget sync in index.html.
   A task lives only in its own day. If it is not done by the end of that day it stays there
   as «missed» (red ✗) and shows up in today's tile as «overdue» (red !) until it is done;
   doneDate records the day it was actually done. No copies are ever made. */
window.PlannerCore = (function () {
  'use strict';
  var KEY = 'alina-daily-tasks-v1';
  var NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  var SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

  function key(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parse(k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
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

  // Folds the old «carry-…» copies back into their originals (one-time cleanup).
  function migrate(db) {
    var changed = false, copies = [];
    Object.keys(db).forEach(function (day) {
      (db[day] || []).forEach(function (t) { if (t && (t.origin || /^carry-/.test(String(t.id)))) copies.push({ day: day, t: t }); });
    });
    copies.sort(function (a, b) { return a.day < b.day ? -1 : a.day > b.day ? 1 : 0; });
    function findOriginal(id) {
      var found = null;
      Object.keys(db).forEach(function (day) { (db[day] || []).forEach(function (t) { if (String(t.id) === String(id) && !t.origin) found = t; }); });
      return found;
    }
    copies.forEach(function (c) {
      var orig = findOriginal(c.t.origin || String(c.t.id).replace(/^carry-(.*)-\d{4}-\d{2}-\d{2}$/, '$1'));
      if (orig && c.t.done && !orig.done) { orig.done = true; orig.doneDate = c.day; }
      else if (orig && c.t.done && orig.done && !orig.doneDate) { orig.doneDate = c.day; }
    });
    Object.keys(db).forEach(function (day) {
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
    Object.keys(db).forEach(function (day) { (db[day] || []).forEach(function (t) { if (t && t.title) all.push({ day: day, t: t }); }); });
    function item(day, t, state, note, tappable) {
      return { id: String(t.id), day: day, title: String(t.title), time: t.time || '', state: state, note: note || '', tappable: !!tappable, source: t.source || '' };
    }
    return days.map(function (D) {
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
      return { date: D.date, label: D.name, num: D.num, isToday: D.date === today, items: byTime(items) };
    });
  }

  // Done / total over this week's tasks plus anything still overdue.
  function counts(view) {
    var seen = {}, done = 0, total = 0;
    view.forEach(function (d) {
      d.items.forEach(function (i) {
        if (i.state === 'missed') return;
        var k = i.day + '|' + i.id; if (seen[k]) return; seen[k] = 1;
        total++; if (i.state === 'done') done++;
      });
    });
    return { done: done, total: total };
  }

  function find(db, day, id) { return (db[day] || []).filter(function (t) { return String(t.id) === String(id); })[0] || null; }

  function setDone(db, day, id, value, today) {
    var t = find(db, day, id); if (!t) return null;
    t.done = !!value;
    if (t.done) t.doneDate = (today || key(new Date())) > day ? (today || key(new Date())) : day;
    else delete t.doneDate;
    return t;
  }

  // Payload for the iOS widget: same tiles, ready to draw.
  function payload(db, today) {
    var v = view(db, today);
    return {
      days: v.map(function (d) {
        return {
          date: d.date, label: d.label,
          tasks: d.items.map(function (i) {
            var o = { id: i.id, title: i.title, done: i.state === 'done', overdue: i.state === 'overdue', state: i.state, day: i.day, tappable: i.tappable };
            if (i.time) o.time = i.time;
            if (i.note) o.note = i.note;
            return o;
          })
        };
      })
    };
  }

  return { KEY: KEY, key: key, short: short, weekDays: weekDays, load: load, save: save, migrate: migrate, view: view, counts: counts, find: find, setDone: setDone, payload: payload };
})();
