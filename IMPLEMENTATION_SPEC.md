# Fahrstundenplanung — Implementation Spec for app.js

## Key Changes Required

### 1. Remove ALL cost/revenue references
- Remove `formatCost` function usage everywhere  
- Remove cost from lesson summary (`lesson.cost`)
- Remove cost from lesson creation (`cost: lesson.cost` in `saveLessonSummary`)
- Remove cost from lesson review (Kosten row)
- Remove cost from lesson edit (Kosten field)
- Remove revenue stats from school dashboard (`data.stats.totalRevenue`, `Umsatz` stat card)
- Remove cost from student detail (`totalCost`, `Gesamtkosten`)
- Remove `renderStudentCostsTab` entirely
- Remove "costs" tab from student navigation
- Remove cost display from student lessons list
- Remove cost from instructor lessons list
- Remove cost field from lesson setup screen

### 2. Add Schedule (Wochenansicht) — Instructor Dashboard
Replace the chart (`renderInstructorChart`, `setChartMode`, `instructor-lesson-chart`) with a weekly schedule view.

#### Schedule State
```js
AppState.scheduleWeekStart = null; // Monday of current week (Date)
AppState.scheduleData = null; // cached schedule data
```

#### Preset Durations (minutes)
```js
var SCHEDULE_PRESETS = {
  'Übungsfahrt': 90,
  'Überlandfahrt': 225,
  'Autobahnfahrt': 180,
  'Nachtfahrt': 135,
  'Prüfungsvorbereitung': 90,
  'Praktische Prüfung': 55,
  'Theoretische Prüfung': 45
};
```

#### Status Colors
- `offen` → dashed border, light background (gestrichelt)
- `geplant` → blue (`var(--color-blue)`)
- `bestätigt` → green (`var(--color-success)`)
- `abgeschlossen` → grey

#### Mobile View (Instructor)
- Show one day at a time with day-tabs (Mo Di Mi Do Fr Sa)
- Time slots 07:00–19:00 as rows
- Each slot is a card with: time, student name (or "Offen"), type badge
- Tap empty area → create new slot
- Tap existing slot → detail/edit modal

#### Desktop View (Admin — see #3 below)

### 3. Add Schedule Tab — Admin/School Dashboard
New tab "Planung" in school navigation, between "dashboard" and "instructors".

#### Admin Schedule Features
- Desktop-first: full week view Mo–Sa with time grid
- Instructor filter dropdown at top
- Can create/edit/delete slots for any instructor
- Can assign students to open slots
- Can confirm planned slots

### 4. Notification System
- Bell icon in topbar for instructor and school roles
- Badge with unread count
- Click opens notification dropdown panel
- Each notification shows: title, message, time ago
- "Alle gelesen" button
- Click notification → dismiss

### 5. Schedule API Integration

```
GET /api/schedule?weekStart=YYYY-MM-DD&weekEnd=YYYY-MM-DD[&instructorId=ID]
POST /api/schedule { instructorId, studentId, date, startTime, endTime, type, licenseClass, notes }
PUT /api/schedule/:id { studentId, date, startTime, endTime, type, licenseClass, status, notes }
DELETE /api/schedule/:id
POST /api/schedule/:id/confirm
GET /api/notifications
PUT /api/notifications/read { notificationId? }
```

### 6. Week Navigation Helper
```js
getWeekDates: function(baseDate) {
  var d = new Date(baseDate);
  var day = d.getDay();
  var diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  var monday = new Date(d.setDate(diff));
  monday.setHours(0,0,0,0);
  var days = [];
  for (var i = 0; i < 6; i++) { // Mo-Sa
    var dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    days.push(dd);
  }
  return { monday: days[0], saturday: days[5], days: days };
}
```

### 7. Schedule Modal for Creating/Editing Slots
Uses `openModal()` with form:
- Date (pre-filled from clicked day)
- Type select (triggers preset duration)
- Start time
- End time (auto-calculated from type, editable)
- Student select (optional — null = open slot)
- License class
- Notes

Type change recalculates end_time ONLY if user hasn't manually changed it.

### 8. renderScheduleWeekView(role, slots, days, instructors?)
Builds the HTML for the weekly view. Different layout for:
- `instructor`: Mobile-first, day tabs
- `school`: Desktop-first, full week grid

### Existing Code Structure
- The app uses vanilla JS with `App` object containing all methods
- HTML screens toggled via `.screen.active` class
- Navigation via `App.navigate('screen-name')` with `screenMap`
- API calls via `ApiClient.get/post/put/del`
- Modals via `App.openModal(title, html)` / `App.closeModalForce()`
- Toast via `App.showToast(msg)`
- State in `AppState` object
- CSS variables for theming (light/dark)

### CRITICAL NOTES
- Keep `formatCost` function definition (it's harmless) but remove all USES of it
- Do NOT use localStorage/sessionStorage — blocked in iframe
- API_BASE uses `__PORT_5000__` pattern
- All string concatenation (no template literals for compatibility)
- Keep all existing functionality that isn't being replaced
