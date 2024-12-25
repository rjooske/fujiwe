<script module lang="ts">
  export type FujiweInput = {
    courseName: string;
    registeredCourseIds: Map<StudentId, CourseId>;
    students: Map<StudentId, Student>;
    courses: Map<CourseId, Course>;
    wrongCourseEmailTemplate: EmailTemplate;
    noCourseEmailTemplate: EmailTemplate;
  };
</script>

<script lang="ts">
  import {
    parseCourses,
    parseCsv,
    parseRegisteredCourses,
    parseStudents,
    type ParseCoursesError,
    type ParseRegisteredCoursesError,
    type ParseStudentsError,
  } from "$lib/input";
  import exceljs from "exceljs";
  import EmailTemplateInput, {
    type EmailTemplate,
  } from "./EmailTemplateInput.svelte";
  import type { Course, CourseId, Student, StudentId } from "$lib/fujiwe";
  const { Workbook } = exceljs;

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

  function formatParseRegisteredCoursesError(
    e: ParseRegisteredCoursesError,
  ): string {
    switch (e.kind) {
      case "missing-column":
        return `履修情報ファイルに列「${e.column}」が存在しません`;
      case "bad-deletion-value":
        return `履修情報ファイルの論理削除列に不正な値「${e.value}」が存在します`;
      default:
        unreachable(e);
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

  let {
    wrongCourseEmailTemplate = $bindable({ subject: "", body: "" }),
    noCourseEmailTemplate = $bindable({ subject: "", body: "" }),
    onFileInputStart,
    onFileInputSuccess,
    onFileInputError,
  }: {
    wrongCourseEmailTemplate: EmailTemplate;
    noCourseEmailTemplate: EmailTemplate;
    onFileInputStart: () => unknown;
    onFileInputSuccess: (i: FujiweInput) => unknown;
    onFileInputError: () => unknown;
  } = $props();

  let registeredCoursesFiles = $state<FileList | undefined>();
  let studentsFiles = $state<FileList | undefined>();
  let coursesFiles = $state<FileList | undefined>();

  let verifyButtonDisabledBecauseFiles = $derived(
    ![registeredCoursesFiles, studentsFiles, coursesFiles].every(
      (x) => x?.length === 1,
    ),
  );
  let verifyButtonDisabledBecauseProcessing = $state(false);

  function error(message: string) {
    verifyButtonDisabledBecauseProcessing = false;
    onFileInputError();
    alert(message);
  }

  async function handleVerify() {
    const registeredCoursesFile = exactlyOne(registeredCoursesFiles ?? []);
    const studentsFile = exactlyOne(studentsFiles ?? []);
    const coursesFile = exactlyOne(coursesFiles ?? []);
    if (
      registeredCoursesFile === undefined ||
      studentsFile === undefined ||
      coursesFile === undefined
    ) {
      return;
    }

    onFileInputStart();
    verifyButtonDisabledBecauseProcessing = true;

    const registeredCoursesText = await registeredCoursesFile.text();
    const registeredCoursesCsv = parseCsv(registeredCoursesText);
    if (registeredCoursesCsv === undefined) {
      error("履修情報ファイルのCSV形式が正しくありません");
      return;
    }
    const maybeRegisteredCourses = parseRegisteredCourses(registeredCoursesCsv);
    if (maybeRegisteredCourses.kind === "error") {
      error(formatParseRegisteredCoursesError(maybeRegisteredCourses.error));
      return;
    }
    const { registeredCourseIds } = maybeRegisteredCourses;

    const studentsText = await studentsFile.text();
    const studentsCsv = parseCsv(studentsText);
    if (studentsCsv === undefined) {
      error("学籍情報ファイルのCSV形式が正しくありません");
      return;
    }
    const maybeStudents = parseStudents(studentsCsv);
    if (maybeStudents.kind === "error") {
      error(formatParseStudentsError(maybeStudents.error));
      return;
    }
    const { students } = maybeStudents;

    const coursesArrayBuffer = await coursesFile.arrayBuffer();
    const coursesWorkbook = new Workbook();
    try {
      await coursesWorkbook.xlsx.load(coursesArrayBuffer);
    } catch {
      error(
        "班別名簿ファイルがExcelファイルではないか、壊れている可能性があります",
      );
      return;
    }
    const maybeCourses = parseCourses(coursesWorkbook);
    if (maybeCourses.kind === "error") {
      error(formatParseCoursesError(maybeCourses.error));
      return;
    }
    const { courses } = maybeCourses;

    // TODO: we're assuming that all courses have the same name
    let courseName = "";
    const randomCourse = Array.from(courses.values()).at(0);
    if (randomCourse !== undefined) {
      courseName = randomCourse.name;
    }

    verifyButtonDisabledBecauseProcessing = false;
    onFileInputSuccess({
      courseName,
      registeredCourseIds,
      students,
      courses,
      wrongCourseEmailTemplate,
      noCourseEmailTemplate,
    });
  }
</script>

<label for="input-registered-courses">履修情報:</label>
<input
  type="file"
  id="input-registered-courses"
  bind:files={registeredCoursesFiles}
/>
<br />

<label for="input-students">学籍情報:</label>
<input type="file" id="input-students" bind:files={studentsFiles} />
<br />

<label for="input-courses">班別名簿:</label>
<input type="file" id="input-courses" bind:files={coursesFiles} />
<br />

<button
  id="verify"
  disabled={verifyButtonDisabledBecauseFiles ||
    verifyButtonDisabledBecauseProcessing}
  onclick={handleVerify}
>
  {#if verifyButtonDisabledBecauseProcessing}
    処理中...
  {:else}
    確認
  {/if}
</button>
<br />

<h3>誤った授業を履修している学生へのメール</h3>
<EmailTemplateInput
  id="wrong-course"
  bind:template={wrongCourseEmailTemplate}
/>
<br />

<h3>履修登録をしていない学生へのメール</h3>
<EmailTemplateInput id="no-course" bind:template={noCourseEmailTemplate} />
<br />
