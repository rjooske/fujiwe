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

type ParseRegisteredCoursesResult =
  | { kind: "ok"; registeredCourseId: Map<StudentId, CourseId> }
  | { kind: "missing-column"; column: string };

function parseRegisteredCourses(csv: Csv): ParseRegisteredCoursesResult {
  const studentIdColumn = "学籍番号";
  const courseIdColumn = "科目番号";
  const deletedColumn = "論理削除";

  for (const column of [studentIdColumn, courseIdColumn, deletedColumn]) {
    if (!csv.columns.includes(column)) {
      return { kind: "missing-column", column };
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

type ParseStudentsResult =
  | { kind: "ok"; students: Map<StudentId, Student> }
  | { kind: "missing-column"; column: string };

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
      return { kind: "missing-column", column };
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

type ParseCoursesResult =
  | {
      kind: "ok";
      courses: Map<CourseId, Course>;
    }
  | {
      kind: "missing-cell";
      cell: "course-id-label" | "course-id" | "student-id-label";
      sheetName: string;
    };

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
        kind: "missing-cell",
        cell: "course-id-label",
        sheetName: sheet.name,
      };
    }

    const courseIdCell = sheet.findCell(
      courseIdLabelCell.fullAddress.row,
      courseIdLabelCell.fullAddress.col + 1,
    );
    if (courseIdCell === undefined) {
      return {
        kind: "missing-cell",
        cell: "course-id",
        sheetName: sheet.name,
      };
    }

    const studentIdLabel = cells.find((c) => c.text.trim() === "学籍番号");
    if (studentIdLabel === undefined) {
      return {
        kind: "missing-cell",
        cell: "student-id-label",
        sheetName: sheet.name,
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

// function displayMissingStudent(
//   s: MissingStudent,
//   courseId: CourseId,
// ): HTMLLIElement {
//   const li = document.createElement("li");
//
//   li.textContent = `${s.id} `;
//   if (s.wrongCourseId === undefined) {
//     li.textContent += "履修未登録 ";
//   } else {
//     li.textContent += `${s.wrongCourseId}を誤登録 `;
//   }
//
//   if (s.contact === undefined) {
//     li.textContent += "(メアド不明)";
//   } else {
//     li.textContent += `学校: ${s.contact.schoolEmail} 個人: ${s.contact.personalEmail} `;
//     const a = document.createElement("a");
//     a.href = createMailtoUri({
//       recipients: [s.contact.schoolEmail],
//       cc: [s.contact.personalEmail],
//       bcc: [],
//       subject: "取らないといけない授業を取っていない",
//       body:
//         s.wrongCourseId === undefined
//           ? "履修登録をしていない"
//           : `${s.wrongCourseId}を誤登録\n${courseId}を取るべき`,
//     });
//     a.textContent = "(メールを作成)";
//     li.appendChild(a);
//   }
//
//   return li;
// }

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
    // TODO: make sure there's only one tr
    const tr = template.querySelector("tr");
    if (tr === null) {
      return undefined;
    }
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length !== 5) {
      return undefined;
    }
    // TODO: make sure there's only one button
    const emailButton = template.querySelector("button");
    if (emailButton === null) {
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
    // TODO: make sure there's only one tbody
    const tbody = root.querySelector("tbody");
    // TODO: better checks
    const rowTemplate = root.querySelector("template");
    if (tbody === null || rowTemplate === null) {
      return undefined;
    }
    if (StudentsInWrongCourseElement.newRow(rowTemplate) === undefined) {
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
    // TODO: make sure there's only one tr
    const tr = template.querySelector("tr");
    if (tr === null) {
      return undefined;
    }
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length !== 4) {
      return undefined;
    }
    // TODO: make sure there's only one button
    const emailButton = template.querySelector("button");
    if (emailButton === null) {
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
    // TODO: make sure there's only one tbody
    const tbody = root.querySelector("tbody");
    // TODO: better checks
    const rowTemplate = root.querySelector("template");
    if (tbody === null || rowTemplate === null) {
      return undefined;
    }
    if (StudentsInNoCourseElement.newRow(rowTemplate) === undefined) {
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

const WRONG_COURSE_EMAIL_TEMPLATE_KEY = "wrong-course-email-template";
const NO_COURSE_EMAIL_TEMPLATE_KEY = "no-course-email-template";

async function main() {
  const registeredCoursesInput = mustGetElementById("input-registered-courses");
  const studentsInput = mustGetElementById("input-students");
  const coursesInput = mustGetElementById("input-courses");
  const verifyElement = mustGetElementById("verify");
  const wrongCourseTextarea = mustGetElementById("email-template-wrong-course");
  const noCourseTextarea = mustGetElementById("email-template-no-course");

  assert(registeredCoursesInput instanceof HTMLInputElement);
  assert(studentsInput instanceof HTMLInputElement);
  assert(coursesInput instanceof HTMLInputElement);
  assert(verifyElement instanceof HTMLButtonElement);
  assert(wrongCourseTextarea instanceof HTMLTextAreaElement);
  assert(noCourseTextarea instanceof HTMLTextAreaElement);

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

  wrongCourseTextarea.value =
    localStorage.getItem(WRONG_COURSE_EMAIL_TEMPLATE_KEY) ?? "";
  noCourseTextarea.value =
    localStorage.getItem(NO_COURSE_EMAIL_TEMPLATE_KEY) ?? "";
  // TODO: throttle?
  wrongCourseTextarea.addEventListener("input", () => {
    localStorage.setItem(
      WRONG_COURSE_EMAIL_TEMPLATE_KEY,
      wrongCourseTextarea.value,
    );
  });
  noCourseTextarea.addEventListener("input", () => {
    localStorage.setItem(NO_COURSE_EMAIL_TEMPLATE_KEY, noCourseTextarea.value);
  });

  const studentsInWrongCourseElement = StudentsInWrongCourseElement.from(
    mustGetElementById("students-in-wrong-course"),
    (student, expectedCourse) => {
      const body = fillInWrongCourseTemplate(
        wrongCourseTextarea.value,
        student,
        expectedCourse,
      );
      const uri = createMailtoUri({
        // TODO
        subject: "TODO",
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
        wrongCourseTextarea.value,
        student,
        expectedCourse,
      );
      const uri = createMailtoUri({
        // TODO
        subject: "TODO",
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

    // TODO: show parsing errors
    const registeredCoursesText = await registeredCoursesFile.text();
    const registeredCoursesCsv = parseCsv(registeredCoursesText);
    assert(registeredCoursesCsv !== undefined);
    const maybeRegisteredCourses = parseRegisteredCourses(registeredCoursesCsv);
    assert(maybeRegisteredCourses.kind === "ok");
    const { registeredCourseId: registeredCourses } = maybeRegisteredCourses;

    // TODO: show parsing errors
    const studentsText = await studentsFile.text();
    const studentsCsv = parseCsv(studentsText);
    assert(studentsCsv !== undefined);
    const maybeStudents = parseStudents(studentsCsv);
    assert(maybeStudents.kind === "ok");
    const { students } = maybeStudents;

    // TODO: show parsing errors
    const coursesArrayBuffer = await coursesFile.arrayBuffer();
    const coursesWorkbook = new Workbook();
    await coursesWorkbook.xlsx.load(coursesArrayBuffer);
    const maybeCourses = parseCourses(coursesWorkbook);
    assert(maybeCourses.kind === "ok");
    const { courses } = maybeCourses;

    studentsInWrongCourseElement.hide();
    studentsInNoCourseElement.hide();

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
