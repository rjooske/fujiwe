import { parse } from "csv-parse/browser/esm/sync";

function assert(b: boolean): asserts b {
  if (!b) {
    throw new Error("assertion failed");
  }
}

function mustGetElementById(id: string): HTMLElement {
  const e = document.getElementById(id);
  assert(e !== null);
  return e;
}

declare const nominalIdentifier: unique symbol;
type Nominal<T, Identifier> = T & { [nominalIdentifier]: Identifier };

type StudentId = Nominal<string, "StudentId">;
type CourseId = Nominal<string, "CourseId">;
type Email = Nominal<string, "Email">;

type StudentContact = { schoolEmail: Email; personalEmail: Email };

type In1 = Map<StudentId, CourseId>;
type In2 = Map<StudentId, true>;
type In3 = Map<StudentId, StudentContact>;

function parseIn1(s: string): In1 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(
        Array.isArray(row) &&
        row.length === 2 &&
        typeof row[0] === "string" &&
        typeof row[1] === "string"
      )
    ) {
      return undefined;
    }
  }

  const in1: In1 = new Map();
  for (const [studentId, courseId] of rows) {
    in1.set(studentId, courseId);
  }
  return in1;
}

function parseIn2(s: string): In2 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(Array.isArray(row) && row.length === 1 && typeof row[0] === "string")
    ) {
      return undefined;
    }
  }

  const in2: In2 = new Map();
  for (const [studentId] of rows) {
    in2.set(studentId, true);
  }
  return in2;
}

function parseIn3(s: string): In3 | undefined {
  const rows = parse(s);
  if (!Array.isArray(rows)) {
    return undefined;
  }
  for (const row of rows) {
    if (
      !(
        Array.isArray(row) &&
        row.length === 3 &&
        typeof row[0] === "string" &&
        typeof row[1] === "string" &&
        typeof row[2] === "string"
      )
    ) {
      return undefined;
    }
  }

  const in3: In3 = new Map();
  for (const [studentId, schoolEmail, personalEmail] of rows) {
    in3.set(studentId, { schoolEmail, personalEmail });
  }
  return in3;
}

type MissingStudent = {
  id: StudentId;
  contact: StudentContact | undefined;
  wrongCourseId: CourseId | undefined;
};
type SuperfluousStudent = {
  id: StudentId;
  contact: StudentContact | undefined;
};
type VerifyResult = {
  missingStudents: MissingStudent[];
  superfluousStudents: SuperfluousStudent[];
};

function verify(
  in1: In1,
  in2: In2,
  in3: In3,
  courseId: CourseId,
): VerifyResult {
  const missingStudents: MissingStudent[] = [];
  const superfluousStudents: SuperfluousStudent[] = [];

  for (const studentId of in2.keys()) {
    const actualTakenCourseId = in1.get(studentId);
    if (actualTakenCourseId === undefined) {
      // Student hasn't registered any course
      missingStudents.push({
        id: studentId,
        contact: in3.get(studentId),
        wrongCourseId: undefined,
      });
    } else if (actualTakenCourseId !== courseId) {
      // Student has registered the wrong course
      missingStudents.push({
        id: studentId,
        contact: in3.get(studentId),
        wrongCourseId: actualTakenCourseId,
      });
    }
  }

  for (const [studentId, actualTakenCourseId] of in1.entries()) {
    // Student took the `courseId` course even though they don't have to
    if (actualTakenCourseId === courseId && !in2.has(studentId)) {
      superfluousStudents.push({
        id: studentId,
        contact: in3.get(studentId),
      });
    }
  }

  return {
    missingStudents,
    superfluousStudents,
  };
}

function displayMaybeStudentContact(c: StudentContact | undefined): string {
  if (c === undefined) {
    return "(メアド不明)";
  } else {
    return `学校: ${c.schoolEmail} 個人: ${c.personalEmail}`;
  }
}

function displayMissingReason(courseId: CourseId | undefined): string {
  if (courseId === undefined) {
    return "履修登録なし";
  } else {
    return `${courseId}を誤登録`;
  }
}

function main() {
  const in1Element = mustGetElementById("in1");
  const in2Element = mustGetElementById("in2");
  const in3Element = mustGetElementById("in3");
  const courseIdElement = mustGetElementById("course-id");
  const verifyElement = mustGetElementById("verify");
  const out1Element = mustGetElementById("out1");
  const out2Element = mustGetElementById("out2");

  assert(
    in1Element instanceof HTMLTextAreaElement &&
      in2Element instanceof HTMLTextAreaElement &&
      in3Element instanceof HTMLTextAreaElement &&
      courseIdElement instanceof HTMLInputElement &&
      verifyElement instanceof HTMLButtonElement &&
      out1Element instanceof HTMLDivElement &&
      out2Element instanceof HTMLDivElement,
  );

  verifyElement.addEventListener("click", () => {
    const in1 = parseIn1(in1Element.value);
    const in2 = parseIn2(in2Element.value);
    const in3 = parseIn3(in3Element.value);
    const courseId = courseIdElement.value;
    assert(in1 !== undefined && in2 !== undefined && in3 !== undefined);

    const result = verify(in1, in2, in3, courseId as CourseId);
    const lb = "%0D%0A";

    const title1 = document.createElement("div");
    title1.textContent = "この授業を取らなくていいのに取っている学生:";
    out1Element.appendChild(title1);
    for (const s of result.superfluousStudents) {
      const a = document.createElement("a");
      a.href = `mailto:${s.contact?.schoolEmail}`
      + `?cc=${s.contact?.personalEmail}`
      + "?subject=取らなくていい授業をとってるぞアホ"
      + `?body=おい${lb}笑える${lb}${courseId}を誤登録`;
      a.textContent = `${s.id} ${displayMaybeStudentContact(s.contact)}`;
      out1Element.appendChild(a);
    }

    const title2 = document.createElement("div");
    title2.textContent = "この授業を取らないといけないのに取っていない学生:";
    out2Element.appendChild(title2);
    for (const s of result.missingStudents) {
      const a = document.createElement("a");
      const reason = displayMissingReason(s.wrongCourseId);
      a.href = `mailto:${s.contact?.schoolEmail}`
      + `?cc=${s.contact?.personalEmail}`
      + "?subject=取ってない授業あるぞボケ"
      + `?body=${reason}${lb}正しくは${courseId}`;
      a.textContent = `${s.id} 理由: ${reason} ${displayMaybeStudentContact(s.contact)}`;
      out2Element.appendChild(a);
    }
  });
}

main();
