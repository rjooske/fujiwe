<script module lang="ts">
  export type FujiweOutput = {
    courseName: string;
    discrepancy: RegistrationDiscrepancy;
    courseIdToModuleName: Map<CourseId, ModuleName>;
  };
</script>

<script lang="ts">
  import type {
    ModuleName,
    CourseId,
    RegistrationDiscrepancy,
    StudentInNoCourse,
    StudentInWrongCourse,
    Course,
    StudentId,
  } from "$lib/fujiwe";

  function assert(b: boolean): asserts b {
    if (!b) {
      throw new Error("assertion failed");
    }
  }

  function* zip<A, B>(
    as: Iterable<A, void, void>,
    bs: Iterable<B, void, void>,
  ): Generator<[A, B], void, void> {
    const bi = bs[Symbol.iterator]();
    for (const a of as) {
      const b = bi.next();
      if (b.done === true) {
        return;
      }
      yield [a, b.value];
    }
  }

  function compareStrings(a: string, b: string): number {
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    for (const [ac, bc] of zip(a, b)) {
      const acp = ac.codePointAt(0);
      const bcp = bc.codePointAt(0);
      assert(acp !== undefined);
      assert(bcp !== undefined);
      if (acp !== bcp) {
        return acp - bcp;
      }
    }
    return 0;
  }

  function groupStudentsByModule<
    Student extends { id: StudentId; expectedCourse: Course },
  >(
    courseIdToModuleName: Map<CourseId, ModuleName>,
    students: Student[],
  ): [ModuleName, Student[]][] {
    const moduleNameToStudents = new Map<ModuleName, Student[]>();

    for (const [courseId, moduleName] of courseIdToModuleName.entries()) {
      const newStudents = students.filter(
        (s) => s.expectedCourse.id === courseId,
      );
      const existingStudents = moduleNameToStudents.get(moduleName);
      if (existingStudents === undefined) {
        moduleNameToStudents.set(moduleName, newStudents);
      } else {
        existingStudents.push(...newStudents);
      }
    }

    const result = moduleNameToStudents
      .entries()
      .filter(([, students]) => students.length >= 1)
      .toArray()
      .toSorted(([a], [b]) => compareStrings(a, b));
    for (const [, students] of result) {
      students.sort((a, b) => compareStrings(a.id, b.id));
    }

    return result;
  }

  const {
    output,
    sendWrongCourseEmail,
    sendNoCourseEmail,
  }: {
    output: FujiweOutput;
    sendWrongCourseEmail: (s: StudentInWrongCourse) => void;
    sendNoCourseEmail: (s: StudentInNoCourse) => void;
  } = $props();

  let { groupsInWrongCourse, groupsInNoCourse } = $derived.by(() => ({
    groupsInWrongCourse: groupStudentsByModule(
      output.courseIdToModuleName,
      output.discrepancy.studentsInWrongCourse,
    ),
    groupsInNoCourse: groupStudentsByModule(
      output.courseIdToModuleName,
      output.discrepancy.studentsInNoCourse,
    ),
  }));
</script>

<h2>授業名: {output.courseName}</h2>

<h3>誤った授業を履修している学生</h3>
{#if output.discrepancy.studentsInWrongCourse.length === 0}
  <p>誤った授業を履修している学生はいません。</p>
{:else}
  {#each groupsInWrongCourse as [moduleName, students] (moduleName)}
    <h4>{moduleName}開講の授業を履修すべき学生</h4>
    <table>
      <thead>
        <tr>
          <th>学籍番号</th>
          <th>氏名</th>
          <th>履修すべき授業</th>
          <th>履修している授業</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each students as student (student.id)}
          <tr>
            <td>{student.id}</td>
            <td>{student.name}</td>
            <td>
              {student.expectedCourse.id} ({student.expectedCourse.targetName})
            </td>
            <td>
              {student.registeredCourse.id} ({student.registeredCourse
                .targetName})
            </td>
            <td>
              <button onclick={() => sendWrongCourseEmail(student)}>
                メールを送信
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
{/if}

<h3>履修登録をしていない学生</h3>
{#if output.discrepancy.studentsInNoCourse.length === 0}
  <p>履修登録をしていない学生はいません。</p>
{:else}
  {#each groupsInNoCourse as [moduleName, students] (moduleName)}
    <h4>{moduleName}開講の授業を履修すべき学生</h4>
    <table>
      <thead>
        <tr>
          <th>学籍番号</th>
          <th>氏名</th>
          <th>履修すべき授業</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {#each students as student (student.id)}
          <tr>
            <td>{student.id}</td>
            <td>{student.name}</td>
            <td>
              {student.expectedCourse.id} ({student.expectedCourse.targetName})
            </td>
            <td>
              <button onclick={() => sendNoCourseEmail(student)}>
                メールを送信
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
{/if}

{#if output.discrepancy.studentsInUnknownCourse.length !== 0}
  <h3>名簿が存在しない授業を履修している学生</h3>
  <p class="error">
    履修情報ファイルに存在する学生のうち、以下の学生が班別名簿ファイルに存在しない授業を履修しています。
  </p>
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>氏名</th>
        <th>履修している授業</th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsInUnknownCourse as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.name}</td>
          <td>{student.unknownCourseId}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

{#if output.discrepancy.studentsWithoutDetails.length !== 0}
  <h3>学籍情報が存在しない学生</h3>
  <p class="error">
    班別名簿ファイルに存在する学生のうち、以下の学籍番号の学生が学籍情報ファイルに存在しません。
  </p>
  <table>
    <thead>
      <tr>
        <th>学籍番号</th>
        <th>班別名簿のシート名</th>
      </tr>
    </thead>
    <tbody>
      {#each output.discrepancy.studentsWithoutDetails as student (student.id)}
        <tr>
          <td>{student.id}</td>
          <td>{student.expectedCourse.targetName}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .error {
    color: #ee0000;
  }
</style>
