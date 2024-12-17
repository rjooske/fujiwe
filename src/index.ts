import * as csvParse from "csv-parse/browser/esm/sync";
import {
  Course,
  CourseId,
  Email,
  findRegistrationDiscrepancies,
  Student,
  StudentId,
  StudentInWrongCourse,
} from "./fujiwe";
import { Cell, Workbook, Worksheet } from "exceljs";

function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("assertion failed");
  }
}

function unreachable(_: never): never {
  throw new Error("should be unreachable");
}

function exactlyOne<T>(ts: Iterable<T>): T | undefined {
  let result: T | undefined;
  for (const t of ts) {
    if (result === undefined) {
      result = t;
    } else {
      return undefined;
    }
  }
  return result;
}

type Csv = {
  columns: string[];
  records: Record<string, string>[];
};

function parseCsv(s: string): Csv | undefined {
  let records: Record<string, string>[];
  try {
    // The library should guarantee that it returns a value of this type
    records = csvParse.parse(s, { trim: true, columns: true });
  } catch {
    return undefined;
  }

  const firstRecord = records.at(0);
  if (firstRecord === undefined) {
    return { columns: [], records: [] };
  } else {
    return {
      columns: Object.keys(firstRecord),
      records,
    };
  }
}

type ParseRegisteredCoursesError = { kind: "missing-column"; column: string };
type ParseRegisteredCoursesResult =
  | { kind: "ok"; registeredCourseId: Map<StudentId, CourseId> }
  | { kind: "error"; error: ParseRegisteredCoursesError };

function parseRegisteredCourses(csv: Csv): ParseRegisteredCoursesResult {
  const studentIdColumn = "学籍番号";
  const courseIdColumn = "科目番号";
  const deletedColumn = "論理削除";

  for (const column of [studentIdColumn, courseIdColumn, deletedColumn]) {
    if (!csv.columns.includes(column)) {
      return { kind: "error", error: { kind: "missing-column", column } };
    }
  }

  const registeredCourseId = new Map<StudentId, CourseId>();
  for (const record of csv.records) {
    // TODO: deletion
    // TODO: remove type assertions
    registeredCourseId.set(
      record[studentIdColumn] as StudentId,
      record[courseIdColumn] as CourseId,
    );
  }

  return { kind: "ok", registeredCourseId };
}

type ParseStudentsError = { kind: "missing-column"; column: string };
type ParseStudentsResult =
  | { kind: "ok"; students: Map<StudentId, Student> }
  | { kind: "error"; error: ParseStudentsError };

function parseStudents(csv: Csv): ParseStudentsResult {
  const idColumn = "学籍番号";
  const nameColumn = "学生氏名";
  const schoolEmailColumn = "Ｅ－ＭＡＩＬ＿大学";
  const personalEmailColumn = "Ｅ－ＭＡＩＬ";

  for (const column of [
    idColumn,
    nameColumn,
    schoolEmailColumn,
    personalEmailColumn,
  ]) {
    if (!csv.columns.includes(column)) {
      return { kind: "error", error: { kind: "missing-column", column } };
    }
  }

  const students = new Map<StudentId, Student>();
  for (const record of csv.records) {
    // TODO: remove type assertions
    const id = record[idColumn] as StudentId;
    students.set(id, {
      id,
      name: record[nameColumn],
      schoolEmail: record[schoolEmailColumn] as Email,
      personalEmail: record[personalEmailColumn] as Email,
    });
  }

  return {
    kind: "ok",
    students,
  };
}

function allCells(sheet: Worksheet): Cell[] {
  const cells: Cell[] = [];
  sheet.eachRow((row) => {
    row.eachCell((cell) => {
      cells.push(cell);
    });
  });
  return cells;
}

type ParseCoursesError = {
  kind: "missing-cell";
  cell:
    | "course-id-label"
    | "course-id"
    | "course-name-label"
    | "course-name"
    | "student-id-label";
  sheetName: string;
};
type ParseCoursesResult =
  | { kind: "ok"; courses: Map<CourseId, Course> }
  | { kind: "error"; error: ParseCoursesError };

function parseCourses(workbook: Workbook): ParseCoursesResult {
  const courses = new Map<CourseId, Course>();

  for (const sheet of workbook.worksheets) {
    const cells = allCells(sheet);

    // TODO: better label
    // if (!cells.some((c) => c.text.trim() === "fujiwe")) {
    //   continue;
    // }

    const courseIdLabelCell = cells.find((c) => c.text.trim() === "科目番号：");
    if (courseIdLabelCell === undefined) {
      return {
        kind: "error",
        error: {
          kind: "missing-cell",
          cell: "course-id-label",
          sheetName: sheet.name,
        },
      };
    }
    const courseIdCell = sheet.findCell(
      courseIdLabelCell.fullAddress.row,
      courseIdLabelCell.fullAddress.col + 1,
    );
    if (courseIdCell === undefined) {
      return {
        kind: "error",
        error: {
          kind: "missing-cell",
          cell: "course-id",
          sheetName: sheet.name,
        },
      };
    }

    const courseNameLabelCell = cells.find((c) => c.text.trim() === "科目名：");
    if (courseNameLabelCell === undefined) {
      return {
        kind: "error",
        error: {
          kind: "missing-cell",
          cell: "course-name-label",
          sheetName: sheet.name,
        },
      };
    }
    const courseNameCell = sheet.findCell(
      courseNameLabelCell.fullAddress.row,
      courseNameLabelCell.fullAddress.col + 1,
    );
    if (courseNameCell === undefined) {
      return {
        kind: "error",
        error: {
          kind: "missing-cell",
          cell: "course-name",
          sheetName: sheet.name,
        },
      };
    }

    const studentIdLabel = cells.find((c) => c.text.trim() === "学籍番号");
    if (studentIdLabel === undefined) {
      return {
        kind: "error",
        error: {
          kind: "missing-cell",
          cell: "student-id-label",
          sheetName: sheet.name,
        },
      };
    }

    const expectedStudents: StudentId[] = [];
    sheet.getColumn(studentIdLabel.fullAddress.col).eachCell((cell, row) => {
      const text = cell.text.trim();
      // TODO: detect student id better?
      if (row > studentIdLabel.fullAddress.row && text !== "") {
        // TODO: remove type assertion
        expectedStudents.push(text as StudentId);
      }
    });

    // TODO: remove type assertion
    const courseId = courseIdCell.text.trim() as CourseId;
    courses.set(courseId, {
      id: courseId,
      name: courseNameCell.text.trim(),
      expectedStudents,
      targetName: sheet.name,
    });
  }

  return { kind: "ok", courses };
}

function mustGetElementById(id: string): HTMLElement {
  const e = document.getElementById(id);
  assert(e !== null);
  return e;
}

type MailtoUriParams = {
  recipients: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
};

function createMailtoUri(p: MailtoUriParams): string {
  return (
    "mailto:" +
    p.recipients.map(encodeURIComponent).join(",") +
    "?cc=" +
    p.cc.map(encodeURIComponent).join(",") +
    "&bcc=" +
    p.bcc.map(encodeURIComponent).join(",") +
    "&subject=" +
    encodeURIComponent(p.subject) +
    "&body=" +
    encodeURIComponent(p.body)
  );
}

/**
 * HTMLTemplateElement.content is guaranteed to be DocumentFragment.
 * https://html.spec.whatwg.org/multipage/scripting.html#dom-template-content-dev
 */
function cloneTemplate(t: HTMLTemplateElement): DocumentFragment {
  return t.content.cloneNode(true) as DocumentFragment;
}

class StudentsInWrongCourseElement {
  private constructor(
    private root: HTMLElement,
    private onEmailButtonClicked: (
      s: StudentInWrongCourse,
      expectedCourse: Course,
    ) => void,
    private tbody: HTMLTableSectionElement,
    private rowTemplate: HTMLTemplateElement,
  ) {}

  hide() {
    this.root.style.display = "none";
  }

  show() {
    this.root.style.display = "initial";
  }

  clear() {
    this.tbody.replaceChildren();
  }

  addStudent(student: StudentInWrongCourse, expectedCourse: Course) {
    const row = StudentsInWrongCourseElement.newRow(this.rowTemplate);
    assert(row !== undefined);
    row.studentIdTd.textContent = student.id;
    row.studentNameTd.textContent = student.name;
    row.expectedCourseTd.textContent = expectedCourse.id;
    row.registeredCourseTd.textContent = student.registeredCourse.id;
    row.emailButton.addEventListener("click", () => {
      this.onEmailButtonClicked(student, expectedCourse);
    });
    this.tbody.appendChild(row.tr);
  }

  private static newRow(t: HTMLTemplateElement):
    | {
        tr: HTMLTableRowElement;
        studentIdTd: HTMLTableCellElement;
        studentNameTd: HTMLTableCellElement;
        expectedCourseTd: HTMLTableCellElement;
        registeredCourseTd: HTMLTableCellElement;
        emailButton: HTMLButtonElement;
      }
    | undefined {
    const template = cloneTemplate(t);
    const tr = exactlyOne(template.querySelectorAll("tr"));
    if (tr === undefined) {
      return undefined;
    }
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length !== 5) {
      return undefined;
    }
    const emailButton = exactlyOne(template.querySelectorAll("button"));
    if (emailButton === undefined) {
      return undefined;
    }
    return {
      tr,
      studentIdTd: tds[0],
      studentNameTd: tds[1],
      expectedCourseTd: tds[2],
      registeredCourseTd: tds[3],
      emailButton,
    };
  }

  static from(
    root: HTMLElement,
    onEmailButtonClicked: (
      s: StudentInWrongCourse,
      expectedCourse: Course,
    ) => void,
  ): StudentsInWrongCourseElement | undefined {
    const tbody = exactlyOne(root.querySelectorAll("tbody"));
    const rowTemplate = exactlyOne(root.querySelectorAll("template"));
    if (
      tbody === undefined ||
      rowTemplate === undefined ||
      StudentsInWrongCourseElement.newRow(rowTemplate) === undefined
    ) {
      return undefined;
    }
    return new StudentsInWrongCourseElement(
      root,
      onEmailButtonClicked,
      tbody,
      rowTemplate,
    );
  }
}

class StudentsInNoCourseElement {
  private constructor(
    private root: HTMLElement,
    private onEmailButtonClicked: (s: Student, expectedCourse: Course) => void,
    private tbody: HTMLTableSectionElement,
    private rowTemplate: HTMLTemplateElement,
  ) {}

  hide() {
    this.root.style.display = "none";
  }

  show() {
    this.root.style.display = "initial";
  }

  clear() {
    this.tbody.replaceChildren();
  }

  addStudent(student: Student, expectedCourse: Course) {
    const row = StudentsInNoCourseElement.newRow(this.rowTemplate);
    assert(row !== undefined);
    row.studentIdTd.textContent = student.id;
    row.studentNameTd.textContent = student.name;
    row.expectedCourseTd.textContent = expectedCourse.id;
    row.emailButton.addEventListener("click", () => {
      this.onEmailButtonClicked(student, expectedCourse);
    });
    this.tbody.appendChild(row.tr);
  }

  private static newRow(t: HTMLTemplateElement):
    | {
        tr: HTMLTableRowElement;
        studentIdTd: HTMLTableCellElement;
        studentNameTd: HTMLTableCellElement;
        expectedCourseTd: HTMLTableCellElement;
        emailButton: HTMLButtonElement;
      }
    | undefined {
    const template = cloneTemplate(t);
    const tr = exactlyOne(template.querySelectorAll("tr"));
    if (tr === undefined) {
      return undefined;
    }
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length !== 4) {
      return undefined;
    }
    const emailButton = exactlyOne(template.querySelectorAll("button"));
    if (emailButton === undefined) {
      return undefined;
    }
    return {
      tr,
      studentIdTd: tds[0],
      studentNameTd: tds[1],
      expectedCourseTd: tds[2],
      emailButton,
    };
  }

  static from(
    root: HTMLElement,
    onEmailButtonClicked: (s: Student, expectedCourse: Course) => void,
  ): StudentsInNoCourseElement | undefined {
    const tbody = exactlyOne(root.querySelectorAll("tbody"));
    const rowTemplate = exactlyOne(root.querySelectorAll("template"));
    if (
      tbody === undefined ||
      rowTemplate === undefined ||
      StudentsInNoCourseElement.newRow(rowTemplate) === undefined
    ) {
      return undefined;
    }
    return new StudentsInNoCourseElement(
      root,
      onEmailButtonClicked,
      tbody,
      rowTemplate,
    );
  }
}

function fillInWrongCourseTemplate(
  template: string,
  student: StudentInWrongCourse,
  expectedCourse: Course,
): string {
  const variables: [string, string][] = [
    ["$student_id", student.id],
    ["$student_name", student.name],
    ["$expected_course_id", expectedCourse.id],
    ["$expected_course_target", expectedCourse.targetName],
    ["$registered_course_id", student.registeredCourse.id],
    ["$registered_course_target", student.registeredCourse.targetName],
    ["$course_name", expectedCourse.name],
  ];
  for (const [pattern, replacement] of variables) {
    template = template.replaceAll(pattern, replacement);
  }
  return template;
}

function fillInNoCourseTemplate(
  template: string,
  student: Student,
  expectedCourse: Course,
): string {
  const variables: [string, string][] = [
    ["$student_id", student.id],
    ["$student_name", student.name],
    ["$expected_course_id", expectedCourse.id],
    ["$expected_course_target", expectedCourse.targetName],
    ["$course_name", expectedCourse.name],
  ];
  for (const [pattern, replacement] of variables) {
    template = template.replaceAll(pattern, replacement);
  }
  return template;
}

function clickUri(uri: string) {
  const a = document.createElement("a");
  a.href = uri;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function formatParseRegisteredCoursesError(
  e: ParseRegisteredCoursesError,
): string {
  switch (e.kind) {
    case "missing-column":
      return `履修情報ファイルに列「${e.column}」が存在しません`;
    default:
      unreachable(e.kind);
  }
}

function formatParseStudentsError(e: ParseStudentsError): string {
  switch (e.kind) {
    case "missing-column":
      return `学籍情報ファイルに列「${e.column}」が存在しません`;
    default:
      unreachable(e.kind);
  }
}

function formatParseCoursesError(e: ParseCoursesError): string {
  switch (e.kind) {
    case "missing-cell":
      let s = `班別名簿ファイルのシート「${e.sheetName}」の中に`;
      switch (e.cell) {
        case "course-id-label":
          s += "科目番号ラベル";
          break;
        case "course-id":
          s += "科目番号";
          break;
        case "course-name-label":
          s += "科目名ラベル";
          break;
        case "course-name":
          s += "科目名";
          break;
        case "student-id-label":
          s += "学籍番号ラベル";
          break;
        default:
          unreachable(e.cell);
      }
      s += "のセルが存在しません";
      return s;
    default:
      unreachable(e.kind);
  }
}

const WRONG_COURSE_EMAIL_SUBJECT_KEY = "wrong-course-email-subject";
const WRONG_COURSE_EMAIL_TEMPLATE_KEY = "wrong-course-email-template";
const NO_COURSE_EMAIL_SUBJECT_KEY = "no-course-email-subject";
const NO_COURSE_EMAIL_TEMPLATE_KEY = "no-course-email-template";

function main() {
  const registeredCoursesInput = mustGetElementById("input-registered-courses");
  const studentsInput = mustGetElementById("input-students");
  const coursesInput = mustGetElementById("input-courses");
  const inputCourseNameElement = mustGetElementById("input-course-name");
  const verifyElement = mustGetElementById("verify");
  const wrongCourseSubject = mustGetElementById("email-subject-wrong-course");
  const wrongCourseTemplate = mustGetElementById("email-template-wrong-course");
  const noCourseSubject = mustGetElementById("email-subject-no-course");
  const noCourseTemplate = mustGetElementById("email-template-no-course");
  const errorElement = mustGetElementById("error");

  assert(registeredCoursesInput instanceof HTMLInputElement);
  assert(studentsInput instanceof HTMLInputElement);
  assert(coursesInput instanceof HTMLInputElement);
  assert(verifyElement instanceof HTMLButtonElement);
  assert(wrongCourseSubject instanceof HTMLInputElement);
  assert(wrongCourseTemplate instanceof HTMLTextAreaElement);
  assert(noCourseSubject instanceof HTMLInputElement);
  assert(noCourseTemplate instanceof HTMLTextAreaElement);
  assert(errorElement instanceof HTMLParagraphElement);

  const updateVerifyElement = () => {
    verifyElement.disabled = ![
      registeredCoursesInput,
      studentsInput,
      coursesInput,
    ].every((i) => i.files?.length === 1);
  };
  registeredCoursesInput.addEventListener("change", updateVerifyElement);
  studentsInput.addEventListener("change", updateVerifyElement);
  coursesInput.addEventListener("change", updateVerifyElement);
  updateVerifyElement();

  for (const [element, key] of [
    [wrongCourseSubject, WRONG_COURSE_EMAIL_SUBJECT_KEY],
    [wrongCourseTemplate, WRONG_COURSE_EMAIL_TEMPLATE_KEY],
    [noCourseSubject, NO_COURSE_EMAIL_SUBJECT_KEY],
    [noCourseTemplate, NO_COURSE_EMAIL_TEMPLATE_KEY],
  ] as const) {
    element.value = localStorage.getItem(key) ?? "";
    // TODO: throttle?
    element.addEventListener("input", () => {
      localStorage.setItem(key, element.value);
    });
  }

  const studentsInWrongCourseElement = StudentsInWrongCourseElement.from(
    mustGetElementById("students-in-wrong-course"),
    (student, expectedCourse) => {
      const body = fillInWrongCourseTemplate(
        wrongCourseTemplate.value,
        student,
        expectedCourse,
      );
      const uri = createMailtoUri({
        subject: wrongCourseSubject.value,
        recipients: [student.schoolEmail],
        cc: [student.personalEmail],
        bcc: [],
        body,
      });
      clickUri(uri);
    },
  );
  const studentsInNoCourseElement = StudentsInNoCourseElement.from(
    mustGetElementById("students-in-no-course"),
    (student, expectedCourse) => {
      const body = fillInNoCourseTemplate(
        wrongCourseTemplate.value,
        student,
        expectedCourse,
      );
      const uri = createMailtoUri({
        subject: noCourseSubject.value,
        recipients: [student.schoolEmail],
        cc: [student.personalEmail],
        bcc: [],
        body,
      });
      clickUri(uri);
    },
  );
  assert(studentsInWrongCourseElement !== undefined);
  assert(studentsInNoCourseElement !== undefined);

  const hideError = () => {
    errorElement.style.display = "none";
  };
  const showError = (s: string) => {
    errorElement.textContent = s;
    errorElement.style.display = "initial";
  };

  verifyElement.addEventListener("click", async () => {
    assert(registeredCoursesInput.files !== null);
    assert(studentsInput.files !== null);
    assert(coursesInput.files !== null);

    const registeredCoursesFile = exactlyOne(registeredCoursesInput.files);
    const studentsFile = exactlyOne(studentsInput.files);
    const coursesFile = exactlyOne(coursesInput.files);
    if (
      registeredCoursesFile === undefined ||
      studentsFile === undefined ||
      coursesFile === undefined
    ) {
      return;
    }

    hideError();
    inputCourseNameElement.textContent = "";
    studentsInWrongCourseElement.hide();
    studentsInNoCourseElement.hide();
    studentsInWrongCourseElement.clear();
    studentsInNoCourseElement.clear();

    const registeredCoursesText = await registeredCoursesFile.text();
    const registeredCoursesCsv = parseCsv(registeredCoursesText);
    if (registeredCoursesCsv === undefined) {
      showError("履修情報ファイルのCSV形式が正しくありません");
      return;
    }
    const maybeRegisteredCourses = parseRegisteredCourses(registeredCoursesCsv);
    if (maybeRegisteredCourses.kind === "error") {
      showError(
        formatParseRegisteredCoursesError(maybeRegisteredCourses.error),
      );
      return;
    }
    const { registeredCourseId: registeredCourses } = maybeRegisteredCourses;

    const studentsText = await studentsFile.text();
    const studentsCsv = parseCsv(studentsText);
    if (studentsCsv === undefined) {
      showError("学籍情報ファイルのCSV形式が正しくありません");
      return;
    }
    const maybeStudents = parseStudents(studentsCsv);
    if (maybeStudents.kind === "error") {
      showError(formatParseStudentsError(maybeStudents.error));
      return;
    }
    const { students } = maybeStudents;

    const coursesArrayBuffer = await coursesFile.arrayBuffer();
    const coursesWorkbook = new Workbook();
    try {
      await coursesWorkbook.xlsx.load(coursesArrayBuffer);
    } catch {
      showError("班別名簿ファイルがExcelファイルではないか壊れています");
      return;
    }
    const maybeCourses = parseCourses(coursesWorkbook);
    if (maybeCourses.kind === "error") {
      showError(formatParseCoursesError(maybeCourses.error));
      return;
    }
    const { courses } = maybeCourses;

    // TODO: we're assuming that all courses have the same name
    const randomCourse = Array.from(courses.values()).at(0);
    if (randomCourse !== undefined) {
      inputCourseNameElement.textContent = "授業名: " + randomCourse.name;
    }

    const discrepancies = findRegistrationDiscrepancies(
      registeredCourses,
      students,
      courses,
    );
    for (const discrepancy of discrepancies) {
      for (const s of discrepancy.studentsInWrongCourse) {
        studentsInWrongCourseElement.addStudent(s, discrepancy.expectedCourse);
      }
      for (const s of discrepancy.studentsInNoCourse) {
        studentsInNoCourseElement.addStudent(s, discrepancy.expectedCourse);
      }
    }

    studentsInWrongCourseElement.show();
    studentsInNoCourseElement.show();
  });
}

main();
