import { parse as _parseCsv } from "csv-parse/browser/esm/sync";
import {
  type Course,
  type CourseId,
  type Email,
  type Student,
  type StudentId,
} from "./fujiwe";
import type { Cell, Workbook, Worksheet } from "exceljs";

export type Csv = {
  columns: string[];
  records: Record<string, string>[];
};

export function parseCsv(s: string): Csv | undefined {
  let records: Record<string, string>[];
  try {
    // The library should guarantee that it returns a value of this type
    records = _parseCsv(s, { trim: true, columns: true });
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

export type ParseRegisteredCoursesError =
  | { kind: "missing-column"; column: string }
  | { kind: "bad-deletion-value"; value: string };
export type ParseRegisteredCoursesResult =
  | { kind: "ok"; registeredCourseIds: Map<StudentId, CourseId> }
  | { kind: "error"; error: ParseRegisteredCoursesError };

export function parseRegisteredCourses(csv: Csv): ParseRegisteredCoursesResult {
  const studentIdColumn = "学籍番号";
  const courseIdColumn = "科目番号";
  const deletionColumn = "論理削除";

  for (const column of [studentIdColumn, courseIdColumn, deletionColumn]) {
    if (!csv.columns.includes(column)) {
      return { kind: "error", error: { kind: "missing-column", column } };
    }
  }

  const registeredCourseId = new Map<StudentId, CourseId>();
  for (const record of csv.records) {
    const deletion = record[deletionColumn];
    if (deletion === "○") {
      continue;
    } else if (deletion !== "") {
      return {
        kind: "error",
        error: { kind: "bad-deletion-value", value: deletion },
      };
    }
    // TODO: remove type assertions
    registeredCourseId.set(
      record[studentIdColumn] as StudentId,
      record[courseIdColumn] as CourseId,
    );
  }

  return { kind: "ok", registeredCourseIds: registeredCourseId };
}

export type ParseStudentsError = { kind: "missing-column"; column: string };
export type ParseStudentsResult =
  | { kind: "ok"; students: Map<StudentId, Student> }
  | { kind: "error"; error: ParseStudentsError };

export function parseStudents(csv: Csv): ParseStudentsResult {
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

export type ParseCoursesError = {
  kind: "missing-cell";
  cell:
    | "course-id-label"
    | "course-id"
    | "course-name-label"
    | "course-name"
    | "student-id-label";
  sheetName: string;
};
export type ParseCoursesResult =
  | { kind: "ok"; courses: Map<CourseId, Course> }
  | { kind: "error"; error: ParseCoursesError };

export function parseCourses(workbook: Workbook): ParseCoursesResult {
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
