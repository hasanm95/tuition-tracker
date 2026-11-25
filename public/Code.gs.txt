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
var STUDENT_SHEET_HEADERS = ['StudentID','নাম','শ্রেণী','শাখা','রোল','শুরুর তারিখ','মাসিক ফি','অভিভাবকের নাম্বার','স্ট্যাটাস','অব্যাহতির তারিখ','শিক্ষাবর্ষ','বিষয়সমূহ'];
var STUDENT_KEYS          = ['id',       'name','class', 'section','roll','startDate',  'monthlyFee','phone',  'status',  'dischargeDate','academicYear','subjects'];

// 'শিক্ষার্থীর নাম' is appended last so existing rows (7 columns) stay aligned;
// migratePaymentNames() adds the header and backfills names for old rows.
var PAYMENT_SHEET_HEADERS = ['PaymentID','StudentID','টাকা জমার তারিখ','টাকার পরিমাণ','এন্ট্রির সময়','মাসের নাম','মাসিক বেতন','শিক্ষার্থীর নাম'];
var PAYMENT_KEYS          = ['id',       'studentId','paidOn', 'amount', 'entryTime',   'monthName', 'targetFee','studentName'];

var EXAM_SHEET_HEADERS = ['MarkID','শিক্ষাবর্ষ','শ্রেণী','শাখা','StudentID','রোল','নাম','পরীক্ষার তারিখ','পরীক্ষার নাম','মোট নম্বর','প্রাপ্ত নম্বর'];
var EXAM_KEYS          = ['id',    'academicYear', 'class',  'section', 'studentId', 'roll', 'name', 'examDate','examTitle',   'totalMarks','obtainedMarks'];

var CLASS_FEE_SHEET_HEADERS = ['শিক্ষাবর্ষ','শ্রেণী','মাসের নাম','ধার্য বেতন','বিষয়'];
var CLASS_FEE_KEYS          = ['academicYear', 'class', 'monthName', 'fee', 'subject'];

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
      case 'deleteExam':          return json({ ok: true, message: deleteExam(data) });
      case 'getExamResults':      return json({ ok: true, result: getExamResults(data) });
      case 'listExams':           return json({ ok: true, exams: listExams(data) });
      case 'getMonthlyReport':    return json({ ok: true, report: getMonthlyReport(data.year) });
      case 'getSignature':        return json({ ok: true, signature: getConfig()['SIGNATURE'] || '' });
      case 'saveSignature':       return json({ ok: true, message: saveSignature(data.signature) });
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
  out.monthFees = monthFeeMap(student, classFees);
  return out;
}

// Effective fee for each of the 12 months: the class/month override if one
// exists, otherwise the student's base monthly fee. Lets the payment form
// default to the right amount for a month before any payment is recorded.
function monthFeeMap(student, classFees) {
  var fee = Number(student.monthlyFee || 0);
  var yr = String(student.academicYear || (student.startDate ? String(student.startDate).slice(0, 4) : ''));
  var cls = String(student['class'] || '');
  var subj = subjectOf_(student);
  var map = {};
  for (var mi = 0; mi < BN_MONTHS.length; mi++) {
    var mn = BN_MONTHS[mi];
    var override = classFeeOverride_(classFees, yr, cls, subj, mn);
    map[mn] = override !== null ? override : fee;
  }
  return map;
}

var HM_RE = /\s*\(HM\)\s*$/;
function baseClass_(cls) { return String(cls || '').replace(HM_RE, '').trim(); }
// A student's subject: the subjects field, else inferred from a legacy (HM) class.
function subjectOf_(student) {
  var s = String(student.subjects || '').trim();
  if (s) return s;
  return HM_RE.test(String(student['class'] || '')) ? 'উচ্চতর গণিত' : 'সাধারণ গণিত';
}
// Class/month fee override for this student's subject. Rows are matched on the
// base class (so a legacy "x (HM)" row still matches); a row with an empty
// subject is legacy and covers every subject, while an exact subject match wins.
function classFeeOverride_(classFees, yr, cls, subj, mn) {
  var base = baseClass_(cls);
  var wildcard = null;
  for (var i = 0; i < classFees.length; i++) {
    var f = classFees[i];
    if (String(f.academicYear) === yr && baseClass_(f['class']) === base && String(f.monthName) === mn) {
      var fs = String(f.subject || '').trim();
      if (fs === subj) return Number(f.fee || 0);
      if (fs === '') wildcard = Number(f.fee || 0);
    }
  }
  return wildcard;
}

var TZ_CACHE_ = null;
function tz_() {
  if (!TZ_CACHE_) {
    try { TZ_CACHE_ = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); } catch (e) {}
    if (!TZ_CACHE_) TZ_CACHE_ = Session.getScriptTimeZone();
  }
  return TZ_CACHE_;
}

function todayYmd_() {
  return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
}

function addStudent(data) {
  var sheet = tab('Students', STUDENT_SHEET_HEADERS);
  var startDate = String(data.startDate || '').trim();
  var status = String(data.status || 'সক্রিয়').trim();
  var row = {
    id: 'STU-' + Date.now(),
    name: String(data.name || '').trim(),
    'class': String(data['class'] || '').trim(),
    section: String(data.section || '').trim(),
    roll: String(data.roll || '').trim(),
    startDate: startDate,
    monthlyFee: Number(data.monthlyFee || 0),
    phone: normPhone_(data.phone),
    status: status,
    dischargeDate: status === 'অব্যাহতি প্রাপ্ত' ? todayYmd_() : '',
    academicYear: String(data.academicYear || (startDate ? startDate.slice(0, 4) : String(new Date().getFullYear()))),
    subjects: String(data.subjects || '').trim()
  };
  if (!row.name) throw 'নাম আবশ্যক।';
  sheet.appendRow(STUDENT_KEYS.map(function(k) { return row[k]; }));
  forceTextCells_(sheet, sheet.getLastRow(), ['startDate', 'academicYear', 'phone'], row, STUDENT_KEYS);
  return withDue(row, 0, []);
}

// Re-write the given columns as literal text so Sheets does not coerce dates
// (startDate) or 4-digit years (academicYear) into Date/number cells, which
// otherwise break date lookups and strict string comparisons.
// Normalize a phone: keep a leading + (international) and digits only, dropping
// spaces, dashes and other separators. The leading 0 is a digit, so it stays.
function normPhone_(p) {
  p = String(p || '').trim();
  return (p.charAt(0) === '+' ? '+' : '') + p.replace(/[^0-9]/g, '');
}

// A phone stored as a number in a legacy row (before phone cells were forced to
// text) loses its leading 0, so an 11-digit BD mobile reads back as 10 digits.
// Restore the 0 on read (e.g. 1716630414 -> 01716630414).
function restorePhone_(p) {
  p = String(p == null ? '' : p).trim();
  return /^1\d{9}$/.test(p) ? '0' + p : p;
}

function forceTextCells_(sheet, rowNum, fields, obj, keys) {
  fields.forEach(function(f) {
    var col = keys.indexOf(f) + 1;
    if (col > 0) sheet.getRange(rowNum, col).setNumberFormat('@').setValue(String(obj[f]));
  });
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
        phone: data.phone != null ? normPhone_(data.phone) : current.phone,
        status: data.status != null ? String(data.status).trim() : (current.status || 'সক্রিয়'),
        dischargeDate: (data.status != null ? String(data.status).trim() : (current.status || 'সক্রিয়')) === 'অব্যাহতি প্রাপ্ত'
          ? (current.dischargeDate || todayYmd_())
          : '',
        academicYear: data.academicYear != null
          ? String(data.academicYear)
          : (current.academicYear || (startDate ? startDate.slice(0, 4) : String(new Date().getFullYear()))),
        subjects: data.subjects != null ? String(data.subjects).trim() : (current.subjects || '')
      };
      sheet.getRange(r + 1, 1, 1, STUDENT_KEYS.length)
        .setValues([STUDENT_KEYS.map(function(k) { return updated[k]; })]);
      forceTextCells_(sheet, r + 1, ['startDate', 'academicYear', 'phone'], updated, STUDENT_KEYS);
      return getStudent(updated.id);
    }
  }
  throw 'শিক্ষার্থী পাওয়া যায়নি।';
}

// deleteRow() silently skips rows hidden under an active sheet filter, so the
// filter must be removed before deleting. The app does not rely on filters.
function dropFilter(sheet) {
  var f = sheet.getFilter();
  if (f) f.remove();
}

function deleteStudent(id) {
  if (!id) throw 'id আবশ্যক।';
  ['Students', 'Payments', 'ExamMarks'].forEach(function(name) {
    var headers = name === 'Students' ? STUDENT_SHEET_HEADERS : (name === 'Payments' ? PAYMENT_SHEET_HEADERS : EXAM_SHEET_HEADERS);
    var sheet = tab(name, headers);
    dropFilter(sheet);
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
      sheet.getRange(r + 1, dischargeCol).setValue(status === 'অব্যাহতি প্রাপ্ত' ? todayYmd_() : '');
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
    var qd = normDate(data.date);
    payments = payments.filter(function(p) { return normDate(p.paidOn) === qd; });
  }
  if (data && data.year) {
    payments = payments.filter(function(p) {
      var s = studentMap[String(p.studentId)];
      if (!s) return false;
      var ay = s.academicYear || (s.startDate ? String(s.startDate).slice(0, 4) : '');
      return String(ay) === String(data.year);
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
  var paidOn = normDate(data.paidOn) || todayYmd_();
  var monthName = data.monthName || BN_MONTHS[new Date(paidOn).getMonth()] || '';
  // Reject a payment for a month the class was not taught (fee override 0 while
  // the student otherwise pays a fee); a "না পড়ানো" month must collect nothing.
  var student = find(readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS), data.studentId);
  if (student && Number(student.monthlyFee || 0) > 0 && monthName) {
    var yr = String(student.academicYear || (student.startDate ? String(student.startDate).slice(0, 4) : ''));
    var override = classFeeOverride_(readTab('ClassFees', CLASS_FEE_SHEET_HEADERS, CLASS_FEE_KEYS), yr, student['class'], subjectOf_(student), monthName);
    if (override === 0) throw 'এই মাস পড়ানো হয় নাই — বেতন জমা করা যাবে না।';
  }
  var row = {
    id: 'PAY-' + Date.now(),
    studentId: String(data.studentId),
    paidOn: paidOn,
    amount: amount,
    entryTime: new Date().toISOString(),
    monthName: monthName,
    targetFee: Number(data.targetFee || amount),
    studentName: student ? String(student.name || '') : ''
  };
  sheet.appendRow(PAYMENT_KEYS.map(function(k) { return row[k]; }));
  // Keep paidOn as literal text (yyyy-mm-dd) so Sheets does not coerce it into a
  // timezone-shifted Date cell, which would break date-based lookups (daily).
  var pc = PAYMENT_KEYS.indexOf('paidOn') + 1;
  sheet.getRange(sheet.getLastRow(), pc).setNumberFormat('@').setValue(row.paidOn);
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
      var name = current.studentName;
      if (!name) { var s = find(readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS), current.studentId); name = s ? String(s.name || '') : ''; }
      var updated = {
        id: current.id,
        studentId: current.studentId,
        paidOn: paidOn,
        amount: data.amount != null ? Number(data.amount) : Number(current.amount),
        entryTime: current.entryTime || '',
        monthName: data.monthName != null ? String(data.monthName) : String(current.monthName || ''),
        targetFee: data.targetFee != null ? Number(data.targetFee) : Number(current.targetFee || 0),
        studentName: name
      };
      sheet.getRange(r + 1, 1, 1, PAYMENT_KEYS.length)
        .setValues([PAYMENT_KEYS.map(function(k) { return updated[k]; })]);
      var pc = PAYMENT_KEYS.indexOf('paidOn') + 1;
      sheet.getRange(r + 1, pc).setNumberFormat('@').setValue(updated.paidOn);
      return updated;
    }
  }
  throw 'পেমেন্ট পাওয়া যায়নি।';
}

function deletePayment(id) {
  if (!id) throw 'id আবশ্যক।';
  var sheet = tab('Payments', PAYMENT_SHEET_HEADERS);
  dropFilter(sheet);
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
  var ORDERED = ['৬ষ্ঠ','৭ম','৮ম','৯ম','৯ম (HM)','১০ম','১০ম (HM)','পরীক্ষার্থী','পরীক্ষার্থী (HM)'];
  ORDERED.forEach(function(c) { map[c] = { active: 0, inactive: 0 }; });
  students.forEach(function(s) {
    var sYr = s.academicYear || (s.startDate ? String(s.startDate).slice(0, 4) : '');
    if ((String(sYr) === yStr || !sYr) && map[s['class']]) {
      s.status === 'অব্যাহতি প্রাপ্ত' ? map[s['class']].inactive++ : map[s['class']].active++;
    }
  });
  return ORDERED.map(function(c) { return { className: c, active: map[c].active, inactive: map[c].inactive }; });
}

// One-time migration: rename every "<class> বিজ্ঞান" to "<class> (HM)" across the
// Students, ClassFees and ExamMarks sheets. RUN THIS ONCE from the Apps Script
// editor (select migrateScienceToHM in the function dropdown → Run) after
// deploying the new code. Safe to re-run — already-renamed rows are untouched.
function migrateScienceToHM() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var targets = [
    { name: 'Students',  col: STUDENT_KEYS.indexOf('class') + 1 },
    { name: 'ClassFees', col: CLASS_FEE_KEYS.indexOf('class') + 1 },
    { name: 'ExamMarks', col: EXAM_KEYS.indexOf('class') + 1 }
  ];
  var changed = 0;
  targets.forEach(function(t) {
    var sheet = ss.getSheetByName(t.name);
    if (!sheet || t.col < 1 || sheet.getLastRow() < 2) return;
    var rng = sheet.getRange(2, t.col, sheet.getLastRow() - 1, 1);
    var vals = rng.getValues();
    var dirty = false;
    for (var i = 0; i < vals.length; i++) {
      var v = String(vals[i][0] || '');
      if (v.indexOf('বিজ্ঞান') >= 0) {
        vals[i][0] = v.replace(/বিজ্ঞান/g, '(HM)').replace(/\s+/g, ' ').trim();
        dirty = true; changed++;
      }
    }
    if (dirty) rng.setValues(vals);
  });
  return 'Updated ' + changed + ' rows to (HM).';
}

// One-time migration: add the 'শিক্ষার্থীর নাম' header to the Payments sheet and
// fill in the name for every existing row from its StudentID. RUN THIS ONCE from
// the Apps Script editor (pick migratePaymentNames → Run) after deploying the
// new code. Safe to re-run — rows that already have a name are left untouched.
function migratePaymentNames() {
  var sheet = tab('Payments', PAYMENT_SHEET_HEADERS);
  var nameCol = PAYMENT_KEYS.indexOf('studentName') + 1; // 8
  sheet.getRange(1, nameCol).setValue(PAYMENT_SHEET_HEADERS[nameCol - 1]);
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var nameById = {};
  students.forEach(function(s) { nameById[String(s.id)] = String(s.name || ''); });
  var last = sheet.getLastRow();
  if (last < 2) return 'No payment rows.';
  var ids = sheet.getRange(2, PAYMENT_KEYS.indexOf('studentId') + 1, last - 1, 1).getValues();
  var names = sheet.getRange(2, nameCol, last - 1, 1).getValues();
  var filled = 0;
  for (var i = 0; i < names.length; i++) {
    if (String(names[i][0] || '').trim() === '') {
      names[i][0] = nameById[String(ids[i][0]).trim()] || '';
      if (names[i][0]) filled++;
    }
  }
  sheet.getRange(2, nameCol, names.length, 1).setValues(names);
  return 'Filled ' + filled + ' payment name(s).';
}

function setClassMonthFee(data) {
  var sheet = tab('ClassFees', CLASS_FEE_SHEET_HEADERS);
  if (sheet.getLastColumn() < 5) sheet.getRange(1, 5).setValue('বিষয়');
  var values = sheet.getDataRange().getValues();
  var yr = String(data.year || '').trim(), cls = String(data['class'] || '').trim();
  var mn = String(data.monthName || '').trim(), fee = Number(data.fee || 0);
  var subj = String(data.subject || '').trim();
  var label = cls + (subj ? ' (' + subj + ')' : '') + ' / ' + mn + ' = ৳' + fee;
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][0]).trim() === yr && String(values[r][1]).trim() === cls &&
        String(values[r][2]).trim() === mn && String(values[r][4] || '').trim() === subj) {
      sheet.getRange(r + 1, 4).setValue(fee);
      return label;
    }
  }
  sheet.appendRow([yr, cls, mn, fee, subj]);
  return label;
}

// Self-check (run from the Apps Script editor): subject-specific wins, legacy
// empty-subject row is a wildcard, (HM) class still matches its base-class row.
function test_classFeeOverride_() {
  var fees = [
    { academicYear: '2026', 'class': 'পরীক্ষার্থী', monthName: 'জানুয়ারি', fee: 0,   subject: 'উচ্চতর গণিত' },
    { academicYear: '2026', 'class': 'পরীক্ষার্থী', monthName: 'ফেব্রুয়ারি', fee: 150, subject: '' }
  ];
  function eq(a, b, m) { if (a !== b) throw 'FAIL ' + m + ': ' + a + ' !== ' + b; }
  eq(classFeeOverride_(fees, '2026', 'পরীক্ষার্থী', 'উচ্চতর গণিত', 'জানুয়ারি'), 0, 'HM holiday applies');
  eq(classFeeOverride_(fees, '2026', 'পরীক্ষার্থী', 'সাধারণ গণিত', 'জানুয়ারি'), null, 'GM untouched by HM holiday');
  eq(classFeeOverride_(fees, '2026', 'পরীক্ষার্থী (HM)', 'উচ্চতর গণিত', 'জানুয়ারি'), 0, 'legacy (HM) class matches base');
  eq(classFeeOverride_(fees, '2026', 'পরীক্ষার্থী', 'সাধারণ গণিত', 'ফেব্রুয়ারি'), 150, 'legacy empty subject is wildcard');
  return 'ok';
}

function test_normPhone_() {
  function eq(a, b, m) { if (a !== b) throw 'FAIL ' + m + ': ' + a + ' !== ' + b; }
  eq(normPhone_('01712-345 678'), '01712345678', 'keeps leading 0, strips separators');
  eq(normPhone_('+880 1712 345678'), '+8801712345678', 'keeps leading +');
  eq(normPhone_(null), '', 'empty stays empty');
  return 'ok';
}

function test_restorePhone_() {
  function eq(a, b, m) { if (a !== b) throw 'FAIL ' + m + ': ' + a + ' !== ' + b; }
  eq(restorePhone_(1716630414), '01716630414', 'number restores leading 0');
  eq(restorePhone_('1716630414'), '01716630414', 'string restores leading 0');
  eq(restorePhone_('01716630414'), '01716630414', 'already-correct stays');
  eq(restorePhone_('+8801716630414'), '+8801716630414', 'international untouched');
  eq(restorePhone_(''), '', 'empty stays empty');
  return 'ok';
}

// Normalize any date (Date object, ISO timestamp, yyyy-mm-dd, dd-mm-yyyy) to
// canonical 'yyyy-MM-dd' in the spreadsheet's timezone so Sheets Date cells
// don't shift back 1 day via UTC JSON serialization.
function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
function normDate(d) {
  if (d === null || d === undefined || d === '') return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
  }
  var s = String(d).trim();
  if (s.indexOf('T') >= 0) {
    var parsed = new Date(s);
    if (!isNaN(parsed)) return Utilities.formatDate(parsed, tz_(), 'yyyy-MM-dd');
  }
  var datePart = s.split('T')[0];
  var parts = datePart.indexOf('/') >= 0 ? datePart.split('/') : datePart.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 4) return parts[0] + '-' + pad2_(parts[1]) + '-' + pad2_(parts[2]);
    if (parts[2].length === 4) return parts[2] + '-' + pad2_(parts[1]) + '-' + pad2_(parts[0]);
  }
  return datePart;
}

function saveExamMarks(data) {
  var sheet = tab('ExamMarks', EXAM_SHEET_HEADERS);
  var values = sheet.getDataRange().getValues();
  var yr = String(data.academicYear || '').trim(), cls = String(data['class'] || '').trim(), dt = normDate(data.examDate);
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][1]).trim() === yr && String(values[r][2]).trim() === cls && normDate(values[r][7]) === dt) {
      sheet.deleteRow(r + 1);
    }
  }
  (data.marksList || []).forEach(function(m, i) {
    var obtained = (m.obtainedMarks === '' || m.obtainedMarks == null) ? '' : Number(m.obtainedMarks);
    sheet.appendRow(['EXM-' + Date.now() + '-' + i, yr, cls, String(m.section || '').trim(), String(m.studentId || ''), String(m.roll || ''), String(m.name || '').trim(), dt, String(data.examTitle || '').trim(), Number(data.totalMarks || 0), obtained]);
  });
  return 'পরীক্ষার নম্বর সংরক্ষিত হয়েছে!';
}

// Delete every mark row of one exam (year + class + date + title).
function deleteExam(data) {
  var sheet = tab('ExamMarks', EXAM_SHEET_HEADERS);
  dropFilter(sheet);
  var values = sheet.getDataRange().getValues();
  var yr = String(data.academicYear || data.year || '').trim();
  var cls = String(data['class'] || '').trim();
  var dt = normDate(data.examDate || data.date);
  var title = String(data.examTitle || data.title || '').trim();
  var removed = 0;
  for (var r = values.length - 1; r >= 1; r--) {
    if (String(values[r][1]).trim() === yr && String(values[r][2]).trim() === cls &&
        normDate(values[r][7]) === dt && String(values[r][8] || '').trim() === title) {
      sheet.deleteRow(r + 1); removed++;
    }
  }
  if (!removed) throw 'পরীক্ষা পাওয়া যায়নি।';
  return 'পরীক্ষা মুছে ফেলা হয়েছে।';
}

// Distinct exams (date + title) for a class/year, newest first.
function listExams(data) {
  var exams = readTab('ExamMarks', EXAM_SHEET_HEADERS, EXAM_KEYS);
  var yr = String(data.year || '').trim(), cls = String(data['class'] || '').trim();
  var seen = {}, out = [];
  exams.forEach(function(e) {
    if (String(e.academicYear).trim() !== yr || String(e['class']).trim() !== cls) return;
    var d = normDate(e.examDate), t = String(e.examTitle || '').trim();
    var key = d + '|' + t;
    if (!seen[key]) { seen[key] = true; out.push({ date: d, title: t, totalMarks: Number(e.totalMarks || 0) }); }
  });
  out.sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
  return out;
}

function getExamResults(data) {
  var exams = readTab('ExamMarks', EXAM_SHEET_HEADERS, EXAM_KEYS);
  var yr = String(data.year || '').trim(), cls = String(data['class'] || '').trim(), dt = normDate(data.date);
  var title = data.title != null ? String(data.title).trim() : '';
  var rows = exams.filter(function(e) {
    if (!(String(e.academicYear).trim() === yr && String(e['class']).trim() === cls && normDate(e.examDate) === dt)) return false;
    if (title && String(e.examTitle || '').trim() !== title) return false;
    return true;
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

// Month range [start, end] a student counts in for `year`, or null if none.
// Discharged students stop before their discharge month (or are skipped if no date).
function studentReportRange_(s, year, yearCap) {
  if (yearCap < 0) return null;
  var sd = s.startDate ? new Date(s.startDate) : null;
  // Continuing students (joined a previous year) are counted from January.
  var startMonth = (sd && !isNaN(sd))
    ? (sd.getFullYear() > year ? 12 : (sd.getFullYear() === year ? sd.getMonth() : 0))
    : 0;
  var endMonth = yearCap;
  if (s.status === 'অব্যাহতি প্রাপ্ত') {
    if (!s.dischargeDate) return null;
    var dd = new Date(s.dischargeDate);
    if (isNaN(dd) || dd.getFullYear() < year) return null;
    if (dd.getFullYear() === year) endMonth = Math.min(endMonth, dd.getMonth() - 1);
  }
  return startMonth <= endMonth ? { start: startMonth, end: endMonth } : null;
}

function test_studentReportRange_() {
  function eq(a, b, m) {
    var sa = JSON.stringify(a), sb = JSON.stringify(b);
    if (sa !== sb) throw 'FAIL ' + m + ': ' + sa + ' !== ' + sb;
  }
  eq(studentReportRange_({ status: 'সক্রিয়', startDate: '2026-03-10' }, 2026, 10), { start: 2, end: 10 }, 'active mid-year');
  eq(studentReportRange_({ status: 'সক্রিয়', startDate: '2025-02-01' }, 2026, 10), { start: 0, end: 10 }, 'continuing student');
  eq(studentReportRange_({ status: 'অব্যাহতি প্রাপ্ত', startDate: '2026-01-05', dischargeDate: '' }, 2026, 10), null, 'discharged without date excluded');
  eq(studentReportRange_({ status: 'অব্যাহতি প্রাপ্ত', startDate: '2026-01-05', dischargeDate: '2026-11-25' }, 2026, 10), { start: 0, end: 9 }, 'discharged in Nov excluded from Nov');
  eq(studentReportRange_({ status: 'অব্যাহতি প্রাপ্ত', startDate: '2026-01-05', dischargeDate: '2026-01-15' }, 2026, 10), null, 'discharged in start month excluded');
  return 'ok';
}

// Income statement for one academic year, month by month:
// (1) a payment counts in the month it is FOR (monthName), not paidOn;
// (2) a not-taught month (class/month fee override 0) skips studentCount & expectedAmount;
// (3) discharged students do not count from their discharge month onward.
function getMonthlyReport(yr) {
  var year = parseInt(yr) || new Date().getFullYear();
  var yStr = String(year);
  var students = readTab('Students', STUDENT_SHEET_HEADERS, STUDENT_KEYS);
  var payments = readTab('Payments', PAYMENT_SHEET_HEADERS, PAYMENT_KEYS);
  var classFees = readTab('ClassFees', CLASS_FEE_SHEET_HEADERS, CLASS_FEE_KEYS);

  var monthIdx = {};
  BN_MONTHS.forEach(function(m, i) { monthIdx[m] = i; });
  var stats = BN_MONTHS.map(function(m) { return { monthName: m, studentCount: 0, expectedAmount: 0, collectedAmount: 0, dueAmount: 0 }; });

  // Students of this academic year; map for attributing their payments.
  var ids = {};
  var yearStudents = students.filter(function(s) {
    var sYr = s.academicYear || (s.startDate ? String(s.startDate).slice(0, 4) : '');
    return String(sYr) === yStr;
  });
  yearStudents.forEach(function(s) { ids[String(s.id)] = true; });

  // Stop accruing at the current month: a future month (e.g. December while it
  // is still November) has not been taught yet, so it must show no target/due.
  var now = new Date();
  var yearCap = year < now.getFullYear() ? 11 : (year === now.getFullYear() ? now.getMonth() : -1);

  // Expected per month + how many studied that month.
  yearStudents.forEach(function(s) {
    var range = studentReportRange_(s, year, yearCap);
    if (!range) return;
    var fee = Number(s.monthlyFee || 0);
    for (var m = range.start; m <= range.end; m++) {
      var mn = BN_MONTHS[m];
      var override = classFeeOverride_(classFees, yStr, s['class'], subjectOf_(s), mn);
      if (override === 0) continue; // not-taught month: exclude student from this month
      stats[m].studentCount++;
      stats[m].expectedAmount += (override !== null ? override : fee);
    }
  });

  // Collected per month, by the month the payment is FOR (monthName), falling
  // back to the payment date's month for legacy rows with no monthName.
  payments.forEach(function(p) {
    if (!ids[String(p.studentId)]) return;
    var mi = monthIdx[String(p.monthName || '').trim()];
    if (mi === undefined) {
      var d = new Date(p.paidOn);
      if (isNaN(d) || d.getFullYear() !== year) return;
      mi = d.getMonth();
    }
    stats[mi].collectedAmount += Number(p.amount || 0);
  });

  var totExp = 0, totCol = 0;
  stats.forEach(function(m) { m.dueAmount = Math.max(0, m.expectedAmount - m.collectedAmount); totExp += m.expectedAmount; totCol += m.collectedAmount; });
  return { year: year, monthlyStats: stats, totalExpected: totExp, totalCollected: totCol, totalDue: Math.max(0, totExp - totCol) };
}

// ---- SIGNATURE ------------------------------------------------------------

// Store the director's signature as a data-URL string in Config.
// '' clears it. Guarded under the Google Sheets 50,000-char cell limit.
function saveSignature(sig) {
  sig = String(sig || '');
  if (sig.length > 45000) throw 'স্বাক্ষর ছবিটি অনেক বড়। ছোট/কম রেজোলিউশনের ছবি দিন।';
  setConfig('SIGNATURE', sig);
  return sig ? 'স্বাক্ষর সংরক্ষিত হয়েছে!' : 'স্বাক্ষর মুছে ফেলা হয়েছে।';
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
    var elapsedMonths = Math.max(0, (now.getFullYear() - st.getFullYear()) * 12 + (now.getMonth() - st.getMonth()));
    var totalExpected = 0;
    // Dues start at the beginning of each month, so count the current month too
    // (m <= elapsedMonths); not-taught months stay free via their 0 override.
    for (var m = 0; m <= elapsedMonths; m++) {
      var mn = BN_MONTHS[(st.getMonth() + m) % 12];
      var yr = String(student.academicYear || (student.startDate ? student.startDate.slice(0, 4) : ''));
      var override = classFeeOverride_(classFees, yr, student['class'], subjectOf_(student), mn);
      totalExpected += (override !== null ? override : fee);
    }
    calcDue = Math.max(0, totalExpected - totalPaid);
  }
  var out = {};
  STUDENT_KEYS.forEach(function(k) { out[k] = student[k]; });
  out.phone = restorePhone_(out.phone);
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

var DATE_KEYS = { startDate: true, dischargeDate: true, paidOn: true, examDate: true };
function rowToObj(row, keys) {
  var o = {};
  keys.forEach(function(k, i) {
    var v = i < row.length ? row[i] : '';
    o[k] = DATE_KEYS[k] ? normDate(v) : v;
  });
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
