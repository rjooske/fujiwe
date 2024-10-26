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

type In1 = [string, string][];
type In2 = [string][];
type In3 = [string, string, string][];

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
  return rows;
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
  return rows;
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
  return rows;
}

function displayStudents(
  studentIds: string[],
  studentIdToEmail: Map<string, [string, string]>,
): string {
  return studentIds
    .map((id) => {
      const email = studentIdToEmail.get(id);
      if (email === undefined) {
        return `${id} (email unknown)`;
      } else {
        return `${id} ${email[0]} ${email[1]}`;
      }
    })
    .join("\n");
}

function main() {
  const in1Element = mustGetElementById("in1");
  const in2Element = mustGetElementById("in2");
  const in3Element = mustGetElementById("in3");
  const courseIdElement = mustGetElementById("course-id");
  const verifyElement = mustGetElementById("verify");
  const outElement = mustGetElementById("out");

  assert(
    in1Element instanceof HTMLTextAreaElement &&
      in2Element instanceof HTMLTextAreaElement &&
      in3Element instanceof HTMLTextAreaElement &&
      courseIdElement instanceof HTMLInputElement &&
      verifyElement instanceof HTMLButtonElement &&
      outElement instanceof HTMLPreElement,
  );

  verifyElement.addEventListener("click", () => {
    const in1 = parseIn1(in1Element.value);
    const in2 = parseIn2(in2Element.value);
    const in3 = parseIn3(in3Element.value);
    const courseId = courseIdElement.value;
    assert(in1 !== undefined && in2 !== undefined && in3 !== undefined);

    const studentIdToEmail = new Map<string, [string, string]>();
    for (const [studentId, schoolEmail, personalEmail] of in3) {
      studentIdToEmail.set(studentId, [schoolEmail, personalEmail]);
    }

    const studentIdToCourseId = new Map<string, string>();
    for (const [studentId, courseId] of in1) {
      studentIdToCourseId.set(studentId, courseId);
    }

    const shouldTakeCourseStudentIds = new Map<string, true>();
    for (const [studentId] of in2) {
      shouldTakeCourseStudentIds.set(studentId, true);
    }

    const mistakeIds: string[] = [];
    const unnecessaryIds: string[] = [];

    for (const studentId of shouldTakeCourseStudentIds.keys()) {
      const actualTakenCourseId = studentIdToCourseId.get(studentId);
      if (actualTakenCourseId === undefined) {
        // NOTE: student hasn't registered a course
        mistakeIds.push(studentId);
        continue;
      }
      if (actualTakenCourseId !== courseId) {
        mistakeIds.push(studentId);
      }
    }

    for (const [
      studentId,
      actualTakenCourseId,
    ] of studentIdToCourseId.entries()) {
      if (
        actualTakenCourseId === courseId &&
        !shouldTakeCourseStudentIds.has(studentId)
      ) {
        unnecessaryIds.push(studentId);
      }
    }

    outElement.innerHTML = `この授業を取らなくていいのに取っている学生:
${displayStudents(unnecessaryIds, studentIdToEmail)}

この授業を取らないといけないのに取っていない学生:
${displayStudents(mistakeIds, studentIdToEmail)}
`;
  });
}

main();
