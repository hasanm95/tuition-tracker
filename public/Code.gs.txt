/**
 * Private Tutoring Student Tracker — Google Apps Script backend.
 *
 * Paste into the Apps Script project bound to your Google Sheet
 * (Extensions -> Apps Script). Set the API_TOKEN *Script Property* (see below) —
 * do NOT hard-code the token in this file. Then
 * Deploy -> New deployment -> Web app (Execute as: Me, Access: Anyone).
 *
 * After ANY edit: Deploy -> Manage deployments -> edit -> Version: New version.
 * Run setup() once from the editor to create the tabs.
 */

// ---- CONFIG ---------------------------------------------------------------

// The API token is NOT stored in this file. Set it once, securely, as a Script
// Property so it never lives in source code or the publicly served copy:
//   Project Settings (gear) -> Script Properties -> Add script property
//   Property: API_TOKEN   Value: <the same long random string as APPS_SCRIPT_TOKEN in .env>
// Generate one with: openssl rand -hex 32
function getApiToken() {
  return PropertiesService.getScriptProperties().getProperty('API_TOKEN') || '';
}

var BN_MONTHS = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];

// Bengali sheet headers — what appears in the Google Sheet
var STUDENT_SHEET_HEADERS = ['StudentID','নাম','শ্রেণী','শাখা','রোল','শুরুর তারিখ','মাসিক ফি','মোবাইল','স্ট্যাটাস','অব্যাহতি','শিক্ষাবর্ষ'];
var STUDENT_KEYS          = ['id',       'name','class', 'section','roll','startDate',  'monthlyFee','phone',  'status',  'dischargeDate','academicYear'];

var PAYMENT_SHEET_HEADERS = ['PaymentID','StudentID','তারিখ', 'পরিমাণ', 'এন্ট্রি_সময়','মাসের_নাম','মাসিক_বেতন'];
var PAYMENT_KEYS          = ['id',       'studentId','paidOn', 'amount', 'entryTime',   'monthName', 'targetFee'];

var EXAM_SHEET_HEADERS = ['MarkID','শিক্ষাবর্ষ',  'শ্রেণী','শাখা',   'StudentID', 'রোল', 'নাম', 'তারিখ',   'পরীক্ষার_নাম','মোট_নম্বর', 'প্রাপ্ত_নম্বর'];
var EXAM_KEYS          = ['id',    'academicYear', 'class',  'section', 'studentId', 'roll', 'name', 'examDate','examTitle',   'totalMarks','obtainedMarks'];

var CLASS_FEE_SHEET_HEADERS = ['শিক্ষাবর্ষ',  'শ্রেণী','মাসের_নাম','ধার্য_বেতন'];
var CLASS_FEE_KEYS          = ['academicYear', 'class', 'monthName', 'fee'];

var CONFIG_HEADERS = ['Key', 'Value'];

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
  var expected = getApiToken();
  var token = data.token || (e.parameter && e.parameter.token);
  // Reject if no token is configured (fail closed) or it doesn't match.
  if (!expected || String(token) !== expected) {
    return json({ ok: false, error: 'Unauthorized' });
  }
  try {
    switch (action) {
      case 'listStudents':        return json({ ok: true, students: listStudents(data) });
      case 'getStudent':          return json({ ok: true, student: getStudent(data.id) });
      case 'addStudent':          return json({ ok: true, student: addStudent(data) });
      case 'updateStudent':       return json({ ok: true, student: updateStudent(data) });
      case 'deleteStudent':       return json({ ok: true, deleted: deleteStudent(data.id) });
      case 'toggleStatus':        return json({ ok: true, student: toggleStatus(data.id, data.status) });
      case 'listPayments':        return json({ ok: true, payments: listPayments(data) });
      case 'addPayment':          return json({ ok: true, payment: addPayment(data) });
      case 'updatePayment':       return json({ ok: true, payment: updatePayment(data) });
      case 'deletePayment':       return json({ ok: true, deleted: deletePayment(data.id) });
      case 'getClassesSummary':   return json({ ok: true, classes: getClassesSummary(data.year) });
      case 'setClassMonthFee':    return json({ ok: true, message: setClassMonthFee(data) });
      case 'saveExamMarks':       return json({ ok: true, message: saveExamMarks(data) });
      case 'getExamResults':      return json({ ok: true, result: getExamResults(data) });
      case 'getMonthlyReport':    return json({ ok: true, report: getMonthlyReport(data.year) });
      case 'verifyPassword':      return json(verifyPassword(data.pass));
      case 'changePassword':      return json(changePassword(data.phone, data.newPass));
      default:                    return json({ ok: false, error: 'Unknown action: ' + action });
    }
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// ---- STUDENT HANDLERS -----------------------------------------------------

function listStudents(data) {
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var payments = readTab('Payments', PAYMENT_SHEET_HEADERS, PAYMENT_KEYS);
  var classFees = readTab('ClassFees', CLASS_FEE_SHEET_HEADERS, CLASS_FEE_KEYS);
  var paidByStudent = sumPayments(payments);
  var result = students.map(function(s) { return withDue(s, paidByStudent[s.id] || 0, classFees); });
  if (data && data.year) {
    result = result.filter(function(s) { return String(s.academicYear) === String(data.year); });
  }
  return result.sort(function(a, b) { return Number(b.due) - Number(a.due); });
}

function getStudent(id) {
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var student = find(students, id);
  if (!student) throw 'শিক্ষার্থী পাওয়া যায়নি।';
  var payments = readTab('Payments', PAYMENT_SHEET_HEADERS, PAYMENT_KEYS)
    .filter(function(p) { return String(p.studentId) === String(id); })
    .sort(function(a, b) { return String(b.paidOn).localeCompare(String(a.paidOn)); });
  var classFees = readTab('ClassFees', CLASS_FEE_SHEET_HEADERS, CLASS_FEE_KEYS);
  var totalPaid = payments.reduce(function(sum, p) { return sum + Number(p.amount || 0); }, 0);
  var out = withDue(student, totalPaid, classFees);
  out.payments = payments;
  return out;
}

function addStudent(data) {
  var sheet = tab('Students', STUDENT_SHEET_HEADERS);
  var startDate = String(data.startDate || '').trim();
  var row = {
    id: uuid(),
    name: String(data.name || '').trim(),
    'class': String(data['class'] || '').trim(),
    section: String(data.section || '').trim(),
    roll: String(data.roll || '').trim(),
    startDate: startDate,
    monthlyFee: Number(data.monthlyFee || 0),
    phone: String(data.phone || '').trim(),
    status: String(data.status || 'সক্রিয়').trim(),
    dischargeDate: '',
    academicYear: String(data.academicYear || (startDate ? startDate.slice(0, 4) : String(new Date().getFullYear())))
  };
  if (!row.name) throw 'নাম আবশ্যক।';
  sheet.appendRow(STUDENT_KEYS.map(function(k) { return row[k]; }));
  return withDue(row, 0, []);
}

function updateStudent(data) {
  var sheet = tab('Students', STUDENT_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(data.id)) {
      var current = rowToObj(values[r], STUDENT_KEYS);
      var startDate = data.startDate != null ? String(data.startDate).trim() : current.startDate;
      var updated = {
        id: current.id,
        name: data.name != null ? String(data.name).trim() : current.name,
        'class': data['class'] != null ? String(data['class']).trim() : current['class'],
        section: data.section != null ? String(data.section).trim() : (current.section || ''),
        roll: data.roll != null ? String(data.roll).trim() : current.roll,
        startDate: startDate,
        monthlyFee: data.monthlyFee != null ? Number(data.monthlyFee) : Number(current.monthlyFee || 0),
        phone: data.phone != null ? String(data.phone).trim() : current.phone,
        status: data.status != null ? String(data.status).trim() : (current.status || 'সক্রিয়'),
        dischargeDate: current.dischargeDate || '',
        academicYear: data.academicYear != null
          ? String(data.academicYear)
          : (current.academicYear || (startDate ? startDate.slice(0, 4) : String(new Date().getFullYear())))
      };
      sheet.getRange(r + 1, 1, 1, STUDENT_KEYS.length)
        .setValues([STUDENT_KEYS.map(function(k) { return updated[k]; })]);
      return getStudent(updated.id);
    }
  }
  throw 'শিক্ষার্থী পাওয়া যায়নি।';
}

function deleteStudent(id) {
  if (!id) throw 'id আবশ্যক।';
  ['Students', 'Payments', 'ExamMarks'].forEach(function(name) {
    var headers = name === 'Students' ? STUDENT_SHEET_HEADERS : (name === 'Payments' ? PAYMENT_SHEET_HEADERS : EXAM_SHEET_HEADERS);
    var sheet = tab(name, headers);
    var values = sheet.getDataRange().getValues();
    var col = (name === 'ExamMarks') ? 4 : (name === 'Payments' ? 1 : 0);
    for (var r = values.length - 1; r >= 1; r--) {
      if (String(values[r][col]).trim() === String(id).trim()) sheet.deleteRow(r + 1);
    }
  });
  return true;
}

function toggleStatus(id, status) {
  var sheet = tab('Students', STUDENT_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).trim() === String(id).trim()) {
      sheet.getRange(r + 1, STUDENT_KEYS.indexOf('status') + 1).setValue(status);
      var dischargeCol = STUDENT_KEYS.indexOf('dischargeDate') + 1;
      sheet.getRange(r + 1, dischargeCol).setValue(status === 'অব্যাহতি প্রাপ্ত' ? new Date().toISOString().split('T')[0] : '');
      return getStudent(id);
    }
  }
  throw 'শিক্ষার্থী পাওয়া যায়নি।';
}

// ---- PAYMENT HANDLERS -----------------------------------------------------

function listPayments(data) {
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var studentMap = {};
  students.forEach(function(s) { studentMap[String(s.id)] = s; });

  var payments = readTab('Payments', PAYMENT_SHEET_HEADERS, PAYMENT_KEYS);
  if (data && data.date) {
    payments = payments.filter(function(p) { return String(p.paidOn) === String(data.date); });
  }
  if (data && data.year) {
    payments = payments.filter(function(p) {
      var s = studentMap[String(p.studentId)];
      if (!s) return false;
      var ay = s.academicYear || (s.startDate ? String(s.startDate).slice(0, 4) : '');
      return ay === String(data.year);
    });
  }
  return payments.map(function(p) {
    var s = studentMap[String(p.studentId)] || {};
    return {
      id: p.id,
      studentId: p.studentId,
      studentName: s.name || '',
      studentClass: s['class'] || '',
      studentSection: s.section || '',
      amount: Number(p.amount || 0),
      paidOn: p.paidOn,
      monthName: p.monthName || '',
      targetFee: Number(p.targetFee || 0),
      entryTime: p.entryTime || ''
    };
  }).sort(function(a, b) { return String(b.paidOn).localeCompare(String(a.paidOn)); });
}

function addPayment(data) {
  if (!data.studentId) throw 'studentId আবশ্যক।';
  var amount = Number(data.amount || 0);
  if (!(amount > 0)) throw 'পরিমাণ ০-এর বেশি হতে হবে।';
  var sheet = tab('Payments', PAYMENT_SHEET_HEADERS);
  var paidOn = String(data.paidOn || new Date().toISOString().slice(0, 10));
  var monthName = data.monthName || BN_MONTHS[new Date(paidOn).getMonth()] || '';
  var row = {
    id: uuid(),
    studentId: String(data.studentId),
    paidOn: paidOn,
    amount: amount,
    entryTime: new Date().toISOString(),
    monthName: monthName,
    targetFee: Number(data.targetFee || amount)
  };
  sheet.appendRow(PAYMENT_KEYS.map(function(k) { return row[k]; }));
  return row;
}

function updatePayment(data) {
  if (!data.id) throw 'id আবশ্যক।';
  var sheet = tab('Payments', PAYMENT_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(data.id)) {
      var current = rowToObj(values[r], PAYMENT_KEYS);
      var paidOn = data.paidOn != null ? String(data.paidOn) : String(current.paidOn);
      var updated = {
        id: current.id,
        studentId: current.studentId,
        paidOn: paidOn,
        amount: data.amount != null ? Number(data.amount) : Number(current.amount),
        entryTime: current.entryTime || '',
        monthName: data.monthName != null ? String(data.monthName) : String(current.monthName || ''),
        targetFee: data.targetFee != null ? Number(data.targetFee) : Number(current.targetFee || 0)
      };
      sheet.getRange(r + 1, 1, 1, PAYMENT_KEYS.length)
        .setValues([PAYMENT_KEYS.map(function(k) { return updated[k]; })]);
      return updated;
    }
  }
  throw 'পেমেন্ট পাওয়া যায়নি।';
}

function deletePayment(id) {
  if (!id) throw 'id আবশ্যক।';
  var sheet = tab('Payments', PAYMENT_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === String(id)) { sheet.deleteRow(r + 1); return true; }
  }
  throw 'পেমেন্ট পাওয়া যায়নি।';
}

// ---- CLASS & EXAM HANDLERS ------------------------------------------------

function getClassesSummary(yr) {
  var yStr = (yr || new Date().getFullYear()).toString();
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var map = {};
  var ORDERED = ['৬ষ্ঠ','৭ম','৮ম','৯ম','৯ম বিজ্ঞান','১০ম','১০ম বিজ্ঞান','পরীক্ষার্থী','পরীক্ষার্থী বিজ্ঞান'];
  ORDERED.forEach(function(c) { map[c] = { active: 0, inactive: 0 }; });
  students.forEach(function(s) {
    var sYr = s.academicYear || (s.startDate ? s.startDate.slice(0, 4) : '');
    if ((sYr === yStr || !sYr) && map[s['class']]) {
      s.status === 'অব্যাহতি প্রাপ্ত' ? map[s['class']].inactive++ : map[s['class']].active++;
    }
  });
  return ORDERED.map(function(c) { return { className: c, active: map[c].active, inactive: map[c].inactive }; });
}

function setClassMonthFee(data) {
  var sheet = tab('ClassFees', CLASS_FEE_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  var yr = String(data.year || '').trim(), cls = String(data['class'] || '').trim();
  var mn = String(data.monthName || '').trim(), fee = Number(data.fee || 0);
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).trim() === yr && String(values[r][1]).trim() === cls && String(values[r][2]).trim() === mn) {
      sheet.getRange(r + 1, 4).setValue(fee);
      return cls + ' / ' + mn + ' = ৳' + fee;
    }
  }
  sheet.appendRow([yr, cls, mn, fee]);
  return cls + ' / ' + mn + ' = ৳' + fee;
}

function saveExamMarks(data) {
  var sheet = tab('ExamMarks', EXAM_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  var yr = String(data.academicYear || '').trim(), cls = String(data['class'] || '').trim(), dt = String(data.examDate || '').trim();
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][1]).trim() === yr && String(values[r][2]).trim() === cls && String(values[r][7]).trim() === dt) {
      sheet.deleteRow(r + 1);
    }
  }
  (data.marksList || []).forEach(function(m) {
    var obtained = (m.obtainedMarks === '' || m.obtainedMarks == null) ? '' : Number(m.obtainedMarks);
    sheet.appendRow([uuid(), yr, cls, String(m.section || '').trim(), String(m.studentId || ''), String(m.roll || ''), String(m.name || '').trim(), dt, String(data.examTitle || '').trim(), Number(data.totalMarks || 0), obtained]);
  });
  return 'পরীক্ষার নম্বর সংরক্ষিত হয়েছে!';
}

function getExamResults(data) {
  var exams = readTab('ExamMarks', EXAM_SHEET_HEADERS, EXAM_KEYS);
  var yr = String(data.year || '').trim(), cls = String(data['class'] || '').trim(), dt = String(data.date || '').trim();
  var rows = exams.filter(function(e) {
    return e.academicYear === yr && e['class'] === cls && e.examDate === dt;
  });
  var secA = [], secB = [];
  rows.forEach(function(e) {
    var isAbsent = (e.obtainedMarks === '' || e.obtainedMarks == null);
    var obj = { studentId: e.studentId, roll: e.roll, name: e.name, section: e.section, isAbsent: isAbsent, obtainedMarks: isAbsent ? '' : Number(e.obtainedMarks), totalMarks: Number(e.totalMarks || 0) };
    e.section === 'ক' ? secA.push(obj) : secB.push(obj);
  });
  var title = rows.length ? rows[0].examTitle : '';
  var totalMarks = rows.length ? Number(rows[0].totalMarks || 0) : 0;
  return { className: cls, examDate: dt, examTitle: title, totalMarks: totalMarks, sectionA: secA, sectionB: secB };
}

// ---- MONTHLY REPORT -------------------------------------------------------

function getMonthlyReport(yr) {
  var year = parseInt(yr) || new Date().getFullYear();
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var payments = readTab('Payments', PAYMENT_SHEET_HEADERS, PAYMENT_KEYS);
  var stats = BN_MONTHS.map(function(m) { return { monthName: m, studentCount: 0, expectedAmount: 0, collectedAmount: 0, dueAmount: 0 }; });
  students.forEach(function(s) {
    var sYr = s.academicYear || (s.startDate ? s.startDate.slice(0, 4) : '');
    if (sYr !== String(year) || s.status === 'অব্যাহতি প্রাপ্ত') return;
    var st = new Date(s.startDate), fee = Number(s.monthlyFee || 0);
    for (var m = 0; m < 12; m++) {
      if (st <= new Date(year, m + 1, 0, 23, 59, 59)) {
        stats[m].studentCount++;
        stats[m].expectedAmount += fee;
      }
    }
  });
  payments.forEach(function(p) {
    var d = new Date(p.paidOn);
    if (d.getFullYear() === year) stats[d.getMonth()].collectedAmount += Number(p.amount || 0);
  });
  var totExp = 0, totCol = 0;
  stats.forEach(function(m) { m.dueAmount = Math.max(0, m.expectedAmount - m.collectedAmount); totExp += m.expectedAmount; totCol += m.collectedAmount; });
  return { year: year, monthlyStats: stats, totalExpected: totExp, totalCollected: totCol, totalDue: Math.max(0, totExp - totCol) };
}

// ---- PASSWORD -------------------------------------------------------------

function verifyPassword(pass) {
  var cfg = getConfig();
  var p = cfg['ADMIN_PASS'] || '1234', ph = cfg['MASTER_PHONE'] || '';
  return (String(pass).trim() === p || String(pass).trim() === ph)
    ? { ok: true }
    : { ok: false, error: 'ভুল পাসওয়ার্ড!' };
}

function changePassword(phone, newPass) {
  var cfg = getConfig();
  if (String(phone).trim() !== (cfg['MASTER_PHONE'] || '')) return { ok: false, error: 'মোবাইল নম্বর সঠিক নয়!' };
  if (!newPass || String(newPass).trim().length < 4) return { ok: false, error: 'পাসওয়ার্ড কমপক্ষে ৪ অক্ষরের দিন।' };
  setConfig('ADMIN_PASS', String(newPass).trim());
  return { ok: true, message: 'পাসওয়ার্ড পরিবর্তিত হয়েছে!' };
}

function getConfig() {
  var sheet = tab('Config', CONFIG_HEADERS);
  var values = sheet.getDataRange().getValues();
  var cfg = {};
  for (var r = 1; r < values.length; r++) cfg[String(values[r][0])] = String(values[r][1]);
  return cfg;
}

function setConfig(key, value) {
  var sheet = tab('Config', CONFIG_HEADERS);
  var values = sheet.getDataRange().getValues();
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]) === key) { sheet.getRange(r + 1, 2).setValue(value); return; }
  }
  sheet.appendRow([key, value]);
}

// ---- DUE CALCULATION ------------------------------------------------------

function withDue(student, totalPaid, classFees) {
  var fee = Number(student.monthlyFee || 0);
  var isFree = fee === 0;
  var calcDue = 0;
  if (!isFree) {
    var st = new Date(student.startDate), now = new Date();
    var completedMonths = Math.max(0, (now.getFullYear() - st.getFullYear()) * 12 + (now.getMonth() - st.getMonth()));
    var totalExpected = 0;
    for (var m = 0; m < completedMonths; m++) {
      var mn = BN_MONTHS[(st.getMonth() + m) % 12];
      var yr = String(student.academicYear || (student.startDate ? student.startDate.slice(0, 4) : ''));
      var override = null;
      for (var i = 0; i < classFees.length; i++) {
        if (classFees[i].academicYear === yr && classFees[i]['class'] === student['class'] && classFees[i].monthName === mn) {
          override = Number(classFees[i].fee || 0);
          break;
        }
      }
      totalExpected += (override !== null ? override : fee);
    }
    calcDue = Math.max(0, totalExpected - totalPaid);
  }
  var out = {};
  STUDENT_KEYS.forEach(function(k) { out[k] = student[k]; });
  out.monthlyFee = fee;
  out.isFree = isFree;
  out.totalPaid = totalPaid;
  out.due = calcDue;
  out.status = out.status || 'সক্রিয়';
  out.section = out.section || '';
  out.academicYear = out.academicYear || (student.startDate ? String(student.startDate).slice(0, 4) : String(new Date().getFullYear()));
  return out;
}

// ---- SHEET HELPERS --------------------------------------------------------

function tab(name, sheetHeaders) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(sheetHeaders);
  }
  return sheet;
}

function readTab(name, sheetHeaders, keys) {
  var sheet = tab(name, sheetHeaders);
  var values = sheet.getDataRange().getValues();
  var out = [];
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).length === 0) continue;
    out.push(rowToObj(values[r], keys));
  }
  return out;
}

function rowToObj(row, keys) {
  var o = {};
  keys.forEach(function(k, i) { o[k] = i < row.length ? row[i] : ''; });
  return o;
}

function sumPayments(payments) {
  var map = {};
  payments.forEach(function(p) {
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

function setup() {
  tab('Students', STUDENT_SHEET_HEADERS);
  tab('Payments', PAYMENT_SHEET_HEADERS);
  tab('ExamMarks', EXAM_SHEET_HEADERS);
  tab('ClassFees', CLASS_FEE_SHEET_HEADERS);
  tab('Config',   CONFIG_HEADERS);
}
