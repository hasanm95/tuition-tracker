/**
 * Private Tutoring Student Tracker — Google Apps Script backend.
 *
 * This is the shared JSON API for the web/PWA app. Paste it into the Apps Script
 * project bound to the Google Sheet (Extensions -> Apps Script), set API_TOKEN
 * below, then Deploy -> New deployment -> Web app:
 *   - Execute as: Me
 *   - Who has access: Anyone      (security comes from the token, not this setting)
 *
 * After ANY edit here: Deploy -> Manage deployments -> edit the existing
 * deployment -> Version: "New version". That keeps the same /exec URL.
 *
 * Run setup() once from the editor to create the tabs with headers.
 */

// ---- CONFIG ---------------------------------------------------------------

// Must EXACTLY match APPS_SCRIPT_TOKEN in the web app's .env.local.
var API_TOKEN = 'change-me-to-a-long-random-string';

// How partial months are billed. 'up' counts the current (in-progress) month
// as owed. Change to 'down' to only bill fully-elapsed months.
var MONTH_ROUNDING = 'up';

var STUDENT_HEADERS = ['id', 'name', 'roll', 'class', 'guardianPhone', 'monthlyFee', 'startDate', 'createdAt'];
var PAYMENT_HEADERS = ['id', 'studentId', 'amount', 'paidOn', 'method', 'note'];

// ---- ROUTING --------------------------------------------------------------

function doGet(e) {
  return handle(e, (e.parameter && e.parameter.action) || '', e.parameter || {});
}

function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json({ ok: false, error: 'Invalid JSON body' });
  }
  return handle(e, body.action || '', body);
}

function handle(e, action, data) {
  var token = data.token || (e.parameter && e.parameter.token);
  if (token !== API_TOKEN) {
    return json({ ok: false, error: 'Unauthorized' });
  }
  try {
    switch (action) {
      case 'listStudents': return json({ ok: true, students: listStudents() });
      case 'getStudent':   return json({ ok: true, student: getStudent(data.id) });
      case 'addStudent':   return json({ ok: true, student: addStudent(data) });
      case 'updateStudent':return json({ ok: true, student: updateStudent(data) });
      case 'addPayment':   return json({ ok: true, payment: addPayment(data) });
      default:             return json({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// ---- HANDLERS -------------------------------------------------------------

function listStudents() {
  var students = readTab('Students', STUDENT_HEADERS);
  var payments = readTab('Payments', PAYMENT_HEADERS);
  var paidByStudent = sumPayments(payments);
  return students
    .map(function (s) { return withDue(s, paidByStudent[s.id] || 0); })
    .sort(function (a, b) { return b.due - a.due; }); // highest due first
}

function getStudent(id) {
  var students = readTab('Students', STUDENT_HEADERS);
  var student = find(students, id);
  if (!student) throw 'Student not found';
  var payments = readTab('Payments', PAYMENT_HEADERS)
    .filter(function (p) { return String(p.studentId) === String(id); })
    .sort(function (a, b) { return String(b.paidOn).localeCompare(String(a.paidOn)); });
  var totalPaid = payments.reduce(function (sum, p) { return sum + Number(p.amount || 0); }, 0);
  var out = withDue(student, totalPaid);
  out.payments = payments;
  return out;
}

function addStudent(data) {
  var sheet = tab('Students', STUDENT_HEADERS);
  var row = {
    id: uuid(),
    name: String(data.name || '').trim(),
    roll: String(data.roll || '').trim(),
    'class': String(data['class'] || '').trim(),
    guardianPhone: String(data.guardianPhone || '').trim(),
    monthlyFee: Number(data.monthlyFee || 0),
    startDate: String(data.startDate || '').trim(),
    createdAt: new Date().toISOString()
  };
  if (!row.name) throw 'Name is required';
  sheet.appendRow(STUDENT_HEADERS.map(function (h) { return row[h]; }));
  return withDue(row, 0);
}

function updateStudent(data) {
  var sheet = tab('Students', STUDENT_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(data.id)) {
      var current = rowToObj(values[r], STUDENT_HEADERS);
      var updated = {
        id: current.id,
        name: data.name != null ? String(data.name).trim() : current.name,
        roll: data.roll != null ? String(data.roll).trim() : current.roll,
        'class': data['class'] != null ? String(data['class']).trim() : current['class'],
        guardianPhone: data.guardianPhone != null ? String(data.guardianPhone).trim() : current.guardianPhone,
        monthlyFee: data.monthlyFee != null ? Number(data.monthlyFee) : Number(current.monthlyFee || 0),
        startDate: data.startDate != null ? String(data.startDate).trim() : current.startDate,
        createdAt: current.createdAt
      };
      sheet.getRange(r + 1, 1, 1, STUDENT_HEADERS.length)
        .setValues([STUDENT_HEADERS.map(function (h) { return updated[h]; })]);
      return getStudent(updated.id);
    }
  }
  throw 'Student not found';
}

function addPayment(data) {
  if (!data.studentId) throw 'studentId is required';
  var amount = Number(data.amount || 0);
  if (!(amount > 0)) throw 'Amount must be greater than 0';
  var sheet = tab('Payments', PAYMENT_HEADERS);
  var row = {
    id: uuid(),
    studentId: String(data.studentId),
    amount: amount,
    paidOn: String(data.paidOn || new Date().toISOString().slice(0, 10)),
    method: String(data.method || ''),
    note: String(data.note || '')
  };
  sheet.appendRow(PAYMENT_HEADERS.map(function (h) { return row[h]; }));
  return row;
}

// ---- DUE CALCULATION ------------------------------------------------------

function withDue(student, totalPaid) {
  var fee = Number(student.monthlyFee || 0);
  var billed = monthsBilled(student.startDate);
  var expected = billed * fee;
  var out = {};
  STUDENT_HEADERS.forEach(function (h) { out[h] = student[h]; });
  out.monthlyFee = fee;
  out.monthsBilled = billed;
  out.totalPaid = totalPaid;
  out.due = expected - totalPaid; // negative means paid in advance
  return out;
}

function monthsBilled(startDate) {
  if (!startDate) return 0;
  var s = new Date(startDate);
  if (isNaN(s.getTime())) return 0;
  var now = new Date();
  var months = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  if (months < 0) return 0;
  // 'up' bills the current month too (start month counts as month 1).
  return MONTH_ROUNDING === 'up' ? months + 1 : months;
}

// ---- SHEET HELPERS --------------------------------------------------------

function tab(name, headers) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

function readTab(name, headers) {
  var sheet = tab(name, headers);
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).length === 0) continue;
    out.push(rowToObj(values[r], headers));
  }
  return out;
}

function rowToObj(row, headers) {
  var o = {};
  headers.forEach(function (h, i) { o[h] = row[i]; });
  return o;
}

function sumPayments(payments) {
  var map = {};
  payments.forEach(function (p) {
    var k = String(p.studentId);
    map[k] = (map[k] || 0) + Number(p.amount || 0);
  });
  return map;
}

function find(list, id) {
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].id) === String(id)) return list[i];
  }
  return null;
}

function uuid() {
  return Utilities.getUuid();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run once from the editor to create both tabs with headers.
function setup() {
  tab('Students', STUDENT_HEADERS);
  tab('Payments', PAYMENT_HEADERS);
}
